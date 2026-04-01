'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { reactivateStaffMember } from '@/lib/actions/staff'

export function ReactivateStaffButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await reactivateStaffMember(profileId)
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Reactivating...' : 'Reactivate'}
    </Button>
  )
}
