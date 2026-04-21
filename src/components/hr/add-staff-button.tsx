'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddStaffModal } from './add-staff-modal'

export function AddStaffButton({ callerRole }: { callerRole?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />Add Staff
      </Button>
      <AddStaffModal open={open} onClose={() => setOpen(false)} callerRole={callerRole} />
    </>
  )
}
