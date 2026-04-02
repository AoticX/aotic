import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SalaryPaymentForm } from '@/components/hr/salary-payment-form'
import { IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager', sales_executive: 'Sales Executive',
  workshop_technician: 'Technician', qc_inspector: 'QC Inspector',
  accounts_finance: 'Accounts', front_desk: 'Front Desk',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI', cheque: 'Cheque',
}

export default async function SalaryPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [employeesRes, paymentsRes] = await Promise.all([
    db.from('employees')
      .select('id, name, role, salary')
      .eq('is_active', true)
      .order('name'),
    db.from('salary_payments')
      .select('id, employee_id, amount, payment_date, payment_method, notes, employees(name, role)')
      .order('payment_date', { ascending: false })
      .limit(100),
  ])

  const employees = (employeesRes.data ?? []) as {
    id: string; name: string; role: string; salary: number | null
  }[]

  const payments = (paymentsRes.data ?? []) as {
    id: string
    employee_id: string
    amount: number
    payment_date: string
    payment_method: string | null
    notes: string | null
    employees: { name: string; role: string } | null
  }[]

  const totalPaidThisMonth = payments
    .filter(p => {
      const d = new Date(p.payment_date)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + (e.salary ?? 0), 0)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/owner/hr"><ArrowLeft className="h-4 w-4 mr-1" />HR</Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Salary Records</h1>
          <p className="text-muted-foreground text-sm">{employees.length} active employees</p>
        </div>
      </div>

      {/* Payroll summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold">Rs. {totalMonthlyPayroll.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Monthly payroll cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="text-lg font-bold">Rs. {totalPaidThisMonth.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Paid this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record payment form */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Record Salary Payment</CardTitle></CardHeader>
        <CardContent>
          <SalaryPaymentForm employees={employees} />
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Payment History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">No salary payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employees?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[p.employees?.role ?? ''] ?? p.employees?.role ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.payment_method ? (METHOD_LABELS[p.payment_method] ?? p.payment_method) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      Rs. {Number(p.amount).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
