import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { updateQuotationStatus } from '@/lib/actions/quotations'
import type { QuotationStatus } from '@/types/database'
import { AlertTriangle } from 'lucide-react'

const STATUS_VARIANT: Record<QuotationStatus, string> = {
  draft: 'secondary', pending_approval: 'warning', approved: 'info',
  sent: 'info', accepted: 'success', rejected: 'destructive',
}

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [quotationRes, itemsRes, approvalRes] = await Promise.all([
    db.from('quotations').select('*, leads(contact_name, contact_phone), discount_reasons(label)').eq('id', id).single(),
    db.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
    db.from('discount_approvals').select('id, status, requested_pct, reason_notes').eq('quotation_id', id).maybeSingle(),
  ])

  if (!quotationRes.data) notFound()

  const q = quotationRes.data as {
    id: string; version: number; status: QuotationStatus
    subtotal: number; discount_pct: number; discount_amount: number
    tax_amount: number; total_amount: number; notes: string | null
    valid_until: string | null; created_at: string
    leads: { contact_name: string; contact_phone: string } | null
    discount_reasons: { label: string } | null
  }

  const items = (itemsRes.data ?? []) as {
    id: string; description: string; quantity: number
    unit_price: number; discount_pct: number; line_total: number
    tier: string | null; segment: string | null
  }[]

  const approval = approvalRes.data as {
    id: string; status: string; requested_pct: number; reason_notes: string | null
  } | null

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Quotation v{q.version}</h1>
          <p className="text-sm text-muted-foreground">
            {q.leads?.contact_name} &middot; {q.leads?.contact_phone}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[q.status] as 'secondary' | 'warning' | 'info' | 'success' | 'destructive' ?? 'outline'} className="text-xs capitalize">
          {q.status.replace('_', ' ')}
        </Badge>
      </div>

      {q.status === 'pending_approval' && (
        <div className="flex items-start gap-3 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Awaiting Owner approval for {approval?.requested_pct}% discount</p>
            {approval?.reason_notes && <p className="text-xs mt-0.5">{approval.reason_notes}</p>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Tier / Segment</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Disc %</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {[item.tier, item.segment].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
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

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>Rs. {Number(q.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {q.discount_pct > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount ({q.discount_pct}%) — {q.discount_reasons?.label}</span>
              <span className="text-destructive">- Rs. {Number(q.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {q.tax_amount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>Rs. {Number(q.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span>Rs. {Number(q.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {q.status === 'draft' && (
          <form action={async () => { 'use server'; await updateQuotationStatus(id, 'sent') }}>
            <Button type="submit" size="sm">Mark as Sent</Button>
          </form>
        )}
        {q.status === 'sent' && (
          <>
            <form action={async () => { 'use server'; await updateQuotationStatus(id, 'accepted') }}>
              <Button type="submit" size="sm">Mark Accepted</Button>
            </form>
            <form action={async () => { 'use server'; await updateQuotationStatus(id, 'rejected') }}>
              <Button type="submit" size="sm" variant="destructive">Mark Rejected</Button>
            </form>
          </>
        )}
        {q.status === 'accepted' && (
          <Button asChild size="sm">
            <Link href={`/sales/bookings?quote=${id}`}>Proceed to Booking</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
