'use server'

type FeedbackPayload = {
  type: 'issue' | 'suggestion'
  userEmail: string
  role: string
  pageTitle: string
  url: string
  description: string
  consoleLogs: string
  viewport: string
  userAgent: string
  clientTimestamp: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ success?: true; error?: string }> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!webhookUrl) return { error: 'Feedback webhook not configured' }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { error: `Submission failed (${res.status})` }
    return { success: true }
  } catch {
    return { error: 'Network error — please try again' }
  }
}
