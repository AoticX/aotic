'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createQuotation, updateQuotation } from '@/lib/actions/quotations'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Vertical = { id: string; name: string }
type ServicePackage = { id: string; vertical_id: string; tier: string; segment: string; name: string; base_price: number }
type DiscountReason = { id: string; label: string }

type LineItem = {
  id: string
  service_package_id?: string
  vertical_id?: string
  description: string
  tier?: string
  segment?: string
  quantity: number
  unit_price: number
}

const TIERS = ['essential', 'enhanced', 'elite', 'luxe']
const SEGMENTS = ['hatchback', 'sedan', 'suv', 'luxury']

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

function lineTotal(item: LineItem) {
  return item.unit_price * item.quantity
}

type InitialValues = {
  items?: LineItem[]
  discountPct?: number
  discountReasonId?: string
  discountNotes?: string
  taxAmount?: number
  notes?: string
  validUntil?: string
}

export function QuotationBuilder({
  leadId,
  customerId,
  verticals,
  packages,
  discountReasons,
  errorMsg,
  quotationId,
  initial,
}: {
  leadId: string
  customerId?: string
  verticals: Vertical[]
  packages: ServicePackage[]
  discountReasons: DiscountReason[]
  errorMsg?: string
  quotationId?: string
  initial?: InitialValues
}) {
  const [items, setItems] = useState<LineItem[]>(initial?.items ?? [newItem()])
  const [discountPct, setDiscountPct] = useState(initial?.discountPct ?? 0)
  const [discountReasonId, setDiscountReasonId] = useState(initial?.discountReasonId ?? '')
  const [discountNotes, setDiscountNotes] = useState(initial?.discountNotes ?? '')
  const [taxAmount, setTaxAmount] = useState(initial?.taxAmount ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '')
  const [isPending, startTransition] = useTransition()

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const headerDiscount = subtotal * (discountPct / 100)
  const total = subtotal - headerDiscount + taxAmount
  const needsApproval = discountPct > 5

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function selectPackage(itemId: string, pkgId: string) {
    const pkg = packages.find((p) => p.id === pkgId)
    if (!pkg) return
    updateItem(itemId, {
      service_package_id: pkg.id,
      vertical_id: pkg.vertical_id,
      description: pkg.name,
      tier: pkg.tier,
      segment: pkg.segment,
      unit_price: pkg.base_price,
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lead_id', leadId)
      if (customerId) fd.set('customer_id', customerId)
      fd.set('items', JSON.stringify(items.map(({ id: _, ...rest }) => rest)))  // id stripped, all other fields sent
      fd.set('discount_pct', String(discountPct))
      if (discountReasonId) fd.set('discount_reason_id', discountReasonId)
      fd.set('discount_notes', discountNotes)
      fd.set('tax_amount', String(taxAmount))
      fd.set('notes', notes)
      if (validUntil) fd.set('valid_until', validUntil)
      if (quotationId) {
        await updateQuotation(quotationId, fd)
      } else {
        await createQuotation(fd)
      }
    })
  }

  const canSubmit = items.length > 0
    && items.every((i) => i.description && i.unit_price >= 0)
    && (discountPct === 0 || !!discountReasonId)

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Service Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, newItem()])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>

        {items.map((item, idx) => {
          const filteredPackages = item.vertical_id
            ? packages.filter((p) => p.vertical_id === item.vertical_id)
            : packages

          return (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <Label className="text-xs">Vertical</Label>
                    <Select value={item.vertical_id ?? ''} onValueChange={(v) => updateItem(item.id, { vertical_id: v, service_package_id: undefined })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {verticals.map((v) => <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <Label className="text-xs">Package</Label>
                    <Select value={item.service_package_id ?? ''} onValueChange={(v) => selectPackage(item.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {filteredPackages.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} — {p.tier}/{p.segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tier</Label>
                    <Select value={item.tier ?? ''} onValueChange={(v) => updateItem(item.id, { tier: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tier" /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Segment</Label>
                    <Select value={item.segment ?? ''} onValueChange={(v) => updateItem(item.id, { segment: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Segment" /></SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
                  <Input
                    className="h-8 text-sm"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Service description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number" min="1" className="h-8 text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number" min="0" step="0.01" className="h-8 text-sm"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="text-right text-sm font-medium">
                  Line total: <span className="text-foreground">Rs. {lineTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Header Discount — HARD LOCK: >5% flags for Owner approval */}
      <Card className={cn(needsApproval && 'border-amber-400/60 bg-amber-50/30')}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Discount & Totals</h3>
            {needsApproval && (
              <Badge variant="warning" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Owner Approval Required
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Header Discount %
                {needsApproval && <span className="ml-1 text-amber-600 text-[10px]">(above 5% — pending owner approval)</span>}
              </Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Number(e.target.value)))}
                className={cn('h-9', needsApproval && 'border-amber-400 focus-visible:ring-amber-400')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Discount Reason <span className="text-destructive">*</span>
                <span className="text-muted-foreground ml-1 text-[10px]">(required for any discount)</span>
              </Label>
              <Select
                value={discountReasonId}
                onValueChange={setDiscountReasonId}
                disabled={discountPct === 0}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={discountPct > 0 ? 'Select reason...' : 'No discount applied'} />
                </SelectTrigger>
                <SelectContent>
                  {discountReasons.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {discountPct > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Discount Justification Notes</Label>
              <Textarea
                placeholder="Explain why this discount is being applied..."
                rows={2}
                value={discountNotes}
                onChange={(e) => setDiscountNotes(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Amount (Rs.)</Label>
              <Input
                type="number" min="0" step="0.01" className="h-9"
                value={taxAmount}
                onChange={(e) => setTaxAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valid Until</Label>
              <Input type="date" className="h-9" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          {/* Totals summary */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount ({discountPct}%)</span>
                <span className="text-destructive">- Rs. {headerDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>Rs. {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t pt-1.5">
              <span>Total</span>
              <span>Rs. {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {needsApproval && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          This quotation will be saved as <strong>Pending Approval</strong> and sent to the Owner for discount sign-off before it can be shared with the customer.
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Quotation Notes</Label>
        <Textarea placeholder="Internal notes or scope clarifications..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button onClick={handleSubmit} disabled={isPending || !canSubmit} className="w-full sm:w-auto">
        {isPending
        ? (quotationId ? 'Saving...' : 'Creating...')
        : needsApproval
          ? 'Submit for Approval'
          : (quotationId ? 'Save Changes' : 'Create Quotation')}
      </Button>
    </div>
  )
}
