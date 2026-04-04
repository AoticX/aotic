# Claude Context - AOTIC CRM

Date: 2026-04-04
Generated from: codebase state + docs + current branch changes

## 1) What was implemented in this workstream

This section captures the practical changes made across the current branch and recent continuation work.

### A. Master data recovery and safety
- Restored missing master datasets using new migrations:
  - `supabase/migrations/006_restore_verticals_service_packages.sql`
  - `supabase/migrations/007_restore_reason_masters.sql`
- These are idempotent recovery migrations for:
  - `verticals`
  - `service_packages`
  - `discount_reasons`
  - `lost_reasons`

### B. Activity tracking and visibility hardening
- Added broad activity trigger coverage with actor linkage and profile name resolution:
  - `supabase/migrations/008_activity_tracking_visibility_and_coverage_fix.sql`
- Added central activity utility for feed-safe retrieval:
  - `src/lib/activity.ts`
- Updated owner/manager feeds to use resilient activity fetch path:
  - `src/app/(dashboard)/owner/page.tsx`
  - `src/app/(dashboard)/manager/page.tsx`
  - `src/app/(dashboard)/manager/activity/page.tsx`

### C. Quotation workflow updates
- Manual-first quotation pricing behavior:
  - Selecting package suggests price, but does not force unit price
  - `src/components/quotations/quotation-builder.tsx`
- Quotation creation now preloads service items from lead service verticals (while remaining editable):
  - `src/app/(dashboard)/sales/quotations/new/page.tsx`
- Proceed to booking flow link corrected:
  - `src/components/quotations/quotation-actions.tsx`

### D. Booking flow guardrails and handoff
- Booking creation now enforces permission and accepted-quote checks at server action level:
  - `src/lib/actions/bookings.ts`
- Booking new page now enforces lead ownership/assignment or manager/owner access:
  - `src/app/(dashboard)/sales/bookings/new/page.tsx`
- Booking confirmation now redirects directly to job card creation screen:
  - `src/lib/actions/bookings.ts`

### E. Job card creation ownership + assignment enforcement
- Job card creation permissions expanded to:
  - booking creator
  - manager
  - owner
- Mandatory assignment at creation:
  - technician (`assigned_to`) required and role-validated
  - QC/supervisor (`supervised_by`) required and role-validated
- Added immediate accounts notification on job card creation:
  - insert into `internal_notifications`
- Files:
  - `src/lib/actions/job-cards.ts`
  - `src/app/(dashboard)/manager/jobs/new/page.tsx`
  - `src/components/job-cards/job-card-intake-form.tsx`
  - `src/app/(dashboard)/sales/bookings/[id]/page.tsx`
  - `src/lib/auth/roles.ts`

### F. Notification bell expansion
- Bell now supports:
  - owner/manager pending discount approvals
  - accounts internal unread alerts
- Accounts notification items mark read on click.
- Files:
  - `src/components/nav/notification-bell.tsx`
  - `src/components/nav/top-bar.tsx`

### G. Technician QC photo gate tightening
- QC submission requires:
  - minimum 4 photos
  - at least one in each stage: before, during, after
- Backend readiness helper + frontend missing-stage message added.
- Files:
  - `src/lib/actions/photos.ts`
  - `src/app/(workshop)/technician/[id]/page.tsx`

### H. Intake simplification and detail UI cleanup
- Removed intake emphasis on fuel, belongings, spare-parts toggle from active capture/display surfaces.
- Files:
  - `src/components/job-cards/job-card-intake-form.tsx`
  - `src/app/(dashboard)/manager/jobs/[id]/page.tsx`
  - `src/app/(workshop)/technician/[id]/page.tsx`

### I. Quotation PDF legal footer update
- Expanded footer legal details in generated quotation PDF:
  - legal name
  - GSTIN
  - address
  - partners
- File:
  - `src/lib/actions/pdfs.ts`

### J. Docs and branding updates touched
- Docs updated in this stream:
  - `development.md`
  - `progress.md`
  - `docs/business-rules.md`
  - `docs/core-workflows.md`
  - `docs/roles-and-permissions.md`
  - `docs/user-guide.md`
- Branding assets changed:
  - `public/logo.png`
  - `public/next.svg`

## 2) How the system works right now (current behavior)

### Lead -> Quotation
1. User opens new quotation for a lead.
2. System preloads initial line items from lead vertical mappings (`lead_verticals` + fallback `leads.vertical_id`).
3. User can still add/remove/modify service lines and prices.
4. Discount rules:
   - <= 5%: normal draft flow
   - > 5%: pending owner approval

### Accepted Quotation -> Booking -> Job Card
1. On accepted quotation, Proceed to Booking opens `/sales/bookings/new?quote=...`.
2. Booking page verifies user access by role or lead ownership/assignment.
3. Booking create action re-validates access and accepted quotation status.
4. After booking confirmation, system redirects directly to `/manager/jobs/new?booking=...`.
5. Job card form requires technician + QC assignment.
6. Job card action validates assigned roles are active and valid.
7. On success:
   - job card is created
   - accounts users are notified via `internal_notifications`
   - owner/manager activity pages are revalidated

### Workshop -> QC gate
- Technician can move job to pending QC only when:
  - total stage photos >= 4
  - each stage has at least one photo

### Activity feed behavior
- Feeds use a centralized robust fetch path (`fetchRecentActivity`) and actor name lookup from `profiles`.
- Audit trigger coverage expanded to many operational tables via migration 008.

## 3) Status reconciliation with docs (development.md and progress.md)

Some backlog lines in docs are now outdated versus code.

### Items marked pending in docs but actually implemented in code
- Date range filters on owner sales reports:
  - present via `DateRangeFilter` and `from/to` query handling.
- Inventory search/filter:
  - `InventorySearchList` is used on manager inventory page.
- WhatsApp inbound webhook:
  - `src/app/api/whatsapp/webhook/route.ts` exists and persists inbound messages.
- Salary payments:
  - `src/lib/actions/salary.ts` and owner salary page/form exist.

### Items still genuinely pending or partial
- Dedicated manager job intake edit page route is still missing:
  - `src/app/(dashboard)/manager/jobs/[id]/intake/page.tsx` not found.
- Booking-time stock reservation is still not implemented at booking action level:
  - reserve logic exists during job card material handling, not booking creation.
- QC checklist item photo evidence UI is not implemented:
  - checklist form has result/notes flow but no per-item photo upload field handling.
- Quotation version comparison UX/diff view still not present.
- Quotation validity expiry automation/reminder flow still not present.
- Revenue leakage quoted-vs-invoiced analytics still not fully surfaced.

## 4) Docs alignment recommendation

The following files should be refreshed to match current code behavior:
- `development.md`
- `progress.md`
- `docs/core-workflows.md`
- `docs/user-guide.md`

Specifically update:
- accepted quotation handoff now goes directly to booking new page
- booking confirmation now routes to job card creation with mandatory assignment
- accounts internal notifications are active in top bell
- report date filter + inventory search + WhatsApp webhook + salary payments are active
- retain true pending list only for currently missing/partial features

## 5) Branch and commit context

Current implementation work was on branch:
- `test/activity-audit-feed`

Requested action from user:
- Commit all current changes to `main`

Execution performed in this run:
- Added this context file (`claudecontext.md`)
- Prepared for full commit and main merge

## 6) Validation notes

- Production builds were run repeatedly during this stream and passed.
- Latest local build status before final commit flow: passing.

