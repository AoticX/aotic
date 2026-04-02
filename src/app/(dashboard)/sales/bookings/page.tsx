import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Booking = {
  id: string
  status: string
  advance_amount: number
  advance_pct: number
  advance_payment_method: string
  promised_delivery_at: string | null
  created_at: string
  advance_override_by: string | null
  quotations: { total_amount: number } | null
  customers: { full_name: string; phone: string } | null
}

const STATUS_VARIANT: Record<string, string> = {
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'info',
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = db
    .from('bookings')
    .select('id, status, advance_amount, advance_pct, advance_payment_method, promised_delivery_at, created_at, advance_override_by, quotations(total_amount), customers(full_name, phone)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (profile?.role === 'sales_executive') {
    query = query.eq('created_by', user!.id)
  }

  const { data } = await query.limit(100)
  const bookings = (data ?? []) as Booking[]

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">{bookings.length} result{bookings.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/sales/bookings?status=${tab.value}` : '/sales/bookings'}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              (status ?? '') === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Advance</TableHead>
              <TableHead>Adv %</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Delivery By</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
            {bookings.map((b) => {
              const cust = b.customers as { full_name: string; phone: string } | null
              const quot = b.quotations as { total_amount: number } | null
              return (
                <TableRow key={b.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/sales/bookings/${b.id}`} className="font-medium hover:underline">
                      {cust?.full_name ?? '—'}
                    </Link>
                    <div className="text-xs text-muted-foreground">{cust?.phone}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {quot ? `Rs. ${Number(quot.total_amount).toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    Rs. {Number(b.advance_amount).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={Number(b.advance_pct) >= 50 ? 'text-green-600' : 'text-destructive'}>
                      {Number(b.advance_pct).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{b.advance_payment_method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.promised_delivery_at
                      ? new Date(b.promised_delivery_at).toLocaleDateString('en-IN')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {b.advance_override_by
                      ? <Badge variant="warning" className="text-xs">Override</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(STATUS_VARIANT[b.status] ?? 'secondary') as 'success' | 'destructive' | 'info' | 'secondary'}
                      className="text-xs capitalize"
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
