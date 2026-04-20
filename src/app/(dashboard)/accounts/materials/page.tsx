import { createServiceClient } from '@/lib/supabase/server'
import { MaterialsJobList } from '@/components/accounts/materials-job-list'
import type { JobCardWithMaterials } from '@/components/accounts/materials-job-list'

export const dynamic = 'force-dynamic'

export default async function AccountsMaterialsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [jobCardsRes, partsRes, txRes] = await Promise.all([
    db
      .from('job_cards')
      .select('id, status, reg_number, created_at, customers(full_name), profiles_assigned:profiles!job_cards_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('job_parts_used')
      .select('id, job_card_id, item_name, quantity, unit, notes, created_at')
      .order('created_at', { ascending: true }),
    db
      .from('inventory_transactions')
      .select('id, job_card_id, qty, transaction_type, notes, created_at, inventory_items(name, unit)')
      .not('job_card_id', 'is', null)
      .in('transaction_type', ['reserve', 'consume'])
      .order('created_at', { ascending: true }),
  ])

  type RawJob = {
    id: string
    status: string
    reg_number: string
    created_at: string
    customers: { full_name: string } | null
    profiles_assigned: { full_name: string } | null
  }
  type RawPart = {
    id: string; job_card_id: string; item_name: string
    quantity: number; unit: string; notes: string | null; created_at: string
  }
  type RawTx = {
    id: string; job_card_id: string; qty: number
    transaction_type: string; notes: string | null; created_at: string
    inventory_items: { name: string; unit: string } | null
  }

const jobCards = (jobCardsRes.data ?? []) as RawJob[]
  const parts = (partsRes.data ?? []) as RawPart[]
  const transactions = (txRes.data ?? []) as RawTx[]

  // Group by job_card_id
  const partsByJob = new Map<string, RawPart[]>()
  for (const p of parts) {
    const list = partsByJob.get(p.job_card_id) ?? []
    list.push(p)
    partsByJob.set(p.job_card_id, list)
  }

  const txByJob = new Map<string, RawTx[]>()
  for (const t of transactions) {
    if (!t.job_card_id) continue
    const list = txByJob.get(t.job_card_id) ?? []
    list.push(t)
    txByJob.set(t.job_card_id, list)
  }

  const jobs: JobCardWithMaterials[] = jobCards.map((j) => ({
    id: j.id,
    status: j.status,
    reg_number: j.reg_number,
    created_at: j.created_at,
    customer_name: j.customers?.full_name ?? null,
    tech_name: j.profiles_assigned?.full_name ?? null,
    parts: (partsByJob.get(j.id) ?? []).map((p) => ({
      id: p.id,
      item_name: p.item_name,
      quantity: Number(p.quantity),
      unit: p.unit,
      notes: p.notes,
      created_at: p.created_at,
      source: 'free_text' as const,
    })),
    inventory: (txByJob.get(j.id) ?? []).map((t) => ({
      id: t.id,
      qty: Number(t.qty),
      transaction_type: t.transaction_type,
      notes: t.notes,
      created_at: t.created_at,
      item_name: t.inventory_items?.name ?? 'Unknown item',
      item_unit: t.inventory_items?.unit ?? 'pcs',
      source: 'inventory' as const,
    })),
  }))

  const totalItems = jobs.reduce((s, j) => s + j.parts.length + j.inventory.length, 0)
  const jobsWithItems = jobs.filter((j) => j.parts.length + j.inventory.length > 0).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Materials Used</h1>
        <p className="text-sm text-muted-foreground">
          {jobsWithItems} job{jobsWithItems !== 1 ? 's' : ''} with logged materials · {totalItems} total item{totalItems !== 1 ? 's' : ''}
        </p>
      </div>

      <MaterialsJobList jobs={jobs} />
    </div>
  )
}
