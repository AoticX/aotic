'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM! // e.g. whatsapp:+14155238886

function formatPhone(phone: string): string {
  // Ensure number is in E.164 format with whatsapp: prefix
  const digits = phone.replace(/\D/g, '')
  const e164 = digits.startsWith('91') ? `+${digits}` : `+91${digits}`
  return `whatsapp:${e164}`
}

export async function sendWhatsAppMessage(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  const to = formData.get('to') as string
  const message = formData.get('message') as string
  const leadId = formData.get('lead_id') as string | null

  if (!to || !message) return { error: 'Phone number and message are required.' }
  if (message.length > 1600) return { error: 'Message too long (max 1600 characters).' }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { error: 'WhatsApp not configured. Add TWILIO_* environment variables.' }
  }

  const toFormatted = formatPhone(to)

  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: toFormatted,
    Body: message,
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
    return { error: err.message ?? `Twilio error ${response.status}` }
  }

  // Log the communication against the lead if provided
  if (leadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('communications').insert({
      lead_id: leadId,
      type: 'whatsapp',
      notes: message,
      created_by: user.id,
    })
    revalidatePath(`/sales/leads/${leadId}`)
  }

  return { success: true }
}

export async function getWhatsAppTemplates() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('whatsapp_templates')
    .select('id, name, category, label, body, variables')
    .order('category')
  return (data ?? []) as {
    id: string; name: string; category: string; label: string; body: string; variables: string[]
  }[]
}
