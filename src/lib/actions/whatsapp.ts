'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendWhatsApp } from '@/lib/whatsapp'

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

  const result = await sendWhatsApp({ to, message })
  if (!result.success) return { error: result.error }

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
