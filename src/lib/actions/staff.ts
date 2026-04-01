'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = [
  'branch_manager', 'sales_executive', 'workshop_technician',
  'qc_inspector', 'accounts_finance', 'front_desk',
] as const

type CreateStaffResult = { success: true } | { error: string }

export async function createStaffMember(formData: FormData): Promise<CreateStaffResult> {
  // Verify caller is owner or branch_manager
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = (profile as { role: string } | null)?.role
  if (callerRole !== 'owner' && callerRole !== 'branch_manager') {
    return { error: 'Only owners and managers can add staff' }
  }

  const full_name = (formData.get('full_name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const phone = (formData.get('phone') as string)?.trim() || null

  if (!full_name || full_name.length < 2) return { error: 'Full name is required (min 2 chars)' }
  if (!email || !email.includes('@')) return { error: 'Valid email is required' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters' }
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) return { error: 'Invalid role selected' }

  const service = createServiceClient()

  // Create the auth user (triggers handle_new_user → creates profile with sales_executive role)
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError || !created?.user) {
    return { error: createError?.message ?? 'Failed to create user' }
  }

  // Update the profile with correct role and phone
  const { error: updateError } = await service
    .from('profiles')
    .update({ role, phone, full_name })
    .eq('id', created.user.id)

  if (updateError) {
    // Rollback: delete the auth user to avoid orphaned accounts
    await service.auth.admin.deleteUser(created.user.id)
    return { error: 'Failed to set role: ' + updateError.message }
  }

  revalidatePath('/manager/staff')
  revalidatePath('/owner/hr')
  return { success: true }
}

export async function updateStaffRole(profileId: string, role: string): Promise<CreateStaffResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = (profile as { role: string } | null)?.role
  if (callerRole !== 'owner' && callerRole !== 'branch_manager') {
    return { error: 'Permission denied' }
  }

  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return { error: 'Invalid role' }
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ role }).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/manager/staff')
  revalidatePath('/owner/hr')
  return { success: true }
}

// Manager-removable roles (branch_manager requires owner)
const MANAGER_CAN_REMOVE = ['sales_executive', 'workshop_technician', 'qc_inspector', 'accounts_finance', 'front_desk']

export async function removeStaffMember(profileId: string): Promise<CreateStaffResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = (callerProfile as { role: string } | null)?.role

  if (callerRole !== 'owner' && callerRole !== 'branch_manager') {
    return { error: 'Permission denied' }
  }

  // Fetch target profile to check their role
  const service = createServiceClient()
  const { data: targetProfile } = await service
    .from('profiles').select('role').eq('id', profileId).single()
  const targetRole = (targetProfile as { role: string } | null)?.role

  if (!targetRole) return { error: 'Staff member not found' }
  if (targetRole === 'owner') return { error: 'Owner accounts cannot be removed' }

  // Manager cannot remove other managers — only owner can
  if (callerRole === 'branch_manager' && !MANAGER_CAN_REMOVE.includes(targetRole)) {
    return { error: 'Only the Owner can remove a Branch Manager' }
  }

  const { error } = await service.from('profiles').update({ is_active: false }).eq('id', profileId)
  if (error) return { error: error.message }

  // Ban the auth account so they can't log in
  await service.auth.admin.updateUserById(profileId, { ban_duration: '87600h' })

  revalidatePath('/manager/staff')
  revalidatePath('/owner/hr')
  return { success: true }
}
