import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * WhatsApp inbound webhook
 * POST /api/whatsapp/webhook
 *
 * Wasender (and compatible providers) POST webhook payloads here.
 * For Wasender, the payload is JSON and contains event data.
 * We store inbound messages in whatsapp_messages + communications,
 * matched to a lead by phone number.
 *
 * Phase 2+ will add full inbound reply handling.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''
    let fromPhone = ''
    let messageBody = ''
    let messageSid = ''
    let toPhone = ''

    if (contentType.includes('application/json')) {
      // Wasender / JSON webhook
      const payload = await req.json().catch(() => ({})) as Record<string, unknown>
      const data = (payload.data ?? payload) as Record<string, unknown>
      fromPhone = String((data.from ?? data.fromNumber ?? '')).replace('whatsapp:', '').trim()
      toPhone = String((data.to ?? data.toNumber ?? '')).replace('whatsapp:', '').trim()
      messageBody = String(data.body ?? data.text ?? data.message ?? '')
      messageSid = String(data.id ?? data.msgId ?? data.messageId ?? '')
    } else {
      // x-www-form-urlencoded (legacy)
      const body = await req.text()
      const params = new URLSearchParams(body)
      fromPhone = (params.get('From') ?? '').replace('whatsapp:', '').trim()
      toPhone = (params.get('To') ?? '').replace('whatsapp:', '').trim()
      messageBody = params.get('Body') ?? ''
      messageSid = params.get('MessageSid') ?? ''
    }

    if (!fromPhone && !messageBody) {
      return new NextResponse('OK', { status: 200 })
    }

    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const last10 = fromPhone.replace(/\D/g, '').slice(-10)
    const { data: leadRows } = last10
      ? await db.from('leads').select('id').ilike('contact_phone', `%${last10}`).limit(1)
      : { data: null }

    const leadId = (leadRows?.[0] as { id: string } | null)?.id ?? null

    await db.from('whatsapp_messages').insert({
      lead_id: leadId,
      direction: 'inbound',
      from_number: fromPhone,
      to_number: toPhone,
      body: messageBody,
      twilio_sid: messageSid,
      status: 'received',
    })

    if (leadId) {
      await db.from('communications').insert({
        lead_id: leadId,
        type: 'whatsapp',
        direction: 'inbound',
        body: messageBody,
        external_id: messageSid,
      })
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[WhatsApp webhook] error:', err)
    return new NextResponse('OK', { status: 200 })
  }
}

export async function GET() {
  return new NextResponse('AOTIC WhatsApp Webhook OK', { status: 200 })
}
