# AOTIC CRM — Final Project Plan (Client Copy)

## What We Are Building
A custom CRM platform for AOTIC’s automotive customization business. This is **not** a generic CRM. Every feature is designed for your 6 verticals, workflow, and team structure.

---

## Business Verticals (All Supported)
1. Audio & Acoustics  
2. Interior Themes & Custom Seat Designs  
3. Sun Protection Film, PPF & Detailing  
4. Base-to-Top OEM Upgrades  
5. Custom Cores (Headlights, Conversions, Body Kits)  
6. Lighting & Visibility Solutions  

---

## Module-by-Module Scope

### Module 1: Login & User Management
- Secure login (email + password)
- Role-based access:
    - Owner / Super Admin
    - Branch Manager / Supervisor
    - Sales Executive
    - Workshop Technician
    - QC Inspector
    - Accounts / Finance
    - Front Desk / Customer Support
- Users only see what they need
- Audit logs for sensitive actions (discount overrides, invoice edits, payment changes)

### Module 2: Lead Management & Sales Pipeline
- Quick lead capture (name, phone, car model, service, budget, source)
- Lead status: Hot / Warm / Cold / Lost (color-coded)
- Manager lead assignment
- Activity timeline (calls, WhatsApp, notes)
- Follow-up reminders + missed follow-up alerts
- Mandatory lost-reason capture
- Lead source revenue tracking  
**Goal:** Enquiry creation in under 45 seconds, no missed leads.

### Module 3: Quotation Builder
- Quote creation from lead
- 4 package tiers: Essential / Enhanced / Elite / Luxe
- Car segment pricing: Hatchback / Sedan / SUV / Luxury
- Version history (V1, V2, V3...)
- Discount policy:
    - Up to 5% by Sales Executive
    - Above 5% requires Owner approval
    - Reason code mandatory
- Instant professional PDF
- Configurable validity (e.g., 7 days)
- Quoted vs invoiced leakage tracking

### Module 4: Booking & Advance Payment
- Booking from accepted quotation
- Mandatory 70% advance before job card
- Manager override with reason (audit logged)
- Inventory reservation at booking
- Promised delivery date capture
- Payment methods tracked: Cash, UPI, Card, Bank Transfer, EMI

### Module 5: Job Card & Workshop Management
- Auto job card from booking (manual option for walk-ins)
- Vehicle intake: reg no., odometer, body condition, fuel, belongings, concerns
- Technician assignment (single/multiple)
- Task breakdown by vertical
- Task time tracking
- Material usage logging (auto inventory deduction)
- Mandatory 4–6 photos (before/during/after)
- Progress % visibility
- Supervisor notes
- Mobile-friendly technician interface
- Job flow: Created → In Progress → Pending QC → QC Passed → Ready for Billing → Ready for Delivery → Delivered

### Module 6: Quality Control (QC)
- Vertical-wise customizable checklists
- Pass/Fail inspection with notes/photos
- Mandatory supervisor sign-off
- Rework loop on failure
- Delivery checklist:
    - Car cleaned
    - Demo given
    - Invoice explained
    - Warranty card handed over
    - Old parts returned (if applicable)
    - Payment confirmed
- Hard lock: no delivery without QC pass (except Owner override with trail)

### Module 7: Invoicing & Payments
- Invoice auto-generation from completed job card
- GST auto-calculation (CGST + SGST, single GSTIN)
- Professional PDF invoice
- Payment tracking by method
- Partial payment flow (70% + 30%)
- Receipt generation
- Hard locks:
    - No release without payment compliance
    - No post-payment invoice edit without Owner override
- Collection aging + receivables tracking

### Module 8: Quality Certificate
- Auto-generated after full payment + QC pass
- Includes customer/vehicle/work summary/QC confirmation/warranty
- Sequential numbering (0001, 0002…)
- Downloadable PDF
- Linked to job card and invoice

### Module 9: Inventory Management
- Product master (~200 SKUs), brand/unit/serial where required
- Live stock visibility
- Auto-deduction from job usage
- Reservation for booked jobs
- Full stock movement history
- Supplier return tracking
- Customer-supplied parts flag
- CSV/Excel export for manual Tally import

### Module 10: Fault / Comeback Tracking
- Post-delivery issue logging linked to original job
- Capture: complaint date, category, severity, root cause, action, cost, resolution date
- Comeback rate metric per 100 deliveries (by category/technician)
- Flow: Reported → Under Review → Rework Scheduled → Resolved → Closed

### Module 11: WhatsApp Communication Log
- Conversation log inside CRM
- Copy-ready templates:
    - Booking confirmation
    - Job started
    - Job completed
    - Invoice sharing
    - Follow-up
    - Birthday wishes
- Communication timeline on lead/customer record
- Future-ready for WhatsApp API auto-send triggers

### Module 12: Tally Export
- Manual exports (as requested):
    - Sales invoices (CSV/Excel)
    - Payment receipts
    - Purchase/inventory data
    - GST reports (GSTR-1 compatible)
- One-click export by date range
- Future-ready for real-time Tally connector

### Module 13: Dashboards & Reports
**Owner Dashboard (real-time):**
- Today’s enquiries, bookings, collections
- Active job card progress
- Pending QC/deliveries
- Open faults, overdue follow-ups
- High-discount alerts

**Reports:**
- Sales (daily/weekly/monthly)
- Salesperson performance
- Technician productivity
- Lead source ROI
- Conversion funnel
- Revenue by vertical
- Promised vs actual delivery
- Inventory/dead stock
- Quality score
- Collection aging/receivables  
All reports filterable by date, vertical, salesperson, technician.

### Module 14: Basic HR (Attendance & Salary)
- Staff list with role/salary
- Attendance: Present / Absent / Half-Day
- Monthly salary records
- Staff payment tracking

---

## Not Included in This Phase (Deferred)

| Feature | Why Deferred |
|---|---|
| Customer Self-Service Portal | Not needed at launch |
| Multi-Branch Support | Single branch first (Chennai); architecture supports later expansion |
| AI Interior Visualization | Needs training data/portfolio, not launch-critical |
| AI Audio/Lighting Recommendation | Planned after core stabilization |
| AI Business Q&A Dashboard | Deferred to Phase 2 |
| Auto Purchase Orders | Current process is direct vendor calls |
| WhatsApp Auto-Send | API not configured yet; manual logging now |
| TV Showroom Dashboard | Owner dashboard on laptop/tablet is sufficient |

All deferred features can be added later without rebuilding.

---

## Build Phases & Timeline

| Phase | Scope | Timeline |
|---|---|---|
| 1 | Foundation: Login, Roles, Permissions, App Structure, Master Data | Week 1 |
| 2 | Lead Management & Sales Pipeline | Week 1–2 |
| 3 | Quotation Builder + Discount Control | Week 2 |
| 4 | Booking & Advance Payment | Week 2–3 |
| 5 | Job Card & Workshop (mobile technician view) | Week 3 |
| 6 | QC Module & Delivery Checklist | Week 3–4 |
| 7 | Invoicing, Payments & GST | Week 4 |
| 8 | Quality Certificate Generation | Week 4 |
| 9 | Inventory Management | Week 4 |
| 10 | Fault / Comeback Tracking | Week 4 |
| 11 | WhatsApp Communication Log | Week 4 |
| 12 | Tally Export Module | Week 4 |
| 13 | Dashboards & Reports | Week 4 |
| 14 | HR Basics (Attendance & Salary) | Week 4 |
| — | Testing, Bug Fixes, Refinements | Throughout |

**Target:** First usable version by first week of April.  
Each phase is demonstrated and tested before moving ahead.

---

## System Hard Locks (Non-Bypassable Without Owner Override)
- No job card without approved quote + 70% advance
- No delivery without QC sign-off
- No car release without required payment
- No invoice edit after payment recording
- No discount above 5% without Owner approval
- Every discount requires a reason
- Every financial edit is audit-logged
- Minimum 4 photos mandatory per job
- Deal lost reason is mandatory

---

## Inputs Required Before Start
- Brand assets (logo, colors, fonts)
- Service/package pricing for all 4 tiers across 6 verticals + car segments
- QC checklist items by vertical
- Sample quotation/invoice/certificate formats
- Staff list (name, role, contact)
- Common deal-lost reasons

---

## Technology
- Web app (Chrome, Safari, Edge; desktop/laptop/tablet/mobile)
- Cloud-hosted (no local server maintenance)
- Role-based secure access + encrypted data
- Fast workflows (lead entry ~45 sec, quote ~2 min)
- Scalable to 50+ branches (configuration-led expansion)

---

## Summary

| Metric | Detail |
|---|---|
| Total Modules | 14 |
| User Roles | 7 |
| Business Verticals Covered | 6 |
| Hard Business Rules Enforced | 9 |
| Reports & Dashboards | 15+ |
| Target Go-Live | First week of April |
| Future Expandability | Customer Portal, AI features, Multi-Branch, Tally Auto-Sync, WhatsApp Auto-Send |

