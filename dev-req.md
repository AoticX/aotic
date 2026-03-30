# AOTIC CRM — Developer Setup Requirements

This document covers the manual setup steps that cannot be automated via MCP. Complete these before running the app in a production-like environment. The app runs without R2 (photo uploads will fail gracefully), but needs the Supabase service role key for server-side admin operations.

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

## 2. Cloudflare R2 — Bucket & API Credentials

**Why needed:** Job photo uploads (before/during/after stages) are stored in R2. Without this, the photo upload UI will error.

### 2a. Create the R2 bucket

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → your account → R2 Object Storage
2. Click **Create bucket**
3. Bucket name: `aotic-media`
4. Location: Auto (or `APAC` if you want closer to Mumbai)
5. Click **Create bucket**

### 2b. Enable public access (for photo display)

1. Open the `aotic-media` bucket → Settings → **Public access**
2. Enable **Allow public access**
3. Copy the public bucket URL — it will look like:
   ```
   https://pub-<hash>.r2.dev
   ```
   or a custom domain if you configure one.

### 2c. Create an R2 API token

1. R2 Object Storage → **Manage R2 API tokens** (top-right)
2. Click **Create API token**
3. Name: `aotic-crm-dev`
4. Permissions: **Object Read & Write**
5. Specify bucket: `aotic-media` (or leave as "All buckets")
6. Click **Create API token**
7. Copy:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (visible in the URL: `dash.cloudflare.com/<account_id>/r2/...`)

### 2d. Update `.env.local`

```env
R2_ACCOUNT_ID=<your cloudflare account id>
R2_ACCESS_KEY_ID=<access key id from step 2c>
R2_SECRET_ACCESS_KEY=<secret access key from step 2c>
R2_BUCKET_NAME=aotic-media
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

---

## 3. Create the First Owner Account

The app uses Supabase Auth. No self-signup flow exists — all accounts are created by an admin.

1. Go to Supabase → Authentication → Users → **Add user**
2. Enter email + password for the owner
3. Then run this SQL in Supabase → SQL Editor (replace values):

```sql
-- Set the owner's role in profiles
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
# Install dependencies (already done if cloning fresh)
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

App runs at `http://localhost:3000`. Redirects to `/login` unauthenticated.

---

## 5. Status

| Requirement | Status |
|---|---|
| Supabase DB schema | Applied (8 migrations) |
| Supabase URL + anon key in `.env.local` | Done |
| Supabase service role key | **Pending — manual step above** |
| R2 bucket created | **Pending — manual step above** |
| R2 credentials in `.env.local` | **Pending — manual step above** |
| First owner account | **Pending — manual step above** |
| App builds without errors | Done |
