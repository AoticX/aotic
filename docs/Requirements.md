# AOTIC CRM - Complete Technical Specification
## For AI Code Writer Use

---

## 1. COMPANY & BUSINESS CONTEXT

### Legal & Identity
- **Company Name:** AOTIC
- **Legal Entity:** Partnership
- **GST Number:** 33ACLFA6510A1Z1 (Single GSTIN, Tamil Nadu, regular registration)
- **GST Rate:** 18% applicable (CGST + SGST split)
- **Address:** No. 28, 200 Feet Bypass Road, Maduravoyal, Chennai - 600095
- **Partners:** Navinkumar Anuj (Owner/Super Admin), Chayan Bhoopat Jain (Owner/Super Admin)
- **GST Registration Date:** 29/01/2026

### Brand Identity
- **Primary Color:** #FF7000 (Orange)
- **Secondary Color:** #2E2E2E (Dark Grey/Near Black)
- **Tertiary Color:** #FFFFFF (White)
- **Logo:** Provided separately (black background, orange and white lettering)
- **AI Visualization Style Inspiration:** Lamborghini, Mercedes-Benz, Brabus, Rolls-Royce
- **Visualization Styles:** Luxury, OEM+, Sporty
- **Visualization Colors:** Black, Tan, Red accents, Ambient RGB
- **Visualization Inputs:** Seat designs, lighting layouts, audio builds, starlight roofs

### Business Type
- Automotive customization workshop, single branch (Chennai)
- Custom CRM, NOT a generic CRM
- Primary customer communication channel: WhatsApp and phone calls
- 90% leads from Instagram, Facebook, YouTube; 10% from Google Ads, referrals, walk-ins

---

## 2. BUSINESS VERTICALS (ALL 6 MUST BE SUPPORTED)

1. Audio and Acoustics
2. Interior Themes and Custom Seat Designs
3. Sun Protection Film, PPF and Detailing
4. Base-to-Top OEM Upgrades
5. Custom Cores (Headlights, Conversions, Body Kits)
6. Lighting and Visibility Solutions

---

## 3. USER ROLES AND ACCESS CONTROL

### Roles
1. **Owner / Super Admin** - Anuj Ostwal, Chayan
   - Full access to all modules
   - Approves discounts above threshold
   - Overrides all hard locks (with audit trail)
   - Can edit invoices after payment
   - Only role that can export data
   - Receives daily reports
2. **Branch Manager / Supervisor** - Mr. Prabhu
   - Manages daily operations
   - Assigns leads, technicians, and jobs
   - Performs QC sign-off
   - Can approve discounts below 20% (small approvals)
   - Can override job start without advance with documented reason
   - Receives daily reports
3. **Sales Executive** - Shayan, Prabhu (temporary)
   - Handles leads, creates quotations, manages bookings
   - Can offer up to 5% discount without approval
   - Can see each other's leads
   - Can edit invoices they created (until payment is recorded)
   - Logs WhatsApp communication
4. **Workshop Technician** - Mukesh, Azeem
   - Sees only their assigned jobs
   - Uploads mandatory photos
   - Logs materials used
   - Marks task progress
   - Mobile phone primary interface
5. **QC Inspector** - Owner / Management (no dedicated role separate from owner)
   - Fills QC checklists
   - Signs off on completed work
   - Flags rework items
6. **Accounts / Finance** - Fatima Madam, Owner
   - Invoicing and payment recording
   - Tally exports
   - Manages Tally (Fatima Madam)
7. **Front Desk / Customer Support** - Fatima Madam
   - Lead entry
   - Communication logs

### Role-Based Visibility Rules
- Each role sees only what their role permits
- Technicians: assigned jobs only, no financial data
- All sensitive actions are audit-logged with user identity and timestamp
- Data export restricted to Owner only

---

## 4. SYSTEM SETTINGS AND CONFIGURATION

### Global Settings
- **OpenAI API:** To be integrated securely
- **WhatsApp API:** Future integration (not Phase 1)
- **GST Rate:** 18% applicable
- **Working Hours:** 10:30 AM to 7:30 PM
- **Inventory Tracking:** Enabled
- **Job Card:** Mandatory
- **Advance Required:** Before work begins
- **Photo Documentation:** Mandatory for all vehicles
- **Customer History Tracking:** Enabled

### Payment Configuration
- **Advance Requirement:** 50% before job commencement (updated from 70% in final master doc)
- **Balance:** After completion
- **Accepted Payment Methods:** Cash, Card, GPay (UPI), Bajaj (EMI/Finance)

### Discount Rules
- Sales executive can give up to 5% without approval
- Branch Manager can approve discounts below 20%
- Discounts above 20% require Owner approval
- Every discount requires a mandatory reason code
- System blocks discount above threshold until approved

---

## 5. VEHICLE SEGMENTS COVERED

| Brand | Coverage |
|-------|----------|
| Toyota | All Models |
| Hyundai | All Models |
| Honda | All Models |
| Kia | All Models |
| Tata | All Models |
| MG | All Models |
| Maruti | All Models |
| BMW | All Models |
| Mercedes | All Models |
| Audi | All Models |

**Car Segment Categories for Pricing:** Hatchback, Sedan, SUV, Luxury

---

## 6. COMPLETE MODULE BREAKDOWN

---

### MODULE 1: LOGIN AND USER MANAGEMENT

**Functionality:**
- Secure login with email and password
- Role-based access control (7 roles as defined above)
- Each role sees only relevant data
- All sensitive actions logged: who, what, when
- Session management

**Audit Log Requirements:**
- Discount overrides
- Invoice edits
- Payment changes
- Job start without advance
- QC override
- Delivery without full payment
- Any Owner-level override

---

### MODULE 2: LEAD MANAGEMENT AND SALES PIPELINE

**Lead Capture Form (must complete in under 45 seconds):**
- Customer name
- Phone number
- Car model
- Service interest (select from 6 verticals)
- Approximate budget
- Source: Instagram, Facebook, YouTube, Google Ads, referral, walk-in

**Lead Classification:**
- Hot: ready to book and pay advance
- Warm: interested but deciding
- Cold: unsure or thinking
- Lost: did not convert (requires mandatory reason selection)

**Lead Lost Reason Codes (mandatory selection):**
- Price concerns
- Product or quality satisfaction
- Overall experience
- Customer changed mind
- Chose cheaper brand
- Other (with text input)

**Lead Management Features:**
- Lead assignment: Manager manually assigns to sales executives
- All sales executives can see each other's leads
- Activity timeline: every call, WhatsApp message, note logged against the lead
- Follow-up reminders: scheduled, missed follow-ups flagged to manager
- Follow-up escalation: if overdue by 24 hours, escalate to manager
- Lead source tracking for marketing ROI analysis

**Performance Targets:**
- Lead entry in under 45 seconds
- No lead falls through without follow-up

---

### MODULE 3: QUOTATION BUILDER

**Quotation Creation:**
- Created from an existing lead
- Select services and packages; system auto-fills pricing based on car segment
- Quotation line templates by category for fast building without manual typing

**Package Tiers (per vertical, per car segment):**
1. AOTIC Essential
2. AOTIC Enhanced
3. AOTIC Elite
4. AOTIC Luxe

**Pricing Rules:**
- Prices vary by car segment (Hatchback, Sedan, SUV, Luxury)
- Prices do not vary by branch
- Some services depend on car segment; others depend on products selected

**Version Control:**
- Every revision saved with version label: V1, V2, V3
- Full log of who changed what, what was removed, why deal value changed
- Locked PDF snapshot created on each version for archive

**Discount Control:**
- Sales exec: up to 5% without approval
- Manager: up to 20% with approval
- Owner: above 20%
- System blocks and requires approval above threshold
- Every discount requires a reason code

**Quotation PDF:**
- Professional clean PDF
- Shareable with customer
- WhatsApp quote approval log (customer approves on chat, PDF snapshot locked)

**Quotation Validity:**
- No fixed validity period (as per questionnaire); configurable field

**Leakage Tracking:**
- Compare quoted value vs final invoiced value
- Catch revenue leakage automatically

**Typical Revisions:** Once or twice

---

### MODULE 4: BOOKING AND ADVANCE PAYMENT

**Booking Creation:**
- Created from accepted quotation only
- Captures promised delivery date

**Advance Payment Rule:**
- 50% advance required before job card can be created (per master doc; earlier versions stated 70%)
- Manager can override with documented reason; override is audit-logged

**Stock Reservation:**
- When booking is confirmed, required materials are reserved in inventory
- Reserved stock is not available for other jobs

**Promised Delivery Date:**
- Captured at booking
- Tracked against actual delivery date for delay reporting
- Red flag if promised date is impossible based on open jobs and technician load

**Payment Methods Tracked:**
- Cash
- Card
- GPay (UPI)
- Bajaj (EMI/Finance)
- Each method tracked separately

---

### MODULE 5: JOB CARD AND WORKSHOP MANAGEMENT

**Job Card Creation:**
- Auto-created from confirmed booking
- Can be manually created for walk-in emergencies

**Vehicle Intake Form:**
- Registration number
- Odometer reading
- Body condition map: existing scratches, dents, broken clips, warning lights
- Fuel level (removed in updated master doc; revert to original if needed or make configurable)
- Belongings checklist (removed in updated master doc; make configurable)
- Spare parts in boot
- Customer concerns captured
- Customer digital signature at intake (to prevent future damage blame)

**Photo Requirements:**
- Before work: mandatory
- During work: for customer updates
- After completion: 100% mandatory
- Minimum 4-6 photos per job

**Technician Assignment:**
- Manager assigns one or multiple technicians per job
- Workshop bay and slot planning (capacity by bay, technician availability, expected job duration)

**Task Breakdown:**
- Sub-tasks per vertical:
  - Audio: wiring, damping installation, DSP tuning
  - Interior: seat stitching, roof wrap
  - Lighting: projector alignment, ambient light routing
  - PPF: coating stage, edge finish
  - OEM: specific upgrade checklist
  - Custom Cores: conversion-specific steps
- Time tracking: start and stop timer per task
- Mandatory internal notes section for supervisors

**Material Consumption:**
- Technician logs materials used
- Auto-deduction from inventory on logging

**Progress Tracking:**
- Percentage completion visible to manager at a glance

**Mobile Technician Interface:**
- Big buttons
- Minimal typing
- Photo-first workflow
- Designed for workshop floor use on mobile phones

**Job Status Flow (13 stages):**
1. Lead Created
2. Inspection Done
3. Quotation Shared
4. Approved by Customer
5. Advance Received
6. Job Created
7. In Progress
8. Pending QC
9. QC Passed
10. Ready for Billing
11. Payment Completed
12. Ready for Delivery
13. Delivered

**Average Task Time:** 3 days

---

### MODULE 6: QUALITY CONTROL

**QC Checklists:**
- Customizable checklist per vertical (owner defines items)
- Exact checks required for each vertical (to be provided by AOTIC separately)
- Sign-off required for hidden work: damping, wiring, tuning, harness quality, PPF edge finish, seat fitment alignment, ambient light routing, projector focus

**Inspection Form:**
- Pass or Fail per item
- Notes and photos per item (photos removed in updated master doc; make configurable)
- Severity levels: minor, major, unsafe, customer-visible, internal-only

**Supervisor Sign-Off:**
- Mandatory. No delivery without QC approval.
- Hard lock: system will not allow delivery without QC sign-off
- No exceptions unless Owner overrides with audit trail

**Rework Flow:**
- If QC fails, job returns to technician with specific notes on what needs fixing
- Rework tracked: who caused it, what material was wasted, whether customer noticed

**Delivery Checklist (all mandatory, no exceptions):**
- Car cleaned
- Demo given to customer
- Invoice explained
- Warranty card handed over
- Old parts returned (if applicable)
- Payment confirmed
- Customer signature at delivery

---

### MODULE 7: INVOICING AND PAYMENTS

**Invoice Generation:**
- Auto-generated from completed job card
- GST-compliant: CGST + SGST auto-calculated (single GSTIN)
- Professional PDF with all line items, GST breakup, payment terms

**Payment Recording:**
- Track by method: Cash, Card, UPI, EMI
- Partial payment tracking: 50% advance + 50% final balance
- Payment receipt generation

**Hard Locks:**
- No car release without payment rule satisfied
- No invoice edit after payment without Owner override (audit-logged)

**Payment Tracking:**
- Collection aging: overdue payments at a glance
- Receivable tracking: who owes how much, for how long
- Gross booking value vs billed value vs collected value

---

### MODULE 8: QUALITY CERTIFICATE

**Auto-Generation Trigger:**
- After full payment confirmed AND QC passed

**Certificate Contents:**
- Customer name and contact details
- Vehicle details
- Complete work summary (what was done)
- QC inspection confirmation
- Inspection points for each vertical covered
- Warranty terms per service
- Confirmation that warranty cards are provided

**Warranty Terms:**
- Interiors: up to 5-10 years depending on product
- Electronics: typically 1-2 years

**Technical:**
- Serial numbering: sequential (0001, 0002... or 0.1, 0.2 style as per questionnaire)
- PDF format for physical printing and digital sharing
- No QR code required
- Linked to job card and invoice

---

### MODULE 9: INVENTORY MANAGEMENT

**Product Master:**
- Approximately 200+ SKUs
- Fields: brand, unit (mostly pieces), serial number tracking where needed

**Stock Operations:**
- Current quantities visible at a glance
- Auto-deduction when technician logs material usage in job card
- Stock reservation against confirmed bookings
- Reserved stock not available for other jobs

**Transaction History:**
- Full log of every stock movement: in, out, reserved, adjusted

**Special Cases:**
- Supplier returns: track defective or warranty returns to vendors
- Customer-supplied parts: flag when customer brings own parts, charge installation only
- Dead stock and slow-moving stock visibility
- Damaged stock tracking

**Alerts:**
- Minimum stock alerts: not required (per questionnaire)
- No auto purchase order generation (direct vendor calls preferred)
- No supplier master required

**Export:**
- Inventory reports exportable as CSV or Excel for manual Tally import

---

### MODULE 10: FAULT AND COMEBACK TRACKING

**Trigger:**
- Customer returns with an issue after delivery
- Logged against original job card and invoice

**Captured Information:**
- Original invoice and job card reference
- Complaint date
- Issue category
- Severity level (minor, major, unsafe, customer-visible, internal-only)
- Root cause analysis
- Action taken
- Cost to company
- Material wastage from failed jobs
- Resolution date

**Issue Status Flow:**
- Reported
- Under Review
- Rework Scheduled
- Resolved
- Closed

**Metrics:**
- Comeback rate per 100 deliveries
- Tracked by category and by technician
- Dashboard visibility for owner

---

### MODULE 11: WHATSAPP COMMUNICATION LOG

**Phase 1 (Manual Logging):**
- Log all WhatsApp conversations per customer inside the CRM
- Communication timeline visible on every lead and customer page

**Template Messages (ready to copy-paste):**
- Booking confirmation
- Job started notification
- Job completed notification
- Invoice sharing
- Follow-up messages
- Birthday wishes
- Quotation sharing
- Offer broadcasts
- PPF and ceramic service reminders (7-day and 30-day)

**Future-Ready Architecture (Phase 2+):**
- WhatsApp Business API integration when account is set up
- Templates become auto-send triggers
- Automated flows:
  - Instant lead response
  - Follow-up reminders
  - Booking confirmation
  - Job progress updates
  - Completion alerts
  - Invoice reminders
  - Service reminders
  - Smart templates with personalization
  - Broadcast campaigns
  - Follow-up escalation

**Communication Channels:** WhatsApp only. No SMS or email.

---

### MODULE 12: TALLY EXPORT

**Approach:** Manual export (no API required for Phase 1)

**Tally Version:** Tally Prime (hosted on LAN server)

**Exports Available:**
- Sales invoices as CSV or Excel in Tally-compatible format
- Payment receipts
- Purchase and inventory data
- GST reports (GSTR-1 compatible)
- One-click export for any date range

**GST Filing:** Monthly

**Future-Ready:** System architecture supports automatic Tally connector for real-time sync in later phases

---

### MODULE 13: DASHBOARDS AND REPORTS

**Owner Dashboard (real-time, single screen):**
- Today's enquiries, bookings, collections
- Active job cards with progress
- Pending deliveries and pending QC
- Open faults and overdue follow-ups
- High-discount deals flagged
- Jobs delivered with pending issue flag
- Open job value stuck in workshop

**Daily Reports Delivered To:** Anuj, Lakshith, Chayan
**Report Formats:** Bullet summary + Table format + Detailed
**Insight Depth:** Daily (moderate), Weekly (deep analysis), Monthly, Annually
**Delivery:** Dashboard + Weekly email + WhatsApp (future)

**AI Reports Structure - Metrics:**
1. Leads generated (source-wise)
2. Conversions (number and percentage)
3. Revenue (category-wise)
4. Active jobs
5. Completed jobs
6. Pending QC
7. Outstanding payments with ageing

**Full Reports List:**
- Daily, weekly, monthly sales
- Salesperson performance: leads handled, conversions, revenue generated, discount percentage given
- Technician productivity: jobs completed, average time per job, comeback rate
- Lead source ROI: which marketing channel brings most revenue per rupee spent
- Conversion funnel: how many leads convert at each stage, where they drop off
- Revenue by vertical (Audio, Interior, PPF, OEM, Custom, Lighting)
- Promised vs actual delivery dates (delay tracking)
- Inventory status and dead stock
- Quality score: total jobs vs faults
- Collection aging and receivables
- Job aging report
- High-discount deals report
- Missed follow-up escalation report
- Technician comeback-rate report
- Salesperson conversion report
- Supplier outstanding and aging
- Slow-moving, dead, and damaged stock report
- Total purchases
- Marketing expenditure
- Daily expenses
- Supplier payments and outstanding balances
- Attendance reports
- Salary reports

**KPIs Tracked:**
- Revenue
- Conversion rate
- Average ticket size
- Marketing performance

**All reports filterable by:** Date range, vertical, salesperson, technician

---

### MODULE 14: HR MANAGEMENT

**Features:**
- Staff list with roles and salary information
- Basic attendance tracking: Present, Absent, Half-Day
- Monthly salary records
- Staff payment tracking

**Users at Launch:** 6-8 users (team expands in 2-3 months)

---

### MODULE 15: AI INTELLIGENCE LAYER (Phase 2 but architecture ready in Phase 1)

**AI Sales Assistant:**
- Suggests best services and upsells based on customer profile and car

**AI Business Insights:**
- Ask questions in plain English about business performance

**AI Follow-Up Optimization:**
- Suggests best timing and priority leads for follow-up

**AI Customer Segmentation:**
- Groups customers into: high-value, repeat, at-risk

**AI Recommendation Engine:**
- Suggests add-ons and future services per customer history

---

## 7. APPROVAL AND OVERRIDE RULES

| Action | Default Rule | Override By |
|--------|-------------|-------------|
| Discount above 5% | Blocked | Manager (up to 20%) |
| Discount above 20% | Blocked | Owner only |
| Job start without advance | Blocked unless approved | Manager with documented reason |
| Delivery without QC | Blocked | Not recommended; Owner only in extreme cases |
| Invoice edit after payment | Blocked | Owner only |
| No car release without payment | Blocked | Owner only |
| Use substitute product | Blocked until customer approval | Sales + Manager |
| Free add-ons | Blocked | Manager + Owner notification |
| Payment overrides | Blocked | Owner approval |

---

## 8. SYSTEM HARD LOCKS (CANNOT BE BYPASSED)

These rules are enforced by the system. No one can skip them without Owner-level override that is audit-logged:

1. No job card without approved quotation and advance received
2. No delivery without QC sign-off
3. No car release without payment rule satisfied
4. No invoice edit after payment recording
5. No discount above 5% without Owner or Manager approval (tiered by amount)
6. Every discount requires a documented reason code
7. Every financial edit is audit-logged: who, what, when
8. Photos are mandatory for every job (minimum 4-6)
9. Deal lost requires mandatory reason selection
10. No invoice can be edited after payment entry without Owner approval
11. No job starts without approved quotation and advance (Manager override allowed with reason)

---

## 9. MASTER DATA STRUCTURES

### Car Master
- Make
- Model
- Variant
- Year
- Segment (Hatchback, Sedan, SUV, Luxury)
- Common notes

### Service Master
- Each of the 6 verticals broken into actual service items and packages
- 4 tiers per service: Essential, Enhanced, Elite, Luxe
- Price per car segment

### Product Master
- SKU
- Brand
- Unit (mostly pieces)
- Warranty
- Serial tracking (yes or no)
- Vendor
- Cost
- Selling range

### Issue Master
- Common fault categories per vertical
- Root cause codes

### QC Template Master
- QC checklist per vertical (items defined by AOTIC)

### WhatsApp Template Master
- Templates per scenario in English (Tamil for future)

### Deal Lost Reason Master
- Price concerns
- Product or quality satisfaction
- Overall experience
- Customer changed mind
- Chose cheaper brand
- Other

### Discount Reason Code Master
- Configurable list maintained by Owner

---

## 10. WORKFLOW STATUS LADDERS

### Lead Status Ladder
- New
- Hot
- Warm
- Cold
- Lost

### Booking Status Ladder
- Pending Advance
- Advance Received
- Confirmed
- Cancelled

### Workshop Status Ladder
- Job Created
- In Progress
- Pending QC
- QC Passed

### Payment Status Ladder
- Advance Pending
- Advance Received
- Partial Payment
- Payment Completed

### QC Status Ladder
- Not Started
- In QC
- QC Passed
- Rework Required
- Rework Done

### Issue / Warranty Status Ladder
- Reported
- Under Review
- Rework Scheduled
- Resolved
- Closed

### Full Job Status Ladder (13 stages as defined in Module 5)
1. Lead Created
2. Inspection Done
3. Quotation Shared
4. Approved by Customer
5. Advance Received
6. Job Created
7. In Progress
8. Pending QC
9. QC Passed
10. Ready for Billing
11. Payment Completed
12. Ready for Delivery
13. Delivered

---

## 11. UI/UX REQUIREMENTS

- Lead entry in under 45 seconds
- Quotation in under 2 minutes
- Technician screens: big buttons, minimal typing, photo-first workflow
- Owner dashboard: fewer numbers, stronger numbers - no clutter
- Every screen must show the next action clearly: follow up, approve, assign, issue material, collect payment, close QC, deliver car
- Mobile-first for technicians (mobile phones)
- Desktop and tablet for managers and owners
- Web application: works on Chrome, Safari, Edge on desktop, laptop, tablet, and mobile
- Quotation view must be beautiful and fast (customer-facing)
- CRM design: extremely simple and easy to use (per client requirement)

---

## 12. TECHNOLOGY REQUIREMENTS

- **Platform:** Web application (cloud-hosted, no server maintenance)
- **Browser Support:** Chrome, Safari, Edge
- **Device Support:** Desktop, laptop, tablet, mobile
- **Authentication:** Email + password
- **Access Control:** Role-based (7 roles)
- **Data Encryption:** Required
- **Backup and Disaster Recovery:** Required
- **Audit Trails:** Required (financial traceability preferred)
- **Regulatory Requirements:** None specific beyond GST
- **Data Export:** Owner only
- **Scalability:** Built to support 50+ branches; adding branches later is configuration, not rebuild
- **Tally Integration:** Manual CSV/Excel export for Phase 1; auto-sync architecture for future
- **WhatsApp API:** Not configured yet; manual logging Phase 1, API-ready architecture required
- **OpenAI API:** To be integrated securely
- **Speed:** Designed for fast operations; lead in 45 seconds, quotation in 2 minutes

---

## 13. PHASE-WISE DEVELOPMENT PLAN

### Phase 1 - Core Operations (Non-Negotiable)
**Target Go-Live:** First week of April

| Week | Modules |
|------|---------|
| Week 1 | Foundation: Login, Roles, Permissions, App Structure, Master Data; Lead Management and Sales Pipeline |
| Week 2 | Quotation Builder with Discount Control; Booking and Advance Payment |
| Week 3 | Job Card and Workshop Management (including mobile technician view); QC Module and Delivery Checklist |
| Week 4 | Invoicing, Payments and GST; Quality Certificate Generation; Inventory Management; Fault/Comeback Tracking; WhatsApp Communication Log; Tally Export; Dashboards and Reports; HR Basics |
| Throughout | Testing, Bug Fixes, Refinements |

**Phase 1 Complete Module List:**
1. Login and User Management
2. Lead Management and Sales Pipeline
3. Quotation Builder
4. Booking and Advance Payment
5. Job Card and Workshop Management
6. Quality Control
7. Invoicing and Payments
8. Quality Certificate
9. Inventory Management
10. Fault/Comeback Tracking
11. WhatsApp Communication Log (manual)
12. Tally Export (manual)
13. Dashboards and Reports
14. HR Management (basic)

### Phase 2 - Control and Accountability
- Fault/comeback tracking (deeper)
- Deeper analytics
- Supplier control
- Stock reservation enhancement
- Bay planning (capacity calendar by technician and bay)
- WhatsApp Business API integration and automation
- AI Intelligence Layer activation
- More advanced reporting

### Phase 3 - Scale and Intelligence
- Selected automation
- AI summaries and forecasting
- Branch-readiness architecture for multi-location
- Richer forecasting
- Auto-purchase orders (optional)
- Customer self-service portal
- TV dashboard for showroom

---

## 14. DEFERRED FEATURES (DO NOT BUILD IN PHASE 1)

| Feature | Reason |
|---------|--------|
| Customer Self-Service Portal | Not needed for launch |
| Multi-Branch Support | Single branch first; architecture must support it later |
| AI Interior Visualization | Needs training data and portfolio photos |
| AI Audio/Lighting Recommendation Engine | After core operations are stable |
| AI Business Dashboard (plain English questions) | Phase 2 |
| Auto Purchase Orders | Direct vendor calls preferred |
| WhatsApp Auto-Send | No API account set up yet |
| TV Dashboard for Showroom | Owner dashboard on laptop serves same purpose |
| Heavy CRM email logic | Business runs on WhatsApp and calls |
| Complex customer retention modules | Fix clean delivery and quality first |
| Over-engineered lead scoring | Keep classification simple: Hot/Warm/Cold/Lost |

---

## 15. COMMERCIALS AND PAYMENT STRUCTURE

**Development and Setup (One-Time):** INR 65,000
- Includes: complete system development (all modules), WhatsApp automation setup, AI features integration, deployment, testing, and training

**Payment Terms:**
- INR 32,500 (50%) at project start
- INR 32,500 (50%) at go-live

**Monthly Maintenance:** INR 5,000 per month
- Includes: hosting and infrastructure, support and updates, bug fixes and minor improvements

**Third-Party Costs (Future):**
- WhatsApp API: INR 1,000 to 5,000 per month (when configured)

---

## 16. REQUIREMENTS FROM CLIENT BEFORE BUILD

1. Brand assets: logo file, preferred colors, font preferences
2. Service and package price list: all 4 tiers across 6 verticals with car segment pricing
3. QC checklist items per vertical
4. Sample documents: existing quotation, invoice, or certificate format
5. Staff list: names, roles, and contact details for all users
6. Common deal lost reasons

---

## 17. OPERATIONAL NOTES FOR DEVELOPMENT

### Key Business Rules to Enforce in Code
- No job can be closed unless payment status, QC status, and delivery checklist status are all complete
- The system must compare quoted value vs invoiced value vs collected value automatically
- If follow-up is overdue by 24 hours, escalate automatically to manager
- All discount-related actions must generate a reason-code entry; no reason means no discount applied
- Promised delivery date must be red-flagged if impossible based on current open jobs and technician load

### Data Sensitivity
- Margin visibility: Owner only (branch manager optional, configurable)
- Financial data: Owner and Accounts roles
- Technician data: their own jobs only

### Photo Handling
- Stage-wise photos required for hidden work (damping, wiring, tuning, harness)
- Photos stored per job with stage labels: intake, dismantling, mid-work, post-fitment, final delivery
- Minimum 4-6 photos per job enforced at system level before job can move to QC

### Customer Experience Flow
- Enquiry to quick lead capture to requirement note to quotation to approval to booking to advance to stock reservation to job card to technician assignment to QC to billing to payment to delivery to issue/warranty tracking
- This flow visible as one clean status ladder
- Everyone must know where a job is stuck at any moment

### Inventory Notes
- Customer-supplied parts must be flagged in the system; charge installation only
- Stock reservation happens at booking confirmation, not at job card creation
- Supplier returns tracked for defective or warranty cases only

### WhatsApp Notes
- All templates available in English
- Tamil support to be added later
- All communication logged against the specific lead or customer record
- PPF/ceramic customers: system must schedule and send reminders at 7-day and 30-day intervals post-delivery

### Quality Certificate Notes
- Physical certificate handed to customer
- Digital PDF also available for sharing
- Serial number format: 0001, 0002 or 0.1, 0.2 (confirm with client)
- No QR code required

---

## 18. SUMMARY METRICS

| Metric | Value |
|--------|-------|
| Total Modules (Phase 1) | 14 (plus AI layer architecture) |
| User Roles | 7 |
| Business Verticals | 6 |
| Hard Locks | 11 |
| Workflow Status Stages | 13 |
| Reports and Dashboards | 15+ |
| Approximate SKUs | 200+ |
| Launch Team Size | 6-8 users |
| Payment Methods | 4 (Cash, Card, UPI, EMI) |
| Target Go-Live | First week of April |
| GST Rate | 18% (CGST + SGST) |
| Advance Requirement | 50% before job start |
| Max Discount Without Approval | 5% |
| Minimum Photos Per Job | 4-6 |
| Average Job Duration | 3 days |