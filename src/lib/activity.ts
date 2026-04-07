import { createServiceClient } from '@/lib/supabase/server'
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
  performed_by: string | null
  actor_name: string | null
}

export const TABLE_LABEL: Record<string, string> = {
  leads: 'Lead',
  lead_verticals: 'Lead Vertical Mapping',
  customers: 'Customer',
  quotations: 'Quotation',
  quotation_items: 'Quotation Item',
  bookings: 'Booking',
  job_cards: 'Job Card',
  job_tasks: 'Job Task',
  job_photos: 'Job Photo',
  technician_time_logs: 'Technician Time Log',
  job_parts_used: 'Job Material Usage',
  qc_records: 'QC Record',
  qc_checklist_results: 'QC Checklist',
  qc_sessions: 'QC Session',
  qc_responses: 'QC Response',
  invoices: 'Invoice',
  invoice_items: 'Invoice Item',
  payments: 'Payment',
  inventory_items: 'Inventory Item',
  inventory_transactions: 'Inventory Movement',
  job_issues: 'Fault/Issue',
  communications: 'Communication',
  lead_activities: 'Lead Activity',
  employees: 'Employee',
  salary_payments: 'Salary Payment',
  attendance: 'Attendance',
  delivery_certificates: 'Delivery Certificate',
  delivery_events: 'Delivery Event',
  whatsapp_conversations: 'WhatsApp Conversation',
  whatsapp_messages: 'WhatsApp Message',
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
  return a.actor_name || 'System/User'
}

export async function fetchRecentActivity(limit = 200): Promise<ActivityEntry[]> {
  // Use service client — audit_logs RLS may restrict reads for non-owner roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data, error } = await db
    .from('audit_logs')
    .select('id, action, table_name, record_id, old_data, new_data, performed_at, notes, performed_by')
    .order('performed_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  const rows = data as Array<{
    id: string
    action: AuditAction
    table_name: string
    record_id: string | null
    old_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    performed_at: string
    notes: string | null
    performed_by: string | null
  }>

  const performerIds = Array.from(new Set(rows.map((r) => r.performed_by).filter(Boolean))) as string[]
  let nameMap = new Map<string, string>()

  if (performerIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', performerIds)

    nameMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null }>)
        .filter((p) => !!p.full_name)
        .map((p) => [p.id, p.full_name as string]),
    )
  }

  return rows.map((r) => ({
    ...r,
    actor_name: r.performed_by ? (nameMap.get(r.performed_by) ?? null) : null,
  }))
}
