# AOTIC CRM — User Guide

---

## Existing Accounts

| Email | Role | Name |
|---|---|---|
| contact@automateo.info | owner | Mokssh Jaiin |
| alpha@automateo.info | owner | Alpha Admin |

**Passwords are not stored in plain text.** To set/reset a password:
1. Go to Supabase dashboard → Authentication → Users
2. Click the three-dot menu next to the user
3. Select **Send password recovery** or **Reset password**

---

## Roles and What They Can Do

| Role | Access | Interface |
|---|---|---|
| `owner` | Everything — leads, quotes, approvals, jobs, invoices, reports | Desktop |
| `branch_manager` | Everything except owner-level discount approval | Desktop |
| `sales_executive` | Leads, quotations, bookings | Desktop |
| `accounts_finance` | Invoices, payments, Tally export | Desktop |
| `front_desk` | View leads, create basic entries | Desktop |
| `workshop_technician` | Own job cards only — timer, photos, materials | Mobile |
| `qc_inspector` | QC checklist queue | Mobile |

---

## How to Add a New Staff Account

### Step 1 — Create the auth user

1. Go to [supabase.com](https://supabase.com) → your project → **Authentication → Users**
2. Click **Add user → Create new user**
3. Enter their email and a temporary password
4. Click **Create user**
5. Copy the **User UID** shown in the list

### Step 2 — Set their role

Go to **SQL Editor** and run:

```sql
UPDATE profiles
SET
  role = 'sales_executive',   -- change to the desired role
  full_name = 'Staff Name'    -- their display name
WHERE id = 'paste-user-uid-here';
```

Available role values:
- `owner`
- `branch_manager`
- `sales_executive`
- `workshop_technician`
- `qc_inspector`
- `accounts_finance`
- `front_desk`

### Step 3 — Share credentials

Send the staff member their email + temporary password. They log in at `/login` and should change their password immediately.

---

## How to Deactivate an Account

```sql
UPDATE profiles SET is_active = false WHERE id = 'user-uid-here';
```

The user will be signed out on their next request and cannot log back in.

---

## Workflow: New Lead to Delivered Vehicle

```
Lead Created
    ↓
Quotation Built  (sales_executive)
    ↓
Discount > 5%?  → Owner Approval Required
    ↓
Quotation Accepted
    ↓
Booking Created  (50% advance required)
    ↓
Job Card Created  (branch_manager)
    ↓
Technician Assigned  → Technician works on mobile
    ↓  Timer / Photos (before/during/after, min 4) / Materials
QC Checklist Completed  (qc_inspector)
    ↓
Invoice Created  (accounts_finance)
    ↓
Payment Recorded  → Invoice auto-locks on first payment
    ↓
Mark Ready for Delivery  (balance must be zero)
    ↓
Delivery Handover Checklist + Customer Signature
    ↓
Delivered
```

---

## Key Hard Locks

| Lock | What happens if violated |
|---|---|
| Booking advance < 50% | Booking cannot be created. Manager can override with a mandatory reason (audit-logged). |
| Discount > 5% | Quotation goes to `pending_approval`. Owner must approve before it can be sent. |
| Less than 4 photos or missing any stage (before/during/after) | Technician cannot submit job for QC. |
| QC not signed off | Job cannot move to delivery. DB trigger blocks the status change. |
| Invoice not fully paid | Cannot mark ready for delivery. |
| Invoice edit after first payment | Invoice is locked. No edits possible. |
| Lost lead | Mandatory reason code required before status can be set to Lost. |

---

## Page Reference by Role

### Owner / Branch Manager
| Page | Path |
|---|---|
| Dashboard | `/owner` or `/manager` |
| All Leads | `/owner/leads` or `/manager/leads` |
| Discount Approvals | `/owner` (approval panel on dashboard) |
| Job Cards | `/manager/jobs` |
| New Job Card | `/manager/jobs/new` |
| Job Delivery | `/manager/jobs/[id]/delivery` |

### Sales Executive
| Page | Path |
|---|---|
| Leads | `/sales/leads` |
| New Lead | `/sales/leads/new` |
| Lead Detail | `/sales/leads/[id]` |
| Quotations | `/sales/quotations` |
| New Quotation | `/sales/quotations/new` |
| Bookings | `/sales/bookings` |
| New Booking | `/sales/bookings/new` |

### Accounts & Finance
| Page | Path |
|---|---|
| Dashboard | `/accounts` |
| Invoices | `/accounts/invoices` |
| Invoice Detail | `/accounts/invoices/[id]` |
| Payments | `/accounts/payments` |

### Workshop Technician (mobile)
| Page | Path |
|---|---|
| My Jobs | `/technician` |
| Job Detail | `/technician/[id]` |
| Upload Photos | `/technician/upload` |
| Timer | `/technician/timer` |

### QC Inspector (mobile)
| Page | Path |
|---|---|
| QC Queue | `/qc/checklist` |
| QC Job Detail | `/qc/[id]` |

---

## Tally Export

Go to **Accounts Dashboard** (`/accounts`) → click **Export to Tally CSV**. Downloads a `.csv` file compatible with Tally ERP's voucher import format covering all finalized invoices and payments.

---

## Photo Upload Requirements

- Minimum **4 photos** required before QC submission (across before/during/after stages)
- Photos are compressed automatically to max 1MB / 1920px before upload
- Requires Cloudflare R2 to be configured (see `dev-req.md`)
