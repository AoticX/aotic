'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateQuotationStatus } from '@/lib/actions/quotations'
import { generateQuotationPdf, generateQuotationPdfUrl } from '@/lib/actions/pdfs'
import { sendWhatsAppMessage } from '@/lib/actions/whatsapp'
import { Download, MessageCircle, Send, CheckCircle2, FileText, Loader2 } from 'lucide-react'

export function QuotationActions({
  quotationId,
  status,
  leadId,
  leadPhone,
  leadName,
  quotationTotal,
  validUntil,
}: {
  quotationId: string
  status: string
  leadId?: string
  leadPhone?: string
  leadName?: string
  quotationTotal?: number
  validUntil?: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  // WhatsApp state
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [waSent, setWaSent] = useState(false)
  const [waError, setWaError] = useState('')
  const [waIsPending, startWaTransition] = useTransition()

  // PDF attachment state
  const [pdfMediaUrl, setPdfMediaUrl] = useState<string | null>(null)
  const [pdfPreparing, setPdfPreparing] = useState(false)
  const [pdfFailed, setPdfFailed] = useState(false)

  // Build pre-filled quotation message from the `quotation_sent` template
  function buildDefaultMessage() {
    const name = leadName || 'there'
    const total = quotationTotal != null
      ? Number(quotationTotal).toLocaleString('en-IN', { minimumFractionDigits: 0 })
      : '—'
    const validity = validUntil
      ? new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '15 days from today'
    return `Hi ${name}, here is your quotation from AOTIC for \u20B9${total}. Please review and let us know if you have any questions. Valid until ${validity}.`
  }

  const [waMessage, setWaMessage] = useState('')

  async function preparePdfForSend() {
    setPdfPreparing(true)
    setPdfFailed(false)
    try {
      const { url, error } = await generateQuotationPdfUrl(quotationId)
      if (error || !url) { setPdfFailed(true); return }
      setPdfMediaUrl(url)
    } catch {
      setPdfFailed(true)
    } finally {
      setPdfPreparing(false)
    }
  }

  function openWhatsApp() {
    setWaMessage(buildDefaultMessage())
    setWaSent(false)
    setWaError('')
    setPdfMediaUrl(null)
    setPdfFailed(false)
    setShowWhatsApp(true)
    preparePdfForSend()
  }

  function handleWaSend() {
    setWaError('')
    startWaTransition(async () => {
      const fd = new FormData()
      fd.set('to', leadPhone!)
      fd.set('message', waMessage)
      if (leadId) fd.set('lead_id', leadId)
      if (pdfMediaUrl) {
        fd.set('media_url', pdfMediaUrl)
        fd.set('file_name', 'AOTIC-Quotation.pdf')
      }
      const result = await sendWhatsAppMessage(fd)
      if (result.error) {
        setWaError(result.error)
      } else {
        setWaSent(true)
        setTimeout(() => setShowWhatsApp(false), 1500)
      }
    })
  }

  function runStatus(s: 'sent' | 'accepted' | 'rejected') {
    startTransition(async () => {
      await updateQuotationStatus(quotationId, s)
    })
  }

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      const { data, error } = await generateQuotationPdf(quotationId)

      if (error) throw new Error(error)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any

      // Function returns raw PDF bytes — convert to blob and open
      if (data instanceof ArrayBuffer || raw instanceof Uint8Array || data instanceof Blob) {
        const blob = new Blob([data as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else if (typeof raw === 'string' && raw.startsWith('%PDF')) {
        // Fallback for some Edge fn text-decoded binary returns
        const blob = new Blob([new TextEncoder().encode(raw)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      } else {
        // Legacy: if function returned a URL
        const url = raw?.pdf_url ?? raw?.url
        if (url) window.open(url, '_blank')
      }
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert(err instanceof Error ? err.message : 'Error generating PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const canSendWhatsApp = leadPhone && (status === 'draft' || status === 'approved')

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
            <Link href={`/sales/bookings/new?quote=${quotationId}`}>Proceed to Booking</Link>
          </Button>
        )}

        {canSendWhatsApp && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
            onClick={openWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Send via WhatsApp
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

      {/* Reject confirm dialog */}
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

      {/* WhatsApp send dialog */}
      <Dialog open={showWhatsApp} onOpenChange={setShowWhatsApp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Send Quotation — {leadPhone}
            </DialogTitle>
          </DialogHeader>

          {waSent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-green-700">
              <CheckCircle2 className="h-10 w-10" />
              <p className="font-medium">Message sent!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* PDF attachment status */}
              <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs border ${
                pdfPreparing ? 'bg-amber-50 text-amber-700 border-amber-200' :
                pdfFailed    ? 'bg-muted text-muted-foreground' :
                pdfMediaUrl  ? 'bg-green-50 text-green-700 border-green-200' :
                'hidden'
              }`}>
                {pdfPreparing && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing PDF...</>}
                {!pdfPreparing && pdfFailed && <><FileText className="h-3.5 w-3.5" /> PDF unavailable — sending text only</>}
                {!pdfPreparing && pdfMediaUrl && <><FileText className="h-3.5 w-3.5" /> AOTIC-Quotation.pdf attached</>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message <span className="text-destructive">*</span></Label>
                <Textarea
                  rows={5}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{waMessage.length}/1600</p>
              </div>

              {waError && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  {waError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowWhatsApp(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={handleWaSend}
                  disabled={!waMessage.trim() || waIsPending || pdfPreparing}
                >
                  <Send className="h-3.5 w-3.5" />
                  {pdfPreparing ? 'Preparing...' : waIsPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
