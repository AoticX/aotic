import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/bookings/booking-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; error?: string }>
}) {
  const { quote: quoteId, error } = await searchParams
  if (!quoteId) redirect('/dashboard/sales/quotations')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null
  const isManager = ['owner', 'branch_manager'].includes(profile?.role ?? '')

  const { data: quotationData } = await db
    .from('quotations')
    .select('id, total_amount, status, lead_id, leads(contact_name, contact_phone, customer_id)')
    .eq('id', quoteId)
    .single()

  if (!quotationData) notFound()

  const q = quotationData as {
    id: string
    total_amount: number
    status: string
    lead_id: string
    leads: { contact_name: string; contact_phone: string; customer_id: string | null } | null
  }

  if (q.status !== 'accepted') {
    redirect(`/dashboard/sales/quotations/${quoteId}?error=Quotation+must+be+accepted+before+booking`)
  }

  const customerId = q.leads?.customer_id ?? ''

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Confirm Booking</h1>
        <p className="text-sm text-muted-foreground">
          Quotation for {q.leads?.contact_name} — Rs. {Number(q.total_amount).toLocaleString('en-IN')}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm
            quotationId={q.id}
            leadId={q.lead_id}
            customerId={customerId}
            totalValue={Number(q.total_amount)}
            customerName={q.leads?.contact_name ?? ''}
            isManager={isManager}
            errorMsg={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}
