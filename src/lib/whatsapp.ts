const WASENDER_API_KEY = process.env.WASENDER_API_KEY
const WASENDER_BASE_URL = 'https://www.wasenderapi.com'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // 12-digit string starting with 91 already has the country code
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  // 10-digit local Indian number — prefix +91
  if (digits.length === 10) return `+91${digits}`
  // Anything else: just prefix + and pass through
  return `+${digits}`
}

type SendParams = {
  to: string
  message: string
  mediaUrl?: string
  fileName?: string
}

export async function sendWhatsApp({
  to,
  message,
  mediaUrl,
  fileName,
}: SendParams): Promise<{ success?: boolean; error?: string }> {
  if (!WASENDER_API_KEY) {
    return { error: 'WhatsApp not configured. Set WASENDER_API_KEY environment variable.' }
  }

  const toFormatted = formatPhone(to)

  const body: Record<string, unknown> = {
    to: toFormatted,
    text: message,
  }

  // Attach media if provided — detect type from file name
  if (mediaUrl) {
    const name = fileName ?? ''
    const isDoc = /\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i.test(name)
    if (isDoc) {
      body.documentUrl = mediaUrl
      if (fileName) body.fileName = fileName
    } else {
      body.imageUrl = mediaUrl
    }
  }

  let response: Response
  try {
    response = await fetch(`${WASENDER_BASE_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WASENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    return { error: 'Failed to reach Wasender API. Check your network or API key.' }
  }

  const responseBody = await response.json().catch(() => ({})) as {
    success?: boolean
    error?: string
    message?: string
    errors?: Record<string, string[]>
  }

  // Log full response for debugging
  console.log('[sendWhatsApp] status:', response.status, '| body:', JSON.stringify(responseBody), '| to:', toFormatted, '| hasMedia:', !!mediaUrl)

  if (!response.ok || responseBody.success === false) {
    const fieldErrors = Object.values(responseBody.errors ?? {}).flat().join(', ')
    const detail = responseBody.error || responseBody.message || fieldErrors || `Wasender error ${response.status}`
    console.error('[sendWhatsApp] delivery failed:', detail)
    return { error: detail }
  }

  // Treat as success only if body explicitly contains success:true (Wasender always sets this)
  if (responseBody.success !== true) {
    const detail = responseBody.message || responseBody.error || 'Wasender returned ambiguous response'
    console.warn('[sendWhatsApp] ambiguous response — treating as failure:', detail)
    return { error: detail }
  }

  return { success: true }
}
