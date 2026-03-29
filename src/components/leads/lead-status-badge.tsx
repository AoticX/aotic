import { Badge } from '@/components/ui/badge'
import type { LeadStatus } from '@/types/database'

const CONFIG: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  hot:  { label: 'Hot',  variant: 'destructive' },
  warm: { label: 'Warm', variant: 'warning' },
  cold: { label: 'Cold', variant: 'info' },
  lost: { label: 'Lost', variant: 'secondary' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, variant } = CONFIG[status]
  return <Badge variant={variant}>{label}</Badge>
}
