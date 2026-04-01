import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddStaffButton } from '@/components/hr/add-staff-button'
import { StaffRoleSelect } from '@/components/hr/staff-role-select'
import { Users } from 'lucide-react'
import type { AppRole } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  branch_manager: 'Branch Manager',
  sales_executive: 'Sales Executive',
  workshop_technician: 'Technician',
  qc_inspector: 'QC Inspector',
  accounts_finance: 'Accounts',
  front_desk: 'Front Desk',
}

type StaffProfile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  is_active: boolean
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const callerRole = (me as { role: AppRole } | null)?.role
  const isOwner = callerRole === 'owner'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active')
    .neq('role', 'owner')
    .order('role')
    .order('full_name')

  const staff = (data ?? []) as StaffProfile[]
  const active = staff.filter(s => s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm">{active.length} active member{active.length !== 1 ? 's' : ''}</p>
        </div>
        <AddStaffButton />
      </div>

      {active.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No staff members yet. Add your first one above.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-sm">{s.phone ?? '—'}</TableCell>
                    <TableCell>
                      {isOwner || callerRole === 'branch_manager' ? (
                        <StaffRoleSelect profileId={s.id} currentRole={s.role} />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="text-xs">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {inactive.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Inactive / Deactivated</p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {inactive.map((s) => (
                    <TableRow key={s.id} className="opacity-50">
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
