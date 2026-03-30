'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center h-full min-h-64 space-y-4 text-center px-4">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message || 'An unexpected error occurred loading this page.'}
      </p>
      <Button size="sm" onClick={reset}>Try again</Button>
    </div>
  )
}
