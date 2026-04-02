'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { COMPANY, getCompanyPdfPayload } from '@/lib/constants'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Generate quotation PDF using service role to bypass RLS
 * Returns: { pdf_url?: string, error?: string }
 */
export async function generateQuotationPdf(quotationId: string) {
  try {
    const supabase = await createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const [{ data: quotation, error: quotationError }, { data: items, error: itemsError }] = await Promise.all([
      db
        .from('quotations')
        .select('id, version, created_at, valid_until, subtotal, discount_pct, discount_amount, tax_amount, total_amount, leads(contact_name, contact_phone, car_model)')
        .eq('id', quotationId)
        .single(),
      db
        .from('quotation_items')
        .select('vertical_id, description, quantity, unit_price, line_total, verticals(name)')
        .eq('quotation_id', quotationId)
        .order('sort_order'),
    ])

    if (quotationError || !quotation) {
      throw new Error(quotationError?.message || 'Quotation not found')
    }
    if (itemsError) {
      throw new Error(itemsError.message || 'Failed to load quotation items')
    }

    const q = quotation as {
      id: string
      version: number
      created_at: string
      valid_until: string | null
      subtotal: number
      discount_pct: number
      discount_amount: number
      tax_amount: number
      total_amount: number
      leads: { contact_name: string; contact_phone: string; car_model: string | null } | null
    }

    const lineItems = (items ?? []) as Array<{
      vertical_id: string | null
      description: string
      quantity: number
      unit_price: number
      line_total: number
      verticals: { name: string } | null
    }>

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const fitText = (
      input: string,
      maxWidth: number,
      size: number,
      useBold = false,
    ) => {
      const safe = (input || '').replace(/\s+/g, ' ').trim()
      if (!safe) return '-'
      const f = useBold ? fontBold : font
      if (f.widthOfTextAtSize(safe, size) <= maxWidth) return safe

      const ellipsis = '...'
      let out = safe
      while (out.length > 1 && f.widthOfTextAtSize(out + ellipsis, size) > maxWidth) {
        out = out.slice(0, -1)
      }
      return out + ellipsis
    }

    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    try {
      const logoBytes = await readFile(logoPath)
      const logo = await pdfDoc.embedPng(logoBytes)
      const scale = 46 / logo.height
      const logoWidth = logo.width * scale
      page.drawImage(logo, { x: 40, y: 782, width: logoWidth, height: 46 })
    } catch {
      // If logo is unavailable, keep PDF generation functional.
    }

    page.drawText(`Quotation v${q.version}`, { x: 420, y: 812, size: 12, font: fontBold, color: rgb(0.18, 0.18, 0.18) })
    page.drawText(`Date: ${new Date(q.created_at).toLocaleDateString('en-IN')}`, { x: 420, y: 796, size: 9, font, color: rgb(0.25, 0.25, 0.25) })
    page.drawText(`Valid Till: ${q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-IN') : '15 days'}`, { x: 420, y: 782, size: 9, font, color: rgb(0.25, 0.25, 0.25) })

    page.drawRectangle({ x: 40, y: 690, width: 250, height: 70, color: rgb(0.94, 0.95, 0.96) })
    page.drawRectangle({ x: 305, y: 690, width: 250, height: 70, color: rgb(0.94, 0.95, 0.96) })
    page.drawText('CUSTOMER', { x: 54, y: 740, size: 9, font: fontBold, color: rgb(0.45, 0.45, 0.45) })
    page.drawText(q.leads?.contact_name || '-', { x: 54, y: 722, size: 15, font: fontBold })
    page.drawText(q.leads?.contact_phone || '-', { x: 54, y: 706, size: 11, font })
    page.drawText('VEHICLE', { x: 319, y: 740, size: 9, font: fontBold, color: rgb(0.45, 0.45, 0.45) })
    page.drawText((q.leads?.car_model || '-').toUpperCase(), { x: 319, y: 722, size: 15, font: fontBold })

    const col = {
      idxX: 48,
      serviceX: 75,
      serviceW: 125,
      descriptionX: 205,
      descriptionW: 190,
      qtyX: 420,
      unitRight: 510,
      totalRight: 555,
    }

    page.drawRectangle({ x: 40, y: 660, width: 515, height: 24, color: rgb(0.12, 0.12, 0.12) })
    page.drawText('#', { x: col.idxX, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Service', { x: col.serviceX, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Description', { x: col.descriptionX, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Qty', { x: col.qtyX, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Unit Price', { x: 450, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    page.drawText('Total', { x: 528, y: 667, size: 10, font: fontBold, color: rgb(1, 1, 1) })

    let rowY = 642
    if (!lineItems.length) {
      page.drawText('No items', { x: col.descriptionX, y: rowY, size: 11, font, color: rgb(0.4, 0.4, 0.4) })
      rowY -= 20
    }

    lineItems.forEach((item, idx) => {
      const service = item.verticals?.name || item.vertical_id || '-'
      const serviceText = fitText(service, col.serviceW, 10)
      const descText = fitText(item.description || '-', col.descriptionW, 10)
      const qtyText = String(item.quantity)
      const unitText = `Rs. ${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      const totalText = `Rs. ${Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

      page.drawText(String(idx + 1), { x: col.idxX, y: rowY, size: 10, font })
      page.drawText(serviceText, { x: col.serviceX, y: rowY, size: 10, font })
      page.drawText(descText, { x: col.descriptionX, y: rowY, size: 10, font })
      page.drawText(qtyText, { x: col.qtyX, y: rowY, size: 10, font })
      page.drawText(unitText, {
        x: col.unitRight - font.widthOfTextAtSize(unitText, 9),
        y: rowY,
        size: 9,
        font,
      })
      page.drawText(totalText, {
        x: col.totalRight - font.widthOfTextAtSize(totalText, 9),
        y: rowY,
        size: 9,
        font,
      })
      rowY -= 20
    })

    const totalsTop = 390
    page.drawRectangle({ x: 370, y: totalsTop, width: 185, height: 150, color: rgb(0.96, 0.96, 0.96) })

    let tY = totalsTop + 126
    const drawTotalRow = (label: string, value: string, isRed = false, isBold = false) => {
      page.drawText(label, { x: 380, y: tY, size: isBold ? 12 : 10, font: isBold ? fontBold : font, color: isRed ? rgb(0.82, 0.2, 0.2) : rgb(0.15, 0.15, 0.15) })
      const width = (isBold ? fontBold : font).widthOfTextAtSize(value, isBold ? 12 : 10)
      page.drawText(value, { x: 545 - width, y: tY, size: isBold ? 12 : 10, font: isBold ? fontBold : font, color: isRed ? rgb(0.82, 0.2, 0.2) : rgb(0.15, 0.15, 0.15) })
      tY -= 22
    }

    drawTotalRow('Subtotal', `Rs. ${Number(q.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    if (Number(q.discount_amount) > 0) {
      drawTotalRow(`Discount (${Number(q.discount_pct)}%)`, `-Rs. ${Number(q.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true)
    }
    drawTotalRow('Taxable Amount', `Rs. ${(Number(q.subtotal) - Number(q.discount_amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    drawTotalRow('CGST (9%)', `Rs. ${(Number(q.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    drawTotalRow('SGST (9%)', `Rs. ${(Number(q.tax_amount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
    page.drawLine({ start: { x: 380, y: tY + 8 }, end: { x: 545, y: tY + 8 }, thickness: 1, color: rgb(0.15, 0.15, 0.15) })
    drawTotalRow('Grand Total', `Rs. ${Number(q.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, true)

    const termsY = totalsTop - 140
    page.drawRectangle({ x: 40, y: termsY, width: 515, height: 100, color: rgb(0.94, 0.95, 0.96) })
    page.drawText('TERMS & CONDITIONS', { x: 54, y: termsY + 84, size: 10, font: fontBold, color: rgb(0.45, 0.45, 0.45) })
    const terms = [
      '1. This quotation is valid for 15 days from the date of issue unless otherwise stated above.',
      '2. A 50% advance payment is required to confirm the booking.',
      '3. All prices are inclusive of GST as detailed above.',
      '4. Delivery timelines will be confirmed upon booking confirmation.',
      '5. Any modifications to scope may require revised pricing via a new quotation version.',
      '6. Warranty terms are applicable as per service-specific policies.',
    ]
    terms.forEach((term, idx) => {
      page.drawText(term, { x: 54, y: termsY + 66 - idx * 14, size: 9, font, color: rgb(0.12, 0.12, 0.12) })
    })

    page.drawText(`${COMPANY.legalName}  |  GSTIN: ${COMPANY.gstin}`, {
      x: 40,
      y: 24,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })

    const data = await pdfDoc.save()
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
