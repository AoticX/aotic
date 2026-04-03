import type { AuditAction } from '@/types/database'

export type ActivityEntry = {
  id: string
  action: AuditAction
  table_name: string
  record_id: string | null
  performed_at: string
  notes: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  profiles: { full_name: string | null } | null
}

export const TABLE_LABEL: Record<string, string> = {
  leads: 'Lead',
  quotations: 'Quotation',
  quotation_items: 'Quotation Item',
  bookings: 'Booking',
  job_cards: 'Job Card',
  job_tasks: 'Job Task',
  qc_records: 'QC Record',
  qc_checklist_results: 'QC Checklist',
  invoices: 'Invoice',
  invoice_items: 'Invoice Item',
  payments: 'Payment',
  inventory_items: 'Inventory Item',
  inventory_transactions: 'Inventory Movement',
  job_issues: 'Fault/Issue',
  communications: 'Communication',
  lead_activities: 'Lead Activity',
  salary_payments: 'Salary Payment',
  attendance: 'Attendance',
}

export function buildActivityMessage(a: ActivityEntry): string {
  const entity = TABLE_LABEL[a.table_name] ?? a.table_name

  if (a.action === 'status_change') {
    const oldStatus = String((a.old_data?.status as string | undefined) ?? '')
    const newStatus = String((a.new_data?.status as string | undefined) ?? '')
    if (oldStatus || newStatus) return `${entity} status: ${oldStatus || '—'} -> ${newStatus || '—'}`
    return `${entity} status changed`
  }

  if (a.action === 'create') return `${entity} created`
  if (a.action === 'delete') return `${entity} deleted`

  if (a.notes) return a.notes
  return `${entity} updated`
}

export function formatActor(a: ActivityEntry): string {
  return a.profiles?.full_name || 'System/User'
}
