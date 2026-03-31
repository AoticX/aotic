# AOTIC CRM — Phases Reference File
# For Claude: Read this at the start of every session before touching any code.

Last updated: 2026-03-30

---

## PROJECT CONTEXT

**Client**: AOTIC — automotive customisation studio, Chennai.
**Go-live target**: First week of April 2026.
**Primary contacts**: Chayan (owner/builder), Anuj Ostwal (owner), Fatima (accounts/front-desk).
**Stack**: Next.js 16.2.1 App Router (Turbopack), Supabase (Postgres + Auth + Edge Functions), Cloudinary (photos), Tailwind v4, shadcn/ui components.

---

## CRITICAL TECHNICAL FACTS

### URL Structure
- Route groups `(dashboard)` and `(workshop)` do NOT appear in URLs.
- `/src/app/(dashboard)/sales/leads/page.tsx` → URL is `/sales/leads`
- `/src/app/(workshop)/technician/page.tsx` → URL is `/technician`
- Next.js 16: middleware file is `proxy.ts`, exported function must also be named `proxy`.

### Supabase Project
- Project ID: `wuhsfhnierlzkrpkqnan`
- URL: `https://wuhsfhnierlzkrpkqnan.supabase.co`
- Cloudinary: cloud name `dmmflttph`, upload preset `aotic_jobs` (unsigned)

### 7 App Roles → Default Routes
```
owner           → /owner
branch_manager  → /manager
sales_executive → /sales
workshop_technician → /technician  (workshop layout, mobile-first)
qc_inspector    → /qc             (workshop layout, mobile-first)
accounts_finance → /accounts
front_desk      → /front-desk
```

### Demo Accounts (all exist in Supabase Auth)
| Role | Email | Password |
|------|-------|----------|
| Owner | owner@aotic.in | Aotic@2024 |
| Branch Manager | manager@aotic.in | Aotic@2024 |
| Sales Executive | sales@aotic.in | Aotic@2024 |
| Workshop Technician | tech@aotic.in | Aotic@2024 |
| QC Inspector | qc@aotic.in | Aotic@2024 |
| Accounts | accounts@aotic.in | Aotic@2024 |
| Front Desk | frontdesk@aotic.in | Aotic@2024 |

### Key Coding Patterns
- **Server components** query Supabase directly; can't pass Lucide icons or functions as props to client components.
- Use `const db = supabase as any` to bypass TypeScript until gen types are run.
- Server actions in `src/lib/actions/*.ts`, always `'use server'` at top.
- Client components in `src/components/**`, always `'use client'` at top.
- `revalidatePath()` after mutations; `redirect()` for navigation inside server actions.
- UI component library: `src/components/ui/` — button, card, badge, dialog, input, label, select, table, textarea.

### Supabase Client
- Server: `import { createClient } from '@/lib/supabase/server'` — async, uses cookies
- Browser: `import { createBrowserClient } from '@supabase/ssr'` (rarely needed)

---

## DATABASE STATE (as of 2026-03-30)

### Tables with Full DB Schema + Full Frontend Code
- `leads`, `profiles`, `verticals`, `lost_reasons`, `discount_reasons`
- `quotations`, `quotation_items`, `discount_approvals`
- `bookings`
- `job_cards`, `job_photos`, `technician_time_logs`
- `qc_records`, `qc_checklist_templates`, `qc_checklist_results`
- `invoices`, `invoice_items`, `payments`
- `service_packages` (96 rows: 6 verticals × 4 tiers × 4 segments)
- `communications` (created this project for activity log on leads)
- `audit_logs`, `override_logs`

### Tables with DB Schema but NO Frontend Code (build these)
| Table | What It Stores | Module |
|-------|---------------|--------|
| `job_tasks` | Sub-tasks per job card (title, status, assigned_to, order_index) | 5 |
| `job_issues` | Fault/comeback reports (title, description, severity, status, assigned_to, root_cause, resolution_notes, is_repeat_issue, due_at) | 10 |
| `issue_categories` | 6 categories seeded | 10 |
| `delivery_certificates` | Quality certificate (certificate_number, customer_name, vehicle_details jsonb, services_summary, qc_passed_at, pdf_url) | 8 |
| `inventory_items` | Product master (name, sku, category, unit, cost_price, selling_price, current_stock, min_stock_level) — only 1 row | 9 |
| `inventory_transactions` | Stock movements (reserve/consume/return/restock/adjustment) | 9 |
| `employees` | Staff records (name, phone, role, salary, joining_date, profile_id) — 0 rows | 14 |
| `attendance` | Daily attendance (employee_id, date, status: present/absent/half_day) | 14 |
| `lead_activities` | Follow-up scheduling (type, content, scheduled_at, completed_at) | 2 |
| `whatsapp_templates` | 11 templates seeded (see below) | 11 |
| `whatsapp_messages` | WhatsApp message log | 11 |

### Analytics Views (DB-ready, no frontend)
| View | What It Shows |
|------|--------------|
| `revenue_summary_view` | total_completed_jobs, total_revenue, total_collected, total_outstanding |
| `profit_summary_view` | Profit breakdown |
| `conversion_funnel_view` | Lead → quotation → booking → job conversion rates |
| `technician_performance_view` | Jobs per technician, avg time, comeback rate |
| `daily_payments_view` | Day-by-day payment totals |
| `top_used_items_view` | Most consumed inventory items |
| `qc_performance_view` | QC pass rate, rework rate |

### Seeded Data Status
| Table | Count | Notes |
|-------|-------|-------|
| `lost_reasons` | 8 active | Good |
| `issue_categories` | 6 | Good |
| `qc_checklist_templates` | 33 active | Across 6 verticals |
| `whatsapp_templates` | 11 active | See list below |
| `service_packages` | 96 | Complete |
| `verticals` | 6 | Complete |
| `employees` | 0 | Needs seeding |
| `inventory_items` | 1 | Needs real data from client |

### WhatsApp Templates (11 seeded, all in DB)
| name | label | category |
|------|-------|----------|
| booking_confirmed | Booking Confirmation | utility |
| job_started | Work Started | utility |
| job_update | Job Progress Update | utility |
| qc_passed | QC Passed | utility |
| ready_for_delivery | Ready for Pickup | utility |
| certificate_ready | Certificate Ready | utility |
| payment_reminder | Payment Reminder | utility |
| quotation_sent | Quotation Shared | utility |
| lead_welcome | Welcome Message | marketing |
| follow_up | Follow Up | marketing |
| feedback_request | Feedback Request | marketing |
All use `{{1}}`, `{{2}}`, etc. as variable placeholders.

### Edge Functions (Deployed on Supabase — NOT yet called from app code)
| Slug | Purpose | Where to Wire |
|------|---------|--------------|
| `generate-quotation-pdf` | Generate PDF for a quotation | Quotation detail page |
| `generate-invoice-pdf` | Generate PDF for an invoice | Invoice detail page |
| `generate-certificate` | Generate quality certificate PDF | Job detail page (post QC + payment) |
| `send-whatsapp-message` | Send WhatsApp via API | WhatsApp templates UI |
| `ai-analyze` | AI analysis | Owner dashboard (optional) |
| `ai-chat` | AI chatbot | Owner dashboard (optional) |

To call an edge function from a server action:
```ts
const supabase = await createClient()
const { data, error } = await supabase.functions.invoke('generate-quotation-pdf', {
  body: { quotation_id: id }
})
```

---

## COMPONENT INVENTORY

### Existing UI Components (`src/components/ui/`)
`badge, button, card, dialog, input, label, select, table, textarea`

### Existing Feature Components
| Component | Path | Purpose |
|-----------|------|---------|
| `LeadForm` | components/leads/lead-form.tsx | New lead creation |
| `LeadEditForm` | components/leads/lead-edit-form.tsx | Edit existing lead |
| `LeadStatusChanger` | components/leads/lead-status-changer.tsx | Status dropdown + lost modal |
| `LostReasonModal` | components/leads/lost-reason-modal.tsx | Required when marking lost |
| `CommunicationLog` | components/leads/communication-log.tsx | Activity log on lead detail |
| `QuotationBuilder` | components/quotations/quotation-builder.tsx | Multi-line quote builder |
| `QuotationActions` | components/quotations/quotation-actions.tsx | Status buttons + reject confirm |
| `DiscountApprovalPanel` | components/quotations/discount-approval-panel.tsx | Owner approves discounts |
| `BookingForm` | components/bookings/booking-form.tsx | Create booking |
| `AdvanceOverrideModal` | components/bookings/advance-override-modal.tsx | Manager 70% override |
| `JobCardIntakeForm` | components/job-cards/job-card-intake-form.tsx | Vehicle intake |
| `DeliverySignOff` | components/job-cards/delivery-sign-off.tsx | Customer signature on delivery |
| `SignaturePad` | components/job-cards/signature-pad.tsx | Canvas signature capture |
| `BodyConditionMap` | components/job-cards/body-condition-map.tsx | Visual car damage map |
| `JobTimer` | components/workshop/job-timer.tsx | Start/stop timer |
| `MaterialLog` | components/workshop/material-log.tsx | Log material usage |
| `PhotoUploader` | components/workshop/photo-uploader.tsx | Cloudinary upload (compressed) |
| `QcChecklistForm` | components/qc/qc-checklist-form.tsx | QC inspection form |
| `PaymentForm` | components/invoices/payment-form.tsx | Record payment |
| `TallyExportButton` | components/invoices/tally-export-button.tsx | CSV export |

### Server Actions (`src/lib/actions/`)
`leads.ts, quotations.ts, bookings.ts, job-cards.ts, qc.ts, invoices.ts, photos.ts, materials.ts, time-logs.ts, communications.ts`

---

## BUSINESS RULES (Hard Locks — never bypass)
1. **70% advance** — DB trigger `enforce_advance_before_job_card` blocks job card creation
2. **4 min photos** — `moveToQcPending` checks photo count before QC transition
3. **QC gate** — job status cannot go to `ready_for_billing` without `qc_signed_off_at` set
4. **Payment gate** — `markReadyForDelivery` checks `amount_due = 0`
5. **Invoice lock** — `is_locked = true` after first payment; edit blocked
6. **Discount >5%** — auto-sets status `pending_approval`; owner must approve
7. **Every discount** — requires a `discount_reason_id`
8. **Lost lead** — requires `lost_reason_id`

---

## PHASES OVERVIEW

| Phase | Name | Est. Days | Status |
|-------|------|-----------|--------|
| A | PDF & Documents | 2 | ⬜ Not started |
| B | Inventory Management UI | 2 | ⬜ Not started |
| C | Fault / Comeback Tracking | 1 | ⬜ Not started |
| D | Follow-up Reminders & WhatsApp Templates | 1 | ⬜ Not started |
| E | Analytics & Reports | 2 | ⬜ Not started |
| F | HR — Attendance & Salary | 1 | ⬜ Not started |
| G | Job Task Breakdown | 1 | ⬜ Not started |
| H | Polish & Production Hardening | 2 | ⬜ Not started |

**Total estimated: ~12 days of focused work**

---

## PHASE A — PDF & Documents

**Goal**: Wire the 3 deployed edge functions. No new DB work needed.

### A1 — Quotation PDF
- File to modify: `src/app/(dashboard)/sales/quotations/[id]/page.tsx`
- Add a "Download PDF" button that calls `supabase.functions.invoke('generate-quotation-pdf', { body: { quotation_id: id } })`
- Response should return `{ pdf_url }` — open in new tab or trigger download
- Must be a client component button (needs `useState` for loading)

### A2 — Invoice PDF
- File to modify: `src/app/(dashboard)/accounts/invoices/[id]/page.tsx`
- Same pattern as A1 but calls `generate-invoice-pdf` with `{ invoice_id: id }`
- Only show button when invoice status is `finalized` or `paid`

### A3 — Quality Certificate
- New page: `src/app/(dashboard)/accounts/certificates/page.tsx` — list all certificates
- Button on job detail (`/manager/jobs/[id]/page.tsx`) — shows after `qc_passed_at` is set AND invoice is paid
- Calls `generate-certificate` with `{ job_card_id: id }`
- Inserts row into `delivery_certificates` with certificate_number, pdf_url
- Certificate number format: sequential (query MAX(certificate_number) + 1)
- Also needs link from owner/accounts to view certificate list

---

## PHASE B — Inventory Management UI

**Goal**: Build inventory pages using existing `inventory_items` + `inventory_transactions` tables.

### B1 — Inventory List Page
- New page: `src/app/(dashboard)/manager/inventory/page.tsx`
- Table: SKU, name, category, unit, current_stock, min_stock_level, status (low/ok)
- Low stock = current_stock < min_stock_level → show amber badge
- Search/filter by category
- Role access: owner, branch_manager, accounts_finance

### B2 — Add/Edit Inventory Item
- Modal or page for creating a new SKU
- Fields: name, SKU, category, unit, cost_price, selling_price, current_stock, min_stock_level
- Server action: `createInventoryItem`, `updateInventoryItem`

### B3 — Stock-In (Restock) Form
- Button on inventory item row: "Add Stock"
- Fields: quantity, notes
- Server action: inserts `inventory_transactions` row with type='restock', updates `inventory_items.current_stock`

### B4 — Material Picker on Job Card
- In technician job view, when logging material consumption, show searchable dropdown of `inventory_items` (not hardcoded)
- Current `MaterialLog` component needs to be verified and fixed to use `inventory_items` table

### B5 — Sidebar Nav Update
- Add "Inventory" link to manager sidebar → `/manager/inventory`

---

## PHASE C — Fault / Comeback Tracking

**Goal**: Build fault logging UI using `job_issues` + `issue_categories` tables.

### C1 — Log Fault Form
- New component: `src/components/faults/fault-form.tsx`
- Triggered from job detail page for delivered jobs
- Fields: title, description, category_id (dropdown from `issue_categories`), severity (low/medium/high/critical), assigned_to, due_at
- Server action: `logJobIssue` → inserts into `job_issues`

### C2 — Fault List Page
- New page: `src/app/(dashboard)/manager/faults/page.tsx`
- Table: job reg number, title, severity, status, assigned_to, due_at, created_at
- Status filter: reported → under_review → rework_scheduled → resolved → closed
- Role access: owner, branch_manager

### C3 — Fault Detail / Resolution
- Clicking a fault → modal or page showing full details
- Manager can update status, add root_cause, resolution_notes
- Server action: `updateJobIssue`

### C4 — Sidebar Nav Update
- Add "Faults" link to manager sidebar → `/manager/faults`

---

## PHASE D — Follow-up Reminders & WhatsApp Templates

**Goal**: Schedule follow-ups on leads; show WhatsApp templates as copy-paste cards.

### D1 — Follow-up Scheduler on Lead
- Add "Schedule Follow-up" button on lead detail
- Modal: type (call/whatsapp/visit), scheduled_at datetime, content/notes
- Server action: `scheduleFollowUp` → inserts into `lead_activities` with scheduled_at
- Show upcoming follow-ups as a list on lead detail below communication log

### D2 — Overdue Follow-ups on Manager Dashboard
- Query `lead_activities` where `scheduled_at < now()` AND `completed_at IS NULL`
- Show count badge + list on manager dashboard

### D3 — WhatsApp Template Viewer
- New component: `src/components/whatsapp/template-cards.tsx`
- Shows all 11 templates as cards with label, body (with variable slots highlighted), copy button
- Copy button fills variables with lead/customer/job data and copies to clipboard
- Appears on lead detail page in a "WhatsApp" tab or section
- No API call needed — purely copy-paste workflow for now

---

## PHASE E — Analytics & Reports

**Goal**: Wire existing DB views to frontend pages. No new DB work needed.

### E1 — Owner Dashboard Revenue MTD
- Query `revenue_summary_view` → replace "—" with real total_revenue, total_collected, total_outstanding
- Add today's enquiries count (leads created today), today's bookings, today's collections

### E2 — Salesperson Performance Page
- New page: `src/app/(dashboard)/owner/reports/sales/page.tsx`
- Query: leads created by user, quotations created, bookings closed, revenue generated, avg discount %
- Date range picker (this week / this month / custom)
- Table: salesperson name, leads, quotations, bookings, revenue, avg discount

### E3 — Technician Performance Page
- New page: `src/app/(dashboard)/manager/reports/technicians/page.tsx`
- Query `technician_performance_view` or raw: jobs per technician, avg time per job, rework count
- Date range filter

### E4 — Tally Export Date Range
- Add date picker to `TallyExportButton` → filter invoices by date range
- Modify `exportTallyCsv` action to accept `from` and `to` date params

---

## PHASE F — HR: Attendance & Salary

**Goal**: Build HR pages using `employees` + `attendance` tables. Seed employees from real staff.

### F1 — Employee List Page
- New page: `src/app/(dashboard)/owner/hr/page.tsx`
- Table: name, role, phone, salary, joining_date, is_active
- "Add Employee" button → form with all fields + optional profile_id link

### F2 — Attendance Marking Page
- New page: `src/app/(dashboard)/manager/attendance/page.tsx`
- Shows today's date, lists all active employees
- Each row: employee name, toggle present/absent/half_day
- Server action: `markAttendance` → upserts into `attendance` for today's date

### F3 — Monthly Attendance Report
- New page or section on HR page
- Month picker → shows grid: employees × days with P/A/HD cells
- Server action: query attendance for selected month

### F4 — Seed Employees (Supabase MCP)
Real staff per questionnaire:
- Anuj Ostwal, Chayan → owner
- Mr. Prabhu → branch_manager
- Shayan, Prabhu (temp) → sales_executive
- Mukesh, Azeem → workshop_technician
- Fatima → accounts_finance + front_desk

---

## PHASE G — Job Task Breakdown

**Goal**: Build sub-task management on job cards using `job_tasks` table.

### G1 — Task List on Job Detail
- On manager job detail (`/manager/jobs/[id]/page.tsx`), show task list section
- Manager can add tasks: title, description, assign to technician, order_index
- Server action: `createJobTask`, `updateJobTaskStatus`

### G2 — Task View for Technician
- On technician job detail (`/technician/[id]/page.tsx`), show assigned tasks
- Technician can mark task as in_progress / done
- Server action: `completeJobTask`

---

## PHASE H — Polish & Production Hardening

### H1 — Advance Payment Reconciliation
- Booking advance (paid at booking stage) must appear in invoice
- Invoice payment summary should show: total amount, advance paid (from booking), balance due
- Query `bookings.advance_amount` when loading invoice detail

### H2 — Delivery Checklist (per contract)
- Before delivery sign-off, show checklist: car cleaned ✓, demo given ✓, invoice explained ✓, warranty card handed ✓, old parts returned ✓
- Already in `DeliverySchema` validation — just needs UI rendering in `DeliverySignOff` component

### H3 — GST Field on Invoice
- Show GSTIN on invoice detail (fetch from `system_settings` or hardcode from env)
- Add GST rate selector (18% / 28%) to quotation; auto-compute CGST + SGST split

### H4 — PWA Manifest + Favicon
- `public/manifest.json` with AOTIC branding
- `public/favicon.ico` + `public/icon-192.png`, `public/icon-512.png`
- Add `<link rel="manifest">` to layout head

### H5 — Tally Export Date Range
- Already in Phase E4 — consolidate here if E4 not done

### H6 — Delete `seed-demo-users` Edge Function
- Manual: Supabase Dashboard → Edge Functions → seed-demo-users → Delete

---

## WHAT YOU NEED FROM THE CLIENT

Items that require client input before code can be completed:

1. **GST Number** — for invoice/certificate display
2. **AOTIC Logo file** — for favicon, certificate PDF header, invoice PDF header
3. **Inventory product list** — ~200 SKUs with name, unit, cost price, selling price
4. **QC checklist items per vertical** — already have 33, but client should verify
5. **Employees real names confirmed** — Anuj, Chayan, Prabhu, Shayan, Mukesh, Azeem, Fatima — confirm phone numbers and salary for HR module
6. **Brand color** — primary color for PWA manifest, PDF branding

---

## HOW TO START EACH PHASE

When beginning a new phase, always:
1. Read this file (`phases.md`) first
2. Read `development.md` to check current state of checkboxes
3. Read the specific files listed in the phase plan above before editing
4. Build → test → mark checkboxes in `development.md`
5. Update this file if the plan changes

---

## FILE LOCATIONS QUICK REFERENCE

```
src/
  app/
    (auth)/login/           ← login page
    (dashboard)/
      owner/                ← owner dashboard + leads
      manager/              ← manager dashboard, jobs, inventory (to build), faults (to build), attendance (to build)
      sales/                ← leads, quotations, bookings
      accounts/             ← invoices, payments, certificates (to build)
      front-desk/           ← lead entry + communication
    (workshop)/
      technician/           ← mobile technician views
      qc/                   ← mobile QC views
  components/
    ui/                     ← shadcn components (badge, button, card, dialog, input, label, select, table, textarea)
    leads/                  ← lead form, edit form, status changer, lost modal, communication log
    quotations/             ← builder, actions, discount panel
    bookings/               ← booking form, advance override
    job-cards/              ← intake form, delivery sign-off, signature pad, body map
    workshop/               ← job timer, material log, photo uploader
    qc/                     ← checklist form
    invoices/               ← payment form, tally export
    faults/                 ← (to build)
    whatsapp/               ← (to build)
  lib/
    actions/                ← all server actions
    auth/                   ← roles.ts, actions.ts
    supabase/               ← client.ts, server.ts
    validations/            ← zod schemas
```
