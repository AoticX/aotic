import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddStaffButton } from '@/components/hr/add-staff-button'
import { StaffRoleSelect } from '@/components/hr/staff-role-select'
import { RemoveStaffButton } from '@/components/hr/remove-staff-button'
import { ReactivateStaffButton } from '@/components/hr/reactivate-staff-button'
import { Users } from 'lucide-react'
import type { AppRole } from '@/types/database'

// Roles a manager is allowed to remove (owner required for branch_manager)
const MANAGER_CAN_REMOVE = ['sales_executive', 'workshop_technician', 'qc_inspector', 'accounts_finance', 'front_desk']

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
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((s) => {
                  const canRemove = isOwner
                    ? s.role !== 'owner'
                    : callerRole === 'branch_manager' && MANAGER_CAN_REMOVE.includes(s.role)

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell className="text-sm">{s.phone ?? '—'}</TableCell>
                      <TableCell>
                        <StaffRoleSelect profileId={s.id} currentRole={s.role} />
                      </TableCell>
                      <TableCell>
                        {canRemove && (
                          <RemoveStaffButton profileId={s.id} name={s.full_name} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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
                    <TableRow key={s.id} className="opacity-60">
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ReactivateStaffButton profileId={s.id} />
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
