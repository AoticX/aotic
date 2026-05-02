# AOTIC CRM — Complete End-User Guide

## What Is AOTIC CRM?

AOTIC CRM is the all-in-one platform for AOTIC automotive service centre. It manages every step of a customer's journey from the moment they enquire, all the way through workshop work and final delivery.

**The Core Workflow:**
Lead → Quotation → Booking → Job Card → Workshop → Quality Check (QC) → Invoice → Delivery

Every customer starts as a **Lead**. Once they accept a quote and pay an advance, a **Booking** is created. A **Job Card** tracks the workshop work. After QC passes, an **Invoice** is raised and the vehicle is delivered.

**Company Details:**
- Name: AOTIC
- GSTIN: 33ACLFA6510A1Z1
- Address: No. 28, 200 Feet Bypass Road, Maduravoyal, Chennai - 600095

---

## Roles & What Each Role Can Do

AOTIC has 7 roles. Each role sees only the pages relevant to their work.

### Owner
- Full access to everything in the system
- Approves discounts greater than 5%
- Can override the 50% advance requirement with a documented reason
- Manages all staff, branches, and settings
- Views all analytics and revenue reports
- Can delete leads (if no job cards exist)
- Dashboard at: `/owner`

### Branch Manager (Supervisor)
- Manages day-to-day operations
- Creates job cards from confirmed bookings
- Assigns technicians and QC inspectors
- Approves advance overrides (below 50%) with a documented reason
- Signs off on QC
- Cannot manage other branch managers or owners
- Dashboard at: `/manager`

### Sales Executive
- Creates and manages leads assigned to them
- Creates quotations and bookings for their leads
- Can apply discounts up to 5% without approval
- Discounts above 5% automatically go to the owner for approval
- Dashboard at: `/sales`

### Front Desk
- Books walk-in customers as leads
- Tracks vehicle status for customers who enquire
- Communicates with customers about their vehicle progress
- Dashboard at: `/front-desk`

### Accounts & Finance
- Creates and finalises invoices
- Records payments (cash, UPI, card, cheque, GPay, Bajaj Finance, EMI, bank transfer)
- Exports invoices to Tally
- Views financial reports and revenue summaries
- Dashboard at: `/accounts`

### Workshop Technician (Mobile)
- Views assigned job cards on their phone
- Uploads intake, progress, and completion photos
- Updates job status as work progresses
- Minimum 4 photos required (at least 1 before, 1 during, 1 after)
- Mobile interface at: `/technician`

### QC Inspector (Mobile)
- Reviews completed jobs before delivery
- Fills QC checklist per service vertical
- Passes job (triggers invoice creation) or flags rework
- Mobile interface at: `/qc`

---

## Leads — Managing Prospective Customers

### What Is a Lead?
A lead is a prospective customer who has shown interest in AOTIC's services. Every client journey starts with a lead. In AOTIC, "client" and "lead" refer to the same prospective customer before a booking is confirmed. After a booking, they become a confirmed customer.

### How to Create a Lead
1. Go to your dashboard (Sales: `/sales`, Front Desk: `/front-desk`, Manager: `/manager`)
2. Click **"New Lead"** or **"+ Add Lead"**
3. Fill in the required fields:
   - **Customer Name** (required): Full name of the person
   - **Phone Number** (required): 10–15 digit mobile number
   - **Lead Source** (required): Where did this lead come from? Options: Walk-in, Phone, WhatsApp, Instagram, Facebook, Referral, Website, Other
   - **Status** (required): Usually starts as "Hot"
4. Optional fields:
   - Email address
   - Car brand (e.g., Maruti, Hyundai, Tata)
   - Car model (e.g., Swift, i20, Nexon)
   - Registration number (number plate)
   - Service interest (what services they want)
   - Estimated budget
   - Service vertical (type of service)
5. Click **Save / Create Lead**

The lead is automatically assigned to you and linked to your branch.

### Lead Statuses — What They Mean

| Status | What It Means | What to Do Next |
|--------|--------------|-----------------|
| **Hot** | High-priority, interested customer | Follow up immediately, create quotation |
| **Warm** | Interested but not urgent | Nurture with follow-ups |
| **Cold** | Low interest currently | Keep in pipeline, reach out later |
| **Booked** | Booking created for this lead | Job card creation is next |
| **Inspection Done** | Vehicle was inspected | Can create another quotation if needed |
| **Lost** | Customer did not proceed | Requires a mandatory "Lost Reason" — cannot be undone |

### How to Mark a Lead as Lost
1. Open the lead
2. Change status to **Lost**
3. You **must** select a **Lost Reason** from the dropdown — this is mandatory and cannot be skipped
4. Optionally add notes explaining the reason
5. Save. Lost leads cannot be reverted.

### How to Assign a Lead to Another Staff Member
- Only Owners and Branch Managers can reassign leads
- Open the lead → click "Assign" → select the staff member from the dropdown

### How to Find a Client's Lead
- Sales Executives: See only their own assigned leads
- Managers and Owners: See all leads
- Use the search bar to find by name, phone number, or registration number

---

## Quotations — Creating Price Estimates

### What Is a Quotation?
A quotation is a detailed price estimate given to the customer. It lists services, quantities, prices, and any discounts.

### How to Create a Quotation
1. Open a lead
2. Click **"Create Quotation"** or go to the Quotations section
3. Fill in service line items:
   - Service/product description
   - Quantity
   - Unit price (GST-inclusive)
   - Optional: tier (Essential / Enhanced / Elite / Luxe), segment (Hatchback / Sedan / SUV / Luxury)
4. Add installation charges separately if applicable (18% GST applies on installation)
5. Apply a discount if needed:
   - **Up to 5%**: Auto-approved, no extra steps
   - **More than 5%**: Requires selecting a discount reason AND goes for owner approval
6. Set a validity date (optional)
7. Add notes for the customer (optional)
8. Click **Save**

### Quotation Statuses

| Status | What It Means |
|--------|--------------|
| **Draft** | Being prepared, not yet sent to customer |
| **Pending Approval** | Discount >5% — waiting for owner to approve |
| **Approved** | Owner approved the discount |
| **Sent** | Quotation sent to customer |
| **Accepted** | Customer agreed to the quotation — ready for booking |
| **Rejected** | Customer declined — final state |

### Discount Rules — Important!
- **0–5% discount**: Sales executive can apply directly. Just select a discount reason from the dropdown.
- **More than 5% discount**: The quotation automatically goes to **Pending Approval**. The owner receives a notification and must approve before you can send it to the customer.
- **All discounts require a reason code** — you cannot apply any discount without selecting a reason from the list.

### How to Send a Quotation to a Customer
1. Open the quotation (must be in Draft or Approved status)
2. Click **"Send to Customer"**
3. The status changes to "Sent"
4. Customer can be informed via WhatsApp or PDF share

### How the Customer Accepts a Quotation
- When the customer agrees, the front desk or sales executive marks it as **Accepted**
- This unlocks the option to create a booking

### Pricing Logic
- Product prices are **GST-inclusive** (18% GST already in the price)
- Installation charges are **GST-exclusive** — 18% GST is added separately on top
- Final total = (Product subtotal − Discount) + Installation charges + Installation GST

---

## Bookings — Confirming the Appointment

### What Is a Booking?
A booking is a confirmed appointment after the customer has accepted the quotation and paid an advance amount.

### How to Create a Booking
1. The quotation must be in **Accepted** or **Approved** status — bookings cannot be made from draft or sent quotations
2. Open the quotation → click **"Create Booking"**
3. Fill in:
   - **Promised Delivery Date** (required): When the vehicle will be ready
   - **Advance Amount** (required): Must be at least 50% of the total
   - **Payment Method**: Cash, Card, GPay, Bajaj Finance, etc.
   - Optional: assigned bay, notes
4. Click **Confirm Booking**

### Advance Payment Rule — 50% Minimum
- By default, the advance must be at least **50%** of the total amount
- If you try to enter less than 50%, the system will block the booking
- **Override (Manager/Owner only):** Branch managers and owners can override this with a written reason of at least 20 characters explaining why a lower advance is acceptable. The override is logged for auditing.

### Booking Statuses

| Status | What It Means |
|--------|--------------|
| **Quote Accepted** | Quotation accepted, advance not yet paid |
| **Advance Pending** | Waiting to receive advance payment |
| **Confirmed** | Advance received, booking is locked in |
| **Scheduled** | Job card created, vehicle is in the system |
| **Cancelled** | Booking was cancelled — cannot be reversed |

### What Happens After Booking is Confirmed?
- The advance payment is automatically recorded
- The system redirects to **Job Card Creation**
- A Branch Manager or Owner must create the job card

---

## Job Cards — Tracking Workshop Work

### What Is a Job Card?
A job card is the internal document that tracks all work done on a vehicle in the workshop. It records intake details, photos, technician assignments, QC, and delivery.

### How to Create a Job Card
Only **Branch Managers** and **Owners** can create job cards.

1. Go to the confirmed booking → click **"Create Job Card"**
2. Fill in vehicle intake details:
   - **Registration Number** (required): Vehicle number plate
   - **Odometer Reading**: Current km reading
   - **Fuel Level**: Percentage (0–100%)
   - **Body Condition Map**: Mark any existing damage on a vehicle diagram
   - **Customer Concerns**: What the customer told you about the vehicle
   - **Belongings Inventory**: List of items left in the vehicle
3. Assign:
   - **Workshop Technician** (required): The technician who will do the work
   - **QC Inspector / Supervisor** (required): Who will inspect the work
4. Assign a **Bay Number** and **Estimated Completion Date**
5. Save — the job card is now in **"Created"** status

### Viewing a Client's Job Card Status
- Owners and Managers: See all job cards on the dashboard
- Front Desk: Search by registration number or customer name to find vehicle status
- Technicians: See only their assigned job cards on mobile

### Job Card Statuses — Complete Progress

| Status | What It Means for the Client |
|--------|------------------------------|
| **Created** | Vehicle received, intake done |
| **In Progress** | Technician is working on the vehicle |
| **Pending QC** | Work complete, waiting for quality inspection |
| **QC Passed** | Quality check passed — ready for billing |
| **Rework Scheduled** | QC found issues — technician will redo some work |
| **Ready for Billing** | Invoice created and finalised |
| **Ready for Delivery** | Vehicle fully paid and ready to collect |
| **Delivered** | Vehicle handed over to customer |
| **Cancelled** | Job was cancelled |

### How to Track a Specific Client's Vehicle
1. Go to your dashboard → use the **Search** or **Jobs** section
2. Search by:
   - Customer name
   - Phone number
   - Vehicle registration number (number plate)
3. Click on the result to see the full job card with current status, photos, and next steps

---

## Workshop Technician Workflow

### How Technicians Use AOTIC (Mobile)

**Step 1 — View Assigned Jobs**
- Log in on your phone at `/technician`
- See your list of assigned job cards

**Step 2 — Intake Photos (Before Stage)**
- At vehicle intake, take at least 1 photo of the vehicle's current condition
- Upload as "Before" photos
- Mark any existing damage on the body condition map

**Step 3 — Work in Progress (During Stage)**
- As you work, upload at least 1 photo showing work in progress
- Log updates to the job card

**Step 4 — Completion Photos (After Stage)**
- After completing the work, take at least 1 photo of the finished result
- Upload as "After" photos
- Minimum total: **4 photos** across all stages (before + during + after)

**Step 5 — Submit for QC**
- Once photos are uploaded (minimum 4), the job moves to **Pending QC**
- The QC inspector is notified

### Photo Requirements (Hard Enforced)
- Minimum 4 photos total
- Must have at least 1 in each stage: Before, During, After
- Cannot move to QC without meeting this minimum
- Photos are uploaded to the cloud (Cloudinary)

---

## QC Inspector Workflow

### How QC Works (Mobile)

**Step 1 — View Pending QC Jobs**
- Log in at `/qc`
- See jobs awaiting quality inspection

**Step 2 — Inspect the Vehicle**
- Go through the checklist items for this service type
- Mark each item as: Pass, Fail, or N/A (Not Applicable)

**Step 3A — If Everything Passes**
- All items are Pass or N/A → click "Sign Off"
- Job automatically moves to **QC Passed**
- Invoice can now be created
- Notifications sent to accounts team, front desk, and managers

**Step 3B — If Something Fails**
- Mark the failing items as Fail
- Add rework notes (mandatory when any item fails): explain what needs to be fixed
- Optionally take a photo of the failure
- Click "Submit" — job moves to **Rework Scheduled**
- Technician is notified to redo the work

**After Rework**
- Technician completes rework → resubmits to QC
- QC inspector reviews again from scratch
- Cycle repeats until QC passes

---

## Invoices & Payments

### What Is an Invoice?
An invoice is the final billing document raised after QC is passed. It shows all services, GST breakdown, and payment details.

### GST Breakdown (Tamil Nadu)
- Total GST: 18%
- Split as: CGST 9% + SGST 9%
- GSTIN: 33ACLFA6510A1Z1

### How to Create an Invoice
Only **Accounts & Finance** users create invoices.

1. QC must be signed off first — cannot create invoice without QC pass
2. Go to the job card → click **"Create Invoice"**
3. The system auto-populates items from the quotation
4. Review and adjust if needed
5. Click **"Finalise Invoice"**
6. Status becomes "Finalised" — now ready to collect payment

### Invoice Statuses

| Status | What It Means |
|--------|--------------|
| **Draft** | Being prepared |
| **Finalised** | Ready for payment collection |
| **Partially Paid** | Some amount received, balance due |
| **Paid** | Fully paid — vehicle can be delivered |
| **Void** | Invoice cancelled |

### How to Record a Payment
1. Open the invoice → click **"Record Payment"**
2. Enter:
   - Amount paid
   - Payment method: Cash, UPI, Card, Cheque, GPay, Bajaj Finance, EMI, Bank Transfer
   - Payment date
   - Reference number (if applicable)
3. Save — the "Amount Due" updates automatically

### Delivery Gate — Important Rule
A vehicle **cannot be released to the customer** until the invoice shows **Amount Due = ₹0** (fully paid). This is enforced by the system. Even if QC passed, if there is any outstanding balance, delivery cannot proceed.

### How to Export to Tally
1. Go to the Accounts dashboard
2. Select the invoices to export
3. Click "Export to Tally" — downloads in Tally-compatible format

---

## Delivery Process

### How to Deliver a Vehicle

1. **Invoice must be fully paid** (Amount Due = ₹0)
2. Bring the customer to the vehicle
3. Capture **delivery signature** — customer signs on screen
4. Record the **delivery checklist** (verify belongings returned, spare parts present)
5. Click **"Mark as Delivered"**
6. Job card status changes to **Delivered** — this is the final state

### What the Customer Gets at Delivery
- The vehicle
- All belongings listed in the inventory
- Spare parts (if any were checked in)
- Invoice copy (can be shared as PDF or WhatsApp message)

---

## Customer / Client Progress Tracking

### How to Check Where a Client's Vehicle Is

**For Front Desk:**
1. Go to `/front-desk` dashboard
2. Use the search bar — type customer name, phone, or registration number
3. The current job status is shown with the stage name

**For Sales Executives:**
1. Go to `/sales` → find the lead
2. The lead record shows the current stage: Booked, In Progress, QC, Invoiced, Delivered

**For Managers / Owners:**
1. Dashboard shows a live overview of all jobs
2. Filter by status, technician, or date
3. Click any job card for full details

### Status Progression for Clients

When a customer asks "Where is my car?", here is how to translate the system status:

| System Status | What to Tell the Customer |
|--------------|--------------------------|
| Created | "Your vehicle has been received and intake is complete. Work will start shortly." |
| In Progress | "Our technicians are currently working on your vehicle." |
| Pending QC | "Work is complete. Your vehicle is being inspected by our quality team." |
| Rework Scheduled | "Minor touch-ups were identified during quality check. Our team is addressing them." |
| QC Passed | "Quality check is complete! We are preparing your invoice now." |
| Ready for Billing | "Your invoice is ready. Please arrange payment to collect your vehicle." |
| Ready for Delivery | "Your vehicle is fully ready. You can come collect it at your convenience." |
| Delivered | "Vehicle was delivered on [date]." |

---

## Common Questions & Answers

### "How do I create a new customer / client?"
Customers in AOTIC are created as **Leads**. Go to your dashboard and click "New Lead". Fill in the customer's name, phone number, and lead source. You can add vehicle details and service interest as well. Once they book, they become a confirmed customer.

### "How do I find a customer's history?"
Search by name, phone number, or vehicle registration number from any dashboard. All leads, quotations, bookings, and job cards linked to that customer will appear.

### "A customer wants to know the status of their vehicle."
Go to the job card for their vehicle. The status column tells you the current stage. Use the translation table above to explain it to the customer.

### "I want to give a customer a discount. How do I apply it?"
Open the quotation, enter the discount percentage, and select a reason from the dropdown. Discounts up to 5% are approved immediately. Discounts above 5% require owner approval — the quotation goes to "Pending Approval" and the owner is notified.

### "A customer cannot pay 50% advance. What do I do?"
Only Branch Managers and Owners can override the 50% advance minimum. The override requires writing a reason (minimum 20 characters). The override is logged and the owner is notified. Contact your branch manager or owner to arrange the override.

### "The QC failed. What happens next?"
The job card moves to "Rework Scheduled". The QC inspector must provide rework notes explaining what needs to be fixed. The technician is notified and will redo the work. After the rework, the job goes back to QC for re-inspection.

### "Can I edit an invoice after payment is recorded?"
No. Once a payment is recorded, the invoice is locked and cannot be edited. If there is an error, contact the system owner to void and re-create the invoice.

### "How do I send a quotation PDF to the customer?"
Open the quotation and click "Generate PDF" or "Share". The system generates a PDF and you can share it via WhatsApp or download it. The PDF includes all service items, pricing, GST breakdown, and company details.

### "Who can see which leads?"
- Sales Executives see only leads assigned to them
- Front Desk can view leads and their associated job status
- Branch Managers and Owners see all leads across their branch

### "How do I record that a customer paid cash after vehicle collection?"
Go to Accounts → find the invoice → click "Record Payment" → select Cash as the payment method and enter the amount. If the full amount is paid, the invoice moves to "Paid" status.

### "What happens if QC passes?"
When QC passes, the following happens automatically:
1. Job card status changes to "QC Passed"
2. Accounts team is notified to create the invoice
3. Front desk is notified that the vehicle is ready for billing
4. Owner and branch manager are notified

### "Can a booking be cancelled?"
Yes, Branch Managers and Owners can cancel a booking. A cancelled booking cannot be reversed. Any advance paid would need to be handled through the accounts team separately.

### "What services does AOTIC offer?"
AOTIC offers automotive detailing and protection services across multiple service verticals including interior care, ceramic coating, paint protection film (PPF), paint correction, and other specialty treatments. The exact services and pricing are configured in the service packages module.

### "How do I know if a discount was approved?"
Go to the quotation. If it shows "Approved" status, the owner approved the discount. If it shows "Pending Approval", it is still waiting. The owner will receive a notification and can approve from their dashboard.

### "What payment methods do we accept?"
AOTIC accepts: Cash, UPI, Card (debit/credit), Cheque, GPay, Bajaj Finance, EMI, Bank Transfer.

### "How do I add a technician to a job card?"
Only Branch Managers and Owners can assign technicians. During job card creation, select the technician from the dropdown (only active technicians with the "Workshop Technician" role appear). You can also reassign a technician later if needed.

### "What is a service vertical?"
A service vertical is a category of service (e.g., Interior Care, Ceramic Coating, Paint Protection). Leads, quotations, and job cards are all tagged to a vertical for reporting purposes. QC checklists are also organized by vertical.

### "How does the advance payment get recorded?"
When a booking is created with an advance amount, the system automatically creates a payment record. You don't need to separately enter it in the invoicing module — it will appear as a deduction when the invoice is created.

### "What is the minimum advance amount?"
The minimum advance is **50% of the total booking value**. This can only be reduced by a Branch Manager or Owner with a documented reason. The system default can be changed by the Owner in Settings.

---

## Tips for Common Roles

### Tips for Sales Executives
- Always fill in the customer's phone number and lead source when creating a lead — these are required
- Create the quotation as soon as possible after the lead is created while interest is fresh
- For discounts above 5%, notify your manager/owner to check the approval notification promptly
- Update the lead status regularly so the dashboard gives accurate reports

### Tips for Front Desk
- When a walk-in customer arrives, create a new lead immediately with source "Walk-in"
- Use the search function to quickly find vehicles when customers call to ask for status
- The job status translation table above will help you explain status to customers accurately

### Tips for Workshop Technicians
- Take photos at every stage — before, during, after
- Minimum 4 photos are required; the system will not let you submit for QC without them
- Log any issues or concerns with the vehicle in the job card notes
- Once you submit for QC, wait for QC feedback before marking the job complete

### Tips for QC Inspectors
- Be thorough — the QC checklist is your sign-off on quality
- If anything fails, add clear rework notes so the technician knows exactly what to fix
- You can take photos of any failures directly from the QC screen
- Once you sign off, the accounts team is immediately notified

### Tips for Accounts & Finance
- You cannot create an invoice until QC is signed off — check the job card status first
- Always record the advance paid at booking as a separate note when finalising the invoice
- The vehicle cannot be delivered until Amount Due = ₹0 — remind customer to complete payment
- Use the Tally export feature at end of day or week for accounting reconciliation

---

## System Settings & Administration (Owner Only)

### Settings the Owner Can Change
- **Advance Percentage**: The minimum advance percentage required for bookings (default 50%)
- **Branch Details**: Company name, address, GSTIN
- **User Management**: Create, edit, activate, or deactivate staff accounts
- **Service Verticals**: Configure which service categories are available
- **Discount Reasons**: Add or edit the list of valid discount reason codes
- **Lost Reasons**: Add or edit the list of valid reasons for marking a lead as lost
- **QC Checklist Templates**: Configure QC checklist items per service vertical

### How to Add a New Staff Member (Owner / Manager)
1. Go to Settings → Staff Management
2. Click "Add Staff"
3. Fill in name, email, role, and branch
4. The staff member receives an email invitation to set their password
5. Their account is active once they complete registration

### How to Deactivate a Staff Member
1. Go to Settings → Staff Management
2. Find the staff member → click "Deactivate"
3. They can no longer log in; their historical records remain intact
