'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { startTimer, stopTimer } from '@/lib/actions/time-logs'
import { Clock, Square, Play } from 'lucide-react'

type Props = {
  jobCardId: string
  activeLog: { id: string; started_at: string } | null
}

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function JobTimer({ jobCardId, activeLog }: Props) {
  const [log, setLog] = useState(activeLog)
  const [elapsed, setElapsed] = useState(activeLog ? formatElapsed(activeLog.started_at) : '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!log) return
    const interval = setInterval(() => {
      setElapsed(formatElapsed(log.started_at))
    }, 1000)
    return () => clearInterval(interval)
  }, [log])

  function handleStart() {
    setError('')
    startTransition(async () => {
      const result = await startTimer(jobCardId)
      if (result.error) { setError(result.error); return }
      const now = new Date().toISOString()
      setLog({ id: result.id!, started_at: now })
      setElapsed('0s')
    })
  }

  function handleStop() {
    if (!log) return
    setError('')
    startTransition(async () => {
      const result = await stopTimer(log.id, notes || undefined)
      if (result.error) { setError(result.error); return }
      setLog(null)
      setElapsed('')
      setNotes('')
    })
  }

  return (
    <div className="space-y-3">
      {log ? (
        <>
          <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-3">
            <Clock className="h-5 w-5 text-green-600 animate-pulse flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Timer running</p>
              <p className="text-xl font-mono font-bold text-green-900">{elapsed}</p>
            </div>
          </div>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            size="xl"
            variant="destructive"
            className="w-full gap-2"
            onClick={handleStop}
            disabled={isPending}
          >
            <Square className="h-5 w-5" />
            Stop Timer
          </Button>
        </>
      ) : (
        <Button
          size="xl"
          className="w-full gap-2"
          onClick={handleStart}
          disabled={isPending}
        >
          <Play className="h-5 w-5" />
          Start Timer
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
