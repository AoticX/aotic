import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceMarker } from '@/components/hr/attendance-marker'
import { UserCheck } from 'lucide-react'

export default async function AttendancePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = new Date().toISOString().split('T')[0]

  const [empRes, attRes] = await Promise.all([
    db.from('employees').select('id, name, role').eq('is_active', true).order('name'),
    db.from('attendance').select('employee_id, status').eq('date', today),
  ])

  let employees = (empRes.data ?? []) as { id: string; name: string; role: string }[]

  // Fallback: use profiles if no employees table data
  if (employees.length === 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)
      .neq('role', 'owner')
      .order('full_name')
    employees = (profiles ?? []).map((p: { id: string; full_name: string; role: string }) => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
    }))
  }

  const attendanceMap = new Map<string, string>(
    ((attRes.data ?? []) as { employee_id: string; status: string }[]).map(a => [a.employee_id, a.status])
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Attendance</h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No staff records found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mark Today&apos;s Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {employees.map((emp) => (
              <AttendanceMarker
                key={emp.id}
                employeeId={emp.id}
                name={emp.name}
                role={emp.role}
                date={today}
                currentStatus={(attendanceMap.get(emp.id) ?? null) as 'present' | 'absent' | 'half_day' | null}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
