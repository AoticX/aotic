'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function recordSalaryPayment(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['owner', 'branch_manager', 'accounts_finance'].includes((profile as { role: string } | null)?.role ?? '')) {
    return { error: 'Only Owner, Branch Manager, or Accounts can record salary payments.' }
  }

  const employeeId = formData.get('employee_id') as string
  const amount = Number(formData.get('amount'))
  const paymentDate = formData.get('payment_date') as string
  const paymentMethod = formData.get('payment_method') as string
  const notes = formData.get('notes') as string || null

  if (!employeeId || !amount || !paymentDate) {
    return { error: 'Employee, amount, and payment date are required.' }
  }

  const { error } = await db.from('salary_payments').insert({
    employee_id: employeeId,
    amount,
    payment_date: paymentDate,
    payment_method: paymentMethod || null,
    notes,
    paid_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/owner/hr/salary')
  return {}
}
