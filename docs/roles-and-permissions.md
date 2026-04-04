# Roles & Permissions Mapping

The system utilizes strict role-based access control. [cite_start]Each of the 7 designated roles sees and interacts only with data necessary for their specific function[cite: 26, 261, 262].

## 1. Owner / Super Admin
* [cite_start]**View**: Sees everything across all modules[cite: 18].
* [cite_start]**Do**: Full system configuration, data export (owners only)[cite: 801].
* [cite_start]**Approve/Override**: Approves discounts above 5%, overrides financial locks (e.g., editing invoices post-payment), and overrides delivery locks[cite: 18, 40, 89].

## 2. Branch Manager / Supervisor
* [cite_start]**View**: Full operational visibility (leads, jobs, schedules, inventory)[cite: 19].
* [cite_start]**Do**: Manages daily operations, manually assigns leads to sales executives, assigns technicians to jobs, manages bay capacity[cite: 19, 29, 58].
* [cite_start]**Approve/Override**: Can override the 50% advance payment rule (requires documented reason), and signs off on QC checklists[cite: 47, 68].

## 3. Sales Executive
* [cite_start]**View**: Leads (can see each other's leads), quotations, customer profiles, product catalogs[cite: 21, 651].
* [cite_start]**Do**: Handles leads, creates quotations, captures bookings, edits invoices they created (prior to payment recording)[cite: 21, 36, 655].
* [cite_start]**Approve/Override**: Can apply discounts up to 5% independently[cite: 39].

## 4. Workshop Technician
* **View**: Restricted mobile-friendly view. [cite_start]Sees only their specifically assigned jobs[cite: 22, 63, 656].
* [cite_start]**Do**: Uses a photo-first interface to start/stop task timers, upload mandatory photos, and log materials consumed (which auto-deducts from inventory)[cite: 22, 59, 60, 63].

## 5. QC Inspector
* **View**: Workshop jobs pending QC.
* [cite_start]**Do**: Fills out vertical-specific QC checklists (Pass/Fail, notes, photos), flags jobs for rework[cite: 23, 66, 67, 69].
* [cite_start]**Approve/Override**: Signs off on completed work to unlock the delivery phase[cite: 23, 68]. *(Note: Often performed by Supervisor/Manager).*

## 6. Accounts / Finance
* [cite_start]**View**: Financial modules, invoices, payment records, Tally export screens[cite: 24].
* [cite_start]**Do**: Records payments (cash, UPI, card, EMI), finalizes invoices, manages Tally CSV/Excel exports[cite: 24, 50, 82].

## 7. Front Desk / Customer Support
* [cite_start]**View**: Lead intake forms, customer communication timelines[cite: 25, 130].
* [cite_start]**Do**: Quick lead entry, manages communication logs (WhatsApp tracking)[cite: 25, 122].
