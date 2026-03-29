'use client'

import { Breadcrumbs } from './breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'

export function TopBar({ role }: { role: AppRole }) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0">
      <Breadcrumbs />
      <Badge variant="secondary" className="text-xs capitalize hidden sm:flex">
        {ROLE_LABELS[role]}
      </Badge>
    </header>
  )
}
