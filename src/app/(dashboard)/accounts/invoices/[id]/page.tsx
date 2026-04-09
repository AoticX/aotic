import { notFound } from 'next/navigation'
import { COMPANY } from '@/lib/constants'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PaymentForm } from '@/components/invoices/payment-form'
import { InvoicePdfButton } from '@/components/invoices/invoice-pdf-button'
import { finalizeInvoice } from '@/lib/actions/invoices'
import { Lock, CreditCard, Banknote, Landmark, Smartphone, FileArchive } from 'lucide-react'

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
  // Service client for all invoice/payment reads — RLS blocks authenticated users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const { data: profileData } = await db.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  const [invRes, itemsRes, paymentsRes] = await Promise.all([
    db.from('invoices').select('*, job_cards(reg_number)').eq('id', id).single(),
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
    customer_name: string | null; customer_phone: string | null
    job_cards: { reg_number: string } | null
  }

  const items = (itemsRes.data ?? []) as {
    id: string; description: string; quantity: number
    unit_price: number; discount_pct: number; line_total: number
  }[]

  const payments = (paymentsRes.data ?? []) as {
    id: string; amount: number; payment_method: string
    payment_date: string; reference_number: string | null; notes: string | null
    is_advance: boolean
  }[]

  const advancePayment = payments.find((p) => p.is_advance)
  const regularPayments = payments.filter((p) => !p.is_advance)

  const jc = inv.job_cards as { reg_number: string } | null
  const canFinalize = inv.status === 'draft' && !inv.is_locked && ['owner', 'branch_manager', 'accounts_finance'].includes(profile?.role ?? '')
  const canRecord = ['finalized', 'partially_paid'].includes(inv.status) && Number(inv.amount_due) > 0

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono">{inv.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            {inv.customer_name} &middot; {inv.customer_phone}
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
            <>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>CGST @ 9%</span>
                <span>Rs. {(Number(inv.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>SGST @ 9%</span>
                <span>Rs. {(Number(inv.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total GST (18%)</span>
                <span>Rs. {Number(inv.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>

          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span>Rs. {Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {advancePayment && (
            <div className="flex justify-between text-green-600">
              <span>Advance Received <span className="text-xs text-muted-foreground capitalize">({advancePayment.payment_method})</span></span>
              <span>- Rs. {Number(advancePayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {regularPayments.length > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Payments Recorded</span>
              <span>- Rs. {regularPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className={`flex justify-between font-bold ${Number(inv.amount_due) > 0 ? 'text-destructive' : 'text-green-600'}`}>
            <span>Balance Due</span>
            <span>Rs. {Number(inv.amount_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Timeline */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-sm">Payment Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="relative border-l border-muted ml-3 space-y-6 pb-2">
              {payments.map((p, i) => {
                let Icon = CreditCard
                if (p.payment_method === 'cash') Icon = Banknote
                else if (p.payment_method === 'bank_transfer') Icon = Landmark
                else if (['upi', 'gpay'].includes(p.payment_method)) Icon = Smartphone
                else if (p.payment_method === 'cheque') Icon = FileArchive

                return (
                  <div key={p.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background ${p.is_advance ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {p.is_advance ? 'Advance Payment' : 'Payment Recorded'}
                          </p>
                          <Badge variant="outline" className="text-[10px] capitalize font-normal text-muted-foreground">
                            {p.payment_method.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(p.payment_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        {p.reference_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ref: <span className="font-mono">{p.reference_number}</span>
                          </p>
                        )}
                        {p.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{p.notes}"</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-green-600">
                          Rs. {Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canFinalize && (
          <form action={async () => { 'use server'; await finalizeInvoice(id) }}>
            <Button type="submit" size="sm">Finalize Invoice</Button>
          </form>
        )}
        {['finalized', 'partially_paid', 'paid'].includes(inv.status) && (
          <InvoicePdfButton invoiceId={id} advanceAmount={advancePayment ? Number(advancePayment.amount) : 0} />
        )}
      </div>

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

      <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground text-sm">{COMPANY.legalName}</p>
        <p>GSTIN: <span className="font-mono font-medium text-foreground">{COMPANY.gstin}</span></p>
        <p>{COMPANY.address}</p>
        <p>Partners: {COMPANY.partners}</p>
      </div>
    </div>
  )
}
