import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LeadStatusBadge } from '@/components/leads/lead-status-badge'
import { LeadsTableRow } from '@/components/leads/leads-table-row'
import { Plus } from 'lucide-react'
import type { LeadStatus, LeadSource } from '@/types/database'

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp',
  instagram: 'Instagram', facebook: 'Facebook', referral: 'Referral',
  website: 'Website', other: 'Other',
}

type Lead = {
  id: string
  contact_name: string
  contact_phone: string
  car_model: string | null
  source: LeadSource
  status: LeadStatus
  estimated_budget: number | null
  created_at: string
  verticals: { name: string } | null
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const p = profile as { role: string } | null

  let query = supabase
    .from('leads')
    .select('id, contact_name, contact_phone, car_model, source, status, estimated_budget, created_at, verticals!leads_vertical_id_fkey(name)')
    .order('created_at', { ascending: false })

  // Sales sees only their assigned leads; owner/manager sees all
  if (p?.role === 'sales_executive') {
    query = query.eq('assigned_to', user!.id)
  }
  if (status && ['hot', 'warm', 'cold', 'lost', 'booked'].includes(status)) {
    query = query.eq('status', status as LeadStatus)
  }

  const { data } = await query.limit(100)
  const leads = (data ?? []) as Lead[]

  const tabs: { label: string; value: string }[] = [
    { label: 'All', value: '' },
    { label: 'Hot', value: 'hot' },
    { label: 'Warm', value: 'warm' },
    { label: 'Cold', value: 'cold' },
    { label: 'Booked', value: 'booked' },
    { label: 'Lost', value: 'lost' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} result{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/sales/leads/new"><Plus className="h-4 w-4 mr-1" />New Lead</Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/sales/leads?status=${tab.value}` : '/sales/leads'}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              (status ?? '') === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Car</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  <p className="mb-3">No leads found.</p>
                  <Link
                    href="/sales/leads/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create First Lead
                  </Link>
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <LeadsTableRow key={lead.id} id={lead.id}>
                <TableCell className="font-medium">{lead.contact_name}</TableCell>
                <TableCell className="text-muted-foreground">{lead.contact_phone}</TableCell>
                <TableCell className="text-muted-foreground">{lead.car_model ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {(lead.verticals as { name: string } | null)?.name ?? '—'}
                </TableCell>
                <TableCell className="text-xs">{SOURCE_LABELS[lead.source]}</TableCell>
                <TableCell className="text-sm">
                  {lead.estimated_budget
                    ? `Rs. ${Number(lead.estimated_budget).toLocaleString('en-IN')}`
                    : '—'}
                </TableCell>
                <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString('en-IN')}
                </TableCell>
              </LeadsTableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
