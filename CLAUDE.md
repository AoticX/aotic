# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run lint     # ESLint (no test suite exists)
```

No test runner is configured. There is no `test` script.

---

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET   # unsigned, uploads to aotic/jobs folder
```

---

## Architecture Overview

**Stack:** Next.js 16.2.1 App Router + Supabase (Postgres + Auth) + Tailwind v4 + shadcn/ui (Radix primitives) + React Hook Form + Zod + pdf-lib.

### Route Structure

Two App Router route groups — the group name does NOT appear in the URL:

| Route group | URL prefix | Audience |
|---|---|---|
| `src/app/(dashboard)/` | `/owner`, `/manager`, `/sales`, `/accounts`, `/front-desk` | Desktop roles |
| `src/app/(workshop)/` | `/technician`, `/qc` | Mobile-first roles |

Role → default landing route is defined in `src/lib/auth/roles.ts:ROLE_DEFAULT_ROUTES`.

Route access control runs in `src/proxy.ts` (the Next.js middleware). It checks `PROTECTED_ROUTES` from `roles.ts` and redirects unauthorised users to their default route.

### Supabase Client Pattern

There are **three clients** and it matters which one you use:

| Client | File | When to use |
|---|---|---|
| `createClient()` | `src/lib/supabase/server.ts` | Server components that need the **authenticated session** — use this for `auth.getUser()` |
| `createServiceClient()` | `src/lib/supabase/server.ts` | Server components / server actions that need to **bypass RLS** for data queries. Most data reads use this. |
| `createClient()` | `src/lib/supabase/client.ts` | Browser / client components |

**Critical rule:** `createServiceClient()` has no session, so `getUser()` returns null on it. Always call `createClient()` first to get the user, then switch to `createServiceClient()` for data:

```ts
const authClient = await createClient()
const { data: { user } } = await authClient.auth.getUser()
const service = createServiceClient() as any
// data queries via service
```

After fetching with service client, enforce access in JS:
```ts
const canAccess = isManager || record.created_by === user.id
if (!canAccess) redirect('/unauthorized')
```

### Server Actions

All `'use server'` code lives in `src/lib/actions/*.ts` — one file per domain (leads, quotations, bookings, invoices, etc.). Never put `use server` in page/component files; always create or add to the matching actions file.

### Components

`src/components/**` are all `'use client'` components, split by domain matching the actions structure. `src/components/ui/` contains the base shadcn primitives (Button, Card, Dialog, etc.).

### Validations

`src/lib/validations/index.ts` contains all Zod schemas. These mirror DB triggers and enforce the same business rules on the client side.

---

## Critical DB & Business-Logic Constraints

**Column naming — never guess:**
- `leads` uses `converted_customer_id` (NOT `customer_id` — leads have no `customer_id` column)
- `bookings` uses `advance_amount` and `total_amount` (NOT `advance_value` / `total_value`)
- `invoices` has `customer_name`, `customer_phone`, `cgst`, `sgst`, `igst`
- `invoice_items` has `gst_rate` (default 0), `gst_amount` (default 0), `total` (default 0), and nullable `line_total`

**Generated columns:** `advance_pct` on bookings is `GENERATED ALWAYS` — never insert it directly.

**Booking creation trigger:** `validate_booking_creation()` requires the linked quotation status to be `IN ('accepted', 'approved')`.

**Quotation items insert:** Must always include `service_vertical` in the payload or the constraint will fail.

**Payment method enum:** Must strictly be one of: `cash, upi, card, cheque, gpay, bajaj, emi, bank_transfer`.

**GST:** 18% total split as CGST 9% + SGST 9% (Tamil Nadu, single GSTIN: `33ACLFA6510A1Z1`).

**Discount hard-lock:** ≤5% is auto-approved; >5% requires `discount_reason_id` and triggers an owner approval workflow.

**Advance lock:** Default 50% advance required on booking. Manager/owner can override with a ≥20-character audit-logged reason.

---

## Notifications

To notify owners/managers of job events, always insert into `internal_notifications`:
```ts
await service.from('internal_notifications').insert({
  user_id,
  title,
  message,
  entity_type: 'job_card',
  entity_id,
  is_read: false,
})
```

---

## PDF Generation

PDFs use `pdf-lib` (binary, not HTML). PDF generation runs through Supabase Edge Functions invoked from server actions in `src/lib/actions/pdfs.ts`. Use `getCompanyPdfPayload()` from `src/lib/constants.ts` when calling edge functions to pass company metadata.

---

## Analytics DB Views

Do **not** write raw aggregate queries for dashboards. Use the existing DB views already seeded:
- `revenue_summary_view`
- `technician_performance_view`
- `conversion_funnel_view`

---

## Roles

7 roles: `owner`, `branch_manager`, `sales_executive`, `workshop_technician`, `qc_inspector`, `accounts_finance`, `front_desk`.

`workshop_technician` and `qc_inspector` are **mobile-first** roles (`/technician`, `/qc`). All others are desktop roles. The middleware enforces this split — mobile roles cannot access desktop routes and vice versa.

---

## Core Workflow

**Lead → Quotation → Booking → Job Card → Workshop → QC → Invoice → Delivery**

Delivery is gated: the vehicle cannot be released unless `amount_due = 0` on the invoice.
