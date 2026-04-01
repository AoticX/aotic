'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDefaultRoute } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Authentication+failed')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  const p = profile as { role: AppRole; is_active: boolean } | null

  if (!p?.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=Account+is+deactivated.+Contact+your+administrator.')
  }

  // Auto-record attendance on login using the authenticated user's session
  try {
    // Use UTC date to avoid timezone issues
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Try to find linked employee record
    const { data: emp } = await db
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    await db.from('attendance').upsert(
      {
        profile_id: user.id,
        employee_id: emp?.id ?? null,
        date: today,
        status: 'present',
        login_time: now.toISOString(),
        marked_by: user.id,
      },
      { onConflict: 'profile_id,date', ignoreDuplicates: true }
    )
  } catch {
    // Non-blocking — attendance failure must not prevent login
  }

  revalidatePath('/', 'layout')
  redirect(getDefaultRoute(p!.role))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
