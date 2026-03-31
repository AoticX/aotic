'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export function WhatsAppCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={copy}>
      {copied ? (
        <><Check className="h-3 w-3 mr-1 text-green-600" />Copied</>
      ) : (
        <><Copy className="h-3 w-3 mr-1" />Copy</>
      )}
    </Button>
  )
}
