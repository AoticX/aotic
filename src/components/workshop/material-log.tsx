'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { logMaterialConsumption } from '@/lib/actions/materials'
import { Plus } from 'lucide-react'

type ReservedItem = {
  inventory_items: { id: string; name: string; unit: string } | null
  qty: number
  transaction_type: string
}

type Props = {
  jobCardId: string
  reservedItems: ReservedItem[]
}

export function MaterialLog({ jobCardId, reservedItems }: Props) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // De-duplicate to show unique reserved items
  const uniqueItems = reservedItems
    .filter((r) => r.transaction_type === 'reserve' && r.inventory_items)
    .reduce<{ id: string; name: string; unit: string }[]>((acc, r) => {
      const item = r.inventory_items!
      if (!acc.find((a) => a.id === item.id)) acc.push(item)
      return acc
    }, [])

  if (uniqueItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No materials reserved for this job.</p>
    )
  }

  function handleLog() {
    if (!selectedItemId) { setError('Select a material.'); return }
    const qtyNum = Number(qty)
    if (!qtyNum || qtyNum <= 0) { setError('Enter a valid quantity.'); return }
    setError('')
    startTransition(async () => {
      const result = await logMaterialConsumption(jobCardId, selectedItemId, qtyNum, notes || undefined)
      if (result.error) { setError(result.error); return }
      setSelectedItemId('')
      setQty('1')
      setNotes('')
    })
  }

  return (
    <div className="space-y-3">
      <select
        value={selectedItemId}
        onChange={(e) => setSelectedItemId(e.target.value)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Select material used...</option>
        {uniqueItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.unit})
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Qty"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={handleLog} disabled={isPending} size="xl" className="w-full gap-2">
        <Plus className="h-5 w-5" />
        Log Usage
      </Button>
    </div>
  )
}
