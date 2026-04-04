# Core Workflows & Status Ladders

These represent the primary operational pipelines within the CRM.

## 1. Lead Management Pipeline
* [cite_start]**Status Ladder**: Hot → Warm → Cold → Lost[cite: 29, 267].
* [cite_start]**Capture Data**: Name, phone, car model, service interest, budget, source[cite: 29].
* [cite_start]**Mandatory Action**: If moving to "Lost", a reason code is strictly required[cite: 32].

## 2. Quotation Flow
* [cite_start]**Status Ladder**: Draft → Pending Approval (if discount >5%) → Approved/Sent → Accepted[cite: 36, 40].
* [cite_start]**Process**: User selects package tiers and car segments; system auto-fills pricing[cite: 36].
* [cite_start]**Data Output**: Version-controlled PDF generated for sharing[cite: 38, 41].

## 3. Booking & Capacity
* [cite_start]**Status Ladder**: Quote Accepted → Advance Pending → Confirmed/Scheduled[cite: 45, 46].
* [cite_start]**Process**: System enforces the 50% advance rule[cite: 46]. [cite_start]Upon confirmation, required materials are placed into "Stock Reservation" status[cite: 48].
* [cite_start]**Mandatory Data**: Promised delivery date must be captured[cite: 49].

## 4. Job Card & Workshop Tracking
* [cite_start]**Status Ladder**: Created → In Progress → Pending QC[cite: 64].
* **Intake Form (Mandatory Data)**:
    * [cite_start]Registration number, odometer reading[cite: 54, 56].
    * [cite_start]**Body condition map**: Existing scratches, dents, warning lights[cite: 55].
    * [cite_start]Customer concerns and intake notes[cite: 56, 57].
    * [cite_start]**Customer Digital Signature**: Required at intake to acknowledge pre-existing conditions[cite: 292, 501].
* [cite_start]**Execution**: Technicians log time, material usage, and upload mandatory stage-wise photos[cite: 59, 60, 61].

## 5. QC & Delivery Flow
* [cite_start]**Status Ladder**: Pending QC → QC Passed (or Rework Scheduled) → Ready for Billing → Ready for Delivery → Delivered[cite: 64, 119].
* [cite_start]**QC Process**: Supervisor completes Pass/Fail checklist and provides mandatory sign-off[cite: 67, 68].
* **Delivery Checklist (Mandatory Actions)**:
    * [cite_start]Car cleaned, demo given, invoice explained, warranty card handed over, old parts returned (if applicable)[cite: 72, 73, 74, 75, 76].
    * [cite_start]**Customer Signature**: Required at delivery handover[cite: 307].
