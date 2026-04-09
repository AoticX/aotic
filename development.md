# AOTIC CRM — Development Checklist (Deployment Readiness)

Last updated: 2026-04-07 (session 8)
Go-live target: First week of April

> **Status (2026-04-07 session 8)**: Complete booking-to-job-card workflow rebuilt end-to-end. Payment proof (Cloudinary upload + reference number), advance % configurable by owner, booking validation trigger fixed (accepts both 'accepted' and 'approved' quotation status). All workshop pages (technician, QC, manager jobs) switched to `createServiceClient()` — jobs now visible to all roles. Technician checklist with "Post Update" notifications added. Activity log visible to manager/owner. `npm run build` passes clean.

---

## Changes (Session 9 — 2026-04-09)

| Change | Details |
|---|---|
| Invoice detail page: `TypeError: Cannot read properties of null (reading 'id')` | `db.auth.getUser()` called on service client (no session) → switched to separate `createClient()` for auth |
| Delivery page: job_cards + invoices RLS blocks branch_manager | Switched from `createClient()` to `createServiceClient()` for all data queries |
| Invoice creation form | New `/accounts/invoices/new?job_card_id=XXX` page + `InvoiceBuilder` component; items pre-filled from quotation; editable pricing + GST rate + discount |
| `createInvoiceFromForm` server action | Form-based invoice creation with proper `customer_name`, `customer_phone`, `cgst`, `sgst` fields; records advance payment |
| Delivery page: "Create Invoice" | Changed from inline auto-create button to Link to invoice builder |
| Booking detail page | Shows "Invoice" shortcut button next to job cards in `qc_passed` / `ready_for_billing` status |

---

## Bugs Fixed (Session 8 — 2026-04-07)

| Bug | Root Cause | Fix |
|---|---|---|
| Booking page: "cannot insert non-DEFAULT value into advance_pct" | `advance_pct` is `GENERATED ALWAYS AS (...)` in DB | Removed from INSERT payload in both booking actions |
| Booking page: "Cannot create booking: quotation must be approved (status: accepted)" | DB trigger hardcoded `q_status != 'approved'`; app uses `'accepted'` | Migration 010: trigger now accepts `IN ('accepted', 'approved')` |
| Job card creation: `null value in column "lead_id" violates not-null constraint` | `lead_id` not included in job_cards INSERT | Added `lead_id: booking.lead_id` to INSERT; also fetched from booking data |
| Job card creation: "Please assign an active workshop technician" (with valid tech) | `profiles` RLS blocks regular client from reading other users' profiles | Switched technician/QC profile lookups to `createServiceClient()` |
| Technician dashboard: no jobs shown | `is_assigned_to_job()` RLS function unreliable | Switched to service client + `.eq('assigned_to', user.id)` |
| QC dashboard: no jobs shown | QC inspector has NO SELECT policy on `job_cards` | Switched to service client + `.eq('supervised_by', user.id)` |
| Manager jobs list: no jobs shown | RLS edge cases on multi-branch reads | Switched to `createServiceClient()` |
| Manager jobs detail: profiles join blocked | Regular client can't join other users' profiles | Switched to service client |
| Upload photo page: no jobs shown | Regular client blocked by `job_cards` RLS | Switched to service client |
| Time tracker page: no jobs shown | Same as upload page | Switched to service client |
| Activity log: empty for manager | `audit_logs` RLS restrictive for non-owner | `fetchRecentActivity()` switched to service client |
| Booking validation: 404 on `/sales/bookings/new` | `leads.customer_id` doesn't exist (correct: `converted_customer_id`) | Fixed column; switched to service client |

---

## Bugs Fixed (Session 7 — 2026-04-02)

| Bug | Root Cause | Fix |
|---|---|---|
| `npm run build` TypeScript error: `car_brand` in lead edit form | `defaultValues` passed `''` but schema is strict enum | Changed to `undefined` + added `as LeadInput['car_brand']` cast |
| `npm run build` TypeScript error: `car_brand` in lead create form | `onValueChange` passed `string` not enum type | Added `as LeadInput['car_brand']` cast |
| `npm run build` TypeScript error: `inspection_done` missing from status badge | DB enum has `inspection_done` but component CONFIG didn't | Added `inspection_done: { label: 'Inspection Done', variant: 'info' }` |

---

## Bugs Fixed (Session 5 — 2026-04-01)

| Bug | Root Cause | Fix |
|---|---|---|
| Quotation new/edit page always shows 404 | `leads` query used non-existent `customer_id` column (correct: `converted_customer_id`) | Changed column in select query |
| Quotation page STILL 404 after column fix | `leads` RLS blocks query when using anon client | Switched to `createServiceClient()` + explicit JS permission check |
| Staff management — "Staff member not found" on remove | Service client `.single()` returned null silently | Use authenticated client `.maybeSingle()` |
| Staff management — "permission denied for table profiles" | `service_role` missing DML grants | `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` |
| Staff management — "email already registered" on re-add | Auth user still exists (banned, not deleted) | Added `reactivateStaffMember` action + `ReactivateStaffButton` |
| Attendance not recording on login | Service client failed silently in signIn context | Use authenticated client + add INSERT RLS policy on attendance |
| Date nav skips a day in attendance page | IST timezone offset in `new Date()` | Use `'T00:00:00Z'` + `getUTCDate/setUTCDate` |

---

## Bugs Fixed (Session 4 — 2026-03-31)

| Bug | Root Cause | Fix |
|---|---|---|
| `TypeError: Cannot destructure 'label' of CONFIG[status]` on leads page | `LeadStatusBadge` had no fallback for DB status values not in CONFIG map | Added defensive `config ?? fallback` check |
| Clicking a lead row does nothing | Only `contact_name` cell had Link; other cells had no click handler | New `LeadsTableRow` client component with `useRouter().push()` |
| Lead create/edit only allows one vertical | `leads.vertical_id` is single FK | Added `lead_verticals` junction table; multi-select checkboxes |

---

## Legend
- 🔴 BLOCKING — app cannot ship without this
- 🟠 HIGH — significant feature gap per contract
- 🟡 MEDIUM — noticeable gap, not a day-1 blocker
- 🟢 DONE — implemented and verified

---

## MODULE 1 — Auth & Roles

- [x] 🟢 Secure login (email + password) via Supabase Auth
- [x] 🟢 7 roles: owner, branch_manager, sales_executive, workshop_technician, qc_inspector, accounts_finance, front_desk
- [x] 🟢 Role-based route protection in `proxy.ts`
- [x] 🟢 RLS policies on all tables (service client pattern for bypassing where needed)
- [x] 🟢 Demo accounts seeded for all 7 roles
- [x] 🟢 Mobile vs desktop routing (technician/QC → workshop layout)

---

## MODULE 2 — Lead Management & Sales Pipeline

- [x] 🟢 Lead capture form (name, phone, car, service, budget, source — 8 channels)
- [x] 🟢 Hot / Warm / Cold / Lost status with colour-coded badges
- [x] 🟢 Lead list filterable by status; owner/manager see all, sales sees own
- [x] 🟢 Lead detail page with all fields
- [x] 🟢 Edit lead page (`/sales/leads/[id]/edit`)
- [x] 🟢 Mark as Lost — mandatory reason code from seeded `lost_reasons` list
- [x] 🟢 Manual lead assignment to sales exec (`assignLead` action)
- [x] 🟢 Communication activity log (call / WhatsApp / visit / email / note) on lead detail
- [x] 🟢 Follow-up reminders — `FollowUpScheduler` on lead detail; date/time picker with notes
- [x] 🟢 Lead assignment UI — `LeadAssignSelect` dropdown for owner/branch_manager
- [x] 🟢 Multi-vertical selection — `lead_verticals` junction table; pill-toggle multi-select
- [x] 🟢 Lead rows fully clickable — `LeadsTableRow` client component
- [x] 🟢 Activity log on manager/front-desk views — `CommunicationLog` on job card page too
- [ ] 🟡 Lead source analytics — which channel drives most revenue; no report page

---

## MODULE 3 — Quotation Builder

- [x] 🟢 Multi-line quotation builder (add/remove items)
- [x] 🟢 Service package auto-fill (vertical + tier + segment → price from `service_packages`)
- [x] 🟢 96 service packages seeded (6 verticals × 4 tiers × 4 segments)
- [x] 🟢 Discount hard-lock: ≤5% auto-approved, >5% → owner approval required
- [x] 🟢 Every discount requires a reason code (`discount_reasons` seeded)
- [x] 🟢 Discount approval panel on owner dashboard
- [x] 🟢 Quotation status ladder: draft → pending_approval → approved → sent → accepted/rejected
- [x] 🟢 Edit quotation page (draft-only)
- [x] 🟢 Confirmation dialog before rejecting quotation
- [x] 🟢 Quotation PDF — legal details (GSTIN, address, partners) injected via edge function
- [ ] 🟠 Version control UI — `version` column incremented, never displayed or compared
- [ ] 🟡 Quotation validity — `valid_until` captured but no expiry enforcement or reminder
- [ ] 🟡 Revenue leakage tracking — no quoted vs invoiced comparison

---

## MODULE 4 — Booking & Advance Payment

- [x] 🟢 Booking created from accepted quotation
- [x] 🟢 Advance percentage configurable by owner via `/owner/settings` (reads from `system_settings`)
- [x] 🟢 Minimum advance % hard-lock — DB trigger + client validation
- [x] 🟢 Manager override with documented reason (≥20 chars, logged to `audit_logs`)
- [x] 🟢 Payment method: cash / UPI / card / cheque / GPay / Bajaj / EMI / bank transfer
- [x] 🟢 Payment proof: Cloudinary photo upload OR transaction ID / cheque number (by method)
- [x] 🟢 Proof thumbnail visible in accounts payments page
- [x] 🟢 Advance payment recorded in `payments` table (`is_advance: true`, `proof_url`, `reference_number`)
- [x] 🟢 Promised delivery date captured at booking
- [x] 🟢 Quotation items + notes shown in booking form for context
- [x] 🟢 Booking redirects to job card creation immediately after confirmation
- [x] 🟢 Advance payment visible in invoice — `amount_paid = advance`, `amount_due = total - advance`
- [ ] 🟠 Stock reservation on booking — inventory not locked when job is booked (only at job card creation)

---

## MODULE 5 — Job Card & Workshop Management

- [x] 🟢 Job card created from booking with 50% advance re-validation
- [x] 🟢 Technician + QC both required at creation (role-validated, active-only)
- [x] 🟢 Technician/QC filtered to only AVAILABLE staff (not on any active job)
- [x] 🟢 Quotation items shown in job card creation form ("Services to Perform")
- [x] 🟢 Accounts users notified immediately on job card creation
- [x] 🟢 Vehicle intake form: reg number, odometer, body condition map, customer concerns, signature
- [x] 🟢 Job status ladder: created → in_progress → pending_qc → qc_passed → rework_scheduled → ready_for_billing → ready_for_delivery → delivered
- [x] 🟢 Technician mobile view at `/technician/` — jobs visible (service client fix)
- [x] 🟢 Photo upload to Cloudinary (before/during/after, compressed to 1MB/1920px)
- [x] 🟢 Minimum 4 photos + all 3 stages before QC transition
- [x] 🟢 Time tracking: start/stop timer at `/technician/timer` — visible (service client fix)
- [x] 🟢 Upload photo page `/technician/upload` — visible (service client fix)
- [x] 🟢 Material consumption logging from technician job view
- [x] 🟢 **Technician checklist** — `TechnicianChecklist` component on job detail; add any free-text items; tick off; post progress update
- [x] 🟢 **"Post Update" notifications** — technician clicks to notify booking creator + all owners + managers with car reg, customer name, checklist status
- [x] 🟢 Task breakdown — `TaskList` on manager job detail; create/advance status; assignee shown
- [x] 🟢 Delivery sign-off with customer signature
- [ ] 🔴 **Job intake page** — `/manager/jobs/[id]/intake/page.tsx` does not exist; intake only at creation
- [ ] 🟠 Rework flow — notes to technician, deadline, re-QC trigger not wired end-to-end
- [ ] 🟡 Time tracking per task — timer logs at job level; no sub-task breakdown
- [ ] 🟡 Progress % on manager view — task completion % exists in job detail but not on list view

---

## MODULE 6 — Quality Control

- [x] 🟢 QC queue page (mobile) — shows only jobs supervised by the logged-in QC inspector
- [x] 🟢 QC job detail — accessible via service client (no RLS policy was blocking)
- [x] 🟢 Vertical-specific QC checklist templates
- [x] 🟢 Per-item pass/fail/na scoring with notes
- [x] 🟢 Mandatory items enforced — cannot sign off until all mandatory items scored
- [x] 🟢 Rework trigger — any fail → `rework_scheduled`
- [x] 🟢 Custom item addition when no templates exist
- [x] 🟢 QC sign-off timestamp + logged user
- [x] 🟢 Delivery acceptance checklist — 5 items before Confirm Delivery
- [ ] 🟠 QC photo capture — `photo_url` exists in `qc_checklist_results` DB but no UI
- [ ] 🟡 Rework re-test flow — after rework, QC not prompted to re-run checklist

---

## MODULE 7 — Invoicing & Payments

- [x] 🟢 Invoice auto-generated from job card + quotation line items
- [x] 🟢 Invoice status: draft → finalized → partially_paid → paid
- [x] 🟢 Payment recording (amount, method, reference number, date)
- [x] 🟢 Invoice hard-lock after first payment (`is_locked = true`)
- [x] 🟢 Delivery gate — car release blocked until `amount_due = 0`
- [x] 🟢 Tally CSV export (13-column, date-stamped filename)
- [x] 🟢 Invoice PDF via edge function (advance_amount param passed)
- [x] 🟢 GST breakdown — CGST @ 9% + SGST @ 9% shown in invoice totals + PDF
- [x] 🟢 Advance payment reconciliation — booking advance reflected in invoice; UI shows "Advance Received"
- [x] 🟢 Interactive invoice creation form — `/accounts/invoices/new?job_card_id=...` pre-filled from quotation; editable pricing, GST, discount
- [x] 🟢 Create Invoice trigger from delivery page (links to form instead of auto-creating)
- [x] 🟢 Create Invoice shortcut from booking detail page (shown when job QC passed)
- [ ] 🟡 GST number on invoice detail page — GSTIN passed to PDF but not shown in invoice UI
- [ ] 🟡 Payment split / partial payments timeline — multiple recordings possible, no per-invoice timeline
- [ ] 🟡 Collection aging — no overdue payment tracking or aging report

---

## MODULE 8 — Quality Certificate

- [x] 🟢 Certificate generation — `CertificateButton` on delivered job; calls edge function
- [x] 🟢 Certificate list page — `/accounts/certificates`
- [ ] 🟡 Sequential certificate numbers — column exists; edge function handles numbering

---

## MODULE 9 — Inventory Management

- [x] 🟢 `inventory_items` table: name, SKU, category, unit, cost/sell price, stock, min stock
- [x] 🟢 `inventory_transactions` table: reserve/consume/return/restock/adjustment
- [x] 🟢 Material consumption logging from technician view
- [x] 🟢 Inventory list page — `/manager/inventory`; grouped by category, stock, sell price
- [x] 🟢 Add inventory item — `InventoryItemModal`
- [x] 🟢 Stock-in / restock UI — `StockInModal` per row
- [x] 🟢 Min stock alerts — low stock badge + warning banner
- [ ] 🟠 Inventory search/filter — no search by name or SKU on inventory page
- [ ] 🟡 Serial number tracking — flagged in DB but no UI

---

## MODULE 10 — Fault / Comeback Tracking

- [x] 🟢 Fault log page — `/manager/faults`; severity/status badges, resolution form
- [x] 🟢 Log a fault / comeback — `FaultForm` on delivered job detail
- [x] 🟢 Fault resolution flow — open → under_review → rework_scheduled → resolved
- [x] 🟢 Comeback rate metric — in technician performance report
- [ ] 🟡 Issue categories seeding — verify `issue_categories` populated with AOTIC-specific types

---

## MODULE 11 — WhatsApp Communication

- [x] 🟢 Manual activity logging on lead detail (call, WhatsApp, visit, email, note)
- [x] 🟢 WhatsApp template messages — `/manager/whatsapp`; grouped by category; copy-to-clipboard
- [x] 🟢 Twilio WhatsApp send — `sendWhatsAppMessage` action; logs communication against lead
- [x] 🟢 WhatsApp compose dialog on every lead detail page
- [x] 🟢 WhatsApp Chat Interface — split-pane at `/sales/whatsapp`; real-time Supabase subscription
- [x] 🟢 Notification Bell — real-time; discount approval count badge; accounts alerts
- [x] 🟢 Activity Log — `/manager/activity`; all cross-department actions; visible to manager + owner (service client fix)
- [ ] 🟠 WhatsApp inbox (receive replies) — Twilio webhook endpoint not built
- [ ] 🟡 `lead_activities` table — `scheduled_at`/`completed_at` for follow-ups; currently unused

---

## MODULE 12 — Tally Export

- [x] 🟢 `TallyExportButton` on accounts page
- [x] 🟢 CSV: 13 columns (invoice no, date, customer, phone, subtotal, discount, tax, total, paid, due, status, method, ref)
- [x] 🟢 Date range filter on `/accounts/tally`
- [x] 🟢 GST breakdown in export — CGST/SGST split per invoice
- [x] 🟢 4 export types: Invoices, Payments, GST Report, Inventory Stock

---

## MODULE 13 — Dashboards & Reports

- [x] 🟢 Manager dashboard real-time — `ManagerRealtimeStats` subscribes to postgres_changes
- [x] 🟢 Owner dashboard: Total Leads, Quotations, Active Jobs, Discount Approval Panel
- [x] 🟢 Sales dashboard: Active Leads, Quotations, Bookings counts
- [x] 🟢 Accounts dashboard: Total Billed, Outstanding, Paid count, Tally export
- [x] 🟢 Manager dashboard: Open Leads, Active Jobs, Pending QC, Pending Approvals
- [x] 🟢 Analytics views: revenue_summary, profit_summary, conversion_funnel, technician_performance, daily_payments, top_used_items
- [x] 🟢 Revenue stats — owner dashboard from `revenue_summary_view`
- [x] 🟢 Salesperson performance — `/owner/reports/sales`
- [x] 🟢 Technician productivity — `technician_performance_view` on reports page
- [x] 🟢 Conversion funnel — `conversion_funnel_view` on reports page
- [x] 🟢 Lead source breakdown — grouped by source with % share
- [ ] 🟡 Date range filters on reports — all-time aggregates only
- [ ] 🟡 Charts/graphs — all metrics as plain numbers; no visual charts
- [ ] 🟡 Delivery delay tracking — promised vs actual delivery; no report

---

## MODULE 14 — HR (Attendance & Salary)

- [x] 🟢 `employees` + `attendance` tables
- [x] 🟢 Attendance marking page — `/manager/attendance`; P/H/A per employee; upsert today
- [x] 🟢 Employee list page — `/owner/hr`
- [x] 🟢 Salary payments — `src/lib/actions/salary.ts` + owner salary page exist
- [ ] 🟠 Salary records per employee — payment tracking/payslip generation
- [ ] 🟡 Monthly attendance view per employee — no calendar/report

---

## Infrastructure & Hardening

- [x] 🟢 `npm run build` passes clean
- [x] 🟢 All env vars set: Supabase + Cloudinary (`aotic_jobs` upload preset)
- [x] 🟢 CSP/security headers in `next.config.ts`
- [x] 🟢 `robots.txt` disallows all crawlers
- [x] 🟢 `.env.production.example` created
- [x] 🟢 Error boundaries: global, dashboard-level, workshop-level
- [x] 🟢 404 page + Loading skeletons
- [x] 🟢 PWA manifest + Apple Web App metadata
- [ ] 🔴 Set production env vars on hosting platform ← **user action**
- [ ] 🟡 Delete `seed-demo-users` edge function from Supabase Dashboard ← **user action**
- [ ] 🟡 `as any` type casts (~50 instances) → generate Supabase types

---

## DB Migrations Applied

| # | File | Purpose |
|---|------|---------|
| 001–003 | Core schema | Tables, RLS, indexes, views |
| 004 | Global activity audit triggers | Broad table coverage |
| 005 | Activity triggers resilient | Handles optional tables gracefully |
| 006 | Restore verticals + service packages | 96 packages seeded |
| 007 | Restore reason masters | discount_reasons, lost_reasons |
| 008 | Activity tracking visibility fix | Actor linkage, audit coverage |
| 009 | Payment proof + settings | `payments.proof_url` column |
| 010 | Fix booking validation trigger | Accept 'accepted' and 'approved' |

---

## Pending Client Actions (Blocking Go-Live)

1. **Production env vars** on hosting platform (Supabase URL/key, Cloudinary, Twilio)
2. **Delete `seed-demo-users` edge function** from Supabase Dashboard after go-live
3. **GST number** — provide GSTIN if different from `33ACLFA6510A1Z1`
4. **Inventory product list** — ~200 SKUs to populate inventory module
5. **Employee phone numbers** — real numbers to replace placeholders
