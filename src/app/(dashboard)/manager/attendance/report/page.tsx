import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager',
  sales_executive: 'Sales Executive', workshop_technician: 'Technician',
  qc_inspector: 'QC Inspector', accounts_finance: 'Accounts', front_desk: 'Front Desk',
}

const STATUS_LABELS: Record<string, string> = { present: 'P', absent: 'A', leave: 'L' }
const STATUS_COLORS: Record<string, string> = {
  present: 'text-green-700 bg-green-100',
  absent: 'text-red-700 bg-red-100',
  leave: 'text-amber-700 bg-amber-100',
}

function buildMonthDates(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
}

function prevMonth(y: number, m: number) {
  m--; if (m < 1) { m = 12; y-- }
  return `${y}-${String(m).padStart(2, '0')}`
}
function nextMonth(y: number, m: number) {
  m++; if (m > 12) { m = 1; y++ }
  return `${y}-${String(m).padStart(2, '0')}`
}

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const now = new Date()
  const [year, month] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]

  const monthDates = buildMonthDates(year, month)
  const monthStart = monthDates[0]
  const monthEnd = monthDates[monthDates.length - 1]

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [profilesRes, attendanceRes] = await Promise.all([
    db.from('profiles').select('id, full_name, role').eq('is_active', true).order('full_name'),
    db.from('attendance')
      .select('profile_id, date, status')
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ])

  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string; role: string }[]
  const attRows = (attendanceRes.data ?? []) as { profile_id: string; date: string; status: string }[]

  // Map: profileId → date → status
  const attMap = new Map<string, Map<string, string>>()
  for (const row of attRows) {
    if (!row.profile_id) continue
    if (!attMap.has(row.profile_id)) attMap.set(row.profile_id, new Map())
    attMap.get(row.profile_id)!.set(row.date, row.status)
  }

  // For display we only show weekdays (Mon–Sat), skip full month if too wide; show first 15 / last 16
  const prevMonStr = prevMonth(year, month)
  const nextMonStr = nextMonth(year, month)
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = `${year}-${String(month).padStart(2, '0')}` === nowStr

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Attendance Report</h1>
          <p className="text-muted-foreground text-sm">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={`?month=${prevMonStr}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" asChild>
              <Link href="?"><Calendar className="h-3.5 w-3.5 mr-1" />This Month</Link>
            </Button>
          )}
          <Button variant="outline" size="icon" disabled={isCurrentMonth} asChild={!isCurrentMonth}>
            {isCurrentMonth
              ? <span><ChevronRight className="h-4 w-4" /></span>
              : <Link href={`?month=${nextMonStr}`}><ChevronRight className="h-4 w-4" /></Link>}
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {profiles.length > 0 && (() => {
          const totalSlots = profiles.length * monthDates.length
          const presentCount = attRows.filter(r => r.status === 'present').length
          const absentCount = attRows.filter(r => r.status === 'absent').length
          const leaveCount = attRows.filter(r => r.status === 'leave').length
          return (
            <>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present entries</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent entries</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{totalSlots - presentCount - absentCount - leaveCount}</p>
                <p className="text-xs text-muted-foreground">Unrecorded slots</p>
              </CardContent></Card>
            </>
          )
        })()}
      </div>

      {/* Per-employee summary table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Employee</TableHead>
                <TableHead className="min-w-[80px]">Role</TableHead>
                <TableHead className="text-center text-green-700">Present</TableHead>
                <TableHead className="text-center text-red-600">Absent</TableHead>
                <TableHead className="text-center text-amber-600">Leave</TableHead>
                <TableHead className="text-center">Unrecorded</TableHead>
                <TableHead className="text-center text-right">Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const empMap = attMap.get(p.id) ?? new Map<string, string>()
                const present = [...empMap.values()].filter(s => s === 'present').length
                const absent = [...empMap.values()].filter(s => s === 'absent').length
                const leave = [...empMap.values()].filter(s => s === 'leave').length
                const unrecorded = monthDates.length - empMap.size
                const pct = monthDates.length > 0 ? ((present / monthDates.length) * 100).toFixed(0) : '0'
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[p.role] ?? p.role}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-green-700">{present}</TableCell>
                    <TableCell className="text-center font-mono text-red-600">{absent}</TableCell>
                    <TableCell className="text-center font-mono text-amber-600">{leave}</TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">{unrecorded}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={Number(pct) >= 80 ? 'success' : Number(pct) >= 60 ? 'warning' : 'destructive'} className="text-xs">
                        {pct}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Day-wise grid (compact) */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <p className="text-xs font-medium text-muted-foreground mb-3">Day-Wise Attendance Grid</p>
          <div className="min-w-max">
            {/* Header row — dates */}
            <div className="flex gap-0.5 mb-1">
              <div className="w-36 shrink-0" />
              {monthDates.map(d => {
                const day = new Date(d + 'T00:00:00Z').getUTCDate()
                return (
                  <div key={d} className="w-6 text-center text-[10px] text-muted-foreground font-mono">{day}</div>
                )
              })}
            </div>
            {profiles.map((p) => {
              const empMap = attMap.get(p.id) ?? new Map<string, string>()
              return (
                <div key={p.id} className="flex gap-0.5 mb-0.5 items-center">
                  <div className="w-36 shrink-0 text-xs truncate pr-2">{p.full_name}</div>
                  {monthDates.map(d => {
                    const status = empMap.get(d)
                    return (
                      <div
                        key={d}
                        title={status ?? 'No record'}
                        className={`w-6 h-5 rounded-sm text-[9px] font-bold flex items-center justify-center ${
                          status ? STATUS_COLORS[status] : 'bg-muted text-muted-foreground/40'
                        }`}
                      >
                        {status ? STATUS_LABELS[status] : '·'}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
