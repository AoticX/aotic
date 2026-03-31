'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { updateQuotationStatus } from '@/lib/actions/quotations'
import { createClient } from '@/lib/supabase/client'
import { Download } from 'lucide-react'

export function QuotationActions({
  quotationId,
  status,
}: {
  quotationId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  function runStatus(s: 'sent' | 'accepted' | 'rejected') {
    startTransition(async () => {
      await updateQuotationStatus(quotationId, s)
    })
  }

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('generate-quotation-pdf', {
        body: { quotation_id: quotationId },
      })
      if (error) throw error
      const url = data?.pdf_url ?? data?.url
      if (url) window.open(url, '_blank')
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {status === 'draft' && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/sales/quotations/${quotationId}/edit`}>Edit</Link>
            </Button>
            <Button size="sm" disabled={isPending} onClick={() => runStatus('sent')}>
              {isPending ? 'Updating...' : 'Mark as Sent'}
            </Button>
          </>
        )}

        {status === 'sent' && (
          <>
            <Button size="sm" disabled={isPending} onClick={() => runStatus('accepted')}>
              {isPending ? 'Updating...' : 'Mark Accepted'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => setShowRejectConfirm(true)}
            >
              Mark Rejected
            </Button>
          </>
        )}

        {status === 'accepted' && (
          <Button asChild size="sm">
            <Link href={`/sales/bookings?quote=${quotationId}`}>Proceed to Booking</Link>
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          disabled={pdfLoading}
          onClick={downloadPdf}
          className="ml-auto"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this quotation?</DialogTitle>
            <DialogDescription>
              This will mark the quotation as rejected. The customer will need a new quotation to proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => { setShowRejectConfirm(false); runStatus('rejected') }}
            >
              {isPending ? 'Rejecting...' : 'Reject Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
