'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { submitQcChecklist, type QcItemResult } from '@/lib/actions/qc'
import { CheckCircle2, XCircle, Minus, Camera, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

type TemplateItem = {
  id: string
  check_point: string
  is_mandatory: boolean
}

type Props = {
  jobCardId: string
  verticalId: string | null
  templates: TemplateItem[]
}

type ResultState = Record<string, { result: 'pass' | 'fail' | 'na'; notes: string }>

export function QcChecklistForm({ jobCardId, verticalId, templates }: Props) {
  const initState = (): ResultState => {
    if (templates.length > 0) {
      return Object.fromEntries(
        templates.map((t) => [t.id, { result: 'na' as const, notes: '' }])
      )
    }
    return {}
  }

  const [results, setResults] = useState<ResultState>(initState)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [customItems, setCustomItems] = useState<{ id: string; label: string }[]>([])
  const [newItem, setNewItem] = useState('')
  const [reworkNotes, setReworkNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const uploadingForRef = useRef<string | null>(null)

  const allItems: QcItemResult[] = [
    ...templates.map((t) => ({
      templateId: t.id,
      checkPoint: t.check_point,
      result: (results[t.id]?.result ?? 'na') as 'pass' | 'fail' | 'na',
      notes: results[t.id]?.notes ?? '',
      photoUrl: photoUrls[t.id] ?? null,
    })),
    ...customItems.map((c) => ({
      templateId: null,
      checkPoint: c.label,
      result: (results[c.id]?.result ?? 'na') as 'pass' | 'fail' | 'na',
      notes: results[c.id]?.notes ?? '',
      photoUrl: photoUrls[c.id] ?? null,
    })),
  ]

  const hasFailure = allItems.some((i) => i.result === 'fail')
  const mandatoryUnscored = templates
    .filter((t) => t.is_mandatory && (results[t.id]?.result ?? 'na') === 'na')
  const canSubmit = mandatoryUnscored.length === 0 && (allItems.length > 0)

  function setResult(id: string, result: 'pass' | 'fail' | 'na') {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], result, notes: prev[id]?.notes ?? '' } }))
  }

  function setNotes(id: string, notes: string) {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], notes } }))
  }

  function addCustomItem() {
    if (!newItem.trim()) return
    const id = `custom_${Date.now()}`
    setCustomItems((prev) => [...prev, { id, label: newItem.trim() }])
    setResults((prev) => ({ ...prev, [id]: { result: 'na', notes: '' } }))
    setNewItem('')
  }

  function openPhotoUpload(itemId: string) {
    uploadingForRef.current = itemId
    photoInputRef.current?.click()
  }

  function removePhoto(itemId: string) {
    setPhotoUrls((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const itemId = uploadingForRef.current
    if (!file || !itemId) return
    // Reset input so the same file can be re-selected
    e.target.value = ''

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Cloudinary not configured — cannot upload QC photos.')
      return
    }

    setUploadingItemId(itemId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', UPLOAD_PRESET)
      fd.append('folder', `aotic/qc/${jobCardId}`)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: fd },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(`Photo upload failed: ${(body as { error?: { message?: string } })?.error?.message ?? res.statusText}`)
        return
      }
      const data = await res.json() as { secure_url: string }
      setPhotoUrls((prev) => ({ ...prev, [itemId]: data.secure_url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingItemId(null)
      uploadingForRef.current = null
    }
  }

  function handleSubmit() {
    if (!canSubmit) { setError('Score all mandatory items before signing off.'); return }
    if (hasFailure && !reworkNotes.trim()) { setError('Provide rework notes for failed items.'); return }
    setError('')
    startTransition(async () => {
      const result = await submitQcChecklist(jobCardId, verticalId, allItems, reworkNotes)
      if (result?.error) setError(result.error)
    })
  }

  function ResultButton({ id, value }: { id: string; value: 'pass' | 'fail' | 'na' }) {
    const current = results[id]?.result ?? 'na'
    const styles = {
      pass: 'border-green-400 bg-green-100 text-green-700',
      fail: 'border-red-400 bg-red-100 text-red-700',
      na: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
    }
    const icons = {
      pass: <CheckCircle2 className="h-4 w-4" />,
      fail: <XCircle className="h-4 w-4" />,
      na: <Minus className="h-4 w-4" />,
    }
    return (
      <button
        type="button"
        onClick={() => setResult(id, value)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all',
          current === value ? styles[value] + ' ring-2 ring-ring' : 'border-input text-muted-foreground hover:border-foreground',
        )}
      >
        {icons[value]}
        {value === 'na' ? 'N/A' : value.toUpperCase()}
      </button>
    )
  }

  function ChecklistItem({ id, label, isMandatory }: { id: string; label: string; isMandatory?: boolean }) {
    const currentResult = results[id]?.result ?? 'na'
    const photoUrl = photoUrls[id]
    const isUploading = uploadingItemId === id

    return (
      <div className={cn(
        'rounded-md border p-3 space-y-2',
        currentResult === 'fail' && 'border-red-200 bg-red-50',
        currentResult === 'pass' && 'border-green-200 bg-green-50',
      )}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium flex-1">
            {label}
            {isMandatory && <span className="text-destructive ml-1">*</span>}
          </p>
          <div className="flex gap-1 flex-shrink-0">
            <ResultButton id={id} value="pass" />
            <ResultButton id={id} value="fail" />
            <ResultButton id={id} value="na" />
          </div>
        </div>

        {currentResult === 'fail' && (
          <input
            type="text"
            placeholder="Describe the issue..."
            value={results[id]?.notes ?? ''}
            onChange={(e) => setNotes(id, e.target.value)}
            className="w-full h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}

        {/* Photo capture */}
        <div className="flex items-center gap-2">
          {photoUrl ? (
            <div className="relative inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="QC photo"
                className="h-14 w-14 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removePhoto(id)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openPhotoUpload(id)}
              disabled={isUploading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-input rounded px-2 py-1 transition-colors disabled:opacity-50"
            >
              {isUploading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Camera className="h-3 w-3" />}
              {isUploading ? 'Uploading…' : 'Add Photo'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Hidden file input shared across all items */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* Checklist items */}
      <div className="space-y-4">
        {templates.map((t) => (
          <ChecklistItem key={t.id} id={t.id} label={t.check_point} isMandatory={t.is_mandatory} />
        ))}
        {customItems.map((c) => (
          <ChecklistItem key={c.id} id={c.id} label={c.label} />
        ))}
      </div>

      {/* Add custom item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
          placeholder="Add check point..."
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCustomItem} className="h-10">
          Add
        </Button>
      </div>

      {/* Rework notes — required if any fail */}
      {hasFailure && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-destructive">
            Rework Notes <span className="font-normal">(required for failed items)</span>
          </label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-destructive/50 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Describe what needs to be reworked..."
            value={reworkNotes}
            onChange={(e) => setReworkNotes(e.target.value)}
          />
        </div>
      )}

      {/* Progress */}
      {mandatoryUnscored.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {mandatoryUnscored.length} mandatory item{mandatoryUnscored.length !== 1 ? 's' : ''} not yet scored
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        size="xl"
        className={cn('w-full', hasFailure && 'bg-destructive hover:bg-destructive/90')}
        onClick={handleSubmit}
        disabled={isPending || !canSubmit}
      >
        {isPending
          ? 'Submitting...'
          : hasFailure
          ? 'Flag for Rework'
          : 'Sign Off — QC Passed'}
      </Button>
    </div>
  )
}
