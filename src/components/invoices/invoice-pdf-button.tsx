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

      // Function may return raw PDF bytes or a URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data instanceof ArrayBuffer || (data as any) instanceof Uint8Array) {
        const blob = new Blob([data as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        const url = (data as any)?.pdf_url ?? (data as any)?.url
        if (url) window.open(url, '_blank')
      }
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
