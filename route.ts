import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { usernameToEmail } from "@/lib/supabase";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const token = authHeader.slice(7);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: caller } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
  if (!caller || !["administrator", "manager"].includes(caller.role)) {
    return NextResponse.json({ error: "You do not have permission to create accounts." }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "staff_member");
  const allowedRoles = caller.role === "administrator"
    ? ["manager", "staff_member", "studio_director"]
    : ["staff_member", "studio_director"];

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  if (password.length < 12) return NextResponse.json({ error: "Use a password with at least 12 characters." }, { status: 400 });
  if (!allowedRoles.includes(role)) return NextResponse.json({ error: "You cannot assign that role." }, { status: 403 });

  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username), password, email_confirm: true,
    user_metadata: { username }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: profileError } = await admin.from("profiles").insert({ id: data.user.id, username, role });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, username, role });
}
