import { createServiceClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ImageIcon } from 'lucide-react'

type Payment = {
  id: string
  amount: number
  payment_method: string | null
  payment_mode: string | null
  payment_date: string
  reference_number: string | null
  reference_no: string | null
  is_advance: boolean
  proof_url: string | null
  booking_id: string | null
  invoices: { invoice_number: string; id: string } | null
  customers: { full_name: string } | null
}

export default async function PaymentsPage() {
  // Service client — RLS on payments has no SELECT policy for authenticated users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data } = await db
    .from('payments')
    .select('id, amount, payment_method, payment_mode, payment_date, reference_number, reference_no, is_advance, proof_url, booking_id, invoices(id, invoice_number), customers(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const payments = (data ?? []) as Payment[]
  const total = payments.reduce((s, p) => s + Number(p.amount), 0)
  const advanceTotal = payments.filter((p) => p.is_advance).reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} transactions &middot; Rs. {total.toLocaleString('en-IN')} total
          {advanceTotal > 0 && (
            <span className="ml-2 text-amber-600">
              (Rs. {advanceTotal.toLocaleString('en-IN')} advance)
            </span>
          )}
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No payments recorded.
                </TableCell>
              </TableRow>
            )}
            {payments.map((p) => {
              const inv = p.invoices as { id: string; invoice_number: string } | null
              const cust = p.customers as { full_name: string } | null
              const method = p.payment_mode ?? p.payment_method ?? '—'
              const ref = p.reference_number ?? p.reference_no ?? null
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(p.payment_date).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell className="font-medium">{cust?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    {inv ? (
                      <Link href={`/accounts/invoices/${inv.id}`} className="font-mono text-xs hover:underline">
                        {inv.invoice_number}
                      </Link>
                    ) : p.booking_id ? (
                      <span className="text-xs text-muted-foreground">Advance</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize text-sm">{method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {ref ?? '—'}
                  </TableCell>
                  <TableCell>
                    {p.proof_url ? (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.proof_url}
                          alt="Payment proof"
                          className="h-10 w-14 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        <ImageIcon className="h-4 w-4 opacity-30" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.is_advance ? 'warning' : 'secondary'}
                      className="text-xs"
                    >
                      {p.is_advance ? 'Advance' : 'Payment'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600 whitespace-nowrap">
                    Rs. {Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
