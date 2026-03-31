'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { createInventoryItem } from '@/lib/actions/inventory'

export function InventoryItemModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createInventoryItem(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new product to the inventory master.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" name="name" required placeholder="e.g. Dynamat Xtreme 18sqft" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" placeholder="e.g. DYN-XT-18" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="e.g. Audio, PPF" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue="pcs" placeholder="pcs / roll / sqft" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="current_stock">Opening Stock</Label>
                <Input id="current_stock" name="current_stock" type="number" min={0} defaultValue={0} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cost_price">Cost Price (Rs.)</Label>
                <Input id="cost_price" name="cost_price" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="selling_price">Selling Price (Rs.)</Label>
                <Input id="selling_price" name="selling_price" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="min_stock_level">Min Stock Alert Level</Label>
                <Input id="min_stock_level" name="min_stock_level" type="number" min={0} placeholder="Leave blank to skip alerts" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Add Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
