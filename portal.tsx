"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Bell, MessageCircle, Shield, Users, LayoutDashboard, LogOut, Star, Plus, Send, RefreshCw } from "lucide-react";

type Profile = { id: string; username: string; role: string; created_at: string };
const supabase = supabaseBrowser();

export default function Portal({ session }: { session: any }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [section, setSection] = useState("Overview");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [chatText, setChatText] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [modUser, setModUser] = useState("");
  const [modId, setModId] = useState("");
  const [punishment, setPunishment] = useState("Warning");
  const [reason, setReason] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff_member");
  const [creatingUser, setCreatingUser] = useState(false);

  const role = profile?.role ?? "staff_member";
  const isAdmin = role === "administrator";
  const isManager = isAdmin || role === "manager";
  const canModerate = isManager;
  const isGuest = role === "studio_director";

  async function refresh() {
    setLoading(true);
    const [{ data: p }, { data: a }, { data: c }, { data: m }, { data: l }] = await Promise.all([
      supabase.from("profiles").select("id,username,role,created_at,last_login_at").eq("id", session.user.id).single(),
      supabase.from("announcements").select("*, profiles(username)").order("created_at", { ascending: false }).limit(30),
      supabase.from("company_messages").select("*, profiles(username)").order("created_at", { ascending: true }).limit(100),
      supabase.from("profiles").select("id,username,role,created_at,last_login_at").order("created_at", { ascending: false }),
      supabase.from("moderation_logs").select("*, profiles(username)").order("created_at", { ascending: false }).limit(100)
    ]);
    setProfile(p as Profile | null); setAnnouncements(a ?? []); setMessages(c ?? []);
    setMembers(m ?? []); setLogs(l ?? []); setLoading(false);
  }

  useEffect(() => {
    refresh();
    const channel = supabase.channel("portal-live")
      .on("postgres_changes", { event: "*", schema: "public" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault(); setNotice("");
    const { error } = await supabase.from("announcements").insert({ title: announcementTitle, body: announcementText, author_id: session.user.id });
    setNotice(error ? error.message : "Announcement posted.");
    if (!error) { setAnnouncementTitle(""); setAnnouncementText(""); refresh(); }
  }
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); if (!chatText.trim()) return;
    const { error } = await supabase.from("company_messages").insert({ body: chatText.trim(), user_id: session.user.id });
    if (error) setNotice(error.message); else setChatText("");
  }
  async function createMember(e: React.FormEvent) {
    e.preventDefault(); setCreatingUser(true); setNotice("");
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${activeSession?.access_token ?? ""}` },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
    });
    const result = await response.json();
    setNotice(response.ok ? `Account created for ${result.username}. Share the login details securely.` : (result.error ?? "Could not create account."));
    if (response.ok) { setNewUsername(""); setNewPassword(""); setNewRole("staff_member"); refresh(); }
    setCreatingUser(false);
  }
  async function addModeration(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("moderation_logs").insert({
      subject_username: modUser, subject_user_id: modId, punishment, reason, moderator_id: session.user.id
    });
    setNotice(error ? error.message : "Moderation record saved.");
    if (!error) { setModUser(""); setModId(""); setReason(""); refresh(); }
  }
  async function signOut() { await supabase.auth.signOut(); }

  const nav = [
    ["Overview", LayoutDashboard], ["Announcements", Bell], ["Company Chat", MessageCircle],
    ...(canModerate ? [["Moderation Logger", Shield] as any] : []),
    ...(isManager ? [["Members", Users] as any] : [])
  ] as any[];

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><span className="brand-mark small"><Star size={17} fill="currentColor"/></span><div><b>TheHeartOfStars</b><small>STAFF PORTAL</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([label, Icon]) => <button key={label} onClick={() => setSection(label)} className={`nav-item ${section === label ? "active" : ""}`}><Icon size={18}/>{label}</button>)}
      <div className="side-bottom">
        <div className="user-chip"><div className="avatar">{profile?.username?.slice(0,1).toUpperCase() ?? "?"}</div><div><b>{profile?.username ?? "Loading..."}</b><small>{roleLabel(role)}</small></div></div>
        <button className="nav-item signout" onClick={signOut}><LogOut size={18}/> Sign out</button>
      </div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><span className="muted">Workspace</span><span className="crumb"> / {section}</span></div><button className="icon-button" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button></header>
      <div className="content">
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {section === "Overview" && <><div className="welcome"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Welcome back, {profile?.username ?? "team member"}.</h1><p className="muted">Here's what's happening across TheHeartOfStars.</p></div><span className="role-pill">{roleLabel(role)}</span></div>
          <div className="stats-grid"><Stat icon={<Bell/>} label="Announcements" value={announcements.length}/><Stat icon={<MessageCircle/>} label="Chat messages" value={messages.length}/>{isManager && <Stat icon={<Users/>} label="Members" value={members.length}/>}<Stat icon={<Shield/>} label="Access" value={isGuest ? "Guest" : "Active"}/></div>
          <div className="section-heading"><div><h2>Latest announcements</h2><p className="muted">Updates from management</p></div><button className="text-button" onClick={() => setSection("Announcements")}>View all</button></div>
          <div className="stack">{announcements.slice(0,3).map(a => <Announcement key={a.id} item={a}/>)}
          {!announcements.length && <Empty text="No announcements have been posted yet."/>}</div>
        </>}
        {section === "Announcements" && <><PageTitle title="Announcements" desc="Important updates from TheHeartOfStars management."/>
          {isManager && <form className="panel form-panel" onSubmit={postAnnouncement}><h3>Post an announcement</h3><input placeholder="Announcement title" value={announcementTitle} onChange={e=>setAnnouncementTitle(e.target.value)} required/><textarea placeholder="Write your announcement..." value={announcementText} onChange={e=>setAnnouncementText(e.target.value)} required/><button className="primary"><Plus size={16}/> Publish announcement</button></form>}
          <div className="stack">{announcements.map(a=><Announcement key={a.id} item={a}/>)}{!announcements.length&&<Empty text="There are no announcements yet."/>}</div>
        </>}
        {section === "Company Chat" && <><PageTitle title="Company-wide chat" desc="A shared space for authorised team members."/>
          <div className="chat-panel"><div className="chat-feed">{messages.map(m=><div className={`chat-message ${m.user_id===session.user.id?"mine":""}`} key={m.id}><b>{m.profiles?.username ?? "Team member"}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}{!messages.length&&<Empty text="Start the conversation."/>}</div>
            <form className="chat-compose" onSubmit={sendMessage}><input value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Write a message..." maxLength={2000}/><button className="primary" aria-label="Send message"><Send size={17}/></button></form></div>
        </>}
        {section === "Moderation Logger" && canModerate && <><PageTitle title="Moderation logger" desc="Record and review moderation actions."/>
          <form className="panel form-panel" onSubmit={addModeration}><h3>New moderation record</h3><div className="two-col"><div><label>Their Username</label><input value={modUser} onChange={e=>setModUser(e.target.value)} required/></div><div><label>Their UserID</label><input value={modId} onChange={e=>setModId(e.target.value)} required/></div></div><label>Punishment Issued</label><select value={punishment} onChange={e=>setPunishment(e.target.value)}><option>Warning</option><option>Kick</option><option>Ban</option><option>PBAN</option></select><label>Reason</label><textarea value={reason} onChange={e=>setReason(e.target.value)} required/><button className="primary"><Plus size={16}/> Save moderation record</button></form>
          <div className="section-heading"><h2>Moderation history</h2><span className="muted">{logs.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Username</th><th>UserID</th><th>Punishment</th><th>Reason</th><th>Moderator</th><th>Date</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{l.subject_username}</td><td>{l.subject_user_id}</td><td><span className="tag">{l.punishment}</span></td><td>{l.reason}</td><td>{l.profiles?.username ?? "—"}</td><td>{new Date(l.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!logs.length&&<Empty text="No moderation records yet."/>}</div>
        </>}
        {section === "Members" && isManager && <><PageTitle title="Members" desc="View team accounts and their current access level."/>
          <form className="panel form-panel" onSubmit={createMember}><h3>Add a new member</h3><div className="two-col"><div><label>Username</label><input value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="e.g. star.member" required minLength={3}/></div><div><label>Temporary password (12+ characters)</label><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={12} required/></div></div><label>Account type</label><select value={newRole} onChange={e=>setNewRole(e.target.value)}><option value="staff_member">Staff Member</option><option value="studio_director">Studio Director (Guest)</option>{isAdmin && <option value="manager">Manager</option>}</select><button className="primary" disabled={creatingUser}><Plus size={16}/>{creatingUser ? "Creating..." : "Create account"}</button></form>
          <div className="table-wrap"><table><thead><tr><th>Username</th><th>Account type</th><th>Joined</th><th>Last login</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><b>{m.username}</b></td><td><span className="tag">{roleLabel(m.role)}</span></td><td>{new Date(m.created_at).toLocaleDateString()}</td><td>{m.last_login_at ? new Date(m.last_login_at).toLocaleString() : "Never logged in"}</td></tr>)}</tbody></table></div><p className="muted tiny">Managers can create Staff Member and Studio Director accounts. Only Administrators can create Manager accounts.</p></>}
        {loading && <p className="muted tiny">Refreshing workspace data…</p>}
      </div>
    </section>
  </main>;
}

function roleLabel(role:string) { return ({administrator:"Administrator",manager:"Manager",staff_member:"Staff Member",studio_director:"Studio Director"} as any)[role] ?? role; }
function Stat({icon,label,value}:any){return <div className="stat-card"><span className="stat-icon">{icon}</span><div><b>{value}</b><small>{label}</small></div></div>}
function PageTitle({title,desc}:any){return <div className="page-title"><div className="eyebrow">THEHEARTOFSTARS</div><h1>{title}</h1><p className="muted">{desc}</p></div>}
function Empty({text}:any){return <div className="empty">{text}</div>}
function Announcement({item}:any){return <article className="announcement"><div className="announcement-icon"><Bell size={18}/></div><div><h3>{item.title}</h3><p>{item.body}</p><small>{item.profiles?.username ?? "Management"} · {new Date(item.created_at).toLocaleString()}</small></div></article>}
