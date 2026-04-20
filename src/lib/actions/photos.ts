'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type PhotoStage = 'before' | 'during' | 'after' | 'qc' | 'delivery'

/**
 * Saves Cloudinary photo metadata to job_photos after the browser has finished uploading.
 * The actual upload happens client-side directly to Cloudinary.
 */
export async function savePhotoRecord(payload: {
  jobCardId: string
  stage: PhotoStage
  cloudinaryPublicId: string
  cloudinaryUrl: string
  fileName: string
  fileSizeKb: number
  mimeType: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('job_photos').insert({
    job_card_id: payload.jobCardId,
    stage: payload.stage,
    r2_key: payload.cloudinaryPublicId,   // reusing column to store Cloudinary public_id
    r2_url: payload.cloudinaryUrl,         // reusing column to store Cloudinary secure_url
    file_name: payload.fileName,
    file_size_kb: payload.fileSizeKb,
    mime_type: payload.mimeType,
    uploaded_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/technician/${payload.jobCardId}`)
  return {}
}

/**
 * Fetch all photos for a job card (used server-side in page components).
 */
export async function getJobPhotos(jobCardId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('job_photos')
    .select('id, stage, r2_url, file_name, file_size_kb, created_at')
    .eq('job_card_id', jobCardId)
    .order('created_at', { ascending: true })
  return (data ?? []) as {
    id: string; stage: string; r2_url: string
    file_name: string | null; file_size_kb: number | null; created_at: string
  }[]
}

/**
 * Checks if the job card has the minimum required photos (4) before QC.
 */
export async function checkPhotoMinimum(jobCardId: string): Promise<boolean> {
  const readiness = await checkPhotoReadiness(jobCardId)
  return readiness.total >= 4
}

export async function checkPhotoReadiness(jobCardId: string): Promise<{
  total: number
  counts: { before: number; during: number; after: number }
  missingStages: Array<'before' | 'during' | 'after'>
}> {
  const photos = await getJobPhotos(jobCardId)
  const counts = { before: 0, during: 0, after: 0 }

  for (const p of photos) {
    if (p.stage === 'before') counts.before += 1
    if (p.stage === 'during') counts.during += 1
    if (p.stage === 'after') counts.after += 1
  }

  const missingStages = (['before', 'during', 'after'] as const).filter((s) => counts[s] === 0)
  const total = counts.before + counts.during + counts.after

  return { total, counts, missingStages }
}

export async function moveToQcPending(jobCardId: string) {
  const readiness = await checkPhotoReadiness(jobCardId)
  if (readiness.total < 4) {
    return { error: 'Minimum 4 photos (before/during/after) required before moving to QC.' }
  }
  if (readiness.missingStages.length > 0) {
    const list = readiness.missingStages.join(', ')
    return { error: `At least one photo is required in each stage (before, during, after). Missing: ${list}.` }
  }
  // Service client required — RLS blocks technician from updating job_cards directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Auto-complete any in_progress tasks before moving to QC
  await service
    .from('job_tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('job_card_id', jobCardId)
    .eq('status', 'in_progress')

  const { error } = await service
    .from('job_cards')
    .update({ status: 'pending_qc' })
    .eq('id', jobCardId)
  if (error) return { error: error.message }
  revalidatePath(`/technician/${jobCardId}`)
  revalidatePath(`/manager/jobs/${jobCardId}`)
  redirect('/technician')
}
