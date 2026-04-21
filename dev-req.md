# AOTIC CRM — Developer Setup Requirements

This document covers the manual setup steps that cannot be automated via MCP. Complete these before running the app in a production-like environment.

---

## 0. What Is Still Required Right Now (Quick Answer)

If you are asking "what API/setup is still needed", this is the current list:

1. **Required env vars in Vercel (Settings → Environment Variables)**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SHEETS_WEBHOOK_URL` (feedback submissions → Google Sheets)
2. **Twilio credentials** (only if WhatsApp send from CRM should work)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
3. **Cloudinary config** (only if job photo uploads should work)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
4. **Run all DB migrations in Supabase SQL Editor** (in order):
   - `001_initial_schema.sql` through `014_analytics_views.sql`
   - Critical post-base migrations: `002` → `003` → `004` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012` → `013` → `014`
5. **Quotation PDF branding asset**
   - Ensure logo exists at `public/logo.png` (used by quotation PDF renderer and as app favicon).

No additional external API is required for quotation PDF generation anymore.

---

## 1. Supabase Service Role Key

**Why needed:** Server actions that bypass RLS (admin-level inserts, audit log writes) require the service role key.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → your project `Aotic CRM`
2. Settings → API
3. Copy the `service_role` key (under "Project API keys")
4. Add to Vercel → Settings → Environment Variables:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<paste key here>
   ```

**Note:** Never expose this key client-side. It must only be used in server actions / route handlers.

---

## 2. Twilio — WhatsApp Integration

**Why needed:** WhatsApp messaging is built directly into the CRM. Sales executives and front-desk staff can send WhatsApp messages to customers from the lead detail page or the dedicated WhatsApp page. Without Twilio credentials, the send button shows a config error.

### 2a. Create a Twilio account

1. Go to [twilio.com](https://twilio.com) and sign up (free trial available)
2. Verify your phone number during signup

### 2b. Enable WhatsApp Sandbox (for testing) or apply for WhatsApp Business API (for production)

**For testing (sandbox):**
1. Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join the sandbox (customer must message the sandbox number first)
3. The sandbox number is usually `+1 415 523 8886`

**For production (recommended):**
1. Twilio Console → Messaging → Senders → WhatsApp senders
2. Apply for WhatsApp Business API (requires Facebook Business Manager verification)
3. Once approved, you get a dedicated WhatsApp number

### 2c. Get your Twilio credentials

1. Twilio Console → Account → Account Info
2. Copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click the eye icon to reveal)

### 2d. Add to Vercel Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> `TWILIO_WHATSAPP_FROM` is the `whatsapp:` prefixed number — use sandbox number for testing, or your approved business number for production.

**Note:** These are server-only variables (no `NEXT_PUBLIC_` prefix). They are never exposed to the browser.

### 2e. Twilio webhook (for receiving replies — optional phase 2)

To receive customer replies back in the CRM:
1. Twilio Console → WhatsApp sender → Edit
2. Set **When a message comes in** webhook URL to: `https://yourdomain.com/api/whatsapp/webhook`
3. This endpoint is not yet built — add to the roadmap for Phase 2

---

## 3. Cloudinary — Cloud Name & Upload Preset

**Why needed:** Job photo uploads (before/during/after stages) go directly from the browser to Cloudinary. Without these two values, the photo upload UI will show a configuration error.

### 3a. Create a Cloudinary account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account
2. After login, your **Cloud Name** is shown on the dashboard (top-left). Copy it.

### 3b. Create an Unsigned Upload Preset

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

### 3c. Add to Vercel Environment Variables

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your cloud name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your preset name>
```

Both values are prefixed `NEXT_PUBLIC_` because the upload happens entirely in the browser — no server secret is needed.

---

## 4. Google Sheets Feedback Webhook

**Why needed:** The floating feedback button in the CRM captures issues/suggestions along with role, browser info, console logs, and uncaught errors, then posts to Google Sheets for AI-assisted debugging.

### 4a. Apps Script setup

1. Open your Google Sheet → Extensions → Apps Script
2. Paste your `doPost(e)` script that reads the JSON body and appends a row
3. Deploy → New deployment → Web app → **Anyone** (not "Anyone with Google account")
4. Copy the deployment URL

### 4b. Add to Vercel Environment Variables

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

---

## 5. Create the First Owner Account

The app uses Supabase Auth. No self-signup flow exists — all accounts are created by an admin.

**Option A — Via SQL (for the very first owner, before any owner account exists):**
1. Go to Supabase → Authentication → Users → **Add user**
2. Enter email + password for the owner
3. Then run this SQL in Supabase → SQL Editor (replace values):

```sql
UPDATE profiles
SET role = 'owner', full_name = 'Your Name'
WHERE email = 'owner@example.com';
```

**Option B — Via the CRM (once one owner account exists):**
1. Log in as owner → go to `/manager/staff`
2. Click **Add Staff** → select role **Owner** (visible only to owners)
3. Fill in name, email, password → Create Account

---

## 6. Business Data Needed from Client

These items need to be provided by the AOTIC team before going live.

### 6a. GST Registration Number
**Used in:** Invoice PDFs, Tally export, GST report headers
**Current status:** Set in `src/lib/constants.ts` as `COMPANY.gstin`.
**Action (if changed):** Update `COMPANY.gstin` in `src/lib/constants.ts`.

### 6b. Business Logo
**Used in:** App favicon, invoice PDFs, quotation PDFs, delivery certificates
**Current status:** `public/logo.png` is used as the app favicon and quotation PDF logo.
**Action:** Replace `public/logo.png` with final production logo.

### 6c. Real Employee Phone Numbers
**Reason:** Employees were seeded with placeholder phone numbers. Used in HR/attendance features.
**Action:** Run in Supabase SQL Editor:

```sql
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'anuj@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'chayan@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'prabhu@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'shayan@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'fatima@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'mukesh@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'azeem@aotic.in';
```

### 6d. Inventory Product List
**Reason:** The inventory module is ready but has no products seeded.
**Format needed:** Excel / CSV with columns:
- `name`, `sku`, `category`, `unit`, `cost_price`, `sell_price`, `reorder_level`

### 6e. Branch / Showroom Details
```sql
INSERT INTO branches (name, city, address) VALUES
  ('AOTIC Main', 'City', 'Full address here');
```

---

## 7. Production Deployment Checklist

Deployment is via **Vercel** (connected to GitHub `main` branch — auto-deploys on every push).

| Step | Action |
|---|---|
| Set env vars | Add all vars to Vercel → Settings → Environment Variables |
| Delete seed function | Remove `seed-demo-users` edge function from Supabase Dashboard → Edge Functions |
| Enable Email Auth | Supabase → Authentication → Providers → Email → ensure "Confirm email" is OFF |
| Set site URL | Supabase → Authentication → URL Configuration → Site URL = production domain |
| Run all migrations | Run `001` through `014` in order in Supabase SQL Editor |
| Test PDF generation | Open any finalized invoice → click "Download PDF" |
| Test photo upload | Create a job card → upload a photo to verify Cloudinary config |
| Test feedback | Click the floating feedback button → verify row appears in Google Sheet |

### Activity Feed Verification (after running migrations)

```sql
select action, table_name, performed_at, notes
from audit_logs
order by performed_at desc
limit 20;
```

---

## 8. Local Dev Quick Start

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build check
```

Create `.env.local` with all vars listed in §0.

---

## 9. Status

| Requirement | Status |
|---|---|
| Supabase DB schema (001–014) | Done |
| Supabase URL + anon key | Done |
| Supabase service role key | Done |
| Vercel deployment | Done (auto-deploys from main branch) |
| Google Sheets feedback webhook | Done (needs `GOOGLE_SHEETS_WEBHOOK_URL` in Vercel) |
| Twilio WhatsApp credentials | **Pending — see §2 above** |
| Cloudinary cloud name + upload preset | **Pending — manual step above** |
| First owner account | Done (in-app via `/manager/staff` or SQL) |
| App builds without errors | Done |
| GST number | Done (configured in `src/lib/constants.ts`) |
| Business logo | Done (`public/logo.png`) |
| Real employee phone numbers | **Pending — needed from client** |
| Inventory product list | **Pending — needed from client** |
| Branch/showroom details | **Pending (optional for single branch)** |
