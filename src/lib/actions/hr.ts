'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAttendance(employeeId: string, date: string, status: 'present' | 'absent' | 'half_day') {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await db.from('attendance').upsert(
    { employee_id: employeeId, date, status, marked_by: user?.id ?? null },
    { onConflict: 'employee_id,date' }
  )

  if (error) return { error: error.message }

  revalidatePath('/manager/attendance')
  return { success: true }
}
