'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { markAttendance } from '@/lib/actions/hr'

const ROLE_LABELS: Record<string, string> = {
  branch_manager: 'Manager', sales_executive: 'Sales',
  workshop_technician: 'Technician', qc_inspector: 'QC',
  accounts_finance: 'Accounts', front_desk: 'Front Desk',
}

export function AttendanceMarker({
  employeeId, name, role, date, currentStatus,
}: {
  employeeId: string
  name: string
  role: string
  date: string
  currentStatus: 'present' | 'absent' | 'half_day' | null
}) {
  const [isPending, startTransition] = useTransition()

  function mark(status: 'present' | 'absent' | 'half_day') {
    startTransition(async () => {
      await markAttendance(employeeId, date, status)
    })
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[role] ?? role}</p>
      </div>
      <div className="flex gap-1.5">
        {(['present', 'half_day', 'absent'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={currentStatus === s ? (s === 'present' ? 'default' : s === 'half_day' ? 'secondary' : 'destructive') : 'outline'}
            className={cn(
              'h-7 text-xs px-2',
              currentStatus === s && s === 'present' && 'bg-green-600 hover:bg-green-700',
            )}
            disabled={isPending}
            onClick={() => mark(s)}
          >
            {s === 'present' ? 'P' : s === 'half_day' ? 'H' : 'A'}
          </Button>
        ))}
      </div>
    </div>
  )
}
