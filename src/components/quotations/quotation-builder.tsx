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
import { Plus, Trash2, AlertTriangle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

type Vertical = { id: string; name: string }
type ServicePackage = { id: string; vertical_id: string; tier: string; segment: string; name: string; base_price: number }
type DiscountReason = { id: string; label: string }

type LineItem = {
  id: string
  service_package_id?: string
  vertical_id?: string
  heading?: string
  description: string
  tier?: string
  segment?: string
  quantity: number
  unit_price: number
}

const TIERS = ['essential', 'enhanced', 'elite', 'luxe']
const SEGMENTS = ['hatchback', 'sedan', 'suv', 'luxury']

function humanize(value?: string) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

function lineTotal(item: LineItem) {
  return item.unit_price * item.quantity
}

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type InitialValues = {
  items?: LineItem[]
  discountPct?: number
  discountReasonId?: string
  discountNotes?: string
  taxAmount?: number        // = installation_gst (only installation GST stored)
  notes?: string
  validUntil?: string
  vehicleLabel?: string
  installationBase?: number
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
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '')
  // Phase 3a: free-text vehicle label
  const [vehicleLabel, setVehicleLabel] = useState(initial?.vehicleLabel ?? '')
  // Phase 3c: installation charges (GST-exclusive base amount)
  const [installationBase, setInstallationBase] = useState(initial?.installationBase ?? 0)
  const [isPending, startTransition] = useTransition()

  // Phase 3b: products are GST-inclusive; no separate GST calculation for products
  const productSubtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const headerDiscount = productSubtotal * (discountPct / 100)
  const productTotalInclGst = productSubtotal - headerDiscount
  // Phase 3c: installation GST calculated on top of base amount
  const installationGst = Math.round(installationBase * 0.18 * 100) / 100
  const grandTotal = productTotalInclGst + installationBase + installationGst
  const needsApproval = discountPct > 5

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function selectPackage(itemId: string, pkgId: string) {
    const pkg = packages.find((p) => p.id === pkgId)
    if (!pkg) return
    const verticalName = verticals.find((v) => v.id === pkg.vertical_id)?.name ?? ''
    updateItem(itemId, {
      service_package_id: pkg.id,
      vertical_id: pkg.vertical_id,
      heading: verticalName,
      description: pkg.name,
      tier: pkg.tier,
      segment: pkg.segment,
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lead_id', leadId)
      if (customerId) fd.set('customer_id', customerId)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fd.set('items', JSON.stringify(items.map(({ id: _, ...rest }) => rest)))
      fd.set('discount_pct', String(discountPct))
      if (discountReasonId) fd.set('discount_reason_id', discountReasonId)
      fd.set('discount_notes', discountNotes)
      // tax_amount = installationGst (only installation GST; product GST is baked in)
      fd.set('tax_amount', String(installationGst))
      fd.set('installation_base', String(installationBase))
      fd.set('vehicle_label', vehicleLabel)
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

      {/* Phase 3a: Free-text vehicle field */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Vehicle
          <span className="text-muted-foreground ml-1 text-[10px] font-normal">(optional — appears on quotation PDF)</span>
        </Label>
        <Input
          className="h-9 text-sm"
          value={vehicleLabel}
          onChange={(e) => setVehicleLabel(e.target.value)}
          placeholder="e.g. Kia Sonet 2024 HTX+, Maruti Baleno Alpha Turbo…"
        />
      </div>

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
          const selectedPackage = item.service_package_id
            ? packages.find((p) => p.id === item.service_package_id)
            : undefined

          return (
            <Card key={item.id} className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="p-4 space-y-3.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <Label className="text-xs">Vertical</Label>
                    <Select value={item.vertical_id ?? ''} onValueChange={(v) => updateItem(item.id, { vertical_id: v, service_package_id: undefined })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {verticals.map((v) => <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Package</Label>
                    <Select value={item.service_package_id ?? ''} onValueChange={(v) => selectPackage(item.id, v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {filteredPackages.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {humanize(p.tier)} • {humanize(p.segment)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPackage && (
                      <p className="text-[11px] text-muted-foreground truncate" title={selectedPackage.name}>
                        {selectedPackage.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tier</Label>
                    <Select value={item.tier ?? ''} onValueChange={(v) => updateItem(item.id, { tier: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tier" /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Segment</Label>
                    <Select value={item.segment ?? ''} onValueChange={(v) => updateItem(item.id, { segment: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Segment" /></SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Item Heading
                    <span className="text-muted-foreground text-[10px] font-normal">(appears as the item title on the quotation)</span>
                  </Label>
                  <Input
                    className="h-9 text-sm font-medium"
                    value={item.heading ?? ''}
                    onChange={(e) => updateItem(item.id, { heading: e.target.value })}
                    placeholder="e.g. Audio Upgrade, PPF Package…"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
                  <Input
                    className="h-9 text-sm"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Service description..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number" min="1" className="h-9 text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                  {/* Phase 3b: label shows "Price (GST Inclusive)" */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Price (GST Inclusive)
                      <span className="text-muted-foreground ml-1 text-[10px] font-normal">per unit</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rs.</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9 text-sm pl-9"
                        value={item.unit_price}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItem(item.id, { unit_price: Number(e.target.value) })}
                      />
                    </div>
                    {selectedPackage && (
                      <p className="text-[11px] text-muted-foreground">
                        Suggested: Rs. {Number(selectedPackage.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-sm font-medium">
                  Line total (incl. GST):{' '}
                  <span className="text-foreground">{fmt(lineTotal(item))}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Discount & Totals */}
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
                onFocus={(e) => e.target.select()}
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

          <div className="space-y-1.5">
            <Label className="text-xs">Valid Until</Label>
            <Input type="date" className="h-9 w-full sm:w-1/2" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          {/* Totals summary — Phase 3 revised format */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Product Subtotal (Incl. GST)</span>
              <span>{fmt(productSubtotal)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount ({discountPct}%)</span>
                <span className="text-destructive">- {fmt(headerDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Product Total (Incl. GST)</span>
              <span>{fmt(productTotalInclGst)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase 3c: Installation Charges — separate GST-exclusive section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Installation Charges</h3>
            <span className="text-xs text-muted-foreground">(GST exclusive — 18% added on top)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Installation Base Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rs.</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 text-sm pl-9"
                  value={installationBase}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setInstallationBase(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GST (18%) on Installation</Label>
              <Input
                readOnly
                className="h-9 text-sm bg-muted"
                value={`Rs. ${installationGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Installation Total</Label>
              <Input
                readOnly
                className="h-9 text-sm bg-muted font-medium"
                value={`Rs. ${(installationBase + installationGst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Product Total (Incl. GST)</span>
          <span>{fmt(productTotalInclGst)}</span>
        </div>
        {installationBase > 0 && (
          <>
            <div className="flex justify-between text-muted-foreground">
              <span>Installation Charges (Base)</span>
              <span>{fmt(installationBase)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST on Installation (18%)</span>
              <span>{fmt(installationGst)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-1.5">
          <span>Grand Total</span>
          <span>{fmt(grandTotal)}</span>
        </div>
      </div>

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
