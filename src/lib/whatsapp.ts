const WASENDER_API_KEY = process.env.WASENDER_API_KEY
const WASENDER_BASE_URL = 'https://www.wasenderapi.com'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`
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

  if (!response.ok || responseBody.success === false) {
    const fieldErrors = Object.values(responseBody.errors ?? {}).flat().join(', ')
    const detail = responseBody.error || responseBody.message || fieldErrors || `Wasender error ${response.status}`
    console.error('[sendWhatsApp] delivery failed:', detail, '| status:', response.status, '| to:', to)
    return { error: detail }
  }

  return { success: true }
}
