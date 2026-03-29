# AOTIC CRM — Build Progress

## Overview
Custom CRM for AOTIC automotive customization business. Strict OS-like operating principles: speed, control, accountability, auditability.

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

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router) + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Forms**: React Hook Form + Zod
- **Auth/DB**: Supabase (managed cloud) + RLS
- **Storage**: Cloudflare R2 (S3-compatible)
- **Image Compression**: browser-image-compression (frontend-only)
