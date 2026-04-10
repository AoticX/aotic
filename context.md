# AOTIC CRM - AI Developer Context & Progress Tracker

> **Last Updated:** 10 April 2026
> **Purpose:** This document provides AI coding assistants (like Claude) with a comprehensive overview of the AOTIC CRM project, business context, implemented features, Supabase schema state, and pending requirements.

---

## 1. Business Context & Identity
*   **Company:** AOTIC (Automotive Customization Workshop, single branch in Chennai)
*   **Partners:** Navinkumar Anuj, Chayan Bhoopat Jain
*   **GST & Finance:** Single GSTIN (Tamil Nadu), 18% GST (CGST + SGST split)
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
### Environment Setup
Required `.env.local` keys:
*   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
*   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (For WhatsApp integration)
*   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (Unsigned preset: `aotic/jobs` folder)

### Database Migrations Applied
*   `001_initial_schema.sql` - Base tables, RLS, indexes
*   `002_advance_lock_to_50.sql` - Advance updated to 50%
*   `003_lead_visibility_access_rules.sql` - RLS rules for leads
*   `004_global_activity_audit_triggers.sql` - Broad audit log coverage across tables
*   `005_activity_triggers_resilient.sql` - Resilient triggers handling optional tables
*   `006_restore_verticals_service_packages.sql` - Seeded 96 packages
*   `007_restore_reason_masters.sql` - Seeded discount_reasons, lost_reasons
*   `008_activity_tracking_visibility_and_coverage_fix.sql` - Actor linkage and feed coverage repair
*   `009_payment_proof_and_settings.sql` - Added `payments.proof_url` and adjustable settings
*   `010_fix_booking_validation_trigger.sql` - Accepts both 'accepted' and 'approved'
*   `011_add_job_cards_profile_fkeys.sql` - Job cards foreign key relationships

---

## 3. Implementation Progress Checklist

### MODULE 1 — Auth & Roles
*   [x] Secure login (email + password) via Supabase Auth
*   [x] 7 roles defined (owner, branch_manager, sales_executive, workshop_technician, qc_inspector, accounts_finance, front_desk)
*   [x] Role-based route protection in `proxy.ts`
*   [x] RLS policies on all tables (using `createServiceClient()` pattern where needed)
*   [x] Profile and attendance fixes (reactivation flow, permission grants)

### MODULE 2 — Lead Management & Sales Pipeline
*   [x] Quick lead capture form (Hot / Warm / Cold / Lost)
*   [x] Lead listing with role-based filtering (Owner sees all, Sales sees own)
*   [x] Multi-vertical selection via `lead_verticals` junction
*   [x] Manual assignment workflows
*   [x] Communication Activity Log (calls, WhatsApp, visits, notes)
*   [x] Follow-up scheduler
*   [ ] *Pending:* Lead source analytics & reporting.

### MODULE 3 — Quotation Builder
*   [x] Multi-line quotation builder with auto-filled service packages (4 tiers, 4 segments)
*   [x] Discount hard-lock (≤5% auto-approved, >5% owner approval required, reason code required)
*   [x] Quotation status ladder (draft → pending_approval → approved → sent → accepted/rejected)
*   [x] Professional Quotation PDF export via Server Actions & Edge Functions (using `pdf-lib` for binary responses, embedded brand logo & legal footers)
*   [x] Reliable quotation save path ensuring `service_vertical` is always mapped
*   [ ] *Pending:* True Version Control UI display (`version` column exists but no comparison view).
*   [ ] *Pending:* Quotation validity enforcement (expiry reminders).
*   [ ] *Pending:* Revenue leakage tracking (Quote vs Final Invoice value comparison).

### MODULE 4 — Booking & Advance Payment
*   [x] Booking created strictly from accepted/approved quotations
*   [x] Configurable Advance % (default 50%, managed in `/owner/settings` via `system_settings`)
*   [x] Manager override of advance requirement (with minimum 20-character audit-logged reason)
*   [x] Payment methods captured with photo upload (Cloudinary) or transaction reference
*   [ ] *Pending:* Stock reservation logic (Inventory is currently not locked when job is booked, only at job card stage).

### MODULE 5 — Job Card & Workshop Management
*   [x] Job Card Auto-Creation requiring active Technician & QC Assignment
*   [x] Vehicle intake simplified flow (odometer, conditions map, reg number; fuel/belongings dropped for speed)
*   [x] Mobile-optimized Technician View (`/technician`) with Work Checklist
*   [x] Cloudinary photo requirements (Hardened QC gate: min 4 photos, explicitly requiring before/during/after stages)
*   [x] Time & Material tracking basics logged at job level
*   [x] "Post Update" button trigger (notifying creator, owners, managers)
*   [ ] *Pending:* True standalone **Job intake page** (`/manager/jobs/[id]/intake/page.tsx` missing, intake is only at creation).
*   [ ] *Pending:* Per-task time tracking breakdown (currently only job-level).
*   [ ] *Pending:* Rework loop integration for technicians (not fully wired).
*   [ ] *Pending:* Overall progress % metric on manager views based on task completion.

### MODULE 6 — Quality Control
*   [x] QC mobile dashboard (`/qc`) showing assigned inspections
*   [x] Vertical-specific pass/fail/na scoring with notes
*   [x] Mandatory items requirement before sign-off
*   [x] Delivery acceptance checklist prior to vehicle release
*   [ ] *Pending:* UI to capture & display QC photos per checklist item (`photo_url` is in DB but no UI).
*   [ ] *Pending:* Rework re-test workflow (triggering a fresh checklist after tech fixes a rework item).

### MODULE 7 — Invoicing & Payments
*   [x] Interactive Invoice Builder pre-filled from quotation items (pricing, GST, discounts editable)
*   [x] GST breakdown calculation (CGST 9% + SGST 9%)
*   [x] Invoice hard-lock rules post-payment
*   [x] Delivery gate (cannot release without `amount_due = 0`)
*   [x] Tally CSV Export and Invoice PDF Edge Function
*   [x] Advance payment reconciliation mapped in invoices
*   [ ] *Pending:* Visual display of the GSTIN inside the Invoice UI (currently passed to PDF but missing in web view).
*   [ ] *Pending:* Payment split / partial payments timeline UI.
*   [ ] *Pending:* Collection aging and overdue payment tracking.

### MODULE 8: Quality Certificate 
*   [x] Certificate generation via edge function (`CertificateButton` on delivered job)
*   [x] Certificate list page (`/accounts/certificates`)
*   [ ] *Pending:* Auto-generation flow triggering instantly upon payment & QC clearance.
*   [ ] *Pending:* Sequential certificate numbering implemented in UI.

### MODULE 9: Inventory Management
*   [x] Inventory structure UI (tables for displaying SKUs, categories, and min stock alerts)
*   [x] Stock-in / Restock UI via `StockInModal`
*   [x] Material consumption logging directly from the technician view
*   [ ] *Pending:* Inventory search/filter by name or SKU.
*   [ ] *Pending:* Serial number tracking for Inventory SKUs.
*   [ ] *Pending:* Supplier returns & customer-supplied part edge cases.

### MODULE 10: Fault and Comeback Tracking
*   [x] Fault creation forms (`fault-form.tsx`, `fault-resolution-form.tsx`)
*   [x] Issue status flows & tracking interface for Managers
*   [ ] *Pending:* Deeper dashboard metrics (Comeback rate per 100 deliveries, etc.)

### MODULE 11: WhatsApp Communication Log
*   [x] WhatsApp basic templates & UI (`whatsapp` / `whatsapp-chat` endpoints)
*   [x] Basic Twilio environment integration setup
*   [ ] *Pending:* Automated WhatsApp Business API workflow triggers (Phase 2).
*   [ ] *Pending:* Inbound reply webhooks connected directly into CRM (currently missing receive path).

### MODULE 12: Tally Export
*   [x] Tally CSV Export (13-column, date-stamped filename)
*   [ ] *Pending:* Automation for real-time sync (Phase 2+). 

### MODULE 13: Dashboards and Reports
*   [x] Owner Dashboard (real-time insights, metrics, active jobs overview)
*   [x] Recent Payments display & high-level counts
*   [x] DB Analytics Views (`revenue_summary_view`, `technician_performance_view`, `conversion_funnel_view` etc.) are seeded and ready for wiring.
*   [ ] *Pending:* Deep dive custom date range filters for reports (currently all-time aggregates).
*   [ ] *Pending:* Lead source ROI and salesperson conversion funnel reports.

### MODULE 14: HR Management
*   [x] Staff list management & reactivation logic (`staff-role-select.tsx`, `reactivate-staff-button.tsx`)
*   [x] Basic Attendance marking via `attendance-marker.tsx`
*   [ ] *Pending:* Monthly attendance view per employee.
*   [ ] *Pending:* Detailed salary records & staff payment tracking.

### MODULE 15: AI Intelligence Layer
*   [ ] *Pending:* AI Architecture implementation (Sales Assistant, Insights, Follow-ups). All AI features are deferred to Phase 2.

---

## 4. Core System Workflow
**Lead → Quotation → Booking → Job Card → Workshop → QC → Invoice → Delivery**
1. **Lead:** Captured, assigned, multi-vertical selected.
2. **Quotation:** Built with line items, discounts approved, PDF generated using server actions (not client) to prevent RLS failure. Customer accepts (`status = 'accepted'`).
3. **Booking:** Created from quote. Advance % enforced/overridden. Payment proof uploaded.
4. **Job Card:** Tech & QC assigned (must be available). Intake form filled (simplified: fuel/belongings removed). Accounts notified.
5. **Workshop (Tech):** Works on custom checklist, posts updates, uploads stage photos (hard-locked: min 4, across all 3 stages), submits for QC.
6. **QC Inspection:** Inspects via vertical checklists. Pass → ready for delivery. Fail → rework.
7. **Invoice:** Generated, advance reconciled, pending payments recorded. Locked upon full payment.
8. **Delivery:** Car released upon zero balance (`amount_due = 0`), checklist signed.

---

## 5. Key Developer Patterns & Known Quirks to Maintain

1. **Routing & Framework:** Next.js 16.2.1 App Router. Route groups like `(dashboard)` and `(workshop)` do NOT appear in URLs (e.g. `/src/app/(dashboard)/sales/leads` maps to `URL: /sales/leads`). 
2. **Component Rules:** `use server` exclusively in `src/lib/actions/*.ts`. `use client` in `src/components/**`. Server components query Supabase directly.
3. **Service Role Data Fetching:** Due to complex RLS, most server-side reads bypass RLS via `createServiceClient()` and enforce explicit JS checks:
   ```ts
   const service = createServiceClient() as any
   const canAccess = isManager || record.created_by === user.id
   if (!canAccess) redirect('/unauthorized')
   ```
4. **Dynamic Generation Checks:** Never insert `advance_pct` directly; it is a `GENERATED ALWAYS` Postgres column.
5. **Important Column Naming Quirks (Do not guess!):**
   * Leads use `converted_customer_id` (NOT `customer_id`, leads have no `customer_id` column).
   * Bookings use `advance_amount` and `total_amount` (NOT `advance_value` or `total_value`).
6. **Booking Trigger Statuses:** `validate_booking_creation()` requires the quotation status to be `IN ('accepted', 'approved')`.
7. **Payment Method Enums:** Must strictly use: `cash, upi, card, cheque, gpay, bajaj, emi, bank_transfer`.
8. **Notification Inserts:** Always use the `internal_notifications` table to notify owners/managers of job events:
   ```ts
   await service.from('internal_notifications').insert({ user_id, title, message, entity_type: 'job_card', entity_id, is_read: false })
   ```
9. **Supabase Edge Functions & PDFs:** Handling PDFs requires `pdf-lib` for proper binary downloads. Always query via server actions, explicitly mapping `service_vertical` to prevent RLS or constraint errors.
10. **Analytics:** Utilize existing DB views (e.g. `technician_performance_view`) when hooking up dashboards instead of creating raw aggregates.

---
**End of Context**
