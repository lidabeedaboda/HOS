 "use client";

import { useEffect, useState } from "react";
import { supabaseBrowser, usernameToEmail } from "@/lib/supabase";
import { ArrowRight, Eye, EyeOff, Star } from "lucide-react";
import Portal from "./portal";

export default function Home() {
  const supabase = supabaseBrowser();
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => data.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(clean)) {
      setError("Enter a valid username (3–32 letters, numbers, dots, underscores or hyphens).");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(clean), password
    });
    if (error) setError("Incorrect username or password. Please try again.");
    else await supabase.rpc("record_my_login");
    setBusy(false);
  }

  if (session) return <Portal session={session} />;

  return <main className="login-shell">
    <section className="login-card">
      <div className="brand-mark"><Star size={23} fill="currentColor" /></div>
      <div className="eyebrow">THEHEARTOFSTARS</div>
      <h1>Staff Management</h1>
      <p className="muted intro">A private space for our team to connect, collaborate and stay informed.</p>
      <form onSubmit={login}>
        <label htmlFor="username">Username</label>
        <input id="username" autoComplete="username" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <div className="password-wrap">
          <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? "Signing in..." : <>Sign in <ArrowRight size={17}/></>}</button>
      </form>
      <div className="login-foot">Authorised team members only · Secure access</div>
    </section>
    <div className="copyright">© {new Date().getFullYear()} TheHeartOfStars</div>
  </main>;
}
