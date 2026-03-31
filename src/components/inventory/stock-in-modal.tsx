'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle } from 'lucide-react'
import { stockIn } from '@/lib/actions/inventory'

export function StockInModal({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const qty = Number(fd.get('qty'))
    const notes = (fd.get('notes') as string) || undefined
    if (!qty || qty < 1) { setError('Quantity must be at least 1'); return }
    setError(null)
    startTransition(async () => {
      const result = await stockIn(itemId, qty, notes)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        <PlusCircle className="h-3 w-3 mr-1" />
        Stock In
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Stock In</DialogTitle>
            <DialogDescription className="text-xs">{itemName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="qty">Quantity *</Label>
              <Input id="qty" name="qty" type="number" min={1} required placeholder="Enter qty received" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" placeholder="e.g. PO #123, vendor name" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Saving...' : 'Add Stock'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
