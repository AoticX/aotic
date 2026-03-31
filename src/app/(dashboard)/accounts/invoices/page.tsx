import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TallyExportButton } from '@/components/invoices/tally-export-button'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_paid: number
  amount_due: number
  created_at: string
  customer_name: string | null
  customer_phone: string | null
}

const STATUS_VARIANT: Record<string, string> = {
  draft: 'secondary',
  finalized: 'info',
  partially_paid: 'warning',
  paid: 'success',
  void: 'destructive',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let query = db
    .from('invoices')
    .select('id, invoice_number, status, total_amount, amount_paid, amount_due, created_at, customer_name, customer_phone')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query.limit(200)
  const invoices = (data ?? []) as Invoice[]

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Finalized', value: 'finalized' },
    { label: 'Partial', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} result{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <TallyExportButton />
      </div>

      <div className="flex gap-1 border-b flex-wrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/accounts/invoices?status=${tab.value}` : '/accounts/invoices'}
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
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/accounts/invoices/${inv.id}`} className="font-mono text-sm font-medium hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{inv.customer_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_phone}</p>
                  </TableCell>
                  <TableCell className="text-right">Rs. {Number(inv.total_amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right text-green-600">Rs. {Number(inv.amount_paid).toLocaleString('en-IN')}</TableCell>
                  <TableCell className={`text-right ${Number(inv.amount_due) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    Rs. {Number(inv.amount_due).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(STATUS_VARIANT[inv.status] ?? 'secondary') as 'secondary' | 'info' | 'warning' | 'success' | 'destructive'}
                      className="text-xs capitalize"
                    >
                      {inv.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
