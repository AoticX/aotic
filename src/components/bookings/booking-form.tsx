'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBooking } from '@/lib/actions/bookings'
import { AdvanceOverrideModal } from './advance-override-modal'
import { AlertTriangle, Camera, CheckCircle2, Loader2, X, ChevronDown, ChevronUp, Upload, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuotationItem = {
  id: string
  description: string
  quantity: number
  line_total: number
  service_vertical: string | null
  tier: string | null
  segment: string | null
}

type Props = {
  quotationId: string
  leadId: string
  customerId: string
  totalValue: number
  customerName: string
  customerPhone: string
  quotationNotes: string | null
  quotationItems: QuotationItem[]
  advancePercentage: number
  isManager: boolean
  errorMsg?: string
  existingBookingId?: string
}

const PAYMENT_METHODS = [
  { value: 'cash',  label: 'Cash' },
  { value: 'upi',   label: 'UPI' },
  { value: 'card',  label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'gpay',  label: 'GPay' },
  { value: 'bajaj', label: 'Bajaj Finserv EMI' },
]

// Methods that support transaction ID instead of photo
const SUPPORTS_REF_ID = ['upi', 'card', 'cheque', 'gpay']

function getReferenceLabel(method: string): string {
  if (method === 'cheque') return 'Cheque Number'
  if (method === 'upi' || method === 'gpay') return 'UPI Transaction ID'
  if (method === 'card') return 'Card Transaction ID'
  return 'Reference Number'
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export function BookingForm({
  quotationId, leadId, customerId, totalValue,
  customerName, customerPhone, quotationNotes,
  quotationItems, advancePercentage, isManager, errorMsg, existingBookingId,
}: Props) {
  const minAdvance = Math.ceil(totalValue * advancePercentage / 100)
  const [advanceAmount, setAdvanceAmount] = useState(minAdvance)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [useRefIdInstead, setUseRefIdInstead] = useState(false)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showItems, setShowItems] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const advancePct = totalValue > 0 ? (advanceAmount / totalValue) * 100 : 0
  const meetsMinimum = advancePct >= advancePercentage
  const canUseRefId = SUPPORTS_REF_ID.includes(paymentMethod)
  const hasProof = proofUrl !== '' || (useRefIdInstead && referenceNumber.trim() !== '')

  function handleMethodChange(val: string) {
    setPaymentMethod(val)
    setUseRefIdInstead(false)
    setReferenceNumber('')
    setProofUrl('')
    setUploadError('')
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setUploadError('Image upload is not configured. Please enter a transaction ID instead.')
      return
    }

    setUploadError('')
    setIsUploadingProof(true)

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      })

      const fileName = `payment_proof_${Date.now()}.jpg`
      const fd = new FormData()
      fd.append('file', compressed, fileName)
      fd.append('upload_preset', UPLOAD_PRESET)
      fd.append('folder', 'aotic/payment-proofs')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: fd },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setUploadError(`Upload failed: ${body?.error?.message ?? res.statusText}`)
        return
      }

      const data = await res.json() as { secure_url: string; public_id: string }
      setProofUrl(data.secure_url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploadingProof(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('proof_url', proofUrl)
    fd.set('reference_number', referenceNumber)
    startTransition(async () => { await createBooking(fd) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {existingBookingId && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">A booking already exists for this quotation.</p>
          <p className="mt-1 text-amber-700">
            This quotation has already been booked. You cannot create a duplicate booking.
          </p>
          <Link
            href={`/sales/bookings/${existingBookingId}`}
            className="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-2 hover:text-amber-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View existing booking
          </Link>
        </div>
      )}

      {!existingBookingId && errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <input type="hidden" name="quotation_id" value={quotationId} />
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="total_value" value={totalValue} />
      <input type="hidden" name="advance_payment_method" value={paymentMethod} />

      {/* Customer & Quote Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <Input value={customerName} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={customerPhone} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label>Total Job Value</Label>
          <Input value={`Rs. ${totalValue.toLocaleString('en-IN')}`} readOnly className="bg-muted font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label>
            Promised Delivery Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            name="promised_delivery_at"
            required
            min={new Date().toISOString().split('T')[0]}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* Quoted Services */}
      {quotationItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setShowItems((s) => !s)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-sm">Quoted Services ({quotationItems.length})</CardTitle>
              {showItems
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showItems && (
            <CardContent className="p-0">
              <div className="divide-y">
                {quotationItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.description}</p>
                      {(item.service_vertical || item.tier || item.segment) && (
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {[item.service_vertical, item.tier, item.segment].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-medium">Rs. {Number(item.line_total).toLocaleString('en-IN')}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {quotationNotes && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes from Quotation</p>
          <p className="text-foreground">{quotationNotes}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Workshop Notes</Label>
        <Textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special instructions for the workshop team..."
          rows={2}
        />
      </div>

      {/* Advance Amount */}
      <Card className={cn(!meetsMinimum && 'border-destructive/40 bg-destructive/5')}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              Advance Amount <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', meetsMinimum ? 'text-green-600' : 'text-destructive')}>
                {advancePct.toFixed(1)}%
              </span>
              <Badge
                variant={meetsMinimum ? 'success' : 'destructive'}
                className="text-xs"
              >
                {meetsMinimum ? `Meets ${advancePercentage}% minimum` : `Below ${advancePercentage}% minimum`}
              </Badge>
            </div>
          </div>
          <Input
            type="number"
            name="advance_amount"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            min={0}
            max={totalValue}
            step={0.01}
            className={cn(!meetsMinimum && 'border-destructive focus-visible:ring-destructive')}
          />
          <p className="text-xs text-muted-foreground">
            Minimum required: Rs. {minAdvance.toLocaleString('en-IN')} ({advancePercentage}%)
          </p>
          {!meetsMinimum && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {isManager
                  ? <button type="button" onClick={() => setShowOverride(true)} className="underline font-medium">Apply manager override</button>
                  : 'Contact your manager to override this requirement.'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label>Payment Method <span className="text-destructive">*</span></Label>
        <Select value={paymentMethod} onValueChange={handleMethodChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment Proof Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment Proof <span className="text-destructive">*</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canUseRefId && (
            <div className="flex gap-2 border rounded-md overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setUseRefIdInstead(false)}
                className={cn(
                  'flex-1 py-2 transition-colors font-medium',
                  !useRefIdInstead ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => { setUseRefIdInstead(true); setProofUrl('') }}
                className={cn(
                  'flex-1 py-2 transition-colors font-medium',
                  useRefIdInstead ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {getReferenceLabel(paymentMethod)}
              </button>
            </div>
          )}

          {!useRefIdInstead ? (
            /* Photo upload */
            <div className="space-y-3">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:bg-muted/30 transition-colors',
                  proofUrl ? 'border-green-300 bg-green-50' : 'border-input',
                )}
                onClick={() => !isUploadingProof && fileInputRef.current?.click()}
              >
                {isUploadingProof ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <p className="text-sm">Uploading...</p>
                  </div>
                ) : proofUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Proof uploaded</p>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={(ev) => { ev.stopPropagation(); setProofUrl('') }}
                    >
                      Remove & re-upload
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="flex gap-3 items-center">
                      <Camera className="h-7 w-7" />
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">
                      {paymentMethod === 'cash' ? 'Take a photo of the cash' : 'Take a photo or upload receipt'}
                    </p>
                    <p className="text-xs">Tap to capture or select from gallery</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleProofUpload}
                  disabled={isUploadingProof}
                />
              </div>

              {proofUrl && (
                <div className="rounded-md overflow-hidden border max-h-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofUrl} alt="Payment proof" className="w-full h-40 object-cover" />
                </div>
              )}

              {uploadError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <X className="h-4 w-4" /> {uploadError}
                </p>
              )}
            </div>
          ) : (
            /* Reference ID */
            <div className="space-y-1.5">
              <Label>{getReferenceLabel(paymentMethod)} <span className="text-destructive">*</span></Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={paymentMethod === 'cheque' ? 'e.g. 000123' : 'e.g. TXN1234567890'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the {getReferenceLabel(paymentMethod).toLowerCase()} as it appears on the receipt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !meetsMinimum || !hasProof || !!existingBookingId}
      >
        {isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirming Booking...</>
        ) : (
          'Confirm Booking & Record Payment'
        )}
      </Button>

      {!hasProof && meetsMinimum && (
        <p className="text-xs text-center text-muted-foreground">
          Upload payment proof or enter a reference number to continue.
        </p>
      )}

      {isManager && showOverride && (
        <AdvanceOverrideModal
          quotationId={quotationId}
          leadId={leadId}
          customerId={customerId}
          totalValue={totalValue}
          advanceAmount={advanceAmount}
          paymentMethod={paymentMethod}
          promisedDelivery={deliveryDate}
          proofUrl={proofUrl}
          referenceNumber={referenceNumber}
          notes={notes}
          onClose={() => setShowOverride(false)}
        />
      )}
    </form>
  )
}
