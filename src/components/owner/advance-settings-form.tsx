'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAdvancePercentage } from '@/lib/actions/settings'
import { CheckCircle2, Loader2 } from 'lucide-react'

type Props = {
  currentPct: number
  lastUpdated: string | null
}

export function AdvanceSettingsForm({ currentPct, lastUpdated }: Props) {
  const [pct, setPct] = useState(currentPct)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaved(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateAdvancePercentage(fd)
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="advance_pct">
          Advance Percentage Required <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="advance_pct"
            name="advance_percentage"
            type="number"
            min={10}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => { setPct(Number(e.target.value)); setSaved(false) }}
            className="w-28"
          />
          <span className="text-sm text-muted-foreground font-medium">%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Currently: <span className="font-semibold text-foreground">{currentPct}%</span>
          {' '}of total job value.
          {' '}Minimum 10%, maximum 100%.
        </p>
      </div>

      {/* Live preview */}
      <div className="rounded-md bg-muted/40 border px-4 py-3 text-sm space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
        <p>
          For a job valued at{' '}
          <span className="font-semibold">Rs. 50,000</span>,
          minimum advance will be{' '}
          <span className="font-semibold text-primary">
            Rs. {Math.ceil(50000 * pct / 100).toLocaleString('en-IN')} ({pct}%)
          </span>
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Advance percentage updated to {pct}%.
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <Button type="submit" disabled={isPending || pct === currentPct}>
        {isPending
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
          : 'Save Changes'}
      </Button>
    </form>
  )
}
