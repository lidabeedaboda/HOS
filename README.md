# TheHeartOfStars Staff Management

A Next.js + Supabase staff portal starter for deployment on GitHub and Vercel.

## Included
- Username/password login (username mapped to an internal synthetic email)
- Four account roles: Administrator, Manager, Staff Member, Studio Director
- Role-aware dashboard navigation
- Management-only announcements
- Company-wide chat
- Moderation logger: username, user ID, Warning/Kick/Ban/PBAN, reason
- Member directory
- Supabase Row Level Security policies
- Administrator bootstrap script and protected create-user API endpoint

## Important security notes
- Never commit `.env.local` or a service-role key to GitHub.
- Do not use the password previously shared in chat as a production password. Set a new, unique password.
- The Supabase service-role key belongs only in local environment variables and Vercel server-side environment variables. It must never use a `NEXT_PUBLIC_` prefix.
- The browser currently displays a basic member directory to signed-in users because chat needs usernames. The Members page is hidden from non-managers in the interface; for stricter privacy, split public chat identity data from private staff profile data before production.
- Successful logins update `last_login_at` through a restricted Supabase function.
- The Members page includes account creation and calls the protected server-side API.
- Add rate limiting, backups, monitoring and a privacy policy before inviting a large team.

## 1. Create Supabase project
1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run all of `supabase/schema.sql`.
3. In **Authentication > Providers > Email**, disable email confirmation if it is enabled. The portal uses synthetic internal login addresses, not real email inboxes.
4. Copy the Project URL, anon/public key, and service-role key from Project Settings > API.

## 2. Configure locally
1. Install Node.js (LTS) from https://nodejs.org.
2. Extract this project and open its folder in a terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Fill in your Supabase URL, anon key and service-role key.
6. Set `ADMIN_PASSWORD` to a new, unique password of at least 12 characters.
7. Run `npm run create-admin` once to create the `ash.j` administrator.
8. Remove `ADMIN_PASSWORD` from `.env.local` after the script succeeds.
9. Run `npm run dev` and open http://localhost:3000.

## 3. Deploy to GitHub and Vercel
1. Create a new private GitHub repository.
2. Upload the project files. Do not upload `.env.local`.
3. In Vercel, choose **Add New > Project** and import the repository.
4. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.
6. Test login, chat, announcements and moderation using separate test accounts for each role.

## 4. Add staff accounts
The secure server endpoint is `POST /api/admin/create-user`.
Send a bearer token for the currently signed-in manager/administrator and JSON:
```json
{
  "username": "new.staff",
  "password": "a-new-unique-password",
  "role": "staff_member"
}
```
Managers can create Staff Member and Studio Director accounts. Administrators can also create Managers. Only an Administrator can create or promote an Administrator, and this starter intentionally does not allow creating another Administrator through the endpoint.

## Role definitions
- `administrator`: full system authority
- `manager`: member administration, announcements and moderation
- `staff_member`: dashboard, announcements, company chat
- `studio_director`: guest dashboard and company chat; not an official staff member

## Current starter limitations
This is a functional starter foundation, not a finished audited HR system. The account-creation endpoint is ready but a user-management form is not yet connected to it. Last-login display is a placeholder until the trusted login timestamp update is added. The current profile read policy is broad to support chat names; tighten it if you need private staff records.
