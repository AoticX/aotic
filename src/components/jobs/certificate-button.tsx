'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Award } from 'lucide-react'
import { generateCertificatePdf } from '@/lib/actions/pdfs'

export function CertificateButton({ jobCardId }: { jobCardId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await generateCertificatePdf(jobCardId)
      if (error) throw new Error(error)
      const url = data?.pdf_url ?? data?.url ?? data?.certificate_url
      if (url) window.open(url, '_blank')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Certificate generation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={generate}>
        <Award className="h-3.5 w-3.5 mr-1.5" />
        {loading ? 'Generating...' : 'Generate Certificate'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
