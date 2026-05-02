'use client'

import { useState, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { uploadAndSaveTallyInvoice, sendTallyInvoiceWhatsApp } from '@/lib/actions/tally-invoices'
import type { TallyInvoice } from '@/lib/actions/tally-invoices'
import {
  Upload, FileText, Send, CheckCircle2, Loader2,
  MessageCircle, Paperclip, Clock, X, AlertCircle,
} from 'lucide-react'

const DEFAULT_TEMPLATE = (name: string) =>
  `Dear ${name},\n\nPlease find your invoice from AOTIC attached to this message.\n\nFor any queries, please feel free to contact us.\n\nThank you for choosing AOTIC!`

type Props = {
  leadId: string
  phone: string
  contactName: string
  existingInvoices: TallyInvoice[]
}

type Step = 'idle' | 'uploading' | 'preview' | 'sending' | 'sent'

type UploadedFile = {
  id: string
  fileName: string
  fileUrl: string
  fileSizeKb: number
}

export function TallyInvoiceSend({ leadId, phone, contactName, existingInvoices }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [message, setMessage] = useState(DEFAULT_TEMPLATE(contactName))
  const [uploadError, setUploadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [invoices, setInvoices] = useState<TallyInvoice[]>(existingInvoices)
  const [resendTarget, setResendTarget] = useState<TallyInvoice | null>(null)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function openFresh() {
    setUploaded(null)
    setResendTarget(null)
    setMessage(DEFAULT_TEMPLATE(contactName))
    setUploadError('')
    setSendError('')
    setStep('idle')
    setOpen(true)
  }

  function openResend(inv: TallyInvoice) {
    setUploaded(null)
    setResendTarget(inv)
    setMessage(DEFAULT_TEMPLATE(contactName))
    setSendError('')
    setOpen(true)
    setStep('preview')
  }

  function handleClose() {
    if (step === 'uploading' || step === 'sending') return
    setOpen(false)
    setStep('idle')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.')
      return
    }
    if (file.size > 16 * 1024 * 1024) {
      setUploadError('File must be under 16 MB.')
      return
    }

    setUploadError('')
    setStep('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('leadId', leadId)

      const result = await uploadAndSaveTallyInvoice(formData)

      if (result.error) {
        setUploadError(result.error)
        setStep('idle')
        return
      }

      // Optimistically add to list
      setInvoices((prev) => [{
        id: result.id!,
        lead_id: leadId,
        file_name: result.fileName!,
        file_url: result.fileUrl!,
        storage_path: null,
        file_size_kb: Math.round(file.size / 1024),
        last_sent_at: null,
        file_deleted_at: null,
        created_at: new Date().toISOString(),
        uploader: null,
      }, ...prev])

      setUploaded({
        id: result.id!,
        fileName: result.fileName!,
        fileUrl: result.fileUrl!,
        fileSizeKb: Math.round(file.size / 1024),
      })
      setStep('preview')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setStep('idle')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleSend() {
    const targetId = resendTarget?.id ?? uploaded?.id
    const targetUrl = resendTarget?.file_url ?? uploaded?.fileUrl
    const targetName = resendTarget?.file_name ?? uploaded?.fileName
    if (!targetId || !targetUrl) return

    setSendError('')
    setStep('sending')

    startTransition(async () => {
      const result = await sendTallyInvoiceWhatsApp(
        targetId, leadId, phone, message, targetUrl, targetName,
      )

      if (result.error) {
        setSendError(result.error)
        setStep('preview')
        return
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === targetId ? { ...inv, last_sent_at: new Date().toISOString() } : inv
        )
      )
      setStep('sent')
      setTimeout(() => {
        setOpen(false)
        setStep('idle')
      }, 2000)
    })
  }

  const activeFileName = resendTarget?.file_name ?? uploaded?.fileName
  const activeFileUrl = resendTarget?.file_url ?? uploaded?.fileUrl

  return (
    <>
      {/* Existing uploads list */}
      {invoices.length > 0 && (
        <div className="space-y-1.5">
          {invoices.map((inv) => {
            const isExpired = !!inv.file_deleted_at
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    {isExpired ? (
                      <span className="text-sm font-medium text-muted-foreground truncate block">
                        {inv.file_name}
                      </span>
                    ) : (
                      <a
                        href={inv.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {inv.file_name}
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(inv.created_at).toLocaleDateString('en-IN')}</span>
                      {inv.last_sent_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sent {new Date(inv.last_sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      {isExpired && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!isExpired && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 flex-shrink-0 ml-2"
                    onClick={() => openResend(inv)}
                  >
                    <Send className="h-3 w-3" />
                    Send
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload button */}
      <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={openFresh}>
        <Upload className="h-3.5 w-3.5" />
        Upload Tally Invoice
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tally Invoice
            </DialogTitle>
          </DialogHeader>

          {/* ── Step: sent ── */}
          {step === 'sent' && (
            <div className="flex flex-col items-center gap-3 py-8 text-green-700">
              <CheckCircle2 className="h-12 w-12" />
              <p className="font-semibold text-lg">Invoice sent via WhatsApp!</p>
            </div>
          )}

          {/* ── Step: idle / uploading ── */}
          {(step === 'idle' || step === 'uploading') && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Select a Tally-generated PDF invoice to upload and send to <strong>{contactName}</strong> ({phone}).
                <span className="block mt-1 text-xs">Files are automatically removed after 2 hours.</span>
              </p>

              <label className={`
                flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                py-10 cursor-pointer transition-colors
                ${step === 'uploading' ? 'opacity-60 pointer-events-none border-border' : 'hover:border-primary hover:bg-muted/30 border-border'}
              `}>
                {step === 'uploading' ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-muted p-3">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to select PDF</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF only · Max 16 MB</p>
                    </div>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={step === 'uploading'}
                />
              </label>

              {uploadError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {uploadError}
                </p>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              </div>
            </div>
          )}

          {/* ── Step: preview / sending ── */}
          {(step === 'preview' || step === 'sending') && activeFileName && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-[#e5ddd5] dark:bg-muted/40 p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-green-600" />
                  Preview — WhatsApp to {phone}
                </p>

                <div className="bg-white dark:bg-card rounded-lg rounded-tl-none shadow-sm overflow-hidden max-w-xs">
                  <a
                    href={activeFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="bg-red-100 rounded p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{activeFileName}</p>
                      <p className="text-xs text-muted-foreground">PDF Document · tap to view</p>
                    </div>
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </a>

                  <div className="px-3 pb-2 pt-1 text-sm whitespace-pre-wrap border-t bg-white dark:bg-card">
                    {message}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Message
                  <span className="text-muted-foreground font-normal">(edit before sending)</span>
                </Label>
                <Textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-sm resize-none"
                  disabled={step === 'sending'}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/1600</p>
              </div>

              {sendError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {sendError}
                </p>
              )}

              <div className="flex items-center gap-2 justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep('idle'); setResendTarget(null) }}
                  disabled={step === 'sending'}
                  className="gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  {resendTarget ? 'Cancel' : 'Change file'}
                </Button>

                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={handleSend}
                  disabled={!message.trim() || step === 'sending'}
                >
                  {step === 'sending' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send via WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
