import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { InventoryItemModal } from '@/components/inventory/inventory-item-modal'
import { InventorySearchList } from '@/components/inventory/inventory-search-list'
import { Package } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: items } = await db
    .from('inventory_items')
    .select('id, name, sku, category, unit, cost_price, selling_price, current_stock, min_stock_level, is_active')
    .eq('is_active', true)
    .order('category')
    .order('name')

  const inventory = (items ?? []) as {
    id: string
    name: string
    sku: string | null
    category: string | null
    unit: string
    cost_price: number | null
    selling_price: number | null
    current_stock: number
    min_stock_level: number | null
    is_active: boolean
  }[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">{inventory.length} product{inventory.length !== 1 ? 's' : ''}</p>
        </div>
        <InventoryItemModal />
      </div>

      {inventory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No inventory items yet.</p>
            <p className="text-xs text-muted-foreground">Add your first product to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Low stock alert */}
          {inventory.some(i => i.min_stock_level != null && i.current_stock <= i.min_stock_level) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Low stock alert:</strong>{' '}
              {inventory.filter(i => i.min_stock_level != null && i.current_stock <= i.min_stock_level).length} item(s) at or below minimum stock level.
            </div>
          )}
          <InventorySearchList items={inventory} />
        </>
      )}
    </div>
  )
}
