'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/whatsapp'

export type TallyInvoice = {
  id: string
  lead_id: string
  file_name: string
  file_url: string
  storage_path: string | null
  file_size_kb: number | null
  last_sent_at: string | null
  file_deleted_at: string | null
  created_at: string
  uploader: { full_name: string } | null
}

export async function uploadAndSaveTallyInvoice(formData: FormData): Promise<{
  id?: string
  fileUrl?: string
  fileName?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const file = formData.get('file') as File | null
  const leadId = formData.get('leadId') as string | null
  if (!file || !leadId) return { error: 'Missing file or lead ID' }
  if (file.type !== 'application/pdf') return { error: 'Only PDF files are allowed' }
  if (file.size > 16 * 1024 * 1024) return { error: 'File must be under 16 MB' }

  const storagePath = `${leadId}/${Date.now()}.pdf`
  const bytes = await file.arrayBuffer()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const { error: uploadError } = await svc.storage
    .from('tally-invoices')
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = svc.storage
    .from('tally-invoices')
    .getPublicUrl(storagePath)

  const { data, error: dbError } = await svc.from('tally_invoices').insert({
    lead_id: leadId,
    file_name: file.name,
    storage_path: storagePath,
    file_url: publicUrl,
    file_size_kb: Math.round(file.size / 1024),
    uploaded_by: user.id,
  }).select('id').single()

  if (dbError) {
    await svc.storage.from('tally-invoices').remove([storagePath])
    return { error: dbError.message }
  }

  revalidatePath(`/sales/leads/${leadId}`)
  return { id: (data as { id: string }).id, fileUrl: publicUrl, fileName: file.name }
}

export async function getTallyInvoicesForLead(leadId: string): Promise<TallyInvoice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any
  const { data } = await svc
    .from('tally_invoices')
    .select('id, lead_id, file_name, file_url, storage_path, file_size_kb, last_sent_at, file_deleted_at, created_at, uploader:uploaded_by(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  const records = (data ?? []) as TallyInvoice[]

  // Lazy storage cleanup: actually delete files from storage for records already marked expired
  const toClean = records.filter((r) => r.file_deleted_at && r.storage_path)
  if (toClean.length > 0) {
    const paths = toClean.map((r) => r.storage_path!)
    svc.storage.from('tally-invoices').remove(paths).then(async () => {
      // Clear storage_path so we don't re-attempt deletion next load
      await svc.from('tally_invoices')
        .update({ storage_path: null })
        .in('id', toClean.map((r) => r.id))
    }).catch(() => {})
  }

  return records
}

export async function sendTallyInvoiceWhatsApp(
  invoiceId: string,
  leadId: string,
  phone: string,
  message: string,
  fileUrl: string,
  fileName?: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  if (!phone || !message) return { error: 'Phone and message are required.' }

  const result = await sendWhatsApp({ to: phone, message, mediaUrl: fileUrl, fileName })
  if (!result.success) return { error: result.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  await svc.from('tally_invoices')
    .update({ last_sent_at: new Date().toISOString(), last_sent_by: user.id })
    .eq('id', invoiceId)

  await svc.from('communications').insert({
    lead_id: leadId,
    type: 'whatsapp',
    notes: `[Tally Invoice sent] ${message}`,
    created_by: user.id,
  })

  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}
