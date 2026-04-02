# AOTIC CRM — Development Checklist (Deployment Readiness)

Last updated: 2026-04-02 (session 7)
Go-live target: First week of April

> **Status (2026-04-02 session 7)**: Branding enforced (AOTIC orange #FF7000, dark sidebar #2E2E2E). Legal entity constants centralised in `src/lib/constants.ts`.
> GSTIN `33ACLFA6510A1Z1`, address, and partners now injected into all PDF edge function calls.
> Advance payment reconciliation verified end-to-end — `createInvoice` sets `amount_paid = advance_amount`, `amount_due = total - advance`, invoice UI shows "Advance Received" line.
> Lead assignment UI (`LeadAssignSelect`) confirmed wired on lead detail for owner/manager.
> Rework flow UI (`ReworkPanel`) confirmed wired on job detail for `rework_scheduled` status.
> 3 pre-existing TypeScript build errors fixed: `car_brand` enum cast in lead forms, `inspection_done` missing from status badge.
> `npm run build` passes clean — 0 errors.

---

## Bugs Fixed (Session 7 — 2026-04-02)

| Bug | Root Cause | Fix |
|---|---|---|
| `npm run build` TypeScript error: `car_brand` in lead edit form | `defaultValues` passed `''` but schema is strict enum | Changed to `undefined` + added `as LeadInput['car_brand']` cast |
| `npm run build` TypeScript error: `car_brand` in lead create form | `onValueChange` passed `string` not enum type | Added `as LeadInput['car_brand']` cast |
| `npm run build` TypeScript error: `inspection_done` missing from status badge | DB enum has `inspection_done` but component CONFIG didn't | Added `inspection_done: { label: 'Inspection Done', variant: 'info' }` |
| `npm run build` TypeScript error: `car_brand` missing from edit page type cast | Inline type cast in edit page omitted the field | Added `car_brand: string | null` to cast |

---

## Bugs Fixed (Session 5 — 2026-04-01)

| Bug | Root Cause | Fix |
|---|---|---|
| Quotation new/edit page always shows 404 | `leads` query used non-existent `customer_id` column (correct: `converted_customer_id`) | Changed column in select query |
| Quotation page STILL 404 after column fix | `leads` RLS blocks query when using anon client in this server component context | Switched to `createServiceClient()` + explicit JS permission check (owner/manager/creator/assignee) |
| Staff management — "Staff member not found" on remove | Service client `.single()` returned null silently | Use authenticated client `.maybeSingle()` for role lookup |
| Staff management — "permission denied for table profiles" on remove | `service_role` missing DML grants | `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` |
| Staff management — "email already registered" on re-add | Auth user still exists (banned, not deleted) | Added `reactivateStaffMember` action + `ReactivateStaffButton` on inactive staff rows |
| Attendance not recording on login | Service client failed silently in signIn context | Use authenticated client + add `INSERT` RLS policy on attendance table |
| Date nav skips a day in attendance page | IST timezone offset in `new Date()` | Use `'T00:00:00Z'` + `getUTCDate/setUTCDate` |

---

## Bugs Fixed (Session 4 — 2026-03-31)

| Bug | Root Cause | Fix |
|---|---|---|
| `TypeError: Cannot destructure 'label' of CONFIG[status]` on leads page | `LeadStatusBadge` had no fallback for DB status values not in CONFIG map | Added defensive `config ?? fallback` check; shows `capitalize` badge for unknown statuses |
| Clicking a lead row does nothing (only name navigates) | Only `contact_name` `<TableCell>` had a `<Link>`; other cells had no click handler | New `LeadsTableRow` client component wraps `TableRow` with `useRouter().push()` |
| Lead create/edit only allows one vertical | `leads.vertical_id` is a single FK; form had a single `<Select>` | Added `lead_verticals` junction table; form now shows pill-style multi-select checkboxes; action inserts/replaces rows |

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
- [x] 🟢 RLS policies on all tables
- [x] 🟢 Demo accounts seeded for all 7 roles (see dev-req.md §4)
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
- [x] 🟢 `communications` table with RLS (created via migration)
- [x] 🟢 **Follow-up reminders** — `FollowUpScheduler` component on lead detail inserts into `lead_activities`; date/time picker with notes
- [x] 🟢 **Lead assignment UI** — `LeadAssignSelect` dropdown on lead detail for owner/branch_manager to reassign to any sales exec
- [x] 🟢 **Multi-vertical selection** — `lead_verticals` junction table added; create/edit forms show pill-toggle multi-select; detail page shows all verticals
- [x] 🟢 **Lead rows fully clickable** — `LeadsTableRow` client component; entire row navigates to lead detail
- [x] 🟢 **Activity log on manager/front-desk views** — `CommunicationLog` mapped and added to Job card page as well.
- [ ] 🟡 **Lead source analytics** — which channel (Instagram/Facebook/etc.) drives most revenue; no report page

---

## MODULE 3 — Quotation Builder

- [x] 🟢 Multi-line quotation builder (add/remove items)
- [x] 🟢 Service package auto-fill (vertical + tier + segment → price populated from `service_packages`)
- [x] 🟢 96 service packages seeded (6 verticals × 4 tiers × 4 segments)
- [x] 🟢 Discount hard-lock: ≤5% auto-approved, >5% → owner approval required
- [x] 🟢 Every discount requires a reason code (`discount_reasons` seeded)
- [x] 🟢 Discount approval panel on owner dashboard (shows subtotal, discount amount, total, link)
- [x] 🟢 Quotation status ladder: draft → pending_approval → approved → sent → accepted/rejected
- [x] 🟢 Edit quotation page (draft-only; replaces line items on save)
- [x] 🟢 Confirmation dialog before rejecting quotation
- [x] 🟢 **Quotation PDF** — "Download PDF" button in `QuotationActions`; calls `generate-quotation-pdf` edge function via `supabase.functions.invoke`
- [ ] 🟠 **Version control UI** — `version` column in DB but only incremented, never displayed or compared (V1 vs V2 diff)
- [ ] 🟡 **Quotation validity** — `valid_until` field captured but no expiry enforcement or reminder
- [ ] 🟡 **Revenue leakage tracking** — no comparison of quoted value vs final invoiced value

---

## MODULE 4 — Booking & Advance Payment

- [x] 🟢 Booking created from accepted quotation
- [x] 🟢 70% advance hard-lock — DB trigger + client validation
- [x] 🟢 Manager override with documented reason (≥20 chars, logged to `audit_logs`)
- [x] 🟢 Advance payment method tracking (cash/UPI/card/EMI/bank_transfer/cheque)
- [x] 🟢 Promised delivery date captured
- [x] 🟢 Booking status: confirmed → scheduled → cancelled
- [ ] 🟠 **Stock reservation on booking** — `inventory_transactions` table supports `reserve` type but booking action does not insert reservation rows; materials are not locked when job is booked
- [x] 🟢 **Advance payment visible in invoice** — advance paid at booking is reconciled in invoice: `amount_paid` set to advance at invoice creation; `amount_due` auto-reflects deduction via generated column; UI shows "Advance Received" line; PDF receives `advance_amount` param

---

## MODULE 5 — Job Card & Workshop Management

- [x] 🟢 Job card created from booking (with 70% advance re-validation)
- [x] 🟢 Vehicle intake form: reg number, odometer, fuel level, body condition map, belongings, spare parts check, customer concerns
- [x] 🟢 Intake signature (digital canvas, URL stored)
- [x] 🟢 Job status ladder: created → in_progress → pending_qc → qc_passed → rework_scheduled → ready_for_billing → ready_for_delivery → delivered
- [x] 🟢 Technician mobile view (big buttons, photo-first) at `/technician/`
- [x] 🟢 Photo upload to Cloudinary (before/during/after stages, compressed to 1MB/1920px)
- [x] 🟢 Minimum 4 photos enforced before QC transition
- [x] 🟢 Time tracking: start/stop timer per job at `/technician/timer`
- [x] 🟢 Material consumption logging (`logMaterialConsumption` action)
- [x] 🟢 Delivery sign-off with customer signature
- [ ] 🔴 **Job intake page** — `/manager/jobs/[id]/intake/page.tsx` does not exist; intake form only shown during job creation, not editable afterwards
- [x] 🟢 **Task / sub-task breakdown** — `TaskList` component on job detail; create tasks, advance status (pending → in_progress → done), shows assignee
- [ ] 🟠 **Technician assignment UI** — `assignTechnician` action exists but the button/modal on job detail is minimal; multiple technicians not well-supported from UI
- [ ] 🟠 **Rework flow** — after QC fail → `rework_scheduled` status set, but no UI to: add rework notes to technician, reassign, set rework deadline, re-trigger QC
- [ ] 🟡 **Time tracking per task** — timer logs at job level; no breakdown by sub-task
- [ ] 🟡 **Progress % display** — no completion percentage visible to manager

---

## MODULE 6 — Quality Control

- [x] 🟢 QC queue page (mobile, shows pending_qc + rework_scheduled jobs)
- [x] 🟢 Vertical-specific QC checklist templates (`qc_checklist_templates` table)
- [x] 🟢 Per-item pass/fail/na scoring with notes
- [x] 🟢 Mandatory items enforced — cannot sign off until all mandatory items scored
- [x] 🟢 Rework trigger — any fail → status → `rework_scheduled`
- [x] 🟢 Custom item addition when no templates exist (manual check point entry)
- [x] 🟢 QC sign-off timestamp and logged user
- [x] 🟢 **Delivery acceptance checklist** — `DeliverySignOff` component has 5-item checklist (cleaned, demo, invoice, warranty, old parts); all must be checked before Confirm Delivery
- [ ] 🟠 **QC photo capture** — `qc_checklist_results` has photo_url field; no photo attachment per QC item
- [ ] 🟡 **Rework re-test flow** — after rework completed, QC inspector not prompted to re-run checklist; just manually changes status

---

## MODULE 7 — Invoicing & Payments

- [x] 🟢 Invoice auto-generated from job card + quotation line items
- [x] 🟢 Invoice status: draft → finalized → partially_paid → paid
- [x] 🟢 Payment recording (amount, method, reference number, date)
- [x] 🟢 Invoice hard-lock after first payment (`is_locked = true`)
- [x] 🟢 Delivery gate — car release blocked until amount_due = 0
- [x] 🟢 Locked banner with icon shown on invoice detail
- [x] 🟢 Tally CSV export (13-column, date-stamped filename)
- [x] 🟢 **Invoice PDF** — `InvoicePdfButton` on invoice detail (finalized/partially_paid/paid); calls `generate-invoice-pdf` edge function
- [x] 🟢 **GST breakdown** — CGST @ 9% + SGST @ 9% shown separately in invoice totals section
- [x] 🟢 **Advance payment reconciliation** — booking advance reflected in invoice; `amount_paid = advance_amount`; `amount_due = total - advance`; "Advance Received" shown on invoice UI and passed to PDF
- [ ] 🟡 **Payment split / partial payments** — multiple payment recordings possible but no timeline view per invoice
- [ ] 🟡 **GST number on invoice** — GSTIN field not shown in invoice detail (per contract requirement)
- [ ] 🟡 **Collection aging** — no overdue payment tracking or aging report

---

## MODULE 8 — Quality Certificate

- [x] 🟢 **Certificate generation** — `CertificateButton` on delivered job detail; calls `generate-certificate` edge function; shown in green "Quality Certificate" panel
- [x] 🟢 **Certificate list page** — `/accounts/certificates` page lists all issued certificates with PDF links; in accounts sidebar
- [ ] 🟡 **Sequential certificate numbers** — `certificate_number` column exists; handled by edge function

---

## MODULE 9 — Inventory Management

- [x] 🟢 `inventory_items` table: name, SKU, category, unit, cost_price, selling_price, current_stock, min_stock_level
- [x] 🟢 `inventory_transactions` table: reserve/consume/return/restock/adjustment types
- [x] 🟢 Material consumption logging from technician job view
- [x] 🟢 **Inventory list page** — `/manager/inventory` page; grouped by category, shows stock, sell price
- [x] 🟢 **Add inventory item** — `InventoryItemModal` with name, SKU, category, unit, cost/sell price, min stock
- [x] 🟢 **Stock-in / restock UI** — `StockInModal` on each row; inserts `inventory_transactions` restock row + updates stock level
- [x] 🟢 **Min stock alerts** — low stock badge + warning banner when stock ≤ min_stock_level
- [ ] 🟠 **Inventory search** — no search/filter by name or SKU on inventory page
- [ ] 🟠 **Material log on job** — `logMaterialConsumption` exists but `MaterialLog` component needs verification that it reads from `inventory_items` and not a hard-coded list
- [ ] 🟡 **Serial number tracking** — flagged in DB but no UI for serial-tracked items

---

## MODULE 10 — Fault / Comeback Tracking

- [x] 🟢 **Fault log page** — `/manager/faults` page; lists all faults with severity/status badges, resolution form
- [x] 🟢 **Log a fault / comeback** — `FaultForm` on delivered job detail ("Customer Comeback?" section); category, severity, description
- [x] 🟢 **Fault resolution flow** — `FaultResolutionForm` with status progression (open → under_review → rework_scheduled → resolved)
- [x] 🟢 **Comeback rate metric** — shown in `/owner/reports/sales` technician performance table
- [ ] 🟡 **Issue categories** — `issue_categories` table exists; verify seeded with realistic AOTIC categories

---

## MODULE 11 — WhatsApp Communication Log

- [x] 🟢 Manual activity logging on lead detail (call, WhatsApp, visit, email, note)
- [x] 🟢 `communications` table with RLS (created this session)
- [x] 🟢 `whatsapp_templates` table with full schema (name, category, label, body, variables, footer, buttons)
- [x] 🟢 **WhatsApp template messages** — `/manager/whatsapp` page; shows all templates grouped by category with one-click copy-to-clipboard
- [x] 🟢 **Twilio WhatsApp send** — `sendWhatsAppMessage` server action; calls Twilio REST API, logs communication against lead
- [x] 🟢 **WhatsApp compose dialog** — `WhatsAppCompose` button on every lead detail page; template picker + custom message + sends via Twilio
- [x] 🟢 **WhatsApp Chat Interface** — full split-pane chat UI at `/sales/whatsapp`; contact list on left with search + last message preview; chat thread on right with real-time Supabase subscription; template picker with auto-fill (`{{1}}` → customer name); Enter to send; accessible to sales_executive, branch_manager, front_desk
- [x] 🟢 **Notification Bell** — real-time bell icon in TopBar for owner + branch_manager; shows pending discount approval count as red badge; click opens dropdown with approval details + link to owner dashboard
- [x] 🟢 **Activity Log** — `/manager/activity` page; all communications across all leads, grouped by date, with type icon, contact name (linked), sender, and message content
- [ ] 🟠 **WhatsApp inbox (receive replies)** — Twilio webhook endpoint not built; Phase 2 item
- [ ] 🟡 **`lead_activities` table** — `scheduled_at` and `completed_at` for follow-up scheduling; currently unused by any code

---

## MODULE 12 — Tally Export

- [x] 🟢 `TallyExportButton` component on accounts page
- [x] 🟢 CSV export: 13 columns (invoice no, date, customer, phone, subtotal, discount, tax, total, paid, due, status, payment method, ref no)
- [x] 🟢 Filters to finalized/partially_paid/paid invoices
- [x] 🟢 **Date range filter** — `TallyExportForm` with from/to date pickers on `/accounts/tally` page
- [x] 🟢 **GST breakdown in export** — GST report type exports CGST/SGST split per invoice
- [x] 🟢 **Inventory/purchase export** — 4 export types: Invoices, Payments, GST Report, Inventory Stock

---

## MODULE 13 — Dashboards & Reports

- [x] 🟢 **Manager dashboard real-time** — `ManagerRealtimeStats` client component subscribes to Supabase postgres_changes on leads, job_cards, discount_approvals; dashboard updates without page refresh
- [x] 🟢 Owner dashboard: Total Leads, Quotations, Active Jobs, Discount Approval Panel (with totals)
- [x] 🟢 Sales dashboard: Active Leads, Quotations, Bookings counts
- [x] 🟢 Accounts dashboard: Total Billed, Outstanding, Paid count, Tally export button
- [x] 🟢 Manager dashboard: Open Leads, Active Jobs, Pending QC, Pending Approvals
- [x] 🟢 DB views: `revenue_summary_view`, `profit_summary_view`, `conversion_funnel_view`, `technician_performance_view`, `daily_payments_view`, `top_used_items_view`
- [x] 🟢 **Revenue stats** — owner dashboard shows Total Collected, Outstanding, Completed Jobs from `revenue_summary_view`
- [x] 🟢 **Salesperson performance** — `/owner/reports/sales` page; leads, won, lost, conversion % per salesperson
- [x] 🟢 **Technician productivity** — `technician_performance_view` wired to reports page; jobs done, avg hours, comeback rate
- [x] 🟢 **Conversion funnel** — `conversion_funnel_view` wired to reports page; total leads → quoted → booked → job %
- [x] 🟢 **Lead source breakdown** — leads grouped by source with % share on reports page
- [ ] 🟡 **Date range filters on reports** — all-time aggregates; no weekly/monthly/custom range selector
- [ ] 🟡 **Charts/graphs** — all metrics shown as plain numbers; no bar, line, or pie charts
- [ ] 🟡 **Delivery delay tracking** — promised vs actual delivery date comparison; no report
- [ ] 🟡 **Lead source ROI** — source tracked on lead but no "Instagram brought X revenue" (requires joining leads → invoices)

---

## MODULE 14 — HR (Attendance & Salary)

- [x] 🟢 `employees` table: name, phone, role, salary, joining_date, is_active, profile_id
- [x] 🟢 `attendance` table: employee_id, date, status (present/absent/half-day), notes, marked_by
- [x] 🟢 **Attendance marking page** — `/manager/attendance`; mark P/H/A per employee with upsert (today's date)
- [x] 🟢 **Employee list page** — `/owner/hr`; staff directory from employees table (fallback to profiles if empty)
- [ ] 🟠 **Salary records** — employees table has salary field; no salary payment tracking or payslip generation
- [ ] 🟡 **Attendance report** — no monthly attendance view per employee

---

## Infrastructure & Hardening

- [x] 🟢 `npm run build` passes clean (46 routes, 0 errors, 0 warnings)
- [x] 🟢 All env vars set: Supabase + Cloudinary (cloud name + upload preset `aotic_jobs`)
- [x] 🟢 CSP/security headers in `next.config.ts` (X-Frame-Options, CSP, nosniff, referrer)
- [x] 🟢 `robots.txt` disallows all crawlers
- [x] 🟢 `.env.production.example` created
- [x] 🟢 Error boundaries: global, dashboard-level, workshop-level
- [x] 🟢 404 page
- [x] 🟢 Loading skeletons: `/(dashboard)/loading.tsx`, `/manager/jobs/[id]/loading.tsx`
- [ ] 🔴 Set production env vars on hosting platform ← **user action**
- [ ] 🟡 Delete `seed-demo-users` edge function from Supabase Dashboard ← **user action**
- [x] 🟢 PWA manifest (`/public/manifest.json`) + Apple Web App metadata in `layout.tsx`
- [ ] 🟡 `as any` type casts (~50 instances) → generate Supabase types

---

## Data & Schema

- [x] 🟢 96 service packages seeded (6 verticals × 4 tiers × 4 segments, INR pricing)
- [x] 🟢 7 demo user accounts (one per role) — see dev-req.md
- [x] 🟢 `communications` table (RLS, indexed)
- [x] 🟢 `delivery_certificates` table with all required fields
- [x] 🟢 `job_issues` / `issue_logs` tables (fault tracking)
- [x] 🟢 `attendance` / `employees` tables (HR)
- [x] 🟢 `whatsapp_templates` / `whatsapp_messages` tables
- [x] 🟢 `job_tasks` table (sub-task breakdown)
- [x] 🟢 Analytics views: `revenue_summary_view`, `technician_performance_view`, `conversion_funnel_view`, `daily_payments_view`
- [x] 🟢 11 DB migrations applied — all column mismatches between code and schema resolved
- [x] 🟢 `bookings`: added `advance_paid_at`, `branch_id`; fixed `total_value` → `total_amount`
- [x] 🟢 `payments`: `payment_mode`, `type`, `created_by` made nullable; `reference_no` → `reference_number`
- [x] 🟢 `invoices`: `customer_name`, `customer_phone` made nullable (using `customer_id` FK instead)
- [x] 🟢 `invoice_items`: `gst_rate`, `gst_amount`, `total` given default 0 (code uses `line_total`)
- [x] 🟢 `quotation_items`: added `service_package_id`, `vertical_id`, `tier`, `segment`, `discount_pct`, `line_total`, `sort_order`
- [x] 🟢 `verticals` + `lost_reasons`: added `sort_order` (seeded 1–6)
- [x] 🟢 `leads`: added `contact_email`, `car_reg_no`, `notes`, `lost_reason_id`, `lost_notes`, `lost_at`, `branch_id`
- [x] 🟢 `discount_approvals`: added `reason_id` FK, unique constraint on `quotation_id`
- [x] 🟢 **RLS CRITICAL FIX** — previous policies used `has_role(uid, role)` (2-arg, checks empty `user_roles` table); now use `has_role(role)` (1-arg, checks `profiles.role`). Manager can now see all leads/quotations.
- [x] 🟢 RLS extended — `branch_manager`, `front_desk`, `accounts_finance` added to all relevant policies
- [x] 🟢 Quotation create error redirect fixed — error now shows proper message instead of 404
- [x] 🟢 Quotation insert writes both `total`/`total_amount` and `discount_percent`/`discount_pct` for full column compatibility
- [ ] 🟡 `lost_reasons` and `issue_categories` — confirm seeded with realistic data
- [ ] 🟡 `qc_checklist_templates` — confirm seeded per vertical (6 verticals need items)

---

## What's Left (After Full Build + Schema Fixes)

### PENDING — client actions required first:
1. **GST number** — provide GSTIN for PDF documents (see dev-req.md §4a)
2. **Business logo** — PNG/SVG for PDFs (see dev-req.md §4b)
3. **Employee phone numbers** — real numbers to replace placeholders (see dev-req.md §4c)
4. **Inventory product list** — ~200 SKUs needed to populate inventory module (see dev-req.md §4d)
5. **Production env vars** on hosting platform ← **user action**
6. **Delete `seed-demo-users` edge function** from Supabase Dashboard ← **user action**

### HIGH — before beta:
1. **Advance payment reconciliation** — booking advance not reflected in invoice; customer may pay twice
2. **WhatsApp webhook (receive replies)** — Twilio webhook endpoint needed at `/api/whatsapp/webhook`; currently only outbound
- [x] 🟢 **Lead assignment dropdown** — `LeadAssignSelect` dropdown on lead detail for owner/branch_manager; calls `assignLead` server action; was already implemented in Session 5, confirmed wired Session 7
- [x] 🟢 **Rework flow UI** — `ReworkPanel` component on job detail for `rework_scheduled` status; allows notes + deadline; dispatches `startReworkCycle` action; was already implemented, confirmed wired Session 7
5. **QC checklist seeding** — `qc_checklist_templates` needs items per vertical (6 verticals)
6. **Issue categories seeding** — `issue_categories` table needs AOTIC-specific fault types

### MEDIUM — polish before stable release:
6. **Inventory search** — filter/search box on `/manager/inventory` page
7. **Salary tracking** — simple payroll records on `/owner/hr`
8. **Monthly attendance view** — per-employee attendance calendar/report
9. **Date range filters on reports** — currently all-time aggregates only
10. **GSTIN on invoice detail page** — currently not displayed

### LOW — after stable release:
11. Charts/graphs on dashboards (currently all numbers)
12. Inventory serial number tracking UI
13. WhatsApp conversations view (tables exist, no frontend)
14. `as any` → Supabase generated types (~50 instances)
