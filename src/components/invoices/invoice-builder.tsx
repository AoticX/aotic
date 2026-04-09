'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoiceFromForm } from '@/lib/actions/invoices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

type LineItem = {
  id: string
  vertical_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_pct: number
}

function lineTotal(item: LineItem): number {
  const gross = item.quantity * item.unit_price
  return Math.round(gross * (1 - item.discount_pct / 100) * 100) / 100
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), vertical_id: null, description: '', quantity: 1, unit_price: 0, discount_pct: 0 }
}

export function InvoiceBuilder({
  jobCardId,
  customerName,
  regNumber,
  advanceAmount,
  advanceMethod,
  initialItems,
}: {
  jobCardId: string
  customerName: string
  regNumber: string
  advanceAmount: number
  advanceMethod: string | null
  initialItems: LineItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<LineItem[]>(initialItems.length ? initialItems : [newItem()])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [applyGst, setApplyGst] = useState(true)
  const [gstPct, setGstPct] = useState(18)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const discountedBase = Math.max(0, subtotal - discountAmount)
  const taxAmount = applyGst ? Math.round(discountedBase * gstPct) / 100 : 0
  const total = discountedBase + taxAmount
  const balanceDue = Math.max(0, total - advanceAmount)

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('job_card_id', jobCardId)
      fd.set('items', JSON.stringify(
        items.map(({ id: _id, ...rest }) => ({ ...rest, line_total: lineTotal({ id: _id, ...rest }) }))
      ))
      fd.set('discount_amount', String(discountAmount))
      fd.set('tax_amount', String(taxAmount))
      fd.set('notes', notes)

      const result = await createInvoiceFromForm(fd)
      if (result.error) {
        setError(result.error)
      } else if (result.id) {
        router.push(`/accounts/invoices/${result.id}`)
      }
    })
  }

  const canSubmit = items.length > 0 && items.every(i => i.description.trim() && i.unit_price >= 0)

  const GST_OPTIONS = [0, 5, 12, 18]

  return (
    <div className="space-y-6">
      {/* Customer banner */}
      <div className="rounded-md bg-muted/40 border px-4 py-3 text-sm space-y-0.5">
        <p className="font-medium">{customerName}</p>
        <p className="text-muted-foreground text-xs">Vehicle: <span className="font-mono">{regNumber}</span></p>
        {advanceAmount > 0 && (
          <p className="text-green-700 text-xs font-medium">
            Advance Paid: Rs.&nbsp;{Number(advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            {advanceMethod && (
              <span className="text-muted-foreground font-normal ml-1 capitalize">
                via {advanceMethod.replace(/_/g, ' ')}
              </span>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Invoice Items</h3>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => setItems(p => [...p, newItem()])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>

        {items.map((item, idx) => (
          <Card key={item.id} className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
                <Input
                  className="h-9 text-sm"
                  value={item.description}
                  onChange={e => updateItem(item.id, { description: e.target.value })}
                  placeholder="Service description..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number" min="1" className="h-9 text-sm"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rs.</span>
                    <Input
                      type="number" min="0" step="0.01" className="h-9 text-sm pl-9"
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Disc %</Label>
                  <Input
                    type="number" min="0" max="100" step="0.5" className="h-9 text-sm"
                    value={item.discount_pct}
                    onChange={e => updateItem(item.id, { discount_pct: Math.min(100, Number(e.target.value)) })}
                  />
                </div>
              </div>

              <div className="text-right text-sm font-medium text-muted-foreground">
                Line total:&nbsp;
                <span className="text-foreground">
                  Rs.&nbsp;{lineTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discount & GST */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Discount &amp; Tax</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Discount (Rs.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rs.</span>
                <Input
                  type="number" min="0" max={subtotal} step="0.01" className="h-9 text-sm pl-9"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GST Rate</Label>
              <div className="flex gap-1.5 flex-wrap">
                {GST_OPTIONS.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      if (pct === 0) { setApplyGst(false); setGstPct(0) }
                      else { setApplyGst(true); setGstPct(pct) }
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      (pct === 0 && !applyGst) || (pct === gstPct && applyGst)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    }`}
                  >
                    {pct === 0 ? 'No GST' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (after item discounts)</span>
              <span>Rs.&nbsp;{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Additional Discount</span>
                <span className="text-destructive">
                  &minus;&nbsp;Rs.&nbsp;{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {applyGst && taxAmount > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>CGST @ {gstPct / 2}%</span>
                  <span>Rs.&nbsp;{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>SGST @ {gstPct / 2}%</span>
                  <span>Rs.&nbsp;{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1.5">
              <span>Invoice Total</span>
              <span>Rs.&nbsp;{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {advanceAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Advance Received</span>
                <span>&minus;&nbsp;Rs.&nbsp;{Number(advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
              <span>Balance Due</span>
              <span>Rs.&nbsp;{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          placeholder="Internal notes or payment instructions..."
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !canSubmit}
        className="w-full sm:w-auto"
      >
        {isPending ? 'Creating Invoice...' : 'Create Invoice'}
      </Button>
    </div>
  )
}
