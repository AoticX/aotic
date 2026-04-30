import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingActionsData } from '@/lib/actions/pending'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'

export default async function PendingActionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  const allowed = ['owner', 'branch_manager', 'sales_executive']
  if (!allowed.includes(role)) redirect('/')

  const { acceptedQuotations, bookingsWithoutJobCards } = await getPendingActionsData()
  const totalCount = acceptedQuotations.length + bookingsWithoutJobCards.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          Pending Actions
          {totalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalCount} pending
            </Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Accepted quotations without a booking, and bookings waiting for a job card.
        </p>
      </div>

      {/* Section 1: Accepted Quotations Without a Booking */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold">
            Accepted Quotations — No Booking Yet
          </h2>
          {acceptedQuotations.length > 0 && (
            <Badge variant="warning" className="text-xs">{acceptedQuotations.length}</Badge>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Quote Value</TableHead>
                <TableHead>Accepted On</TableHead>
                {['owner', 'branch_manager'].includes(role) && (
                  <TableHead>Sales Exec</TableHead>
                )}
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acceptedQuotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No accepted quotations waiting for booking.
                  </TableCell>
                </TableRow>
              )}
              {acceptedQuotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.contact_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{q.car_model ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    Rs. {q.total_amount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {q.accepted_at
                      ? new Date(q.accepted_at).toLocaleDateString('en-IN')
                      : new Date(q.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                  {['owner', 'branch_manager'].includes(role) && (
                    <TableCell className="text-xs text-muted-foreground">
                      {q.sales_exec_name ?? '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="default">
                      <Link href={`/sales/bookings/new?quote=${q.id}`}>
                        Confirm Booking
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Section 2: Bookings Without a Job Card */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold">
            Bookings Confirmed — Job Card Not Created
          </h2>
          {bookingsWithoutJobCards.length > 0 && (
            <Badge variant="warning" className="text-xs">{bookingsWithoutJobCards.length}</Badge>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Advance Paid</TableHead>
                <TableHead>Adv %</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Promised By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsWithoutJobCards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bookings waiting for a job card.
                  </TableCell>
                </TableRow>
              )}
              {bookingsWithoutJobCards.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.contact_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.car_model ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    Rs. {b.advance_amount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={b.advance_pct >= 50 ? 'text-green-600' : 'text-amber-600'}>
                      {Number(b.advance_pct).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{b.advance_payment_method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.promised_delivery_at
                      ? new Date(b.promised_delivery_at).toLocaleDateString('en-IN')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="default">
                      <Link href={`/manager/jobs/new?booking=${b.id}`}>
                        Create Job Card
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
