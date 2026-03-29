import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TallyExportButton } from '@/components/invoices/tally-export-button'
import Link from 'next/link'
import { FileText, IndianRupee, Clock } from 'lucide-react'

export default async function AccountsDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [totalRes, dueRes, paidRes] = await Promise.all([
    db.from('invoices').select('total_amount').in('status', ['finalized', 'partially_paid', 'paid']),
    db.from('invoices').select('amount_due').in('status', ['finalized', 'partially_paid']),
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ])

  const totalBilled = (totalRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + Number(r.total_amount), 0)
  const totalDue = (dueRes.data ?? []).reduce((s: number, r: { amount_due: number }) => s + Number(r.amount_due), 0)
  const paidCount = paidRes.count ?? 0

  const stats = [
    { label: 'Total Billed', value: `Rs. ${totalBilled.toLocaleString('en-IN')}`, icon: IndianRupee },
    { label: 'Outstanding', value: `Rs. ${totalDue.toLocaleString('en-IN')}`, icon: Clock },
    { label: 'Fully Paid', value: String(paidCount), icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Invoices, payments, and Tally export</p>
        </div>
        <TallyExportButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/accounts/invoices"
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="font-medium">All Invoices</p>
          <p className="text-sm text-muted-foreground">View and manage invoices</p>
        </Link>
        <Link
          href="/dashboard/accounts/payments"
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="font-medium">Payments</p>
          <p className="text-sm text-muted-foreground">Payment history</p>
        </Link>
      </div>
    </div>
  )
}
