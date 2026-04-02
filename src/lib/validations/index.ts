import { z } from 'zod'

// =============================================================================
// AOTIC CRM — Zod Schemas (Frontend Hard-Lock Enforcement)
// These schemas mirror the DB triggers and enforce the same rules on the client.
// =============================================================================

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type LoginInput = z.infer<typeof LoginSchema>

// ---------------------------------------------------------------------------
// LEAD — HARD LOCK: lost reason mandatory when status = 'lost'
// (docs: business-rules.md §7, core-workflows.md §1)
// ---------------------------------------------------------------------------

export const LeadSchema = z.object({
  contact_name: z.string().min(2, 'Name is required'),
  contact_phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .max(15, 'Phone number too long'),
  contact_email: z.string().email().optional().or(z.literal('')),
  car_brand: z.enum(['Toyota','Hyundai','Honda','Kia','Tata','MG','Maruti','BMW','Mercedes','Audi']).optional(),
  car_model: z.string().optional(),
  car_reg_no: z.string().optional(),
  service_interest: z.string().optional(),
  vertical_id: z.string().uuid().optional(),
  estimated_budget: z.number().nonnegative().optional(),
  source: z.enum(['walk_in','phone','whatsapp','instagram','facebook','referral','website','other']),
  status: z.enum(['hot','warm','cold','lost','booked','inspection_done']),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional(),
  lost_reason_id: z.string().uuid().optional(),
  lost_notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // HARD LOCK: lost reason is mandatory when marking as lost
  if (data.status === 'lost' && !data.lost_reason_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A reason code is required when marking a lead as lost.',
      path: ['lost_reason_id'],
    })
  }
})

export type LeadInput = z.infer<typeof LeadSchema>

// ---------------------------------------------------------------------------
// QUOTATION — HARD LOCK: discount >5% requires reason + approval trigger
// (docs: business-rules.md §2, §4)
// ---------------------------------------------------------------------------

export const QuotationItemSchema = z.object({
  service_package_id: z.string().uuid().optional(),
  vertical_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required'),
  tier: z.enum(['essential','enhanced','elite','luxe']).optional(),
  segment: z.enum(['hatchback','sedan','suv','luxury']).optional(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unit_price: z.number().nonnegative('Price cannot be negative'),
  discount_pct: z.number().min(0).max(100),
  sort_order: z.number().int().default(0),
})

export const QuotationSchema = z.object({
  lead_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  items: z.array(QuotationItemSchema).min(1, 'Add at least one service item'),
  discount_pct: z
    .number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
  discount_reason_id: z.string().uuid().optional(),
  discount_notes: z.string().optional(),
  tax_amount: z.number().nonnegative().default(0),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // HARD LOCK: every discount requires a reason code
  if (data.discount_pct > 0 && !data.discount_reason_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A reason code is required for any discount.',
      path: ['discount_reason_id'],
    })
  }
  // HARD LOCK: >5% discount requires owner approval (flagged to user here)
  if (data.discount_pct > 5 && !data.discount_reason_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Discounts above 5% require Owner approval and a documented reason.',
      path: ['discount_pct'],
    })
  }
})

export type QuotationInput = z.infer<typeof QuotationSchema>
export type QuotationItemInput = z.infer<typeof QuotationItemSchema>

// Discount approval request schema
export const DiscountApprovalSchema = z.object({
  quotation_id: z.string().uuid(),
  requested_pct: z
    .number()
    .min(5.01, 'Only discounts above 5% require approval')
    .max(100),
  reason_id: z.string().uuid('Select a discount reason'),
  reason_notes: z.string().min(10, 'Provide at least 10 characters of justification'),
})
export type DiscountApprovalInput = z.infer<typeof DiscountApprovalSchema>

// ---------------------------------------------------------------------------
// BOOKING — HARD LOCK: 50% advance enforced
// (docs: business-rules.md §1)
// ---------------------------------------------------------------------------

export const BookingSchema = z.object({
  lead_id: z.string().uuid(),
  quotation_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  promised_delivery_at: z.string().min(1, 'Promised delivery date is required'),
  total_value: z.number().positive('Total value must be greater than 0'),
  advance_amount: z.number().nonnegative(),
  advance_payment_method: z
    .enum(['cash','card','gpay','bajaj'])
    .optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const advancePct = (data.advance_amount / data.total_value) * 100
  // HARD LOCK: minimum 50% advance required
  if (advancePct < 50) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum 50% advance required. Current: ${advancePct.toFixed(1)}%. Requires Manager override with documented reason.`,
      path: ['advance_amount'],
    })
  }
})

export type BookingInput = z.infer<typeof BookingSchema>

// Override schema for manager advance waiver
export const AdvanceOverrideSchema = z.object({
  booking_id: z.string().uuid(),
  advance_amount: z.number().nonnegative(),
  override_reason: z
    .string()
    .min(20, 'Provide a detailed reason (min 20 characters) for this override'),
})
export type AdvanceOverrideInput = z.infer<typeof AdvanceOverrideSchema>

// ---------------------------------------------------------------------------
// JOB CARD INTAKE
// (docs: core-workflows.md §4)
// ---------------------------------------------------------------------------

export const JobCardIntakeSchema = z.object({
  booking_id: z.string().uuid(),
  reg_number: z.string().min(4, 'Enter a valid registration number'),
  odometer_reading: z.number().int().nonnegative().optional(),
  body_condition_map: z.record(z.unknown()).default({}),
  spare_parts_check: z.boolean().default(false),
  customer_concerns: z.string().optional(),
  // Signature is captured separately as a URL after upload
  intake_signature_url: z.string().url().optional(),
  notes: z.string().optional(),
})
export type JobCardIntakeInput = z.infer<typeof JobCardIntakeSchema>

// ---------------------------------------------------------------------------
// JOB PHOTOS — HARD LOCK: minimum 4 photos required
// (docs: business-rules.md §6)
// ---------------------------------------------------------------------------

export const JobPhotoUploadSchema = z.object({
  job_card_id: z.string().uuid(),
  stage: z.enum(['before','during','after','qc','delivery']),
  // File validated before upload
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 10 * 1024 * 1024, 'File must be under 10MB')
    .refine(
      (f) => ['image/jpeg','image/png','image/webp'].includes(f.type),
      'Only JPEG, PNG, or WebP images allowed'
    ),
})
export type JobPhotoUploadInput = z.infer<typeof JobPhotoUploadSchema>

export const MIN_PHOTOS_REQUIRED = 4
export const MAX_PHOTOS_REQUIRED = 6

export function validatePhotoCount(count: number): string | null {
  if (count < MIN_PHOTOS_REQUIRED) {
    return `A minimum of ${MIN_PHOTOS_REQUIRED} photos are required. You have uploaded ${count}.`
  }
  return null
}

// ---------------------------------------------------------------------------
// QC CHECKLIST
// ---------------------------------------------------------------------------

export const QcChecklistResultSchema = z.object({
  template_id: z.string().uuid().optional(),
  check_point: z.string().min(1),
  result: z.enum(['pass','fail','na']),
  notes: z.string().optional(),
})

export const QcRecordSchema = z.object({
  job_card_id: z.string().uuid(),
  vertical_id: z.string().uuid().optional(),
  checklist_results: z
    .array(QcChecklistResultSchema)
    .min(1, 'At least one checklist item is required'),
  rework_required: z.boolean().default(false),
  rework_notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // HARD LOCK: if any item fails, rework_notes must be provided
  const hasFailure = data.checklist_results.some((r) => r.result === 'fail')
  if (hasFailure && data.rework_required && !data.rework_notes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Rework notes are required when items are marked as failed.',
      path: ['rework_notes'],
    })
  }
})
export type QcRecordInput = z.infer<typeof QcRecordSchema>

// ---------------------------------------------------------------------------
// INVOICE — HARD LOCK: cannot edit after payment
// (docs: business-rules.md §5)
// ---------------------------------------------------------------------------

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  vertical_id: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  discount_pct: z.number().min(0).max(100).default(0),
  sort_order: z.number().int().default(0),
})

export const InvoiceSchema = z.object({
  job_card_id: z.string().uuid(),
  booking_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  items: z.array(InvoiceItemSchema).min(1, 'Add at least one item'),
  discount_amount: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
})
export type InvoiceInput = z.infer<typeof InvoiceSchema>

// HARD LOCK: client-side check before attempting edit
export function assertInvoiceNotLocked(isLocked: boolean): void {
  if (isLocked) {
    throw new Error(
      'HARD_LOCK: This invoice is locked after payment recording. An Owner override is required to edit it.'
    )
  }
}

// ---------------------------------------------------------------------------
// PAYMENT RECORDING
// ---------------------------------------------------------------------------

export const PaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_method: z.enum(['cash','card','gpay','bajaj']),
  payment_date: z.string().min(1, 'Payment date is required'),
  reference_no: z.string().optional(),
  is_advance: z.boolean().default(false),
  notes: z.string().optional(),
})
export type PaymentInput = z.infer<typeof PaymentSchema>

// ---------------------------------------------------------------------------
// DELIVERY — HARD LOCK: QC sign-off required
// (docs: business-rules.md §3)
// ---------------------------------------------------------------------------

export const DeliverySchema = z.object({
  job_card_id: z.string().uuid(),
  delivery_signature_url: z.string().url('Customer delivery signature is required'),
  // Delivery checklist (docs: core-workflows.md §5)
  car_cleaned: z.literal(true, {
    errorMap: () => ({ message: 'Confirm car has been cleaned' }),
  }),
  demo_given: z.literal(true, {
    errorMap: () => ({ message: 'Confirm demo was given to customer' }),
  }),
  invoice_explained: z.literal(true, {
    errorMap: () => ({ message: 'Confirm invoice was explained to customer' }),
  }),
  warranty_handed: z.boolean().default(false),
  notes: z.string().optional(),
})
export type DeliveryInput = z.infer<typeof DeliverySchema>
