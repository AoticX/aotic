'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { exportTallyCsv } from '@/lib/actions/invoices'
import { Download } from 'lucide-react'

export function TallyExportButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleExport() {
    setError('')
    startTransition(async () => {
      const { csv, error } = await exportTallyCsv()
      if (error) { setError(error); return }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tally_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending} className="gap-1.5">
        <Download className="h-4 w-4" />
        {isPending ? 'Exporting...' : 'Export Tally CSV'}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
