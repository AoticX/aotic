'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'

export function DateRangeFilter() {
  const router = useRouter()
  const sp = useSearchParams()
  const [from, setFrom] = useState(sp.get('from') ?? '')
  const [to, setTo] = useState(sp.get('to') ?? '')

  function apply() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`?${params.toString()}`)
  }

  function reset() {
    setFrom('')
    setTo('')
    router.push('?')
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36 text-sm" />
      </div>
      <Button size="sm" onClick={apply} className="h-8 gap-1.5">
        <Calendar className="h-3.5 w-3.5" />Apply
      </Button>
      {(sp.get('from') || sp.get('to')) && (
        <Button size="sm" variant="outline" onClick={reset} className="h-8">Clear</Button>
      )}
    </div>
  )
}
