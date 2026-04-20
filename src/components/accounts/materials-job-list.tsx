'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight, Package, Wrench, Search } from 'lucide-react'

type PartUsed = {
  id: string
  item_name: string
  quantity: number
  unit: string
  notes: string | null
  created_at: string
  source: 'free_text'
}

type InventoryItem = {
  id: string
  qty: number
  transaction_type: string
  notes: string | null
  created_at: string
  item_name: string
  item_unit: string
  source: 'inventory'
}

type JobMaterial = PartUsed | InventoryItem

export type JobCardWithMaterials = {
  id: string
  status: string
  reg_number: string
  created_at: string
  customer_name: string | null
  tech_name: string | null
  parts: PartUsed[]
  inventory: InventoryItem[]
}

const STATUS_VARIANT: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  created: 'secondary',
  in_progress: 'info',
  pending_qc: 'warning',
  qc_passed: 'success',
  rework_scheduled: 'destructive',
  ready_for_delivery: 'success',
  delivered: 'secondary',
}

function totalMaterials(job: JobCardWithMaterials) {
  return job.parts.length + job.inventory.length
}

export function MaterialsJobList({ jobs }: { jobs: JobCardWithMaterials[] }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = jobs.filter((j) => {
    const q = query.toLowerCase()
    const matchesQuery =
      !q ||
      j.reg_number.toLowerCase().includes(q) ||
      (j.customer_name ?? '').toLowerCase().includes(q) ||
      (j.tech_name ?? '').toLowerCase().includes(q) ||
      j.parts.some((p) => p.item_name.toLowerCase().includes(q)) ||
      j.inventory.some((p) => p.item_name.toLowerCase().includes(q))
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter
    return matchesQuery && matchesStatus
  })

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const statuses = ['all', ...Array.from(new Set(jobs.map((j) => j.status)))]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reg no., customer, item…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No jobs match your search.</p>
      )}

      <div className="space-y-2">
        {filtered.map((job) => {
          const isOpen = expanded.has(job.id)
          const total = totalMaterials(job)
          const allMaterials: JobMaterial[] = [
            ...job.parts,
            ...job.inventory,
          ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

          return (
            <Card key={job.id} className="overflow-hidden">
              <button
                onClick={() => toggle(job.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{job.reg_number}</span>
                    {job.customer_name && (
                      <span className="text-sm text-muted-foreground">· {job.customer_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {job.tech_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" />{job.tech_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {total === 0 ? 'No items' : `${total} item${total !== 1 ? 's' : ''}`}
                  </span>
                  <Badge
                    variant={STATUS_VARIANT[job.status] ?? 'secondary'}
                    className="text-[10px] capitalize"
                  >
                    {job.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </button>

              {isOpen && (
                <CardContent className="border-t px-4 py-3 bg-muted/10">
                  {allMaterials.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">No materials logged for this job.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Column header */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 pb-1">
                        <span>Item</span>
                        <span className="text-right">Qty</span>
                        <span>Unit</span>
                        <span>Source</span>
                      </div>
                      {allMaterials.map((m) => (
                        <div
                          key={m.id}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center rounded-md bg-background border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {m.source === 'inventory' ? m.item_name : m.item_name}
                            </p>
                            {m.notes && (
                              <p className="text-xs text-muted-foreground truncate">{m.notes}</p>
                            )}
                          </div>
                          <span className="font-mono text-xs text-right tabular-nums">
                            {m.source === 'inventory' ? Number(m.qty) : Number(m.quantity)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {m.source === 'inventory' ? m.item_unit : m.unit}
                          </span>
                          <Badge
                            variant={m.source === 'inventory' ? 'info' : 'secondary'}
                            className="text-[10px] flex items-center gap-1 w-fit"
                          >
                            <Package className="h-2.5 w-2.5" />
                            {m.source === 'inventory' ? m.transaction_type : 'logged'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {job.parts.length > 0 && `${job.parts.length} free-text item${job.parts.length !== 1 ? 's' : ''}`}
                      {job.parts.length > 0 && job.inventory.length > 0 && ' · '}
                      {job.inventory.length > 0 && `${job.inventory.length} from inventory`}
                    </span>
                    <span className="font-mono">JC {job.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
