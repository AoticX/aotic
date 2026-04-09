'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { generateInvoicePdf } from '@/lib/actions/pdfs'

export function InvoicePdfButton({
  invoiceId,
  advanceAmount,
}: {
  invoiceId: string
  advanceAmount?: number
}) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const { data, error } = await generateInvoicePdf(invoiceId, advanceAmount)
      if (error) throw new Error(error)

      // Edge function returns { html, invoice } — open in a new print window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html = (data as any)?.html
      if (html) {
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          // Slight delay so the browser renders before print dialog
          setTimeout(() => {
            win.focus()
            win.print()
          }, 600)
        }
        return
      }

      // Fallback: PDF bytes (ArrayBuffer / Uint8Array)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data instanceof ArrayBuffer || (data as any) instanceof Uint8Array) {
        const blob = new Blob([data as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        return
      }

      // Fallback: direct URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = (data as any)?.pdf_url ?? (data as any)?.url
      if (url) window.open(url, '_blank')
    } catch (err) {
      console.error('Invoice PDF generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={download}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {loading ? 'Generating...' : 'Download PDF'}
    </Button>
  )
}
