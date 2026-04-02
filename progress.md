# AOTIC CRM — Build Progress

## Overview
Custom CRM for AOTIC automotive customization business. Strict OS-like operating principles: speed, control, accountability, auditability.

---

## Session 9: Critical Fixes + Session 7 Directives Revalidated (2026-04-02)
**Status: ✅ COMPLETE**

### Completed
- [x] **Bug 1 (PDF data access/RLS):** Confirmed quotation/invoice PDF generation uses server action path in `src/lib/actions/pdfs.ts` with `createServiceClient()`; updated certificate generation button to the same server-side path to prevent anon-key RLS failures.
- [x] **Bug 2 (`service_vertical` null on quotation save):** Hardened `createQuotation` and `updateQuotation` in `src/lib/actions/quotations.ts`:
  - Resolves vertical via `service_packages.vertical_id` when missing on item payload
  - Blocks save with clear error if any line item still lacks vertical mapping
  - Ensures `quotation_items.service_vertical` is always populated
- [x] **Advance policy alignment:** Standardized UI and action-level messaging/thresholds from 70% to 50% across bookings and job-card eligibility pages.
- [x] **Session 7 task verification:**
  - Branding remains aligned to AOTIC palette (`#FF7000`, `#2E2E2E`, `#FFFFFF`)
  - Legal entity constants remain centralized and injected into PDF payloads
  - Invoice advance reconciliation remains visible in UI and passed to invoice PDF
  - Lead assignment UI and rework panel remain wired and functional
- [x] **Build status:** `npm run build` passes clean (45 routes generated, 0 TypeScript errors)

---

## Phase 1: DB Schema, Supabase Auth, Role-Based Access Control (RBAC)
**Status: ✅ COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] Read and analyzed all `/docs` business logic documents
- [x] Initialized Next.js 16.2.1 (App Router) + TypeScript project
- [x] Installed all dependencies: Supabase SSR, React Hook Form, Zod, shadcn/ui Radix primitives, Lucide, browser-image-compression
- [x] Set up shadcn/ui CSS design system with full token set (globals.css)
- [x] Created `components.json` for shadcn/ui
- [x] Built complete Supabase SQL schema (`supabase/migrations/001_initial_schema.sql`)
  - 7 roles via `app_role` enum: owner, branch_manager, sales_executive, workshop_technician, qc_inspector, accounts_finance, front_desk
  - 6 verticals seeded: Audio & Acoustics, Interior Themes & Custom Seat Designs, Sun Protection Film/PPF & Detailing, Base-to-Top OEM Upgrades, Custom Cores, Lighting & Visibility Solutions
  - 4 pricing tiers seeded: Essential, Enhanced, Elite, Luxe
  - 4 car segments seeded: Hatchback, Sedan, SUV, Luxury
  - All tables include `created_at`, `updated_at`, `created_by` audit fields
  - Full RLS policies enforced per role
  - Hard-lock triggers: 70% advance, QC delivery gate, invoice edit lock, discount >5% approval gate
  - Immutable `audit_logs` table (INSERT only, no UPDATE/DELETE)
- [x] Supabase client utilities (`src/lib/supabase/client.ts`, `server.ts`)
- [x] `src/middleware.ts` — role-based route protection & redirect logic
- [x] `src/lib/auth/roles.ts` — role constants, permissions map, route guard helpers
- [x] `src/types/database.ts` — full TypeScript types mirroring DB schema
- [x] `src/lib/validations/index.ts` — Zod schemas enforcing all hard locks on the frontend
- [x] Login page (`src/app/(auth)/login/page.tsx`) with React Hook Form + Zod
- [x] Server Action for login (`src/lib/auth/actions.ts`)
- [x] Role-aware layout shells: desktop (owner/manager/sales/accounts/front-desk) and mobile (technician/qc)
- [x] Placeholder dashboard stubs for all 7 roles
- [x] `.env.local.example` with all required environment variables
- [x] `components/ui/` — button, input, label, card, badge, toast primitives

---

## Phase 2: Layouts, Navigation (Desktop/Mobile routing based on role)
**Status: ✅ COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] `SidebarNav` client component — `usePathname` active highlighting, accent bg on active route
- [x] `Breadcrumbs` client component — auto-generates from URL segments, UUID-safe, linked crumbs
- [x] `TopBar` client component — breadcrumbs left, role badge right
- [x] `MobileBottomNav` client component — `usePathname` active indicator, sign-out action
- [x] Desktop layout refactored: server shell + client nav components
- [x] Mobile layout refactored: server shell + `MobileBottomNav`
- [x] Role-specific nav item filtering (each role sees only their nav items)

---

## Phase 3: Lead Management & Quotation Builder (with 5% discount lock)
**Status: COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] Lead list page with status filter tabs (Hot/Warm/Cold/Lost), table view, role-filtered
- [x] Lead capture form (name, phone, car, vertical, budget, source, notes) with Zod validation
- [x] Lead detail page with contact info, vehicle data, linked quotations
- [x] LeadStatusChanger client component — inline status dropdown
- [x] LostReasonModal — hard-lock dialog: mandatory reason required to mark lost
- [x] LeadStatusBadge component
- [x] createLead, updateLeadStatus, assignLead server actions
- [x] Quotation builder — vertical + tier + segment selects auto-populate price from service_packages
- [x] Per-line-item discount fields
- [x] Header discount field with 5% hard lock UI (amber warning, Owner Approval Required badge)
- [x] Mandatory discount reason code select (disabled when discount = 0)
- [x] Discount > 5% auto-creates discount_approvals record and sets status = pending_approval
- [x] Quotation status ladder: Draft / Pending Approval / Sent / Accepted / Rejected
- [x] Quotation detail page with line items table, totals, status actions
- [x] DiscountApprovalPanel on Owner dashboard — approve/reject with review notes
- [x] approveDiscount server action — moves quotation back to draft when approved
- [x] Owner/Manager leads pages re-export sales page (all leads visible)

---

## Phase 4: Booking, 70% Advance Logic, and Job Card Creation
**Status: COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] BookingForm client component — live advance % calculation, green/red badge, 70% minimum enforcement
- [x] AdvanceOverrideModal — manager-only dialog, reason ≥20 chars, audit_log entry on override
- [x] createBooking server action — 70% gate enforced at action level, quotation marked accepted
- [x] createBookingWithOverride server action — role guard (owner/branch_manager), audit trail
- [x] Bookings list page — status tabs, advance %, override badge, customer/value data
- [x] New booking page — quotation must be accepted, pre-fills customer/value from quotation
- [x] Booking detail page — advance status card, booking summary, "Create Job Card" CTA for managers
- [x] SignaturePad component — canvas-based, mouse + touch, PNG dataURL capture
- [x] BodyConditionMap component — 6 zones (front/rear/left/right/roof/interior), 4 conditions (ok/scratch/dent/both), expandable with damage notes
- [x] JobCardIntakeForm component — reg number, odometer, fuel level, bay, est. completion, body condition, belongings, spare parts toggle, customer concerns, signature
- [x] createJobCard server action — re-validates 70% advance, parses JSONB body map, inserts inventory_transactions for material reservation
- [x] updateJobCardStatus, assignTechnician server actions
- [x] Job cards list page — status filter tabs, technician assignment column, reg number, bay
- [x] New job card page — fetches booking, guards advance requirement, renders intake form
- [x] Job card detail page — status progression, technician assignment form, body condition display, belongings, signature preview, booking link

---

## Phase 5: Workshop View, Frontend Image Compression, and Cloudflare R2 Uploads
**Status: COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] `src/lib/r2.ts` — R2 S3 client (Cloudflare endpoint), `getPresignedPutUrl`, `getPublicUrl`, `deleteR2Object`
- [x] `src/lib/actions/photos.ts` — `getPhotoUploadUrl` (presigned URL), `savePhotoRecord`, `getJobPhotos`, `checkPhotoMinimum` (≥4), `moveToQcPending` (blocks if <4 photos)
- [x] `src/lib/actions/time-logs.ts` — `startTimer` (blocks duplicate, auto-transitions to in_progress), `stopTimer`, `getActiveTimer`, `getTimeLogs`
- [x] `src/lib/actions/materials.ts` — `logMaterialConsumption` (inserts consume transaction), `getReservedMaterials`
- [x] `PhotoUploader` client component — browser-image-compression (max 1MB/1920px), presigned PUT to R2, stage selector (before/during/after), min-4 indicator, photo grid preview
- [x] `JobTimer` client component — live elapsed counter (1s interval), start/stop, notes on stop, error display
- [x] `MaterialLog` client component — de-duplicated reserved items dropdown, qty + notes input
- [x] Date range filters on `owner/reports/sales`
- [x] Monthly attendance report view for `manager/attendance`
- [x] Payment timeline view per invoice UI
- [x] Progress % display on job detail header
- [x] Fix Rework re-test flow for QC inspector
- [x] Seed Issue categories and QC checklist templates
- [x] Technician dashboard — customer name, bay, due date, no stubs
- [x] Technician job detail page — damage map, belongings, timer, photo uploader, material log, QC submit gate
- [x] `/workshop/technician/upload` — job selector + PhotoUploader
- [x] `/workshop/technician/timer` — job selector + JobTimer + session history
- [x] Installed `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

---

## Phase 6: QC Checklist, Invoicing, and Final Payment Locks
**Status: COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] `src/lib/actions/qc.ts` — `getQcTemplates`, `getJobVertical` (traverses job→booking→quotation→service_package), `submitQcChecklist` (creates qc_records + results, sets job status qc_passed or rework_scheduled, sets qc_signed_off_by/at)
- [x] `src/lib/actions/invoices.ts` — `createInvoice` (pulls from quotation, auto-generates INV-YYYYMMDD-XXXX number, sets amount_paid from advance), `finalizeInvoice`, `recordPayment` (DB trigger auto-locks + updates amount_paid), `markReadyForDelivery` (app-level payment balance check + DB trigger QC check), `markDelivered` (captures signature), `exportTallyCsv` (Tally-compatible CSV download)
- [x] `QcChecklistForm` client component — pass/fail/na toggle per item, mandatory item scoring enforcement, rework notes required when failures exist, custom item addition, sign-off / flag for rework button
- [x] `PaymentForm` client component — amount, method, reference no., notes
- [x] `TallyExportButton` client component — triggers CSV download via server action
- [x] `DeliverySignOff` client component — 5-item delivery checklist with tick UI + customer signature pad
- [x] QC queue page updated — shows pending_qc + rework_scheduled, links to checklist
- [x] `/workshop/qc/[id]` — QC job detail with checklist form, already-signed guard
- [x] `/workshop/qc/checklist` — tab page listing all QC-pending jobs
- [x] Accounts dashboard — real stats (total billed, outstanding, paid count) + Tally export
- [x] `/dashboard/accounts/invoices` — invoice list with status tabs
- [x] `/dashboard/accounts/invoices/[id]` — invoice detail, line items, payments, finalize/record actions, lock indicator
- [x] `/dashboard/accounts/payments` — full payment history across all invoices
- [x] `/dashboard/manager/jobs/[id]/delivery` — step tracker (QC→Invoice→Payment→Ready→Delivered), create invoice, mark ready for delivery, delivery sign-off
- [x] Manager job detail updated — "Manage Delivery" CTA when job is qc_passed or beyond

### Hard locks fully wired
- Invoice locked by DB trigger on first payment (cannot edit after)
- `markReadyForDelivery` blocks if balance > 0
- DB trigger `enforce_qc_before_delivery` blocks status change without QC sign-off
- QC checklist form blocks sign-off until all mandatory items scored

---

## Hard Locks Implementation Status

| Lock | Zod (Frontend) | RLS/Trigger (Backend) |
|------|---------------|----------------------|
| 70% advance before job card | ✅ Phase 1 | ✅ Phase 1 |
| QC sign-off before delivery | ✅ Phase 1 | ✅ Phase 1 |
| Final payment before release | ✅ Phase 1 | ✅ Phase 1 |
| Invoice edit lock post-payment | ✅ Phase 1 | ✅ Phase 1 |
| Discount >5% requires Owner approval | ✅ Phase 1 | ✅ Phase 1 |
| Mandatory discount reason code | ✅ Phase 1 | ✅ Phase 1 |
| Min 4–6 photos per job | ✅ Phase 1 | ✅ Phase 1 |
| Mandatory lost-deal reason | ✅ Phase 1 | ✅ Phase 1 |

---

## Phase 7: Supabase Live Project Setup & Build Fixes
**Status: COMPLETE**
**Date: 2026-03-29**

### Completed
- [x] Connected live Supabase project `wuhsfhnierlzkrpkqnan` (ap-south-1)
- [x] Applied 8 schema migrations to align existing DB with app code (additive, no data loss)
  - Enum additions (app_role, job_card_status, quotation_status, invoice_status, etc.)
  - Generated column aliases (customers.full_name, quotations.total_amount, bookings.advance_pct, invoices.amount_due)
  - Missing columns on all core tables
  - 13 new tables (branches, verticals, service_packages, lost_reasons, discount_approvals, job_photos, time_logs, qc tables, etc.)
  - Triggers: auto_lock_invoice_on_payment, trg_sync_profile_role, enforce_qc_before_delivery
  - RLS policies on all new tables
  - Seeded: 6 verticals, 8 lost reasons, 7 discount reasons, 33 QC checklist items, 1 branch
- [x] `.env.local` populated with Supabase URL + anon key
- [x] Fixed `globals.css` — changed `@import "tailwindcss-animate"` to `@plugin "tailwindcss-animate"` (Tailwind v4 syntax)
- [x] Fixed login page — wrapped `useSearchParams()` in Suspense boundary (Next.js 16 prerender requirement)
- [x] `npm run build` passes clean — 34 routes compiled, zero TypeScript errors
- [x] `dev-req.md` created with manual setup procedures for: SUPABASE_SERVICE_ROLE_KEY, Cloudflare R2 bucket + API token, first owner account creation

### 4. Build & Delivery
- **Goal:** Ensure `npm run build` succeeds and code is committed clean.
- **Status:** **COMPLETE**
- **Action Items:**
  - [x] `npm run build` clean pass
  - [x] Clean up unused/test files (`seed_check.ts`)
  - [x] Git commit and push

### Pending manual steps (see dev-req.md)
- [x] Add SUPABASE_SERVICE_ROLE_KEY to `.env.local`
- [x] Create Cloudflare R2 bucket `aotic-media` and API token
- [x] Add R2 credentials to `.env.local`
- [x] Create first owner account via Supabase Auth dashboard

---

## Session 8: Critical Bug Fixes (2026-04-02 IMMEDIATE)
**Status: ✅ COMPLETE**

### Bug Fixes Applied
- [x] **Bug 1: Empty Quotation PDFs (RLS Issue)** — PDF edge functions were being called from client with anon key, causing RLS to filter out all results. Solution: Created new `src/lib/actions/pdfs.ts` with server actions (`generateQuotationPdf`, `generateInvoicePdf`, `generateCertificatePdf`) using `createServiceClient()` to bypass RLS. Updated `quotation-actions.tsx` and `invoice-pdf-button.tsx` to call server actions instead of direct edge function invocation.
- [x] **Bug 2: Quotation Save Failure (service_vertical constraint)** — `quotation_items` insert was missing required `service_vertical` field, causing NOT-NULL constraint violation. Solution: Added `service_vertical` field mapped from `vertical_id` in both `createQuotation` and `updateQuotation` functions in `src/lib/actions/quotations.ts`.
- [x] **Build Status**: PASSING (46 routes, 0 TypeScript errors)
- [x] **Git**: Commit `056f3e5` — "fix: resolve critical bugs in quotation PDFs and quotation save"

### Session 7 Verification (2026-04-02)
All previously completed tasks verified:
- [x] **TASK A — Branding**: AOTIC brand colors (#FF7000 primary, #2E2E2E dark) enforced in `globals.css`
- [x] **TASK B — Legal Entity**: `COMPANY` object hardcoded in `src/lib/constants.ts` with GSTIN, address, partners
- [x] **TASK C — Advance Reconciliation**: `createInvoice` sets `amount_paid = advance_amount` at invoice creation; `amount_due` auto-computed as generated DB column
- [x] **TASK D — Lead Assignment UI**: `LeadAssignSelect` component wired on Lead Detail page for owner/manager
- [x] **TASK D — Rework Flow UI**: `ReworkPanel` component wired on Job Detail when `status === 'rework_scheduled'`

---

## Session 7: Branding, Production Data Injection, Financial Fix & UX Gaps
**Status: ✅ COMPLETE**
**Date: 2026-04-02**

### Completed

#### TASK A — Branding & UI Theme Update
- [x] `src/app/globals.css` — Enforced exact AOTIC brand colors: #FF7000 (primary), #2E2E2E (sidebar), #FFFFFF (foreground)
- [x] `src/app/layout.tsx` — Switched to Inter font (Google Fonts) project-wide
- [x] Sidebar background is dark grey (#2E2E2E / `0 0% 18%`); active items show orange accent
- [x] All `--primary` tokens reference pure AOTIC orange; removed all blue/purple tints

#### TASK B — Production Data Injection (PDFs & Exports)
- [x] `src/lib/constants.ts` — Created single source of truth for legal entity:
  - Legal Name: AOTIC
  - GSTIN: 33ACLFA6510A1Z1
  - Address: No. 28, 200 Feet Bypass Road, Maduravoyal, Chennai - 600095
  - Partners: Navinkumar Anuj & Chayan Bhoopat Jain
- [x] `QuotationActions` — passes `getCompanyPdfPayload()` to `generate-quotation-pdf` edge function
- [x] `InvoicePdfButton` — passes `getCompanyPdfPayload()` + `advance_amount` to `generate-invoice-pdf` edge function
- [x] Invoice detail page — company footer card shows GSTIN, address, partners
- [x] Quotation detail page — same company footer card added

#### TASK C — Advance Payment Reconciliation (HIGH blocker — RESOLVED)
- [x] Verified: `createInvoice` action already queries `bookings.advance_amount` and sets `amount_paid` to the advance value at invoice creation time
- [x] Verified: Advance is inserted as an `is_advance: true` payment row so it appears distinctly in payment history
- [x] Verified: `amount_due` is a generated DB column = `total_amount - amount_paid`, so it automatically reflects the deduction
- [x] Verified: Invoice detail UI shows "Advance Received" line with green text and payment method
- [x] `InvoicePdfButton` now forwards `advanceAmount` to the PDF edge function for reconciliation in the PDF
- [x] **Customer will NOT be overcharged at delivery** — constraint is enforced end-to-end

#### TASK D — UX Gaps (HIGH — RESOLVED)
- [x] **Lead Assignment UI** — `LeadAssignSelect` dropdown already wired on Lead Detail page for owner/branch_manager roles; calls `assignLead` server action on change
- [x] **Rework Flow UI** — `ReworkPanel` component already rendered on Job Detail when `status === 'rework_scheduled'`; allows notes + deadline + dispatches `startReworkCycle` action moving job back to `in_progress`

#### Build Fixes (pre-existing TypeScript errors squashed)
- [x] `lead-edit-form.tsx` — `car_brand` defaultValues now passes `undefined` (not `''`) for missing values; Select cast to `LeadInput['car_brand']`
- [x] `lead-form.tsx` — same `car_brand` Select onValueChange cast fixed
- [x] `lead-status-badge.tsx` — added missing `inspection_done` to CONFIG (was present in DB enum but missing in component map)
- [x] `lead edit page` — type cast now includes `car_brand` field
- [x] `npm run build` — **PASSES CLEAN** (46+ routes, 0 TypeScript errors)
- **Framework**: Next.js 16.2.1 (App Router) + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Forms**: React Hook Form + Zod
- **Auth/DB**: Supabase (managed cloud) + RLS
- **Storage**: Cloudflare R2 (S3-compatible)
- **Image Compression**: browser-image-compression (frontend-only)
