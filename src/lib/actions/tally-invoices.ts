'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/whatsapp'

export type TallyInvoice = {
  id: string
  lead_id: string
  file_name: string
  cloudinary_url: string
  file_size_kb: number | null
  last_sent_at: string | null
  created_at: string
  uploader: { full_name: string } | null
}

export async function saveTallyInvoice(payload: {
  leadId: string
  fileName: string
  cloudinaryPublicId: string
  cloudinaryUrl: string
  fileSizeKb: number
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = await db.from('tally_invoices').insert({
    lead_id: payload.leadId,
    file_name: payload.fileName,
    cloudinary_public_id: payload.cloudinaryPublicId,
    cloudinary_url: payload.cloudinaryUrl,
    file_size_kb: payload.fileSizeKb,
    uploaded_by: user.id,
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath(`/sales/leads/${payload.leadId}`)
  return { id: data.id }
}

export async function getTallyInvoicesForLead(leadId: string): Promise<TallyInvoice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = await db
    .from('tally_invoices')
    .select('id, lead_id, file_name, cloudinary_url, file_size_kb, last_sent_at, created_at, uploader:uploaded_by(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  return (data ?? []) as TallyInvoice[]
}

export async function sendTallyInvoiceWhatsApp(
  invoiceId: string,
  leadId: string,
  phone: string,
  message: string,
  mediaUrl: string,
  fileName?: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  if (!phone || !message) return { error: 'Phone and message are required.' }

  const result = await sendWhatsApp({ to: phone, message, mediaUrl, fileName })
  if (!result.success) return { error: result.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  await db.from('tally_invoices')
    .update({ last_sent_at: new Date().toISOString(), last_sent_by: user.id })
    .eq('id', invoiceId)

  await db.from('communications').insert({
    lead_id: leadId,
    type: 'whatsapp',
    notes: `[Tally Invoice sent] ${message}`,
    created_by: user.id,
  })

  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}
