'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateAdvancePercentage(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  if (role !== 'owner') {
    return { error: 'Only the Owner can change advance payment settings.' }
  }

  const pctRaw = Number(formData.get('advance_percentage'))
  if (isNaN(pctRaw) || pctRaw < 10 || pctRaw > 100) {
    return { error: 'Advance percentage must be between 10% and 100%.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('system_settings')
    .update({
      value: { default: pctRaw, override_requires: 'owner' },
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'advance_percentage')

  if (error) return { error: error.message }

  revalidatePath('/owner/settings')
  revalidatePath('/sales/bookings/new')
  return { success: true }
}
