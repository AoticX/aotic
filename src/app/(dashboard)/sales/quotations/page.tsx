import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
      <h1 className="text-xl font-bold">Quotations</h1>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quotations yet.</TableCell>
              </TableRow>
            )}
            {quotations.map((q) => (
              <TableRow key={q.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/dashboard/sales/quotations/${q.id}`} className="font-medium hover:underline">
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
