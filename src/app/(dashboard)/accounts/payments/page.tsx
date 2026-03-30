import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

type Payment = {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_no: string | null
  is_advance: boolean
  invoices: { invoice_number: string; id: string } | null
  customers: { full_name: string } | null
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('payments')
    .select('id, amount, payment_method, payment_date, reference_no, is_advance, invoices(id, invoice_number), customers(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const payments = (data ?? []) as Payment[]

  const total = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} transactions &middot; Rs. {total.toLocaleString('en-IN')} total
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
              <TableHead>Ref No.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No payments recorded.
                </TableCell>
              </TableRow>
            )}
            {payments.map((p) => {
              const inv = p.invoices as { id: string; invoice_number: string } | null
              const cust = p.customers as { full_name: string } | null
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {new Date(p.payment_date).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell className="font-medium">{cust?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    {inv ? (
                      <Link href={`/accounts/invoices/${inv.id}`} className="font-mono text-xs hover:underline">
                        {inv.invoice_number}
                      </Link>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="capitalize text-sm">{p.payment_method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.reference_no ?? '—'}</TableCell>
                  <TableCell className="text-xs">
                    {p.is_advance
                      ? <span className="text-amber-600">Advance</span>
                      : <span className="text-muted-foreground">Payment</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
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
