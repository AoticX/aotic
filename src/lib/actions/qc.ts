'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type QcItemResult = {
  templateId: string | null
  checkPoint: string
  result: 'pass' | 'fail' | 'na'
  notes: string
}

export async function getQcTemplates(verticalId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('qc_checklist_templates')
    .select('id, check_point, is_mandatory, item_order')
    .eq('vertical_id', verticalId)
    .eq('is_active', true)
    .order('item_order')
  return (data ?? []) as {
    id: string; check_point: string; is_mandatory: boolean; item_order: number
  }[]
}

export async function getJobVertical(jobCardId: string): Promise<string | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // job_card → booking → quotation → quotation_items → service_packages → verticals
  const { data } = await db
    .from('job_cards')
    .select('bookings(quotation_id)')
    .eq('id', jobCardId)
    .single()
  if (!data) return null
  const bookingData = data as { bookings: { quotation_id: string } | null }
  const quotationId = bookingData.bookings?.quotation_id
  if (!quotationId) return null

  const { data: items } = await db
    .from('quotation_items')
    .select('service_packages(vertical_id)')
    .eq('quotation_id', quotationId)
    .limit(1)
    .maybeSingle()
  if (!items) return null
  const itemData = items as { service_packages: { vertical_id: string } | null }
  return itemData.service_packages?.vertical_id ?? null
}

export async function submitQcChecklist(
  jobCardId: string,
  verticalId: string | null,
  items: QcItemResult[],
  reworkNotes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as { role: string } | null
  if (!['owner', 'branch_manager', 'qc_inspector'].includes(profile?.role ?? '')) {
    return { error: 'Insufficient permissions.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const hasFailure = items.some((i) => i.result === 'fail')
  const overallResult = hasFailure ? 'fail' : 'pass'
  const reworkRequired = hasFailure

  // Create QC record
  const { data: qcRecord, error: qcError } = await db
    .from('qc_records')
    .insert({
      job_card_id: jobCardId,
      vertical_id: verticalId ?? null,
      inspector_id: user.id,
      overall_result: overallResult,
      rework_required: reworkRequired,
      rework_notes: reworkRequired ? (reworkNotes || null) : null,
      signed_off_at: !reworkRequired ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (qcError) return { error: qcError.message }
  const qcId = (qcRecord as { id: string }).id

  // Insert checklist results
  const results = items.map((item) => ({
    qc_record_id: qcId,
    template_id: item.templateId ?? null,
    check_point: item.checkPoint,
    result: item.result,
    notes: item.notes || null,
  }))
  const { error: resultsError } = await db.from('qc_checklist_results').insert(results)
  if (resultsError) return { error: resultsError.message }

  // Update job card status + QC sign-off fields
  const jobUpdate = reworkRequired
    ? { status: 'rework_scheduled' }
    : {
        status: 'qc_passed',
        qc_signed_off_by: user.id,
        qc_signed_off_at: new Date().toISOString(),
      }

  const { error: jobError } = await db
    .from('job_cards')
    .update(jobUpdate)
    .eq('id', jobCardId)
  if (jobError) return { error: jobError.message }

  revalidatePath(`/qc/${jobCardId}`)
  revalidatePath('/qc')
  revalidatePath(`/manager/jobs/${jobCardId}`)

  if (!reworkRequired) {
    redirect('/qc')
  }
  return {}
}
