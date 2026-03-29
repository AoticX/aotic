import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PaymentForm } from '@/components/invoices/payment-form'
import { finalizeInvoice } from '@/lib/actions/invoices'
import { Lock } from 'lucide-react'

const STATUS_VARIANT: Record<string, string> = {
  draft: 'secondary', finalized: 'info',
  partially_paid: 'warning', paid: 'success', void: 'destructive',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  const [invRes, itemsRes, paymentsRes] = await Promise.all([
    db.from('invoices').select('*, customers(full_name, phone), job_cards(reg_number)').eq('id', id).single(),
    db.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    db.from('payments').select('*').eq('invoice_id', id).order('created_at'),
  ])

  if (!invRes.data) notFound()

  const inv = invRes.data as {
    id: string; invoice_number: string; status: string
    subtotal: number; discount_amount: number; tax_amount: number
    total_amount: number; amount_paid: number; amount_due: number
    is_locked: boolean; locked_at: string | null; finalized_at: string | null
    notes: string | null; created_at: string
    customers: { full_name: string; phone: string } | null
    job_cards: { reg_number: string } | null
  }

  const items = (itemsRes.data ?? []) as {
    id: string; description: string; quantity: number
    unit_price: number; discount_pct: number; line_total: number
  }[]

  const payments = (paymentsRes.data ?? []) as {
    id: string; amount: number; payment_method: string
    payment_date: string; reference_no: string | null; notes: string | null
  }[]

  const cust = inv.customers as { full_name: string; phone: string } | null
  const jc = inv.job_cards as { reg_number: string } | null
  const canFinalize = inv.status === 'draft' && !inv.is_locked && ['owner', 'branch_manager', 'accounts_finance'].includes(profile?.role ?? '')
  const canRecord = ['finalized', 'partially_paid'].includes(inv.status) && Number(inv.amount_due) > 0

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono">{inv.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            {cust?.full_name} &middot; {cust?.phone}
            {jc && <span> &middot; {jc.reg_number}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inv.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          <Badge
            variant={(STATUS_VARIANT[inv.status] ?? 'secondary') as 'secondary' | 'info' | 'warning' | 'success' | 'destructive'}
            className="text-xs capitalize"
          >
            {inv.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {inv.is_locked && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>Invoice locked after payment recording on {inv.locked_at ? new Date(inv.locked_at).toLocaleDateString('en-IN') : '—'}</span>
        </div>
      )}

      {/* Line items */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Disc %</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">Rs. {Number(item.unit_price).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right">{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</TableCell>
                  <TableCell className="text-right font-medium">Rs. {Number(item.line_total).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>Rs. {Number(inv.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(inv.discount_amount) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="text-destructive">- Rs. {Number(inv.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {Number(inv.tax_amount) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>Rs. {Number(inv.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span>Rs. {Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium">
            <span>Paid</span>
            <span>Rs. {Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className={`flex justify-between font-bold ${Number(inv.amount_due) > 0 ? 'text-destructive' : 'text-green-600'}`}>
            <span>Balance Due</span>
            <span>Rs. {Number(inv.amount_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Ref No.</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="capitalize text-sm">{p.payment_method}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.reference_no ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      Rs. {Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canFinalize && (
        <form action={async () => { 'use server'; await finalizeInvoice(id) }}>
          <Button type="submit" size="sm">Finalize Invoice</Button>
        </form>
      )}

      {canRecord && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Record Payment</CardTitle></CardHeader>
          <CardContent>
            <PaymentForm invoiceId={id} amountDue={Number(inv.amount_due)} />
          </CardContent>
        </Card>
      )}

      {inv.status === 'paid' && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
          Invoice fully paid.
        </div>
      )}
    </div>
  )
}
