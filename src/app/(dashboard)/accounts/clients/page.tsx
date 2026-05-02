import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Car } from 'lucide-react'

type ClientRow = {
  id: string
  full_name: string | null
  phone: string | null
  car_model: string | null
  car_brand: string | null
  invoice_count: number
  total_billed: number
  total_paid: number
  total_due: number
}

export default async function ClientsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Fetch all customers who have at least one invoice, with aggregated financials
  const { data: invoicesData } = await db
    .from('invoices')
    .select('customer_id, total_amount, amount_paid, amount_due')
    .not('customer_id', 'is', null)

  const invoices = (invoicesData ?? []) as {
    customer_id: string
    total_amount: number
    amount_paid: number
    amount_due: number
  }[]

  // Aggregate per customer
  const byCustomer = new Map<string, { count: number; billed: number; paid: number; due: number }>()
  for (const inv of invoices) {
    const existing = byCustomer.get(inv.customer_id) ?? { count: 0, billed: 0, paid: 0, due: 0 }
    byCustomer.set(inv.customer_id, {
      count: existing.count + 1,
      billed: existing.billed + Number(inv.total_amount),
      paid: existing.paid + Number(inv.amount_paid),
      due: existing.due + Number(inv.amount_due),
    })
  }

  if (byCustomer.size === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">Customers with invoices</p>
        </div>
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No clients with invoices found.
        </Card>
      </div>
    )
  }

  const customerIds = Array.from(byCustomer.keys())
  const { data: customersData } = await db
    .from('customers')
    .select('id, full_name, phone, car_brand, car_model')
    .in('id', customerIds)

  const customers = (customersData ?? []) as {
    id: string
    full_name: string | null
    phone: string | null
    car_brand: string | null
    car_model: string | null
  }[]

  // Build final rows — sort by highest outstanding balance first
  const rows: ClientRow[] = customers.map((c) => {
    const agg = byCustomer.get(c.id) ?? { count: 0, billed: 0, paid: 0, due: 0 }
    return {
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      car_brand: c.car_brand,
      car_model: c.car_model,
      invoice_count: agg.count,
      total_billed: agg.billed,
      total_paid: agg.paid,
      total_due: agg.due,
    }
  }).sort((a, b) => b.total_due - a.total_due || b.total_billed - a.total_billed)

  const grandBilled = rows.reduce((s, r) => s + r.total_billed, 0)
  const grandDue    = rows.reduce((s, r) => s + r.total_due,    0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} client{rows.length !== 1 ? 's' : ''} &middot; Rs.{' '}
            {grandBilled.toLocaleString('en-IN')} billed
            {grandDue > 0 && (
              <span className="ml-2 text-destructive font-medium">
                Rs. {grandDue.toLocaleString('en-IN')} outstanding
              </span>
            )}
          </p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Total Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/accounts/clients/${row.id}`} className="hover:underline">
                    <p className="font-medium">{row.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{row.phone}</p>
                  </Link>
                </TableCell>
                <TableCell>
                  {row.car_brand || row.car_model ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Car className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{[row.car_brand, row.car_model].filter(Boolean).join(' ')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="text-xs">{row.invoice_count}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  Rs. {row.total_billed.toLocaleString('en-IN')}
                </TableCell>
                <TableCell className="text-right text-sm text-green-600">
                  Rs. {row.total_paid.toLocaleString('en-IN')}
                </TableCell>
                <TableCell className={`text-right font-medium text-sm ${row.total_due > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Rs. {row.total_due.toLocaleString('en-IN')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
