import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_PASSWORD;
if (!url || !key || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and ADMIN_PASSWORD first.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters. Use a new, unique password.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const username = "ash.j";
const email = `${username}@login.theheartofstars.invalid`;
const { data, error } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { username }
});
if (error) {
  console.error("Could not create administrator:", error.message);
  process.exit(1);
}
const { error: profileError } = await supabase.from("profiles").insert({
  id: data.user.id, username, role: "administrator"
});
if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("Could not create administrator profile:", profileError.message);
  process.exit(1);
}
console.log("Administrator account created: ash.j");
console.log("Remove ADMIN_PASSWORD from your environment after this one-time setup.");
