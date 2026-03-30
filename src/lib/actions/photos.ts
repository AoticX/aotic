'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPresignedPutUrl, getPublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

type PhotoStage = 'before' | 'during' | 'after' | 'qc' | 'delivery'

/**
 * Returns a presigned PUT URL for direct browser→R2 upload.
 * Called by the client before uploading; does NOT touch the DB yet.
 */
export async function getPhotoUploadUrl(
  jobCardId: string,
  stage: PhotoStage,
  fileName: string,
  mimeType: string,
): Promise<{ uploadUrl: string; r2Key: string; publicUrl: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const ext = fileName.split('.').pop() ?? 'jpg'
  const r2Key = `jobs/${jobCardId}/${stage}/${randomUUID()}.${ext}`
  const uploadUrl = await getPresignedPutUrl(r2Key, mimeType)
  const publicUrl = getPublicUrl(r2Key)
  return { uploadUrl, r2Key, publicUrl }
}

/**
 * Saves photo metadata to job_photos after the browser has finished uploading to R2.
 */
export async function savePhotoRecord(payload: {
  jobCardId: string
  stage: PhotoStage
  r2Key: string
  r2Url: string
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
    r2_key: payload.r2Key,
    r2_url: payload.r2Url,
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
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { count } = await db
    .from('job_photos')
    .select('id', { count: 'exact', head: true })
    .eq('job_card_id', jobCardId)
    .in('stage', ['before', 'during', 'after'])
  return (count ?? 0) >= 4
}

export async function moveToQcPending(jobCardId: string) {
  const hasPhotos = await checkPhotoMinimum(jobCardId)
  if (!hasPhotos) {
    return { error: 'Minimum 4 photos (before/during/after) required before moving to QC.' }
  }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('job_cards')
    .update({ status: 'pending_qc' })
    .eq('id', jobCardId)
  if (error) return { error: error.message }
  revalidatePath(`/technician/${jobCardId}`)
  redirect('/technician')
}
