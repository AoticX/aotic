import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', branch_manager: 'Branch Manager',
  sales_executive: 'Sales Executive', workshop_technician: 'Technician',
  qc_inspector: 'QC Inspector', accounts_finance: 'Accounts',
  front_desk: 'Front Desk',
}

export default async function HRPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: employees } = await db
    .from('employees')
    .select('id, name, phone, role, salary, joining_date, is_active, profiles(full_name, email)')
    .eq('is_active', true)
    .order('role')
    .order('name')

  const staff = (employees ?? []) as {
    id: string; name: string; phone: string | null; role: string
    salary: number | null; joining_date: string | null; is_active: boolean
    profiles: { full_name: string; email: string } | null
  }[]

  // If no employees in employees table, fallback to profiles
  const { data: profiles } = !staff.length
    ? await db.from('profiles').select('id, full_name, role, email, phone, is_active').eq('is_active', true).order('role').order('full_name')
    : { data: null }

  const profileStaff = (profiles ?? []) as {
    id: string; full_name: string; role: string; email: string; phone: string | null; is_active: boolean
  }[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">HR — Staff Directory</h1>
        <p className="text-muted-foreground text-sm">{staff.length || profileStaff.length} active staff member(s)</p>
      </div>

      {staff.length === 0 && profileStaff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No staff records found.</p>
          </CardContent>
        </Card>
      ) : staff.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Salary (Rs.)</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ROLE_LABELS[emp.role] ?? emp.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{emp.phone ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {emp.salary != null ? Number(emp.salary).toLocaleString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Fallback: show profiles table */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">System Users (from profiles)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profileStaff.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ROLE_LABELS[p.role] ?? p.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.phone ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
