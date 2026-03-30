'use client'

import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/button'
import { savePhotoRecord } from '@/lib/actions/photos'
import { Camera, CheckCircle2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Stage = 'before' | 'during' | 'after'

type UploadedPhoto = {
  id: string
  stage: Stage
  url: string
  name: string
}

type Props = {
  jobCardId: string
  existingPhotos: { id: string; stage: string; r2_url: string; file_name: string | null }[]
}

const STAGE_LABELS: Record<Stage, string> = {
  before: 'Before',
  during: 'During',
  after: 'After',
}

const MIN_PHOTOS = 4
const STAGES: Stage[] = ['before', 'during', 'after']

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export function PhotoUploader({ jobCardId, existingPhotos }: Props) {
  const [stage, setStage] = useState<Stage>('before')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [localPhotos, setLocalPhotos] = useState<UploadedPhoto[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const allPhotos = [
    ...existingPhotos.map((p) => ({
      id: p.id,
      stage: p.stage as Stage,
      url: p.r2_url,
      name: p.file_name ?? 'photo',
    })),
    ...localPhotos,
  ]

  const totalCount = allPhotos.length
  const meetsMinimum = totalCount >= MIN_PHOTOS

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Cloudinary is not configured. Contact your administrator.')
      return
    }

    setError('')
    setUploading(true)

    try {
      for (const file of files) {
        // Compress before upload — max 1MB / 1920px
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg',
        })

        const fileName = `${stage}_${Date.now()}.jpg`
        const fileSizeKb = Math.round(compressed.size / 1024)

        // Upload directly to Cloudinary via unsigned upload preset
        const formData = new FormData()
        formData.append('file', compressed, fileName)
        formData.append('upload_preset', UPLOAD_PRESET)
        formData.append('folder', `aotic/jobs/${jobCardId}/${stage}`)

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData },
        )

        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}))
          setError(`Upload failed: ${body?.error?.message ?? uploadRes.statusText}`)
          continue
        }

        const cloudData = await uploadRes.json() as {
          public_id: string
          secure_url: string
        }

        const result = await savePhotoRecord({
          jobCardId,
          stage,
          cloudinaryPublicId: cloudData.public_id,
          cloudinaryUrl: cloudData.secure_url,
          fileName,
          fileSizeKb,
          mimeType: 'image/jpeg',
        })

        if (result.error) {
          setError(result.error)
          continue
        }

        setLocalPhotos((prev) => [
          ...prev,
          { id: cloudData.public_id, stage, url: cloudData.secure_url, name: fileName },
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Stage selector */}
      <div className="flex gap-2">
        {STAGES.map((s) => {
          const count = allPhotos.filter((p) => p.stage === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-medium border transition-colors',
                stage === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:text-foreground',
              )}
            >
              {STAGE_LABELS[s]}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Compressing and uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <p className="text-sm font-medium">Tap to add {STAGE_LABELS[stage]} photo</p>
            <p className="text-xs">Compressed automatically before upload</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <X className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Photo count / minimum indicator */}
      <div className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
        meetsMinimum ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800',
      )}>
        {meetsMinimum
          ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          : <Camera className="h-4 w-4 flex-shrink-0" />}
        <span>
          {totalCount} photo{totalCount !== 1 ? 's' : ''} uploaded
          {!meetsMinimum && ` — ${MIN_PHOTOS - totalCount} more required`}
        </span>
      </div>

      {/* Photo grid for current stage */}
      {allPhotos.filter((p) => p.stage === stage).length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {allPhotos
            .filter((p) => p.stage === stage)
            .map((p) => (
              <div key={p.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <img
                  src={p.url}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
