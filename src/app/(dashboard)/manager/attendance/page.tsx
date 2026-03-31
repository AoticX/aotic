import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Clock, UserCheck, UserX, Calendar } from 'lucide-react'

type AttendanceStatus = 'present' | 'absent' | 'leave'

type ProfileRow = {
  id: string
  full_name: string
  role: string
}

type AttendanceRow = {
  profile_id: string | null
  status: AttendanceStatus
  login_time: string | null
  notes: string | null
}

function formatTime(ts: string | null) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function prevDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() - 1)
  return dt.toISOString().split('T')[0]
}

function nextDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + 1)
  return dt.toISOString().split('T')[0]
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
  present: { label: 'Present', variant: 'success' },
  absent:  { label: 'Absent',  variant: 'destructive' },
  leave:   { label: 'Leave',   variant: 'warning' },
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Manager', sales_executive: 'Sales',
  workshop_technician: 'Technician', qc_inspector: 'QC Inspector',
  accounts_finance: 'Accounts', front_desk: 'Front Desk',
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = dateParam ?? today
  const isToday = selectedDate === today

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [profilesRes, attendanceRes] = await Promise.all([
    db.from('profiles').select('id, full_name, role').eq('is_active', true).order('full_name'),
    db.from('attendance').select('profile_id, status, login_time, notes').eq('date', selectedDate),
  ])

  const profiles = (profilesRes.data ?? []) as ProfileRow[]
  const attendanceMap = new Map<string, AttendanceRow>(
    ((attendanceRes.data ?? []) as AttendanceRow[])
      .filter(a => a.profile_id)
      .map(a => [a.profile_id!, a])
  )

  const presentCount = [...attendanceMap.values()].filter(a => a.status === 'present').length
  const absentCount = profiles.length - attendanceMap.size

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">{formatDateDisplay(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={`?date=${prevDate(selectedDate)}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" asChild>
              <Link href="?"><Calendar className="h-3.5 w-3.5 mr-1" />Today</Link>
            </Button>
          )}
          <Button variant="outline" size="icon" disabled={isToday} asChild={!isToday}>
            {isToday
              ? <span><ChevronRight className="h-4 w-4" /></span>
              : <Link href={`?date=${nextDate(selectedDate)}`}><ChevronRight className="h-4 w-4" /></Link>}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Not logged in</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-xs text-muted-foreground">Total staff</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Staff Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {profiles.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">No staff records found.</p>
          ) : (
            profiles.map(profile => {
              const att = attendanceMap.get(profile.id)
              const statusCfg = att ? STATUS_CONFIG[att.status] : null

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role] ?? profile.role}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {att?.login_time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(att.login_time)}
                      </span>
                    )}
                    {statusCfg ? (
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    ) : (
                      <Badge variant="outline">No record</Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
