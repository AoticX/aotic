'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('pcs'),
  cost_price: z.coerce.number().min(0).optional(),
  selling_price: z.coerce.number().min(0).optional(),
  current_stock: z.coerce.number().int().min(0).default(0),
  min_stock_level: z.coerce.number().int().min(0).optional(),
})

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const parsed = ItemSchema.safeParse({
    name: formData.get('name'),
    sku: formData.get('sku') || undefined,
    category: formData.get('category') || undefined,
    unit: formData.get('unit') || 'pcs',
    cost_price: formData.get('cost_price') || undefined,
    selling_price: formData.get('selling_price') || undefined,
    current_stock: formData.get('current_stock') ?? 0,
    min_stock_level: formData.get('min_stock_level') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await db.from('inventory_items').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/manager/inventory')
  return { success: true }
}

export async function stockIn(itemId: string, qty: number, notes?: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  // Insert transaction
  const { error: txError } = await db.from('inventory_transactions').insert({
    item_id: itemId,
    transaction_type: 'restock',
    quantity: qty,
    notes: notes || null,
    created_by: user!.id,
  })
  if (txError) return { error: txError.message }

  // Update stock level
  const { error: stockError } = await db.rpc('increment_stock', { item_id: itemId, delta: qty })
  if (stockError) {
    // Fallback: manual update
    const { data: item } = await db.from('inventory_items').select('current_stock').eq('id', itemId).single()
    if (item) {
      await db.from('inventory_items').update({ current_stock: item.current_stock + qty }).eq('id', itemId)
    }
  }

  revalidatePath('/manager/inventory')
  return { success: true }
}
