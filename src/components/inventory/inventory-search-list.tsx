'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { StockInModal } from '@/components/inventory/stock-in-modal'

type InventoryItem = {
  id: string
  name: string
  sku: string | null
  category: string | null
  unit: string
  cost_price: number | null
  selling_price: number | null
  current_stock: number
  min_stock_level: number | null
}

function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Sell Price</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const isLow = item.min_stock_level != null && item.current_stock <= item.min_stock_level
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{item.sku ?? '—'}</TableCell>
              <TableCell className="text-right">
                <span className={isLow ? 'text-destructive font-medium' : ''}>
                  {item.current_stock} {item.unit}
                </span>
                {isLow && (
                  <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Low</Badge>
                )}
              </TableCell>
              <TableCell className="text-right text-sm">
                {item.selling_price != null ? `Rs. ${Number(item.selling_price).toLocaleString('en-IN')}` : '—'}
              </TableCell>
              <TableCell className="text-right">
                <StockInModal itemId={item.id} itemName={item.name} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function InventorySearchList({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (i.category ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items

  const categories = [...new Set(filtered.map((i) => i.category).filter(Boolean))]

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name, SKU or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No items match your search.</p>
      ) : categories.length > 0 ? (
        <>
          {categories.map((cat) => {
            const catItems = filtered.filter((i) => i.category === cat)
            return (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <InventoryTable items={catItems} />
                </CardContent>
              </Card>
            )
          })}
          {filtered.some((i) => !i.category) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Uncategorised</CardTitle></CardHeader>
              <CardContent className="p-0">
                <InventoryTable items={filtered.filter((i) => !i.category)} />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <InventoryTable items={filtered} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
