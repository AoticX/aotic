'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generateInvoicePdfUrl } from '@/lib/actions/pdfs'
import { sendWhatsAppMessage } from '@/lib/actions/whatsapp'
import { MessageCircle, Send, CheckCircle2, FileText, Loader2 } from 'lucide-react'

export function InvoiceWhatsAppButton({
  invoiceId,
  customerPhone,
  customerName,
  invoiceNumber,
  totalAmount,
}: {
  invoiceId: string
  customerPhone: string
  customerName: string
  invoiceNumber: string
  totalAmount: number
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [pdfMediaUrl, setPdfMediaUrl] = useState<string | null>(null)
  const [pdfPreparing, setPdfPreparing] = useState(false)
  const [pdfFailed, setPdfFailed] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [waIsPending, startWaTransition] = useTransition()

  function buildMessage() {
    const name  = customerName || 'there'
    const total = Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })
    return `Hi ${name}, your invoice ${invoiceNumber} from AOTIC is ready. Total amount: ₹${total}. Please find the invoice attached.\n\nThank you for choosing AOTIC!`
  }

  async function preparePdf() {
    setPdfPreparing(true)
    setPdfFailed(false)
    try {
      const { url, error } = await generateInvoicePdfUrl(invoiceId)
      if (error || !url) { setPdfFailed(true); return }
      setPdfMediaUrl(url)
    } catch {
      setPdfFailed(true)
    } finally {
      setPdfPreparing(false)
    }
  }

  function openDialog() {
    setMessage(buildMessage())
    setPdfMediaUrl(null)
    setPdfFailed(false)
    setSent(false)
    setSendError('')
    setOpen(true)
    preparePdf()
  }

  function handleSend() {
    setSendError('')
    startWaTransition(async () => {
      const fd = new FormData()
      fd.set('to', customerPhone)
      fd.set('message', message)
      if (pdfMediaUrl) {
        fd.set('media_url', pdfMediaUrl)
        fd.set('file_name', `${invoiceNumber}.pdf`)
      }
      const result = await sendWhatsAppMessage(fd)
      if (result.error) {
        setSendError(result.error)
      } else {
        setSent(true)
        setTimeout(() => setOpen(false), 1500)
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
        onClick={openDialog}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Send via WhatsApp
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Send Invoice — {customerPhone}
            </DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-green-700">
              <CheckCircle2 className="h-10 w-10" />
              <p className="font-medium">Sent!</p>
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
                {!pdfPreparing && pdfMediaUrl && <><FileText className="h-3.5 w-3.5" /> {invoiceNumber}.pdf attached</>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message <span className="text-destructive">*</span></Label>
                <Textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/1600</p>
              </div>

              {sendError && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  {sendError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={handleSend}
                  disabled={!message.trim() || waIsPending || pdfPreparing}
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
