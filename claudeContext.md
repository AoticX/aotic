# AOTIC CRM - AI Developer Context & Progress Tracker

> **Last Updated:** 21 April 2026
> **Purpose:** This document provides AI coding assistants (like Claude) with a comprehensive overview of the AOTIC CRM project, business context, implemented features, Supabase schema state, and pending requirements.

---

## 1. Business Context & Identity
*   **Company:** AOTIC (Automotive Customization Workshop, single branch in Chennai)
*   **Partners:** Navinkumar Anuj, Chayan Bhoopat Jain
*   **GST & Finance:** Single GSTIN (Tamil Nadu): `33ACLFA6510A1Z1`, 18% GST (CGST 9% + SGST 9%)
*   **Brand Style:** #FF7000 (Orange), #2E2E2E (Dark Grey), #FFFFFF (White). Luxury, OEM+, Sporty visualization.
*   **6 Core Verticals:** 
    1. Audio & Acoustics
    2. Interior Themes & Custom Seat Designs
    3. Sun Protection Film, PPF & Detailing
    4. Base-to-Top OEM Upgrades
    5. Custom Cores (Headlights, Conversions, Body Kits)
    6. Lighting & Visibility Solutions

---

## 2. Infrastructure & Supabase State

### Stack
- **Framework:** Next.js 16.2.4, App Router, React 19
- **Database/Auth:** Supabase (Postgres + Auth)
- **Styling:** Tailwind v4 + shadcn/ui (Radix primitives)
- **Forms:** React Hook Form + Zod
- **PDFs:** pdf-lib (binary, via Supabase Edge Functions)
- **Photos:** Cloudinary (unsigned upload from browser)
- **Deployment:** Vercel (Hobby plan, auto-deploys from `main` branch)

### Environment Variables
Required in Vercel → Settings → Environment Variables:
*   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
*   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
*   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
*   `GOOGLE_SHEETS_WEBHOOK_URL` (feedback webhook — Google Apps Script deployment URL)
*   `NEXT_PUBLIC_APP_URL` (production domain)

### All Database Migrations (run in order)
| File | What it does |
|---|---|
| `001_initial_schema.sql` | Base tables, RLS, indexes, profile sync trigger |
| `002_advance_lock_to_50.sql` | Default advance updated to 50% |
| `003_lead_visibility_access_rules.sql` | RLS rules for leads |
| `004_global_activity_audit_triggers.sql` | Broad audit log coverage across tables |
| `005_activity_triggers_resilient.sql` | Resilient triggers handling optional tables |
| `006_restore_verticals_service_packages.sql` | Seeded 96 service packages |
| `007_restore_reason_masters.sql` | Seeded discount_reasons, lost_reasons |
| `008_activity_tracking_visibility_and_coverage_fix.sql` | Actor linkage and feed coverage |
| `009_payment_proof_and_settings.sql` | Added `payments.proof_url` and `system_settings` |
| `010_fix_booking_validation_trigger.sql` | Accepts both `accepted` and `approved` quotation status |
| `011_add_job_cards_profile_fkeys.sql` | Job cards foreign key relationships |
| `012_job_parts_used.sql` | `job_parts_used` table — technicians log parts used per job |
| `013_tally_invoices.sql` | `tally_invoices` table — Tally PDF uploads with WhatsApp send tracking |
| `014_analytics_views.sql` | Creates `revenue_summary_view`, `technician_performance_view`, `conversion_funnel_view` |

---

## 3. Implementation Progress Checklist

### MODULE 1 — Auth & Roles
*   [x] Secure login (email + password) via Supabase Auth
*   [x] 7 roles: `owner`, `branch_manager`, `sales_executive`, `workshop_technician`, `qc_inspector`, `accounts_finance`, `front_desk`
*   [x] Role-based route protection in `src/middleware.ts` (Edge runtime — replaced `proxy.ts`)
*   [x] RLS policies on all tables (`createServiceClient()` pattern where needed)
*   [x] Owner can create another owner via Add Staff modal (`/manager/staff`)
*   [x] Profile and attendance fixes (reactivation flow, permission grants)

### MODULE 2 — Lead Management & Sales Pipeline
*   [x] Quick lead capture form (Hot / Warm / Cold / Lost)
*   [x] Lead listing with role-based filtering (Owner sees all, Sales sees own)
*   [x] Multi-vertical selection via `lead_verticals` junction
*   [x] Manual assignment workflows
*   [x] Communication Activity Log (calls, WhatsApp, visits, notes)
*   [x] Follow-up scheduler
*   [ ] *Pending:* Lead source analytics & reporting

### MODULE 3 — Quotation Builder
*   [x] Multi-line quotation builder with auto-filled service packages (4 tiers, 4 segments)
*   [x] Discount hard-lock (≤5% auto-approved, >5% owner approval required, reason code required)
*   [x] Quotation status ladder (draft → pending_approval → approved → sent → accepted/rejected)
*   [x] Professional Quotation PDF export via Server Actions & Edge Functions
*   [x] Reliable quotation save path ensuring `service_vertical` is always mapped
*   [ ] *Pending:* Version control UI (column exists, no comparison view)
*   [ ] *Pending:* Quotation validity enforcement (expiry reminders)
*   [ ] *Pending:* Revenue leakage tracking (Quote vs Final Invoice value comparison)

### MODULE 4 — Booking & Advance Payment
*   [x] Booking created strictly from accepted/approved quotations
*   [x] Configurable Advance % (default 50%, managed in `/owner/settings` via `system_settings`)
*   [x] Manager override of advance requirement (min 20-character audit-logged reason)
*   [x] Payment methods captured with photo upload (Cloudinary) or transaction reference
*   [ ] *Pending:* Stock reservation logic at booking stage

### MODULE 5 — Job Card & Workshop Management
*   [x] Job Card Auto-Creation requiring active Technician & QC Assignment
*   [x] Vehicle intake page (`/manager/jobs/[id]/intake`) — simplified flow (odometer, condition map, reg number)
*   [x] Mobile-optimized Technician View (`/technician`) with Work Checklist
*   [x] Cloudinary photo requirements (min 4 photos, before/during/after stages)
*   [x] Time & Material tracking at job level
*   [x] "Post Update" button trigger (notifies creator, owners, managers)
*   [x] Parts used logging (`job_parts_used` table — technicians log free-text parts per job)
*   [ ] *Pending:* Per-task time tracking breakdown (currently only job-level)
*   [ ] *Pending:* Rework loop integration for technicians
*   [ ] *Pending:* Overall progress % metric on manager views based on task completion

### MODULE 6 — Quality Control
*   [x] QC mobile dashboard (`/qc`) showing assigned inspections
*   [x] Vertical-specific pass/fail/na scoring with notes
*   [x] Mandatory items requirement before sign-off
*   [x] Delivery acceptance checklist prior to vehicle release
*   [ ] *Pending:* UI to capture & display QC photos per checklist item (`photo_url` in DB, no UI)
*   [ ] *Pending:* Rework re-test workflow

### MODULE 7 — Invoicing & Payments
*   [x] Interactive Invoice Builder pre-filled from quotation items
*   [x] GST breakdown (CGST 9% + SGST 9%)
*   [x] Invoice hard-lock rules post-payment
*   [x] Delivery gate (cannot release without `amount_due = 0`)
*   [x] Invoice PDF via Edge Function
*   [x] Advance payment reconciliation mapped in invoices
*   [ ] *Pending:* GSTIN display inside Invoice UI (passed to PDF but missing in web view)
*   [ ] *Pending:* Payment split / partial payments timeline UI
*   [ ] *Pending:* Collection aging and overdue payment tracking

### MODULE 8 — Quality Certificate
*   [x] Certificate generation via edge function (`CertificateButton` on delivered job)
*   [x] Certificate list page (`/accounts/certificates`)
*   [ ] *Pending:* Auto-generation on payment + QC clearance
*   [ ] *Pending:* Sequential certificate numbering in UI

### MODULE 9 — Inventory Management
*   [x] Inventory structure UI (SKUs, categories, min stock alerts)
*   [x] Stock-in / Restock UI via `StockInModal`
*   [x] Material consumption logging from technician view
*   [x] Accounts → Materials Used page (`/accounts/materials`)
*   [ ] *Pending:* Inventory search/filter by name or SKU
*   [ ] *Pending:* Serial number tracking for SKUs
*   [ ] *Pending:* Supplier returns & customer-supplied part edge cases

### MODULE 10 — Fault and Comeback Tracking
*   [x] Fault creation forms (`fault-form.tsx`, `fault-resolution-form.tsx`)
*   [x] Issue status flows & tracking interface for Managers
*   [ ] *Pending:* Dashboard metrics (Comeback rate per 100 deliveries, etc.)

### MODULE 11 — WhatsApp Communication Log
*   [x] WhatsApp basic templates & UI (`/manager/whatsapp`, `/sales/whatsapp`)
*   [x] Basic Twilio environment integration setup
*   [x] Tally invoices WhatsApp send tracking (`tally_invoices` table)
*   [ ] *Pending:* Automated WhatsApp Business API workflow triggers (Phase 2)
*   [ ] *Pending:* Inbound reply webhooks

### MODULE 12 — Tally Export
*   [x] Tally CSV Export (13-column, date-stamped filename)
*   [x] Tally Invoices — PDF uploads linked to leads with WhatsApp send tracking
*   [ ] *Pending:* Real-time sync automation (Phase 2+)

### MODULE 13 — Dashboards and Reports
*   [x] Owner Dashboard (real-time insights, metrics, active jobs overview)
*   [x] DB Analytics Views seeded (`revenue_summary_view`, `technician_performance_view`, `conversion_funnel_view`) — migration `014`
*   [ ] *Pending:* Custom date range filters (currently all-time aggregates)
*   [ ] *Pending:* Lead source ROI and salesperson conversion funnel reports

### MODULE 14 — HR Management
*   [x] Staff list management & reactivation logic
*   [x] Basic attendance marking via `attendance-marker.tsx`
*   [x] Owner can create other owner accounts via Add Staff modal
*   [ ] *Pending:* Monthly attendance view per employee
*   [ ] *Pending:* Detailed salary records & staff payment tracking

### MODULE 15 — Feedback System
*   [x] Floating feedback button on all pages
*   [x] Captures: type, email, role, page title, URL, description, console logs, viewport, userAgent, uncaught JS errors, timestamp
*   [x] Posts to Google Sheets via Apps Script webhook (`GOOGLE_SHEETS_WEBHOOK_URL`)

### MODULE 16 — AI Intelligence Layer
*   [ ] *Pending:* AI Architecture (Sales Assistant, Insights, Follow-ups) — deferred to Phase 2

---

## 4. Core System Workflow
**Lead → Quotation → Booking → Job Card → Workshop → QC → Invoice → Delivery**
1. **Lead:** Captured, assigned, multi-vertical selected.
2. **Quotation:** Built with line items, discounts approved, PDF generated. Customer accepts (`status = 'accepted'`).
3. **Booking:** Created from quote. Advance % enforced/overridden. Payment proof uploaded.
4. **Job Card:** Tech & QC assigned. Intake form filled. Accounts notified.
5. **Workshop (Tech):** Works on checklist, posts updates, uploads stage photos (min 4, all 3 stages), logs parts used, submits for QC.
6. **QC Inspection:** Passes via vertical checklists. Fail → rework.
7. **Invoice:** Generated, advance reconciled, payments recorded. Locked upon full payment.
8. **Delivery:** Released only when `amount_due = 0`. Checklist signed.

---

## 5. Key Developer Patterns & Known Quirks

1. **Routing:** Next.js 16 App Router. Route groups `(dashboard)` and `(workshop)` do NOT appear in URLs. `/src/app/(dashboard)/sales/leads` → URL `/sales/leads`.

2. **Middleware:** Auth and role-based routing runs in `src/middleware.ts` (Edge runtime). It calls `@supabase/ssr` to refresh the session, checks `profiles.role` and `profiles.is_active`, and redirects accordingly.

3. **Component Rules:** `use server` exclusively in `src/lib/actions/*.ts`. `use client` in `src/components/**`. Server components query Supabase directly.

4. **Supabase Client Pattern — Three clients, different purposes:**

| Client | File | When to use |
|---|---|---|
| `createClient()` | `src/lib/supabase/server.ts` | Auth (`getUser()`) in server components |
| `createServiceClient()` | `src/lib/supabase/server.ts` | All data queries (bypasses RLS) |
| `createClient()` | `src/lib/supabase/client.ts` | Browser / client components |

   **Critical:** `createServiceClient()` has no session — `getUser()` returns null on it. Always get user from `createClient()` first, then use `createServiceClient()` for data:
   ```ts
   const authClient = await createClient()
   const { data: { user } } = await authClient.auth.getUser()
   const service = createServiceClient() as any
   // data queries via service
   ```

5. **Column Naming — Never Guess:**
   - `leads` → `converted_customer_id` (NOT `customer_id`)
   - `bookings` → `advance_amount`, `total_amount` (NOT `advance_value` / `total_value`)
   - `invoices` → `customer_name`, `customer_phone`, `cgst`, `sgst`, `igst`
   - `invoice_items` → `gst_rate` (default 0), `gst_amount` (default 0), `total` (default 0), nullable `line_total`

6. **Generated Columns:** `advance_pct` on `bookings` is `GENERATED ALWAYS` — never insert it.

7. **Booking Trigger:** `validate_booking_creation()` requires quotation status `IN ('accepted', 'approved')`.

8. **Quotation Items Insert:** Must always include `service_vertical` in the payload.

9. **Payment Method Enum:** Must strictly be one of: `cash, upi, card, cheque, gpay, bajaj, emi, bank_transfer`.

10. **Notifications:** Always insert into `internal_notifications` to notify owners/managers:
    ```ts
    await service.from('internal_notifications').insert({
      user_id, title, message, entity_type: 'job_card', entity_id, is_read: false,
    })
    ```

11. **Analytics:** Use existing DB views (`revenue_summary_view`, `technician_performance_view`, `conversion_funnel_view`) — never write raw aggregates for dashboards.

12. **PDFs:** Use `pdf-lib` (binary, not HTML). PDF generation runs through Supabase Edge Functions invoked from `src/lib/actions/pdfs.ts`. Use `getCompanyPdfPayload()` from `src/lib/constants.ts` when calling edge functions.

13. **Discount Lock:** ≤5% auto-approved; >5% requires `discount_reason_id` and triggers owner approval workflow.

14. **Advance Lock:** Default 50% advance. Manager/owner can override with ≥20-character audit-logged reason.

---

**End of Context**
