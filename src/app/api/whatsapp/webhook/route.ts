import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Twilio WhatsApp inbound webhook
 * POST /api/whatsapp/webhook
 *
 * Twilio sends x-www-form-urlencoded:
 *   From=whatsapp:+91XXXXXXXXXX
 *   To=whatsapp:+14155XXXXXXX
 *   Body=<message text>
 *   MessageSid=<sid>
 *   NumMedia=0
 *
 * We store the message in whatsapp_messages, find the matching lead by phone,
 * and return an empty TwiML response (no auto-reply).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') ?? ''   // e.g. whatsapp:+919876543210
    const toNum = params.get('To') ?? ''
    const messageBody = params.get('Body') ?? ''
    const messageSid = params.get('MessageSid') ?? ''

    // Strip whatsapp: prefix
    const fromPhone = from.replace('whatsapp:', '').trim()       // +919876543210
    const toPhone = toNum.replace('whatsapp:', '').trim()

    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Try to match lead by phone (last 10 digits to handle +91 prefix variants)
    const last10 = fromPhone.replace(/\D/g, '').slice(-10)

    const { data: leadRows } = await db
      .from('leads')
      .select('id')
      .ilike('contact_phone', `%${last10}`)
      .limit(1)

    const leadId = (leadRows?.[0] as { id: string } | null)?.id ?? null

    // Store in whatsapp_messages
    await db.from('whatsapp_messages').insert({
      lead_id: leadId,
      direction: 'inbound',
      from_number: fromPhone,
      to_number: toPhone,
      body: messageBody,
      twilio_sid: messageSid,
      status: 'received',
    })

    // Also log as a communication if lead found
    if (leadId) {
      await db.from('communications').insert({
        lead_id: leadId,
        type: 'whatsapp',
        direction: 'inbound',
        body: messageBody,
        external_id: messageSid,
      })
    }

    // Return empty TwiML — no auto-reply
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    )
  } catch (err) {
    console.error('[WhatsApp webhook] error:', err)
    // Always return 200 to Twilio so it doesn't retry infinitely
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}

// Twilio sometimes sends GET to verify webhook URL — respond 200
export async function GET() {
  return new NextResponse('AOTIC WhatsApp Webhook OK', { status: 200 })
}
