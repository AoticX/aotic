'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function WorkshopError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-64 space-y-4 text-center px-4 py-12">
      <p className="text-base font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button size="sm" onClick={reset}>Try again</Button>
    </div>
  )
}
