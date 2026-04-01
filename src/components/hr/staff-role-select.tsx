'use client'

import { useState, useTransition } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateStaffRole } from '@/lib/actions/staff'

const ROLES = [
  { value: 'branch_manager',      label: 'Branch Manager' },
  { value: 'sales_executive',     label: 'Sales Executive' },
  { value: 'workshop_technician', label: 'Workshop Technician' },
  { value: 'qc_inspector',        label: 'QC Inspector' },
  { value: 'accounts_finance',    label: 'Accounts & Finance' },
  { value: 'front_desk',          label: 'Front Desk' },
]

export function StaffRoleSelect({
  profileId,
  currentRole,
}: {
  profileId: string
  currentRole: string
}) {
  const [role, setRole] = useState(currentRole)
  const [isPending, startTransition] = useTransition()

  function handleChange(val: string) {
    setRole(val)
    startTransition(async () => {
      await updateStaffRole(profileId, val)
    })
  }

  return (
    <Select value={role} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-7 text-xs w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map(r => (
          <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
