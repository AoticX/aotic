# AOTIC CRM — Developer Setup Requirements

This document covers the manual setup steps that cannot be automated via MCP. Complete these before running the app in a production-like environment.

---

## 0. What Is Still Required Right Now (Quick Answer)

If you are asking "what API/setup is still needed", this is the current list:

1. **Required env vars in hosting**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. **Twilio credentials** (only if WhatsApp send from CRM should work)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
3. **Cloudinary config** (only if job photo uploads should work)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
4. **Run latest DB migrations in Supabase SQL Editor**
   - `supabase/migrations/002_advance_lock_to_50.sql`
   - `supabase/migrations/003_lead_visibility_access_rules.sql`
   - `supabase/migrations/004_global_activity_audit_triggers.sql` (required for owner/manager all-department activity feed)
   - `supabase/migrations/005_activity_triggers_resilient.sql` (recommended final version; safely handles optional/missing tables)
5. **Quotation PDF branding asset**
   - Ensure logo exists at `public/logo.png` (used directly by app-side quotation PDF renderer).

No additional external API is required for quotation PDF generation anymore.

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

### 2d. Update `.env.local`

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

## 4. Create the First Owner Account

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

## 5. Business Data Needed from Client

These items need to be provided by the AOTIC team before going live. The app is functional without them but PDF documents and some features will be incomplete.

### 4a. GST Registration Number
**Used in:** Invoice PDFs, Tally export, GST report headers
**Format:** 15-character GSTIN (e.g., `29ABCDE1234F1Z5`)
**Current status:** Set in app constants (`src/lib/constants.ts`) and passed to PDF generators from server actions.
**Action (if changed):** Update `COMPANY.gstin` in `src/lib/constants.ts`.

### 4b. Business Logo
**Used in:** Invoice PDFs, quotation PDFs, delivery certificates
**Format:** PNG or SVG, minimum 400×150 px, transparent background preferred
**Current status:** Quotation PDF reads logo from local file `public/logo.png`.
**Action:** Replace `public/logo.png` with final production logo.
**Note:** Invoice/certificate still use edge functions, so if those functions have their own logo URL constant, keep that in sync there.

### 4c. Real Employee Phone Numbers
**Reason:** Employees were seeded with placeholder phone numbers (`0000000001` through `0000000007`). These are used in HR/attendance features.
**Action:** Run the following SQL in Supabase Dashboard → SQL Editor, replacing values:

```sql
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'anuj@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'chayan@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'prabhu@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'shayan@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'fatima@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'mukesh@aotic.in';
UPDATE employees SET phone = '+91XXXXXXXXXX' WHERE email = 'azeem@aotic.in';
```

### 4d. Inventory Product List
**Reason:** The inventory module is ready but has no products seeded.
**Format needed:** Excel / CSV with columns:
- `name` — product name
- `sku` — unique code (e.g., `PPF-001`, `TINT-3M-25`)
- `category` — e.g., `PPF`, `Window Tint`, `Ceramic Coating`, `Accessories`
- `unit` — e.g., `sqft`, `piece`, `roll`, `litre`
- `cost_price` — purchase price (Rs.)
- `sell_price` — retail price (Rs.)
- `reorder_level` — low-stock threshold quantity

**Action:** Share the list → products will be inserted via Supabase.

### 4e. Branch / Showroom Details
**Reason:** Multi-branch support is built in. If AOTIC has more than one location, provide:
- Branch name
- City
- Address

**Action:** Run in Supabase SQL Editor:
```sql
INSERT INTO branches (name, city, address) VALUES
  ('AOTIC Main', 'City', 'Full address here');
```

---

## 6. Production Deployment Checklist

Before going live on Vercel / any hosting:

| Step | Action |
|---|---|
| Set env vars | Add all `.env.local` vars to the hosting platform's environment settings |
| Delete seed function | Remove `seed-demo-users` edge function from Supabase Dashboard → Edge Functions (it was for development only) |
| Enable Email Auth | Supabase → Authentication → Providers → Email → ensure "Confirm email" is OFF for staff-invite flow |
| Set site URL | Supabase → Authentication → URL Configuration → Site URL = your production domain |
| Test PDF generation | Open any finalized invoice → click "Download PDF" to verify edge functions work |
| Test photo upload | Create a job card → upload a photo to verify Cloudinary config is correct |
| Apply post-April migrations | Run `002_advance_lock_to_50.sql`, `003_lead_visibility_access_rules.sql`, `004_global_activity_audit_triggers.sql`, and `005_activity_triggers_resilient.sql` in Supabase SQL Editor |

### Activity Feed Verification (after running migration 005)

Run this query in Supabase SQL Editor after performing a few actions in the app (create/edit lead, create quotation, status change, payment, etc.):

```sql
select action, table_name, performed_at, notes
from audit_logs
order by performed_at desc
limit 20;
```

If rows are present, owner/manager activity pages will start showing updates.

---

## 7. Local Dev Quick Start

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build check
```

---

## 8. Status

| Requirement | Status |
|---|---|
| Supabase DB schema | Done (base schema + follow-up migrations through `003`) |
| Supabase URL + anon key | Done |
| Supabase service role key | Done |
| Twilio WhatsApp credentials | **Pending — see §2 above** |
| Cloudinary cloud name + upload preset | **Pending — manual step above** |
| First owner account | Done (see user-guide.md) |
| App builds without errors | Done — 46 routes, 0 errors |
| GST number | Done (configured in `src/lib/constants.ts`) |
| Business logo | Done for quotation PDF (`public/logo.png`) |
| Real employee phone numbers | **Pending — needed from client** |
| Inventory product list | **Pending — needed from client** |
| Branch/showroom details | **Pending (optional for single branch)** |
