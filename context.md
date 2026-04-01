# AOTIC CRM — Session Context (For Continuity)

Last updated: 2026-04-01

> **Purpose:** Every new Claude Code session must read this file first to understand the project state, architecture decisions, known pitfalls, and current bugs. This prevents re-investigating solved problems and avoids re-introducing fixed bugs.

---

## Project Overview

**AOTIC CRM** — A Next.js 15 + Supabase CRM for an automotive customization workshop.

- **Stack:** Next.js 16.2.1 (App Router, Turbopack), Supabase (Postgres + Auth + Realtime + Edge Functions), Tailwind CSS v4, shadcn/ui
- **Auth:** Supabase SSR (`@supabase/ssr@0.5.1`) with cookie-based sessions
- **ORM:** PostgREST via Supabase client — no Prisma
- **Uploads:** Cloudinary (`aotic_jobs` upload preset, `cloud_name` from env)
- **WhatsApp:** Twilio REST API (outbound only)
- **Dev server:** `npm run dev` (Next.js Turbopack)
- **DB project ID:** `wuhsfhnierlzkrpkqnan` (Supabase region: ap-south-1)

---

## File Structure (Critical Files)

```
src/
  app/
    (auth)/login/page.tsx          — Login page (client component)
    (dashboard)/layout.tsx         — Dashboard shell (sidebar, user footer, sign-out form)
    (dashboard)/sales/
      leads/[id]/page.tsx          — Lead detail (getUser() + .single() on leads)
      quotations/new/page.tsx      — New quotation (uses service client for leads query)
      quotations/[id]/edit/page.tsx — Edit quotation (uses service client for leads query)
    (dashboard)/manager/
      page.tsx                     — Manager dashboard (realtime stats)
      attendance/page.tsx          — Attendance viewer with date navigation
      staff/page.tsx               — Staff management (add/remove/reactivate)
  lib/
    supabase/server.ts             — createClient() + createServiceClient()
    auth/actions.ts                — signIn (auto-records attendance), signOut
    actions/
      staff.ts                     — createStaffMember, updateStaffRole, removeStaffMember, reactivateStaffMember
      quotations.ts                — createQuotation, updateQuotation, updateQuotationStatus, approveDiscount
      leads.ts                     — createLead (sets created_by + assigned_to = user.id)
  proxy.ts                         — Next.js middleware (session refresh + route guard)
  components/
    quotations/quotation-builder.tsx — Full quotation form (client component)
    dashboard/manager-realtime-stats.tsx — Realtime stats for manager dashboard
    hr/
      add-staff-button.tsx / add-staff-modal.tsx
      staff-role-select.tsx
      remove-staff-button.tsx
      reactivate-staff-button.tsx
```

---

## Architecture Decisions & Gotchas

### 1. Middleware is `src/proxy.ts` (NOT `middleware.ts`)
Next.js/Turbopack auto-discovers `src/proxy.ts` as middleware (compiled bundle confirms this).
It handles: session refresh, unauthenticated redirect, role-based route guarding.

**NEVER rename or move `proxy.ts`** — it IS the middleware.

### 2. `createClient()` vs `createServiceClient()`
- `createClient()` — anon key + user JWT from cookies → subject to RLS
- `createServiceClient()` — service role key → bypasses RLS entirely

**Known issue:** The `leads` table RLS doesn't reliably return rows when using `createClient()` in server components for the quotation pages (root cause TBD — possibly `auth.uid()` null in certain request paths). **Fix applied:** quotation new/edit pages use `createServiceClient()` for lead lookup + explicit JS permission check.

### 3. RLS — 1-arg vs 2-arg `has_role`
- **CORRECT:** `has_role('branch_manager'::app_role)` — 1-arg, checks `profiles.role`
- **BROKEN:** `has_role(auth.uid(), 'branch_manager'::app_role)` — 2-arg, checks empty `user_roles` table → always false

All 60+ policies were fixed in a previous session to use the 1-arg form.

### 4. `leads` Table Column Names
The `leads` table does NOT have a `customer_id` column. The correct column is `converted_customer_id` (UUID FK to customers, nullable). Always use `converted_customer_id`.

### 5. TypeScript — `as any` Pattern
The TypeScript types (`src/types/database.ts`) don't include all tables. Pattern used throughout:
```ts
const db = supabase as any
// or
const svc = createServiceClient() as any
```
This is intentional — 50+ instances exist. Do NOT try to "fix" these by generating types unless explicitly asked.

### 6. JWT Refresh in Server Components
`supabase.auth.getUser()` MUST be called before any DB query in server components. This refreshes expired access tokens. Without it, `auth.uid()` may return null in RLS.

The dashboard layout (`(dashboard)/layout.tsx`) already calls `getUser()`. But child page components each create their OWN `createClient()` instance and MUST call `getUser()` independently.

### 7. Date Navigation (UTC Safety)
When navigating dates in attendance pages, ALWAYS use UTC:
```ts
function prevDate(d: string) {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().split('T')[0]
}
```
Using local time causes IST timezone to skip days.

### 8. Staff Management — Banned vs Deleted
When removing staff: set `is_active = false` on profiles + ban auth account (`ban_duration: '87600h'`).
When reactivating: set `is_active = true` + unban (`ban_duration: 'none'`).
**NEVER** delete the auth user (causes "email already registered" when re-adding).

### 9. Attendance Auto-Record on Login
`signIn()` in `src/lib/auth/actions.ts` auto-upserts attendance for the logged-in user via the authenticated supabase client (NOT service client). Uses `onConflict: 'profile_id,date', ignoreDuplicates: true`.

### 10. Sign-Out Button Accidental Clicks
The sign-out button in `(dashboard)/layout.tsx` is a `<form action={signOut}>`. When a user is on a page and clicks sign-out, the POST goes to the CURRENT URL (e.g., `/sales/quotations/new?lead=...`). This shows up in server logs as `POST /sales/quotations/new → signOut()`. This is expected behavior, NOT a bug in the quotation page.

---

## Database Schema — Key Tables

| Table | Key Columns | Notes |
|---|---|---|
| `profiles` | id, full_name, email, phone, role, is_active, branch_id | role is `app_role` enum |
| `leads` | id, contact_name, contact_phone, vertical_id, created_by, assigned_to, status, converted_customer_id, branch_id | NO `customer_id` column |
| `quotations` | id, lead_id, customer_id, status, subtotal, discount_pct, total_amount, created_by | |
| `quotation_items` | id, quotation_id, description, quantity, unit_price, discount_pct, service_package_id, vertical_id, tier, segment | |
| `attendance` | id, profile_id, employee_id, date, status, login_time, marked_by | unique on (profile_id, date) |
| `service_packages` | id, vertical_id, tier, segment, name, base_price, is_active | 96 packages seeded |
| `verticals` | id, name, is_active, sort_order | 6 verticals |

### RLS Policies — Leads Table (SELECT)
```sql
"Creator sees own leads":         created_by = auth.uid()
"Sales exec sees assigned leads": assigned_to = auth.uid()
"Owner/Manager can see all leads": has_role('owner') OR has_role('branch_manager') OR has_role('front_desk') OR has_role('accounts_finance') OR has_role('accounts')
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Owner | owner@aotic.demo | Aotic@1234 |
| Branch Manager | manager@aotic.demo | Aotic@1234 |
| Sales Executive | sales@aotic.demo | Aotic@1234 |
| Workshop Technician | tech@aotic.demo | Aotic@1234 |
| QC Inspector | qc@aotic.demo | Aotic@1234 |
| Accounts | accounts@aotic.demo | Aotic@1234 |
| Front Desk | frontdesk@aotic.demo | Aotic@1234 |

---

## Known Bugs & Status

### FIXED ✅
| Bug | Fix Applied |
|---|---|
| Manager sees 0 leads/jobs on dashboard | All 60+ RLS policies changed from 2-arg `has_role(uid,role)` to 1-arg `has_role(role)` |
| Attendance not recording on login | Added upsert in `signIn()` using authenticated client + `INSERT` RLS policy on attendance |
| Date nav skips a day (IST timezone) | Used `'T00:00:00Z'` + `getUTCDate/setUTCDate` |
| "Staff member not found" on remove | Changed service client `.single()` to authenticated client `.maybeSingle()` for role lookup |
| "permission denied for table profiles" on remove | `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` |
| "Email already registered" when re-adding removed staff | Ban/unban instead of delete; added `reactivateStaffMember` action + button |
| Quotation new/edit page 404 (originally) | Added `getUser()` call before DB queries; changed `.single()` to `.maybeSingle()` |
| Quotation page still 404 after getUser() fix | `leads` query used non-existent `customer_id` column → changed to `converted_customer_id` |
| Quotation page STILL 404 after column fix | `leads` RLS blocks query via anon client in this context → switched to `createServiceClient()` + explicit JS permission check |
| `LeadStatusBadge` crash on unknown status | Added defensive `config ?? fallback` |
| Lead rows not clickable | Added `LeadsTableRow` client component with `useRouter().push()` |
| Single-vertical lock on lead create/edit | Added `lead_verticals` junction table + multi-select UI |

### PENDING 🔴 BLOCKING
| Bug | Details |
|---|---|
| Job intake page missing | `/manager/jobs/[id]/intake/page.tsx` does not exist |

### PENDING 🟠 HIGH
| Gap | Details |
|---|---|
| Advance payment reconciliation | Booking advance not reflected in invoice |
| WhatsApp receive (Twilio webhook) | Only outbound implemented |
| Stock reservation on booking | `inventory_transactions` supports reserve type but booking action doesn't insert reservation |
| Technician assignment UI | Multiple technicians not well-supported |
| Rework flow UI | No UI after QC fail → rework |

---

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=https://wuhsfhnierlzkrpkqnan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=aotic_jobs
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...
```

---

## Go-Live Target
First week of April 2026. Current date: 2026-04-01.
