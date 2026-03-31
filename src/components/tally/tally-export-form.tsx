'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'
import { exportTallyCSV } from '@/lib/actions/tally'

export function TallyExportForm({ exportType }: { exportType: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Default: current month
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(exportType === 'inventory' ? '' : firstOfMonth)
  const [toDate, setToDate] = useState(exportType === 'inventory' ? '' : today)

  function handleExport() {
    setError(null)
    startTransition(async () => {
      const result = await exportTallyCSV(
        exportType as 'invoices' | 'payments' | 'gst' | 'inventory',
        fromDate || today,
        toDate || today,
      )
      if (result.error) {
        setError(result.error)
        return
      }
      if (!result.csv) {
        setError('No data found for the selected date range.')
        return
      }
      // Trigger download
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const showDateRange = exportType !== 'inventory'

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {showDateRange && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
        </>
      )}
      <Button size="sm" disabled={isPending} onClick={handleExport}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        {isPending ? 'Exporting...' : 'Export CSV'}
      </Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  )
}
