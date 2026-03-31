'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function InvoicePdfButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoiceId },
      })
      if (error) throw error
      const url = data?.pdf_url ?? data?.url
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
