'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM!

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const e164 = digits.startsWith('91') ? `+${digits}` : `+91${digits}`
  return `whatsapp:${e164}`
}

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
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  if (!phone || !message) return { error: 'Phone and message are required.' }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { error: 'WhatsApp not configured. Add TWILIO_* environment variables.' }
  }

  const toFormatted = formatPhone(phone)

  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: toFormatted,
    Body: message,
    MediaUrl: mediaUrl,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return { error: (err as { message?: string }).message ?? `Twilio error ${response.status}` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Mark the invoice as sent
  await db.from('tally_invoices')
    .update({ last_sent_at: new Date().toISOString(), last_sent_by: user.id })
    .eq('id', invoiceId)

  // Log communication against the lead
  await db.from('communications').insert({
    lead_id: leadId,
    type: 'whatsapp',
    notes: `[Tally Invoice sent] ${message}`,
    created_by: user.id,
  })

  revalidatePath(`/sales/leads/${leadId}`)
  return { success: true }
}
