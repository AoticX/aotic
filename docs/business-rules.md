# Business Rules & Hard Locks

This document outlines the strict system rules that govern the AOTIC CRM. These locks cannot be bypassed unless explicitly overridden by authorized personnel.

## Financial & Discount Locks
* [cite_start]**70% Advance Rule**: The system enforces a minimum 70% advance payment before a job card can be created[cite: 46]. [cite_start]This can only be overridden by a Manager, and the override must include a documented reason and be audit-logged[cite: 47].
* [cite_start]**Discount Limit**: Sales executives can provide a maximum discount of up to 5% without approval[cite: 39]. 
* [cite_start]**Discount Approval**: Any discount exceeding 5% is blocked by the system until it receives Owner approval[cite: 40].
* [cite_start]**Mandatory Discount Reason**: Every discount, regardless of the percentage, requires a documented reason code[cite: 40, 206].
* [cite_start]**Invoice Editing**: No invoice can be edited after a payment has been recorded[cite: 89, 204]. [cite_start]This is a hard lock that can only be overridden by the Owner, generating an audit trail[cite: 89, 634].
* [cite_start]**Audit Trail**: Every financial edit (who, what, when) must be recorded in an unalterable audit log[cite: 207].

## Operational & Workflow Locks
* [cite_start]**Quotation Prerequisite**: No job card can be created without an approved quotation and the required advance payment[cite: 201].
* [cite_start]**Mandatory Photos**: Technicians must upload a minimum of 4-6 mandatory photos (before, during, and after) for every job[cite: 61, 208, 707].
* [cite_start]**Lost Deal Reasons**: If a deal is marked as lost, the salesperson must select a mandatory reason (e.g., price too high, chose competitor, etc.)[cite: 32, 209].
* [cite_start]**QC Delivery Lock**: The system will absolutely not allow a car to be marked for delivery without a Supervisor's QC sign-off[cite: 68, 78, 202]. 
* [cite_start]**Payment Release Lock**: No car can be released, and final handover cannot occur, until the payment rules are fully satisfied[cite: 88, 203, 565].
* [cite_start]**Product Substitution**: Using a substitute product is blocked until customer approval is granted, requiring both Sales and Manager overrides[cite: 634].
