'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { addJobPartUsed } from '@/lib/actions/materials'
import type { JobPartUsed } from '@/lib/actions/materials'
import { Plus, Package } from 'lucide-react'

const UNIT_OPTIONS = ['pcs', 'ml', 'litre', 'kg', 'g', 'm', 'set', 'pair', 'can', 'bottle']

type Props = {
  jobCardId: string
  initialParts: JobPartUsed[]
}

export function ItemsUsedLog({ jobCardId, initialParts }: Props) {
  const [parts, setParts] = useState<JobPartUsed[]>(initialParts)
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

      // Optimistically add to local list
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
    })
  }

  return (
    <div className="space-y-4">
      {/* Existing entries */}
      {parts.length > 0 && (
        <div className="space-y-1.5">
          {parts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{p.item_name}</span>
                {p.notes && (
                  <span className="text-xs text-muted-foreground truncate">({p.notes})</span>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2 flex-shrink-0">
                {p.quantity} {p.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="space-y-2">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Item / part name (e.g. Engine oil, Air filter)"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Qty"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-28 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          onClick={handleAdd}
          disabled={isPending}
          size="xl"
          className="w-full gap-2"
        >
          <Plus className="h-5 w-5" />
          {isPending ? 'Logging…' : 'Log Item Used'}
        </Button>
      </div>
    </div>
  )
}
