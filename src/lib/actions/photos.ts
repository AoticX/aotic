'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
