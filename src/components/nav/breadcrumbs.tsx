'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// Maps path segments to human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  owner: 'Owner',
  manager: 'Manager',
  sales: 'Sales',
  accounts: 'Accounts',
  'front-desk': 'Front Desk',
  workshop: 'Workshop',
  technician: 'Technician',
  qc: 'QC',
  leads: 'Leads',
  quotations: 'Quotations',
  bookings: 'Bookings',
  jobs: 'Job Cards',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings',
  customers: 'Customers',
  schedule: 'Schedule',
  upload: 'Upload Photos',
  timer: 'Time Log',
  checklist: 'Checklist',
  new: 'New',
  edit: 'Edit',
}

function isUUID(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = isUUID(seg) ? 'Detail' : (SEGMENT_LABELS[seg] ?? seg)
    const isLast = i === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          {crumb.isLast ? (
            <span className={cn('font-medium text-foreground')}>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
