import { createClient } from "@supabase/supabase-js";

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// Synthetic email lets staff sign in with a username instead of an email address.
// It is an internal login identifier; users do not need a real mailbox at this domain.
export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@login.theheartofstars.invalid`;
}
