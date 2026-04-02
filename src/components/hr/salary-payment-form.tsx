'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { recordSalaryPayment } from '@/lib/actions/salary'
import { CheckCircle2 } from 'lucide-react'

type Employee = { id: string; name: string; role: string; salary: number | null }

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI / GPay' },
  { value: 'cheque', label: 'Cheque' },
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager', sales_executive: 'Sales Executive',
  workshop_technician: 'Technician', qc_inspector: 'QC Inspector',
  accounts_finance: 'Accounts', front_desk: 'Front Desk',
}

export function SalaryPaymentForm({ employees }: { employees: Employee[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')

  const selectedEmp = employees.find(e => e.id === selectedEmpId)
  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await recordSalaryPayment(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
        setSelectedEmpId('')
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Salary payment recorded successfully.
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Employee <span className="text-destructive">*</span></Label>
          <select
            name="employee_id"
            required
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select employee...</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {ROLE_LABELS[emp.role] ?? emp.role}
              </option>
            ))}
          </select>
          {selectedEmp?.salary != null && (
            <p className="text-xs text-muted-foreground">
              Monthly salary: <span className="font-medium">Rs. {Number(selectedEmp.salary).toLocaleString('en-IN')}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Amount (Rs.) <span className="text-destructive">*</span></Label>
          <Input
            name="amount"
            type="number"
            min={1}
            step={0.01}
            required
            placeholder={selectedEmp?.salary != null ? String(selectedEmp.salary) : '0.00'}
            defaultValue={selectedEmp?.salary != null ? selectedEmp.salary : undefined}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Payment Date <span className="text-destructive">*</span></Label>
          <Input name="payment_date" type="date" required defaultValue={today} />
        </div>

        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <select
            name="payment_method"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select method...</option>
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea name="notes" placeholder="e.g. April 2026 salary, partial advance, bonus..." rows={2} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Recording...' : 'Record Payment'}
      </Button>
    </form>
  )
}
