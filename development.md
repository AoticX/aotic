# AOTIC CRM — Development Checklist (Deployment Readiness)

Last updated: 2026-03-30

---

## Legend
- 🔴 BLOCKING — app cannot ship without this
- 🟠 HIGH — significant feature gap or data integrity risk
- 🟡 MEDIUM — noticeable UX issue, not a hard blocker
- 🟢 DONE — already implemented

---

## 1. Environment & Infrastructure

- [x] 🟢 `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local`
- [ ] 🔴 Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` to `.env.local` (photo uploads show config error without this — see dev-req.md §2)
- [ ] 🔴 Set all production env vars on hosting platform (Vercel / Cloudflare Pages) before deploy
- [ ] 🟠 Create `.env.production.example` documenting all required vars for CI/CD
- [x] 🟢 Supabase project live and schema applied
- [x] 🟢 `npm run build` passes clean

---

## 2. Missing / Stub Pages

- [ ] 🔴 **`/front-desk`** — currently shows disabled "Phase 3" buttons. Needs a working quick-lead-entry form (reuse `LeadForm` component from `/sales/leads/new`)
- [ ] 🔴 **`/owner/leads`** — sidebar nav links to it; file exists but only re-exports sales page — verify it renders all leads (not just assigned)
- [ ] 🔴 **`/app/not-found.tsx`** — global 404 page missing; orphaned routes show blank white screen
- [ ] 🔴 **`/app/error.tsx`** — global error boundary missing; unhandled server component errors crash silently
- [ ] 🔴 **`/app/(dashboard)/error.tsx`** — dashboard-level error boundary
- [ ] 🔴 **`/app/(workshop)/error.tsx`** — workshop-level error boundary
- [ ] 🟠 **`/manager/jobs/[id]` → loading.tsx** — job detail page does multiple DB queries with no skeleton
- [ ] 🟡 **`/app/(dashboard)/loading.tsx`** — dashboard pages show blank during server render

---

## 3. Broken / Incomplete Features

- [ ] 🔴 **Photo upload** — `PhotoUploader` now uses Cloudinary. Requires `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in env. Shows a user-facing config error if missing.
- [ ] 🔴 **Tally CSV export** — verify `exportTallyCsv` action is correctly wired in accounts dashboard; test against real invoice data
- [ ] 🔴 **Lost Lead — reason code selection** — DB has `lost_reasons` seeded (8 entries), Zod enforces reason, but `LeadStatusChanger` has no dropdown to pick from the seeded list; user can't actually select a reason
- [ ] 🟠 **Discount approval panel** — owner dashboard panel only shows customer name; needs to show quotation total + discount % + line items inline so owner can make decision without clicking through
- [ ] 🟠 **Advance override modal** — `AdvanceOverrideModal` exists in components; verify it actually appears on booking form for manager/owner role and that audit log entry is created
- [ ] 🟠 **Job card status mismatch** — code in `manager/jobs/page.tsx` references `qc_pending` but DB enum uses `pending_qc`; status filter tab likely returns zero results
- [ ] 🟠 **Material log** — `MaterialLog` component exists; verify it correctly de-duplicates reserved items and that `logMaterialConsumption` inserts `inventory_transactions` rows
- [ ] 🟡 **Signature pad on delivery** — `DeliverySignOff` uses canvas-based signature; test on actual mobile/touch device that touch events work correctly

---

## 4. Missing Business Logic (per docs)

- [ ] 🔴 **Communication log** — `docs/business-rules.md` mandates WhatsApp/call/visit tracking per lead. No `communications` table, no server action, no UI. Required for front-desk and sales roles.
- [ ] 🔴 **Edit Lead** — no `/sales/leads/[id]/edit` page. After creation, leads can't be updated (wrong phone number, car details change, etc.)
- [ ] 🔴 **Edit Quotation** — no edit page for draft quotations. If a line item needs changing after creation, no UI path exists.
- [ ] 🟠 **Product/material substitution approval** — `docs/business-rules.md` §20: using a substitute part mid-job requires customer approval. No workflow implemented.
- [ ] 🟠 **Service package pricing auto-fill** — quotation builder should auto-populate price from `service_packages` table when vertical + tier + segment are selected. Verify this actually queries DB and fills the amount field.
- [ ] 🟠 **Booking → Job Card link** — booking detail shows "Create Job Card" CTA only for managers, but `isManager` flag must be derived from session role. Verify it works for `branch_manager` and `owner` but not `sales_executive`.
- [ ] 🟠 **QC checklist templates by vertical** — `getJobVertical` traverses job → booking → quotation → service_package to get vertical. If any link in that chain is null (e.g. quotation_id not set on booking), QC templates return empty. Add fallback to show generic checklist.
- [ ] 🟡 **Invoice number uniqueness** — current implementation uses date + random suffix. Replace with a DB sequence counter to guarantee no collisions in production.
- [ ] 🟡 **Mandatory 70% advance** — DB trigger enforces it, but `AdvanceOverrideModal` reason field requires ≥20 chars. Verify character count validation is enforced client-side before submit.

---

## 5. UI / UX Gaps

- [ ] 🟠 **Empty states with CTAs** — Leads, Quotations, Bookings, Invoices list pages show "no data" text but no "Create" button visible within the empty state itself
- [ ] 🟠 **Confirmation dialogs** — no confirm prompt before: marking lead as Lost, rejecting a quotation, marking invoice void. Single click can corrupt data.
- [ ] 🟠 **Form submission loading states** — Lead form, Booking form, Quotation builder give no visual feedback during server action execution. Risk of double-submission.
- [ ] 🟡 **Inline form validation** — discount reason field should show red border immediately when discount >5% and no reason selected, not just on submit
- [ ] 🟡 **Invoice lock indicator** — lock icon on invoice detail is 16px and easily missed; add a prominent locked banner when `is_locked = true`
- [ ] 🟡 **Breadcrumb labels** — `Breadcrumbs` component shows raw UUID segments for detail pages (e.g. `/sales/leads/3a0371a3`). Should show customer name or lead title instead.
- [ ] 🟡 **Mobile bottom nav active state** — verify `usePathname` active highlighting works correctly for nested routes like `/technician/timer` and `/qc/checklist`
- [ ] 🟡 **Technician job list** — shows all jobs assigned to technician but no indication of urgency / due date colour coding
- [ ] 🟡 **Back navigation** — workshop pages have a back `←` text link; should be a proper `<Link>` to parent route, not browser back (breaks on direct load)
- [ ] 🟡 **Quotation status badge colours** — `pending_approval` and `rejected` should be visually distinct (amber vs red); verify Badge variant covers all statuses

---

## 6. Roles & Permissions Gaps

- [ ] 🟠 **Front desk role** — can see `/front-desk` page but has no functional UI. Per `docs/roles-and-permissions.md`, front desk should: create leads, view customer info, log communications. Currently 0% functional.
- [ ] 🟠 **Owner can't navigate to job cards or invoices directly** — sidebar nav for owner shows only Overview + Leads. Should also link to `/manager/jobs` and `/accounts/invoices` since owner has access to all routes.
- [ ] 🟡 **QC inspector can't see rework jobs** — `/qc` page only lists `pending_qc` status; jobs in `rework_scheduled` should also appear
- [ ] 🟡 **Accounts role can't create invoices** — invoice creation CTA is on `/manager/jobs/[id]/delivery` which accounts_finance cannot access per `PROTECTED_ROUTES`. Accounts should have a path to create invoices for jobs.

---

## 7. Deployment & Production Hardening

- [ ] 🔴 **Rename `src/middleware.ts` → `src/proxy.ts`** — Next.js 16 deprecation warning on every request; will become an error in a future version
- [ ] 🟠 **Rate limiting on login** — `signIn` server action has no rate limiting; brute-force possible. Add IP-based throttle or use Supabase Auth's built-in rate limits (verify they're enabled on project).
- [ ] 🟠 **CORS / CSP headers** — no `next.config` headers set for Content-Security-Policy, X-Frame-Options, etc.
- [ ] 🟠 **Image compression fallback** — if `browser-image-compression` fails (unsupported browser), upload silently fails. Add try/catch with user-facing error.
- [ ] 🟡 **`as any` type casts** — ~50 instances of `const db = supabase as any` across pages. Should be replaced with generated Supabase TypeScript types (`supabase gen types`) to catch schema mismatches at compile time.
- [ ] 🟡 **No `robots.txt` or `sitemap.xml`** — not strictly needed for a private CRM, but should explicitly disallow indexing in `public/robots.txt`
- [ ] 🟡 **Favicon / PWA manifest** — default Next.js favicon; set AOTIC branding. Add `manifest.json` for mobile technician "Add to Home Screen" experience.
- [ ] 🟡 **Delete `seed-demo-users` edge function** — one-time seeding function still deployed on Supabase. Remove it (`verify_jwt: false` makes it publicly callable).

---

## 8. Testing

- [ ] 🟠 **End-to-end flow test** — manually walk through: New Lead → Quotation → Booking → Job Card → QC → Invoice → Payment → Delivery with real DB data
- [ ] 🟠 **Hard lock tests** — verify each hard lock actually blocks at DB level: 70% advance, QC gate, payment gate, invoice lock
- [ ] 🟠 **Role isolation test** — log in as each of the 7 roles and confirm you cannot access routes you shouldn't
- [ ] 🟡 **Mobile responsiveness** — test technician and QC pages on actual mobile device (not just browser DevTools)
- [ ] 🟡 **Signature pad on iOS Safari** — canvas touch events behave differently on Safari; test `SignaturePad` component

---

## 9. Post-Deployment (Nice to Have)

- [ ] Dashboard analytics — owner dashboard shows real stats (total revenue, jobs in progress, pending approvals count)
- [ ] PDF invoice generation — exportable invoice PDF for customer handover
- [ ] WhatsApp notification on booking confirmation — auto-send booking summary to customer phone
- [ ] Push notifications for technician job assignments
- [ ] Customer portal (read-only) — customer can view job status and invoice

---

## Quick Priority Order

**Ship blockers (do first):**
1. Env vars (R2 + service role key)
2. `error.tsx` + `not-found.tsx`
3. Fix `/front-desk` page
4. Fix lost-reason dropdown in `LeadStatusChanger`
5. Fix `qc_pending` vs `pending_qc` status mismatch in jobs page
6. Rename `middleware.ts` → `proxy.ts`
7. Delete `seed-demo-users` edge function

**Before beta users:**
8. Edit Lead + Edit Quotation pages
9. Communication log (front desk + sales)
10. Confirmation dialogs on destructive actions
11. Form loading states
12. Owner sidebar — add job cards + invoices links
