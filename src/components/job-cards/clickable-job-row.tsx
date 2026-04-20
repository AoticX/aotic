'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'

export function ClickableJobRow({ id, children }: { id: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => router.push(`/manager/jobs/${id}`)}
    >
      {children}
    </TableRow>
  )
}
