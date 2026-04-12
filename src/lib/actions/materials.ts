'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function logMaterialConsumption(
  jobCardId: string,
  itemId: string,
  qty: number,
  notes?: string,
): Promise<{ error?: string }> {
  if (qty <= 0) return { error: 'Quantity must be greater than zero.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Verify item exists and has enough stock reserved for this job
  const { data: itemData } = await db
    .from('inventory_items')
    .select('id, name, stock_qty')
    .eq('id', itemId)
    .single()
  if (!itemData) return { error: 'Inventory item not found.' }

  const { error } = await db.from('inventory_transactions').insert({
    item_id: itemId,
    job_card_id: jobCardId,
    transaction_type: 'consume',
    qty,
    notes: notes ?? null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/technician/${jobCardId}`)
  return {}
}

export async function getReservedMaterials(jobCardId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('inventory_transactions')
    .select('id, qty, transaction_type, inventory_items(id, name, unit)')
    .eq('job_card_id', jobCardId)
    .order('created_at', { ascending: true })
  return (data ?? []) as {
    id: string
    qty: number
    transaction_type: string
    inventory_items: { id: string; name: string; unit: string } | null
  }[]
}

export type JobPartUsed = {
  id: string
  item_name: string
  quantity: number
  unit: string
  notes: string | null
  created_at: string
  logged_by: string | null
}

export async function addJobPartUsed(
  jobCardId: string,
  itemName: string,
  quantity: number,
  unit: string,
  notes?: string,
): Promise<{ error?: string }> {
  const trimmed = itemName.trim()
  if (!trimmed) return { error: 'Item name is required.' }
  if (quantity <= 0) return { error: 'Quantity must be greater than zero.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('job_parts_used').insert({
    job_card_id: jobCardId,
    item_name: trimmed,
    quantity,
    unit: unit.trim() || 'pcs',
    notes: notes?.trim() || null,
    logged_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/technician/${jobCardId}`)
  return {}
}

export async function getJobPartsUsed(jobCardId: string): Promise<JobPartUsed[]> {
  // Use service client to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = await db
    .from('job_parts_used')
    .select('id, item_name, quantity, unit, notes, created_at, logged_by')
    .eq('job_card_id', jobCardId)
    .order('created_at', { ascending: true })
  return (data ?? []) as JobPartUsed[]
}
