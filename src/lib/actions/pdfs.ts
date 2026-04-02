'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyPdfPayload } from '@/lib/constants'

/**
 * Generate quotation PDF using service role to bypass RLS
 * Returns: { pdf_url?: string, error?: string }
 */
export async function generateQuotationPdf(quotationId: string) {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.functions.invoke('generate-quotation-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        quotation_id: quotationId,
        id: quotationId,
        ...getCompanyPdfPayload(),
      },
    })

    if (error) throw new Error(error.message || 'Failed to generate quotation PDF')

    return { data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error generating PDF'
    console.error('[generateQuotationPdf]', message)
    return { error: message }
  }
}

/**
 * Generate invoice PDF using service role to bypass RLS
 * Returns: { pdf_url?: string, error?: string }
 */
export async function generateInvoicePdf(invoiceId: string, advanceAmount?: number) {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        invoice_id: invoiceId,
        advance_amount: advanceAmount ?? 0,
        ...getCompanyPdfPayload(),
      },
    })

    if (error) throw new Error(error.message || 'Failed to generate invoice PDF')

    return { data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error generating PDF'
    console.error('[generateInvoicePdf]', message)
    return { error: message }
  }
}

/**
 * Generate quality certificate PDF using service role
 * Returns: { pdf_url?: string, error?: string }
 */
export async function generateCertificatePdf(jobCardId: string) {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.functions.invoke('generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        job_card_id: jobCardId,
        ...getCompanyPdfPayload(),
      },
    })

    if (error) throw new Error(error.message || 'Failed to generate certificate PDF')

    return { data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error generating certificate'
    console.error('[generateCertificatePdf]', message)
    return { error: message }
  }
}
