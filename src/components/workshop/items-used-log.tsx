'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addJobPartUsed } from '@/lib/actions/materials'
import type { JobPartUsed } from '@/lib/actions/materials'
import { Plus, Package, X } from 'lucide-react'

const UNIT_OPTIONS = ['pcs', 'ml', 'litre', 'kg', 'g', 'm', 'set', 'pair', 'can', 'bottle']

type Props = {
  jobCardId: string
  initialParts: JobPartUsed[]
}

export function ItemsUsedLog({ jobCardId, initialParts }: Props) {
  const [parts, setParts] = useState<JobPartUsed[]>(initialParts)
  const [showForm, setShowForm] = useState(false)
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('pcs')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!itemName.trim()) { setError('Enter an item name.'); return }
    const qtyNum = Number(quantity)
    if (!qtyNum || qtyNum <= 0) { setError('Enter a valid quantity.'); return }
    setError('')

    startTransition(async () => {
      const result = await addJobPartUsed(jobCardId, itemName, qtyNum, unit, notes || undefined)
      if (result.error) { setError(result.error); return }

      setParts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          item_name: itemName.trim(),
          quantity: qtyNum,
          unit,
          notes: notes.trim() || null,
          created_at: new Date().toISOString(),
          logged_by: null,
        },
      ])
      setItemName('')
      setQuantity('1')
      setUnit('pcs')
      setNotes('')
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-3">
      {/* Logged items */}
      {parts.length > 0 && (
        <div className="space-y-1.5">
          {parts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.item_name}</p>
                  {p.notes && (
                    <p className="text-xs text-muted-foreground truncate">{p.notes}</p>
                  )}
                </div>
              </div>
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded ml-2 flex-shrink-0">
                {p.quantity} {p.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Item / part name  (e.g. Engine oil, Air filter)"
            className="h-10 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />

          <div className="flex gap-2">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24 h-9 text-sm"
              placeholder="Qty"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm flex-shrink-0"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="flex-1 h-9 text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={isPending || !itemName.trim()}
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {isPending ? 'Logging…' : 'Log Item'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setError(''); setItemName(''); setQuantity('1'); setNotes('') }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Log Item Used
        </Button>
      )}
    </div>
  )
}
