import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/bookings/booking-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; error?: string }>
}) {
  const { quote: quoteId, error } = await searchParams
  if (!quoteId) redirect('/sales/quotations')

  const supabase = await createClient()
  // Use service client for data queries to bypass RLS — explicit JS permission check below
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as { role: string } | null
  const isManager = ['owner', 'branch_manager'].includes(profile?.role ?? '')

  const [quotationRes, itemsRes, settingsRes] = await Promise.all([
    service.from('quotations')
      .select('id, total_amount, status, lead_id, notes, leads(contact_name, contact_phone, converted_customer_id, created_by, assigned_to)')
      .eq('id', quoteId)
      .single(),
    service.from('quotation_items')
      .select('id, description, quantity, line_total, service_vertical, tier, segment')
      .eq('quotation_id', quoteId)
      .order('sort_order'),
    service.from('system_settings')
      .select('value')
      .eq('key', 'advance_percentage')
      .maybeSingle(),
  ])

  if (!quotationRes.data) notFound()

  const q = quotationRes.data as {
    id: string
    total_amount: number
    status: string
    lead_id: string
    notes: string | null
    leads: {
      contact_name: string
      contact_phone: string
      converted_customer_id: string | null
      created_by: string | null
      assigned_to: string | null
    } | null
  }

  // Explicit permission check (service client bypasses RLS so we enforce here)
  const canAccess = isManager
    || q.leads?.created_by === user.id
    || q.leads?.assigned_to === user.id
  if (!canAccess) notFound()

  if (!['accepted', 'approved'].includes(q.status)) {
    redirect(`/sales/quotations/${quoteId}?error=Quotation+must+be+accepted+by+the+customer+before+booking`)
  }

  const customerId = q.leads?.converted_customer_id ?? ''
  const items = (itemsRes.data ?? []) as Array<{
    id: string
    description: string
    quantity: number
    line_total: number
    service_vertical: string | null
    tier: string | null
    segment: string | null
  }>

  const settingsValue = settingsRes.data?.value as { default?: number } | null
  const advancePercentage = settingsValue?.default ?? 50

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Confirm Booking</h1>
        <p className="text-sm text-muted-foreground">
          Quotation for {q.leads?.contact_name} — Rs. {Number(q.total_amount).toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Fill booking details and record the advance payment to proceed to job card creation.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Booking & Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm
            quotationId={q.id}
            leadId={q.lead_id}
            customerId={customerId}
            totalValue={Number(q.total_amount)}
            customerName={q.leads?.contact_name ?? ''}
            customerPhone={q.leads?.contact_phone ?? ''}
            quotationNotes={q.notes}
            quotationItems={items}
            advancePercentage={advancePercentage}
            isManager={isManager}
            errorMsg={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}
