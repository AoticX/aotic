// =============================================================================
// AOTIC CRM — Database TypeScript Types
// Mirrors the Supabase SQL schema (001_initial_schema.sql)
// =============================================================================

export type AppRole =
  | 'owner'
  | 'branch_manager'
  | 'sales_executive'
  | 'workshop_technician'
  | 'qc_inspector'
  | 'accounts_finance'
  | 'front_desk'

export type LeadStatus = 'hot' | 'warm' | 'cold' | 'lost'
export type LeadSource =
  | 'walk_in'
  | 'phone'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'referral'
  | 'website'
  | 'other'

export type QuotationStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'rejected'

export type BookingStatus =
  | 'quote_accepted'
  | 'advance_pending'
  | 'confirmed'
  | 'scheduled'
  | 'cancelled'

export type JobStatus =
  | 'created'
  | 'in_progress'
  | 'pending_qc'
  | 'qc_passed'
  | 'rework_scheduled'
  | 'ready_for_billing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled'

export type QcResult = 'pass' | 'fail' | 'na'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'emi' | 'bank_transfer' | 'cheque'
export type InvoiceStatus = 'draft' | 'finalized' | 'partially_paid' | 'paid' | 'void'
export type PricingTier = 'essential' | 'enhanced' | 'elite' | 'luxe'
export type CarSegment = 'hatchback' | 'sedan' | 'suv' | 'luxury'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'override'
  | 'approval'
  | 'payment'
  | 'login'
  | 'logout'

// ---------------------------------------------------------------------------
// TABLE ROW TYPES
// ---------------------------------------------------------------------------

export interface Branch {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: AppRole
  branch_id: string | null
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Vertical {
  id: string
  code: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PricingTierConfig {
  id: string
  tier: PricingTier
  label: string
  description: string | null
  sort_order: number
}

export interface CarSegmentConfig {
  id: string
  segment: CarSegment
  label: string
  sort_order: number
}

export interface ServicePackage {
  id: string
  vertical_id: string
  tier: PricingTier
  segment: CarSegment
  name: string
  description: string | null
  base_price: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface LostReason {
  id: string
  code: string
  label: string
  is_active: boolean
  sort_order: number
}

export interface DiscountReason {
  id: string
  code: string
  label: string
  is_active: boolean
}

export interface Customer {
  id: string
  full_name: string
  phone: string
  email: string | null
  address: string | null
  car_model: string | null
  car_reg_no: string | null
  branch_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Lead {
  id: string
  customer_id: string | null
  contact_name: string
  contact_phone: string
  contact_email: string | null
  car_model: string | null
  car_reg_no: string | null
  service_interest: string | null
  vertical_id: string | null
  estimated_budget: number | null
  source: LeadSource
  status: LeadStatus
  assigned_to: string | null
  branch_id: string | null
  notes: string | null
  lost_reason_id: string | null
  lost_notes: string | null
  lost_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Quotation {
  id: string
  lead_id: string
  customer_id: string | null
  version: number
  status: QuotationStatus
  subtotal: number
  discount_amount: number
  discount_pct: number
  discount_reason_id: string | null
  discount_notes: string | null
  tax_amount: number
  total_amount: number
  valid_until: string | null
  pdf_url: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  sent_at: string | null
  accepted_at: string | null
  branch_id: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  service_package_id: string | null
  vertical_id: string | null
  description: string
  tier: PricingTier | null
  segment: CarSegment | null
  quantity: number
  unit_price: number
  discount_pct: number
  line_total: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DiscountApproval {
  id: string
  quotation_id: string
  requested_pct: number
  reason_id: string
  reason_notes: string | null
  status: ApprovalStatus
  requested_by: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  lead_id: string
  quotation_id: string
  customer_id: string
  status: BookingStatus
  promised_delivery_at: string
  total_value: number
  advance_amount: number
  advance_pct: number
  advance_paid_at: string | null
  advance_payment_method: PaymentMethod | null
  advance_override_by: string | null
  advance_override_note: string | null
  branch_id: string | null
  assigned_bay: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface JobCard {
  id: string
  booking_id: string
  quotation_id: string
  customer_id: string
  status: JobStatus
  reg_number: string
  odometer_reading: number | null
  fuel_level_pct: number | null
  body_condition_map: Record<string, unknown>
  belongings_inventory: string[] | null
  spare_parts_check: boolean
  customer_concerns: string | null
  intake_signature_url: string | null
  intake_signed_at: string | null
  assigned_to: string | null
  supervised_by: string | null
  branch_id: string | null
  bay_number: string | null
  estimated_completion: string | null
  actual_completion: string | null
  qc_signed_off_by: string | null
  qc_signed_off_at: string | null
  delivery_signature_url: string | null
  delivery_signed_at: string | null
  delivered_by: string | null
  delivered_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface JobPhoto {
  id: string
  job_card_id: string
  job_item_id: string | null
  stage: 'before' | 'during' | 'after' | 'qc' | 'delivery'
  r2_key: string
  r2_url: string
  file_name: string | null
  file_size_kb: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
}

export interface Invoice {
  id: string
  job_card_id: string
  booking_id: string
  customer_id: string
  invoice_number: string
  status: InvoiceStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
  finalized_at: string | null
  finalized_by: string | null
  notes: string | null
  branch_id: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface Payment {
  id: string
  invoice_id: string
  booking_id: string | null
  customer_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference_no: string | null
  is_advance: boolean
  notes: string | null
  recorded_by: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  action: AuditAction
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
  performed_by: string | null
  performed_at: string
  ip_address: string | null
  user_agent: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// SUPABASE DATABASE TYPE (for typed client)
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: Branch
        Insert: Omit<Branch, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Branch, 'id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      verticals: {
        Row: Vertical
        Insert: Omit<Vertical, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Vertical, 'id'>>
      }
      pricing_tier_config: {
        Row: PricingTierConfig
        Insert: Omit<PricingTierConfig, 'id'>
        Update: Partial<Omit<PricingTierConfig, 'id'>>
      }
      car_segment_config: {
        Row: CarSegmentConfig
        Insert: Omit<CarSegmentConfig, 'id'>
        Update: Partial<Omit<CarSegmentConfig, 'id'>>
      }
      service_packages: {
        Row: ServicePackage
        Insert: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ServicePackage, 'id'>>
      }
      lost_reasons: {
        Row: LostReason
        Insert: Omit<LostReason, 'id'>
        Update: Partial<Omit<LostReason, 'id'>>
      }
      discount_reasons: {
        Row: DiscountReason
        Insert: Omit<DiscountReason, 'id'>
        Update: Partial<Omit<DiscountReason, 'id'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id'>>
      }
      quotations: {
        Row: Quotation
        Insert: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Quotation, 'id'>>
      }
      quotation_items: {
        Row: QuotationItem
        Insert: Omit<QuotationItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<QuotationItem, 'id'>>
      }
      discount_approvals: {
        Row: DiscountApproval
        Insert: Omit<DiscountApproval, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DiscountApproval, 'id'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'advance_pct'>
        Update: Partial<Omit<Booking, 'id' | 'advance_pct'>>
      }
      job_cards: {
        Row: JobCard
        Insert: Omit<JobCard, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<JobCard, 'id'>>
      }
      job_photos: {
        Row: JobPhoto
        Insert: Omit<JobPhoto, 'id' | 'created_at'>
        Update: never
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'amount_due'>
        Update: Partial<Omit<Invoice, 'id' | 'amount_due'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Payment, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'performed_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: AppRole
      lead_status: LeadStatus
      quotation_status: QuotationStatus
      booking_status: BookingStatus
      job_status: JobStatus
      pricing_tier: PricingTier
      car_segment: CarSegment
      payment_method: PaymentMethod
      invoice_status: InvoiceStatus
      approval_status: ApprovalStatus
    }
  }
}
