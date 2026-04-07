# Claude Context - AOTIC CRM

Date: 2026-04-07
Generated from: codebase state + all sessions to date

---

## 1) What was implemented across all sessions

### Session 1–4: Foundation, Auth, Leads, Quotations
- Secure login with Supabase Auth; 7 roles; role-based route protection via `proxy.ts`
- Lead capture, status management (hot/warm/cold/lost), multi-vertical selection via `lead_verticals`
- Communication log (call/WhatsApp/visit/email/note) on lead detail
- Follow-up scheduler with date/time picker
- Lead assignment dropdown for owner/branch_manager
- Full quotation builder: multi-line items, service package auto-fill, discount rules (≤5% auto, >5% owner approval)
- Quotation PDF via edge function; all legal details injected (GSTIN, address, partners)
- Quotation status ladder: draft → pending_approval → approved → sent → accepted/rejected

### Session 5: RLS & Access Fixes
- Critical RLS fix: `has_role(role)` (1-arg) vs broken `has_role(uid, role)` (2-arg)
- Quotation page 404 fixed: `leads.converted_customer_id` (not `customer_id`) + switched to `createServiceClient()`
- Staff management fixes: reactivation flow, permission grants
- Attendance recording fixed

### Session 6: Booking → Job Card Rebuild (Complete)
- **Booking form** (`src/components/bookings/booking-form.tsx`): advance amount, payment method (cash/UPI/card/cheque/GPay/Bajaj/EMI/bank_transfer), photo proof upload to Cloudinary OR reference number/transaction ID, live advance % preview, quotation items display, booking notes
- **Advance % configurable** by owner via `/owner/settings` page using `system_settings` table
- **`createBooking`** action: validates advance %, records payment in `payments` table (with `proof_url`, `reference_number`, `is_advance: true`), redirects to `/manager/jobs/new`
- **`createBookingWithOverride`** action: manager/owner can bypass advance requirement with documented reason (≥20 chars), logged to `audit_logs`
- **Booking validation trigger fixed**: `validate_booking_creation()` now accepts both `'accepted'` and `'approved'` quotation statuses (migration `010_fix_booking_validation_trigger.sql`)
- **`advance_pct` GENERATED ALWAYS** column — never inserted directly
- **Job card creation** (`src/lib/actions/job-cards.ts`): uses `createServiceClient()` for all reads to bypass RLS; includes `lead_id` in INSERT (was NOT NULL violation); validates technician (role=`workshop_technician`) and QC (role in `qc_inspector/branch_manager/owner`); notifies all `accounts_finance` users via `internal_notifications`
- **New job card page** (`/manager/jobs/new`): fetches technicians and QC filtered to only those NOT on active jobs (`ACTIVE_JOB_STATUSES`); shows "Services to Perform" from quotation items; prefills notes from booking + quotation
- **Payments table**: `proof_url` column added via migration `009_payment_proof_and_settings.sql`; accounts payments page shows clickable proof thumbnail
- **Owner settings page** (`/owner/settings`): advance percentage slider (10–100%), live preview

### Session 7: Workshop Visibility & Technician Checklist
- **RLS bypass for all workshop pages**: all job_cards reads switched to `createServiceClient()` because:
  - Technician: `is_assigned_to_job()` RLS function unreliable
  - QC inspector: NO SELECT policy existed on `job_cards`
  - Manager: RLS edge cases on multi-branch
- **Technician dashboard** (`/technician`): service client + `.eq('assigned_to', user.id)` filter
- **QC dashboard** (`/qc`): service client + `.eq('supervised_by', user.id)` filter (each QC sees their own jobs)
- **Technician `[id]` detail**: service client; also fixed upload and timer sub-pages
- **QC `[id]` detail**: service client + `supervised_by = user.id` guard
- **Manager jobs list + detail**: service client for all queries including profiles/technicians join
- **Activity log** (`src/lib/activity.ts`): `fetchRecentActivity()` switched to service client so manager/owner see full audit trail
- **Technician checklist** (`src/components/workshop/technician-checklist.tsx`): client component on tech job detail page
  - Technician adds any free-text checklist items
  - Tap circle icon to cycle pending → in_progress → done (optimistic UI)
  - **"Post Update" button** triggers `postTechnicianUpdate` server action:
    - Fetches tech name, car reg, customer name (job_cards → bookings → leads chain)
    - Builds contextual notification: "Tech posted update for Customer (REG). Checklist: X/Y done. ✓ item ○ item"
    - Sends to: booking creator + all active owners + all branch_managers
    - `revalidatePath` for both tech and manager job views
- **job-tasks actions** (`src/lib/actions/job-tasks.ts`): all switched to service client; added `postTechnicianUpdate` action

---

## 2) Established patterns (critical — always follow these)

### Service client pattern
```ts
// For ALL data reads in server components — regular client blocked by RLS for most roles
const service = createServiceClient() as any
// Then do explicit JS permission check:
const canAccess = isManager || record.created_by === user.id || ...
if (!canAccess) redirect('/...')
```

### Known column names (breaking if wrong)
- `leads.converted_customer_id` — NOT `customer_id`; leads have no `customer_id` column
- `advance_pct` on bookings is `GENERATED ALWAYS` — never insert/update this column directly
- `bookings.advance_amount`, `bookings.total_amount` — NOT `advance_value`/`total_value`

### Booking trigger
- `validate_booking_creation()` accepts `q_status IN ('accepted', 'approved')` — both are valid
- `'accepted'` = customer accepted via app workflow
- `'approved'` = owner approved high-discount quote

### Payment method enum
Valid values: `cash, upi, card, cheque, gpay, bajaj, emi, bank_transfer`

### Notification pattern
```ts
await service.from('internal_notifications').insert({
  user_id: recipientId,
  title: '...',
  message: '...',
  entity_type: 'job_card',
  entity_id: jobCardId,
  is_read: false,
})
```

---

## 3) System workflow (current state)

### Lead → Quotation → Booking → Job Card → Workshop → QC → Invoice → Delivery

1. **Lead** captured by sales exec; assigned by manager; multi-vertical
2. **Quotation** built with line items; discount rules apply; PDF generated
3. Customer accepts quotation → status becomes `'accepted'`
4. **Booking** created at `/sales/bookings/new?quote=...`:
   - Advance amount + payment method + photo proof/ref number
   - Minimum advance % enforced (configurable, default 50%)
   - Manager can override with documented reason
   - Payment recorded in `payments` table with proof
   - Redirects to `/manager/jobs/new?booking=...`
5. **Job Card** created at `/manager/jobs/new`:
   - Technician + QC both required (filtered to available staff only)
   - Body condition map, reg number, customer concerns, signature
   - Accounts team notified immediately
6. **Technician** works on job at `/technician/[id]`:
   - Builds and checks off items on **Work Checklist**
   - Posts updates (notifies booking creator + managers)
   - Uploads photos (before/during/after, min 4)
   - Tracks time
   - Submits for QC when photo gate met
7. **QC** inspects at `/qc/[id]`:
   - Runs vertical-specific checklist
   - Pass → `qc_passed` → ready for delivery
   - Fail → `rework_scheduled` → technician reworks
8. **Invoice** generated, advance reconciled, payment recorded
9. **Delivery** sign-off with checklist + customer signature

---

## 4) Files changed in sessions 6–7 (latest)

### New files
- `src/app/(dashboard)/owner/settings/page.tsx`
- `src/components/owner/advance-settings-form.tsx`
- `src/lib/actions/settings.ts`
- `src/components/workshop/technician-checklist.tsx`
- `supabase/migrations/009_payment_proof_and_settings.sql`
- `supabase/migrations/010_fix_booking_validation_trigger.sql`

### Heavily modified
- `src/components/bookings/booking-form.tsx` — complete rebuild with payment/proof flow
- `src/lib/actions/bookings.ts` — service client, payments insert, override flow
- `src/lib/actions/job-cards.ts` — service client, lead_id fix, notifications
- `src/lib/actions/job-tasks.ts` — service client, `postTechnicianUpdate` action
- `src/lib/activity.ts` — service client for audit log reads
- `src/app/(dashboard)/manager/jobs/new/page.tsx` — technician/QC filtering, quotation items
- `src/app/(dashboard)/manager/jobs/[id]/page.tsx` — service client
- `src/app/(dashboard)/manager/jobs/page.tsx` — service client
- `src/app/(workshop)/technician/page.tsx` — service client
- `src/app/(workshop)/technician/[id]/page.tsx` — service client + checklist
- `src/app/(workshop)/technician/upload/page.tsx` — service client
- `src/app/(workshop)/technician/timer/page.tsx` — service client
- `src/app/(workshop)/qc/page.tsx` — service client + supervised_by filter
- `src/app/(workshop)/qc/[id]/page.tsx` — service client + supervised_by filter
- `src/app/(dashboard)/accounts/payments/page.tsx` — proof thumbnail
- `src/components/nav/sidebar-nav.tsx` — owner settings link

---

## 5) Currently pending / known gaps

### Blocking
- `/manager/jobs/[id]/intake/page.tsx` — does not exist; intake is capture-only at creation, not editable after

### High
- QC photo capture per checklist item — `photo_url` field exists in DB but no UI
- WhatsApp inbound webhook — outbound only via Twilio, no receive path

### Medium
- Rework flow: after rework → QC inspector not prompted to re-run checklist
- Date range filters on reports (currently all-time aggregates)
- GSTIN displayed on invoice detail page (passed to PDF but not shown in UI)
- Monthly attendance view per employee

### Low
- `as any` type casts → generate Supabase types
- Charts/graphs on dashboards
- Inventory serial number tracking

---

## 6) DB migrations applied (in order)

| # | File | Purpose |
|---|------|---------|
| 001–003 | Core schema | Tables, RLS, indexes |
| 004 | Global activity audit triggers | Broad coverage across tables |
| 005 | Activity triggers resilient | Handles optional/missing tables |
| 006 | Restore verticals + service packages | 96 packages seeded |
| 007 | Restore reason masters | discount_reasons, lost_reasons |
| 008 | Activity tracking visibility fix | Actor linkage, feed coverage |
| 009 | Payment proof + settings | `payments.proof_url` column added |
| 010 | Fix booking validation trigger | Accept both 'accepted' and 'approved' |
