import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText } from 'lucide-react'
import type { QuotationStatus } from '@/types/database'

const STATUS_VARIANT: Record<QuotationStatus, string> = {
  draft: 'secondary', pending_approval: 'warning', approved: 'info',
  sent: 'info', accepted: 'success', rejected: 'destructive',
}

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const p = profile as { role: string } | null

  let query = supabase
    .from('quotations')
    .select('id, version, status, total_amount, discount_pct, created_at, leads(contact_name)')
    .order('created_at', { ascending: false })

  if (p?.role === 'sales_executive') query = query.eq('created_by', user!.id)

  const { data } = await query.limit(100)
  const quotations = (data ?? []) as {
    id: string; version: number; status: QuotationStatus
    total_amount: number; discount_pct: number; created_at: string
    leads: { contact_name: string } | null
  }[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quotations</h1>
        <p className="text-sm text-muted-foreground">{quotations.length} result{quotations.length !== 1 ? 's' : ''}</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="mb-3">No quotations yet.</p>
                  <Link
                    href="/sales/leads"
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Go to Leads to create a quotation
                  </Link>
                </TableCell>
              </TableRow>
            )}
            {quotations.map((q) => (
              <TableRow key={q.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/sales/quotations/${q.id}`} className="font-medium hover:underline">
                    {(q.leads as { contact_name: string } | null)?.contact_name ?? '—'}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">v{q.version}</TableCell>
                <TableCell className="font-medium">Rs. {Number(q.total_amount).toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-sm">{q.discount_pct > 0 ? `${q.discount_pct}%` : '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[q.status] as 'secondary' | 'warning' | 'info' | 'success' | 'destructive' ?? 'outline'} className="text-xs capitalize">
                    {q.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(q.created_at).toLocaleDateString('en-IN')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
