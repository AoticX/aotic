'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type AcceptedQuotationPending = {
  id: string
  lead_id: string
  total_amount: number
  created_at: string
  accepted_at: string | null
  contact_name: string
  car_model: string | null
  sales_exec_name: string | null
}

export type BookingPending = {
  id: string
  lead_id: string
  advance_amount: number
  advance_pct: number
  advance_payment_method: string
  created_at: string
  promised_delivery_at: string | null
  contact_name: string
  car_model: string | null
  total_amount: number
}

export async function getPendingActionsData(): Promise<{
  acceptedQuotations: AcceptedQuotationPending[]
  bookingsWithoutJobCards: BookingPending[]
  role: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { acceptedQuotations: [], bookingsWithoutJobCards: [], role: '' }

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const isPrivileged = ['owner', 'branch_manager'].includes(role)

  // --- 1. Booking quotation_ids (to exclude accepted quotations that already have bookings) ---
  const { data: bookingRows } = await service
    .from('bookings')
    .select('quotation_id')
    .not('quotation_id', 'is', null)
  const quotationIdsWithBookings = new Set(
    ((bookingRows ?? []) as { quotation_id: string }[]).map((r) => r.quotation_id)
  )

  // --- 2. Accepted quotations without a booking ---
  let quotQuery = service
    .from('quotations')
    .select('id, lead_id, total_amount, created_at, accepted_at, leads(contact_name, car_model, assigned_to, profiles:assigned_to(full_name))')
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(100)

  if (!isPrivileged) {
    // Sales exec sees only their own leads
    const { data: myLeads } = await service
      .from('leads')
      .select('id')
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
    const myLeadIds = ((myLeads ?? []) as { id: string }[]).map((l) => l.id)
    if (myLeadIds.length === 0) {
      return { acceptedQuotations: [], bookingsWithoutJobCards: [], role }
    }
    quotQuery = quotQuery.in('lead_id', myLeadIds)
  }

  const { data: quotRows } = await quotQuery
  const allQuots = (quotRows ?? []) as Array<{
    id: string
    lead_id: string
    total_amount: number
    created_at: string
    accepted_at: string | null
    leads: {
      contact_name: string
      car_model: string | null
      profiles: { full_name: string } | null
    } | null
  }>

  const acceptedQuotations: AcceptedQuotationPending[] = allQuots
    .filter((q) => !quotationIdsWithBookings.has(q.id))
    .map((q) => ({
      id: q.id,
      lead_id: q.lead_id,
      total_amount: Number(q.total_amount),
      created_at: q.created_at,
      accepted_at: q.accepted_at,
      contact_name: q.leads?.contact_name ?? '—',
      car_model: q.leads?.car_model ?? null,
      sales_exec_name: q.leads?.profiles?.full_name ?? null,
    }))

  // --- 3. Job card booking_ids ---
  const { data: jobCardRows } = await service
    .from('job_cards')
    .select('booking_id')
    .not('booking_id', 'is', null)
  const bookingIdsWithJobCards = new Set(
    ((jobCardRows ?? []) as { booking_id: string }[]).map((r) => r.booking_id)
  )

  // --- 4. Bookings without a job card ---
  let bookQuery = service
    .from('bookings')
    .select('id, lead_id, advance_amount, advance_pct, advance_payment_method, created_at, promised_delivery_at, quotations(total_amount), leads(contact_name, car_model)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isPrivileged) {
    bookQuery = bookQuery.eq('created_by', user.id)
  }

  const { data: bookRows } = await bookQuery
  const allBookings = (bookRows ?? []) as Array<{
    id: string
    lead_id: string
    advance_amount: number
    advance_pct: number
    advance_payment_method: string
    created_at: string
    promised_delivery_at: string | null
    quotations: { total_amount: number } | null
    leads: { contact_name: string; car_model: string | null } | null
  }>

  const bookingsWithoutJobCards: BookingPending[] = allBookings
    .filter((b) => !bookingIdsWithJobCards.has(b.id))
    .map((b) => ({
      id: b.id,
      lead_id: b.lead_id,
      advance_amount: Number(b.advance_amount),
      advance_pct: Number(b.advance_pct),
      advance_payment_method: b.advance_payment_method,
      created_at: b.created_at,
      promised_delivery_at: b.promised_delivery_at,
      contact_name: b.leads?.contact_name ?? '—',
      car_model: b.leads?.car_model ?? null,
      total_amount: Number(b.quotations?.total_amount ?? 0),
    }))

  return { acceptedQuotations, bookingsWithoutJobCards, role }
}

export async function getPendingActionsCount(): Promise<number> {
  const { acceptedQuotations, bookingsWithoutJobCards } = await getPendingActionsData()
  return acceptedQuotations.length + bookingsWithoutJobCards.length
}
