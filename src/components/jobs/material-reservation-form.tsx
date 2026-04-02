'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'

export function MaterialReservationForm({ jobCardId }: { jobCardId: string }) {
  const [items, setItems] = useState<{ id: string; name: string; unit: string; current_stock: number }[]>([])
  const [selectedItem, setSelectedItem] = useState('')
  const [qty, setQty] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function loadItems() {
    if (items.length > 0) return
    const { data } = await supabase.from('inventory_items').select('id, name, unit, current_stock').order('name')
    if (data) setItems(data)
  }

  function handleReserve(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem || qty <= 0) return
    setError('')
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // Insert reservation logic
      const { error: txError } = await db.from('inventory_transactions').insert({
        inventory_item_id: selectedItem,
        job_card_id: jobCardId,
        transaction_type: 'reserve',
        qty: qty,
        unit_price: 0,
        total_price: 0,
        recorded_by: user.id
      })

      if (txError) {
        setError(txError.message)
        return
      }

      setSelectedItem('')
      setQty(1)
      setIsOpen(false)
      router.refresh()
    })
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setIsOpen(true); loadItems() }}>
        <Package className="h-4 w-4 mr-2" /> Reserve Materials from Inventory
      </Button>
    )
  }

  return (
    <Card className="border-indigo-100 bg-indigo-50/50">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Reserve Materials</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleReserve} className="flex gap-2 items-start flex-wrap">
          <select
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm min-w-[200px]"
            required
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
          >
            <option value="">Select item...</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.current_stock} {item.unit} in stock)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0.1}
            step="any"
            required
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button type="submit" size="sm" className="h-9" disabled={isPending}>
            {isPending ? 'Reserving...' : 'Reserve'}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </form>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  )
}
