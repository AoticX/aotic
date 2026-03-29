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
**Status: ⏳ PENDING**

### Planned
- [ ] Booking form (promised delivery date, advance amount capture)
- [ ] 70% advance enforcement (system blocks job card if <70% received)
- [ ] Manager override flow for advance exception (with audit log)
- [ ] Job card intake form (registration, odometer, fuel level, body condition map)
- [ ] Customer digital signature capture at intake
- [ ] Belongings inventory checklist
- [ ] Material reservation logic (stock → reserved state)

---

## Phase 5: Workshop View, Frontend Image Compression, and Cloudflare R2 Uploads
**Status: ⏳ PENDING**

### Planned
- [ ] Mobile-first technician dashboard (assigned jobs only)
- [ ] Task timer (start/stop per job)
- [ ] `browser-image-compression` integration (compress before upload)
- [ ] Cloudflare R2 upload via S3-compatible API
- [ ] Mandatory photo enforcement (min 4–6 photos: before, during, after)
- [ ] Material consumption logging (auto-deducts from inventory)

---

## Phase 6: QC Checklist, Invoicing, and Final Payment Locks
**Status: ⏳ PENDING**

### Planned
- [ ] Vertical-specific QC checklist (Pass/Fail per item, notes, photos)
- [ ] QC sign-off gate (blocks delivery without Supervisor approval)
- [ ] Delivery checklist (clean, demo, invoice explained, warranty, old parts)
- [ ] Customer signature at handover
- [ ] Invoice generation with line items
- [ ] Invoice edit lock (hard lock post payment recording)
- [ ] Payment recording (cash, UPI, card, EMI)
- [ ] Final payment release lock (blocks car release until paid)
- [ ] Tally CSV/Excel export

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
