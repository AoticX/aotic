# AOTIC CRM — Developer Setup Requirements

This document covers the manual setup steps that cannot be automated via MCP. Complete these before running the app in a production-like environment.

---

## 1. Supabase Service Role Key

**Why needed:** Server actions that bypass RLS (admin-level inserts, audit log writes) require the service role key.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → your project `Aotic CRM`
2. Settings → API
3. Copy the `service_role` key (under "Project API keys")
4. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<paste key here>
   ```

**Note:** Never expose this key client-side. It must only be used in server actions / route handlers.

---

## 2. Cloudinary — Cloud Name & Upload Preset

**Why needed:** Job photo uploads (before/during/after stages) go directly from the browser to Cloudinary. Without these two values, the photo upload UI will show a configuration error.

### 2a. Create a Cloudinary account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account
2. After login, your **Cloud Name** is shown on the dashboard (top-left). Copy it.

### 2b. Create an Unsigned Upload Preset

Unsigned presets allow the browser to upload directly without a server-side signature — safe when combined with folder restrictions.

1. Cloudinary dashboard → **Settings** (gear icon) → **Upload**
2. Scroll to **Upload presets** → click **Add upload preset**
3. Set:
   - **Preset name:** `aotic_jobs` (or any name you prefer)
   - **Signing mode:** `Unsigned`
   - **Folder:** `aotic/jobs` (restricts uploads to this folder)
   - **Allowed formats:** `jpg, jpeg, webp` (optional but recommended)
   - **Max file size:** `2 MB` (optional)
4. Click **Save**
5. Copy the **Preset name**

### 2c. Update `.env.local`

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your cloud name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your preset name>
```

Both values are prefixed `NEXT_PUBLIC_` because the upload happens entirely in the browser — no server secret is needed.

---

## 3. Create the First Owner Account

The app uses Supabase Auth. No self-signup flow exists — all accounts are created by an admin.

1. Go to Supabase → Authentication → Users → **Add user**
2. Enter email + password for the owner
3. Then run this SQL in Supabase → SQL Editor (replace values):

```sql
UPDATE profiles
SET role = 'owner', full_name = 'Your Name'
WHERE id = '<user-uuid-from-auth-users-table>';
```

4. Repeat for other staff, using the appropriate role:
   - `branch_manager`
   - `sales_executive`
   - `workshop_technician`
   - `qc_inspector`
   - `accounts_finance`
   - `front_desk`

---

## 4. Local Dev Quick Start

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build check
```

---

## 5. Status

| Requirement | Status |
|---|---|
| Supabase DB schema | Done (8 migrations applied) |
| Supabase URL + anon key | Done |
| Supabase service role key | Done |
| Cloudinary cloud name + upload preset | **Pending — manual step above** |
| First owner account | Done (see user-guide.md) |
| App builds without errors | Done |
