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
        .select('id, version, created_at, valid_until, subtotal, discount_pct, discount_amount, tax_amount, total_amount, leads(contact_name, contact_phone, car_model, car_reg_no)')
        .eq('id', quotationId)
        .single(),
      db
        .from('quotation_items')
        .select('vertical_id, description, quantity, unit_price, line_total, tier, segment, verticals(name)')
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
      leads: { contact_name: string; contact_phone: string; car_model: string | null; car_reg_no: string | null } | null
    }

    const lineItems = (items ?? []) as Array<{
      vertical_id: string | null
      description: string
      quantity: number
      unit_price: number
      line_total: number
      tier: string | null
      segment: string | null
      verticals: { name: string } | null
    }>

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Brand palette
    const orange   = rgb(1, 0.44, 0)          // #FF7000
    const darkGrey = rgb(0.18, 0.18, 0.18)    // #2E2E2E
    const midGrey  = rgb(0.45, 0.45, 0.45)
    const lightBg  = rgb(0.96, 0.96, 0.97)
    const altRowBg = rgb(0.975, 0.975, 0.98)

    // Always 2 decimal places — prevents Rs. 120.778 style artifacts
    const fmt = (n: number) =>
      `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    // Word-wrap helper (no truncation)
    function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
      const f = bold ? fontBold : font
      const words = (text || '').replace(/\s+/g, ' ').trim().split(' ')
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (f.widthOfTextAtSize(test, size) <= maxWidth) {
          current = test
        } else {
          if (current) lines.push(current)
          current = word
        }
      }
      if (current) lines.push(current)
      return lines.length ? lines : ['-']
    }

    // ── LOGO ───────────────────────────────────────────────────────────────
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    try {
      const logoBytes = await readFile(logoPath)
      const logo = await pdfDoc.embedPng(logoBytes)
      const scale = 46 / logo.height
      page.drawImage(logo, { x: 40, y: 782, width: logo.width * scale, height: 46 })
    } catch { /* logo unavailable */ }

    // Orange accent rule under header area
    page.drawLine({ start: { x: 40, y: 772 }, end: { x: 555, y: 772 }, thickness: 1.5, color: orange })

    // ── QUOTATION META (top-right) ─────────────────────────────────────────
    page.drawText(`Quotation v${q.version}`, { x: 420, y: 812, size: 13, font: fontBold, color: darkGrey })
    page.drawText(`Date: ${new Date(q.created_at).toLocaleDateString('en-IN')}`, { x: 420, y: 795, size: 9, font, color: midGrey })
    page.drawText(`Valid Till: ${q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-IN') : '15 days'}`, { x: 420, y: 781, size: 9, font, color: midGrey })

    // ── CUSTOMER / VEHICLE BOXES (equal width, edge-to-edge) ─────────────
    const boxW = 253
    const boxH = 72
    const boxY = 686
    const box2X = 302   // 40 + 253 + 9 gap

    page.drawRectangle({ x: 40,    y: boxY, width: boxW, height: boxH, color: lightBg })
    page.drawRectangle({ x: box2X, y: boxY, width: boxW, height: boxH, color: lightBg })
    // Orange left-border accent
    page.drawLine({ start: { x: 40,    y: boxY }, end: { x: 40,    y: boxY + boxH }, thickness: 3, color: orange })
    page.drawLine({ start: { x: box2X, y: boxY }, end: { x: box2X, y: boxY + boxH }, thickness: 3, color: orange })

    // Customer box — label / name / phone
    const cPad = 14
    page.drawText('CUSTOMER', { x: 40 + cPad, y: boxY + boxH - 13, size: 8, font: fontBold, color: midGrey })
    page.drawText(q.leads?.contact_name || '-', { x: 40 + cPad, y: boxY + boxH - 29, size: 13, font: fontBold, color: darkGrey })
    page.drawText(q.leads?.contact_phone || '-', { x: 40 + cPad, y: boxY + boxH - 46, size: 10, font, color: midGrey })

    // Vehicle box — label / model / reg number (same vertical rhythm)
    page.drawText('VEHICLE', { x: box2X + cPad, y: boxY + boxH - 13, size: 8, font: fontBold, color: midGrey })
    page.drawText((q.leads?.car_model || '-').toUpperCase(), { x: box2X + cPad, y: boxY + boxH - 29, size: 13, font: fontBold, color: darkGrey })
    page.drawText((q.leads?.car_reg_no || '—').toUpperCase(), { x: box2X + cPad, y: boxY + boxH - 46, size: 10, font, color: midGrey })

    // ── TABLE ─────────────────────────────────────────────────────────────
    // Columns: # | SERVICE & DESCRIPTION (wide, 2-line) | QTY | UNIT PRICE | TOTAL
    const C = {
      idxX:    48,
      descX:   70,
      descW:   270,  // full description, no truncation
      qtyX:    355,
      unitRX:  480,  // right-align edge for unit price
      totalRX: 553,  // right-align edge for total
    }

    // Header row — sits 8pt below the info boxes
    const headerY = boxY - 10
    page.drawRectangle({ x: 40, y: headerY, width: 515, height: 22, color: darkGrey })
    page.drawLine({ start: { x: 40, y: headerY }, end: { x: 555, y: headerY }, thickness: 2, color: orange })

    const hY = headerY + 7
    page.drawText('#',                   { x: C.idxX, y: hY, size: 9, font: fontBold, color: rgb(1,1,1) })
    page.drawText('SERVICE & DESCRIPTION', { x: C.descX, y: hY, size: 9, font: fontBold, color: rgb(1,1,1) })
    page.drawText('QTY',                 { x: C.qtyX,  y: hY, size: 9, font: fontBold, color: rgb(1,1,1) })
    const upLabel = 'UNIT PRICE'
    page.drawText(upLabel, { x: C.unitRX - fontBold.widthOfTextAtSize(upLabel, 9), y: hY, size: 9, font: fontBold, color: rgb(1,1,1) })
    const totLabel = 'TOTAL'
    page.drawText(totLabel, { x: C.totalRX - fontBold.widthOfTextAtSize(totLabel, 9), y: hY, size: 9, font: fontBold, color: rgb(1,1,1) })

    // Item rows — dynamic height
    let curY = headerY  // we'll subtract each row's height as we go

    if (!lineItems.length) {
      curY -= 30
      page.drawText('No items found.', { x: C.descX, y: curY, size: 10, font, color: midGrey })
      curY -= 10
    }

    lineItems.forEach((item, idx) => {
      const descLines = wrapText(item.description || '-', C.descW, 10)
      const subtitleParts = [
        item.verticals?.name,
        item.tier    ? item.tier.charAt(0).toUpperCase()    + item.tier.slice(1)    : null,
        item.segment ? item.segment.charAt(0).toUpperCase() + item.segment.slice(1) : null,
      ].filter(Boolean)
      const subtitle = subtitleParts.join(' · ')

      // Row height: desc lines (14pt each) + optional subtitle (13pt) + top/bottom padding (14pt)
      const contentH = descLines.length * 14 + (subtitle ? 13 : 0)
      const rowH = Math.max(contentH + 14, 38)

      const rowTopY = curY
      const rowBotY = rowTopY - rowH

      // Alternating row background
      if (idx % 2 === 1) {
        page.drawRectangle({ x: 40, y: rowBotY, width: 515, height: rowH, color: altRowBg })
      }

      // Row bottom separator
      page.drawLine({ start: { x: 40, y: rowBotY }, end: { x: 555, y: rowBotY }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) })

      const textY = rowTopY - 9

      // Index
      page.drawText(String(idx + 1), { x: C.idxX, y: textY, size: 10, font: fontBold, color: darkGrey })

      // Description lines (full, no truncation)
      descLines.forEach((line, li) => {
        page.drawText(line, { x: C.descX, y: textY - li * 14, size: 10, font, color: darkGrey })
      })

      // Subtitle: vertical · tier · segment
      if (subtitle) {
        page.drawText(subtitle, { x: C.descX, y: textY - descLines.length * 14, size: 8, font, color: rgb(0.55, 0.55, 0.55) })
      }

      // Qty
      page.drawText(String(item.quantity), { x: C.qtyX, y: textY, size: 10, font, color: darkGrey })

      // Unit price (right-aligned)
      const unitStr = fmt(item.unit_price)
      page.drawText(unitStr, { x: C.unitRX - font.widthOfTextAtSize(unitStr, 9), y: textY, size: 9, font, color: darkGrey })

      // Line total (right-aligned, bold)
      const totalStr = fmt(item.line_total)
      page.drawText(totalStr, { x: C.totalRX - fontBold.widthOfTextAtSize(totalStr, 9), y: textY, size: 9, font: fontBold, color: darkGrey })

      curY = rowBotY
    })

    curY -= 18  // gap before totals box

    // ── TOTALS BOX (right-aligned) ────────────────────────────────────────
    const totalsBoxX = 352
    const totalsBoxW = 203

    const totRows: { label: string; value: string; red?: boolean }[] = [
      { label: 'Subtotal',       value: fmt(q.subtotal) },
      ...(Number(q.discount_amount) > 0
        ? [{ label: `Discount (${Number(q.discount_pct)}%)`, value: `- ${fmt(q.discount_amount)}`, red: true }]
        : []),
      { label: 'Taxable Amount', value: fmt(Number(q.subtotal) - Number(q.discount_amount)) },
      { label: 'CGST (9%)',      value: fmt(Number(q.tax_amount) / 2) },
      { label: 'SGST (9%)',      value: fmt(Number(q.tax_amount) / 2) },
    ]

    const lineGap    = 22
    const totalsBoxH = totRows.length * lineGap + 50  // rows + grand total row + padding
    const totalsBoxY = curY - totalsBoxH

    page.drawRectangle({ x: totalsBoxX, y: totalsBoxY, width: totalsBoxW, height: totalsBoxH, color: lightBg })
    page.drawLine({ start: { x: totalsBoxX, y: totalsBoxY }, end: { x: totalsBoxX, y: curY }, thickness: 2.5, color: orange })

    let tY = curY - 14
    totRows.forEach((r) => {
      const lc = r.red ? rgb(0.82, 0.2, 0.2) : midGrey
      const vc = r.red ? rgb(0.82, 0.2, 0.2) : darkGrey
      page.drawText(r.label, { x: totalsBoxX + 12, y: tY, size: 9.5, font, color: lc })
      const vw = font.widthOfTextAtSize(r.value, 9.5)
      page.drawText(r.value, { x: totalsBoxX + totalsBoxW - 12 - vw, y: tY, size: 9.5, font, color: vc })
      tY -= lineGap
    })

    // Divider + Grand Total
    const divY = tY + 8
    page.drawLine({ start: { x: totalsBoxX + 8, y: divY }, end: { x: totalsBoxX + totalsBoxW - 8, y: divY }, thickness: 0.8, color: rgb(0.75, 0.75, 0.75) })
    const grandY = divY - 20
    const grandStr = fmt(q.total_amount)
    page.drawText('Grand Total', { x: totalsBoxX + 12, y: grandY, size: 11, font: fontBold, color: darkGrey })
    page.drawText(grandStr, {
      x: totalsBoxX + totalsBoxW - 12 - fontBold.widthOfTextAtSize(grandStr, 11),
      y: grandY, size: 11, font: fontBold, color: orange,
    })

    // ── TERMS & CONDITIONS ────────────────────────────────────────────────
    const termsTopY = totalsBoxY - 20
    const termLines = [
      '1. This quotation is valid for 15 days from the date of issue unless otherwise stated above.',
      '2. A 50% advance payment is required to confirm the booking.',
      '3. All prices are inclusive of GST as detailed above.',
      '4. Delivery timelines will be confirmed upon booking confirmation.',
      '5. Any modifications to scope may require revised pricing via a new quotation version.',
      '6. Warranty terms are applicable as per service-specific policies.',
    ]
    const termsH = termLines.length * 13 + 26
    page.drawRectangle({ x: 40, y: termsTopY - termsH, width: 515, height: termsH, color: lightBg })
    page.drawLine({ start: { x: 40, y: termsTopY - termsH }, end: { x: 40, y: termsTopY }, thickness: 2.5, color: orange })
    page.drawText('TERMS & CONDITIONS', { x: 54, y: termsTopY - 14, size: 9, font: fontBold, color: midGrey })
    termLines.forEach((term, i) => {
      page.drawText(term, { x: 54, y: termsTopY - 26 - i * 13, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) })
    })

    // ── FOOTER ────────────────────────────────────────────────────────────
    page.drawLine({ start: { x: 40, y: 52 }, end: { x: 555, y: 52 }, thickness: 0.8, color: rgb(0.8, 0.8, 0.8) })
    page.drawText(`${COMPANY.legalName}  |  GSTIN: ${COMPANY.gstin}`, { x: 40, y: 39, size: 8, font, color: midGrey })
    page.drawText(`Address: ${COMPANY.address}`, { x: 40, y: 27, size: 8, font, color: midGrey })
    page.drawText(`Partners: ${COMPANY.partners}`, { x: 40, y: 15, size: 8, font, color: midGrey })

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
