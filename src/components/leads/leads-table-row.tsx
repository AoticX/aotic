'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'

export function LeadsTableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => router.push(`/sales/leads/${id}`)}
    >
      {children}
    </TableRow>
  )
}
