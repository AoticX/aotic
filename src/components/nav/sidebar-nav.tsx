'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, LayoutDashboard, Users, FileText, Calendar, Wrench, BarChart3, Package, AlertTriangle, ClipboardList, UserCheck, MessageCircle, Database, Activity, UserCog, Settings, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/types/database'
import { PendingBadge } from './pending-badge'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  showPendingBadge?: boolean
}

const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  owner: [
    { href: '/owner',               label: 'Overview',     icon: LayoutDashboard },
    { href: '/owner/leads',         label: 'Leads',        icon: Users },
    { href: '/manager/jobs',        label: 'Job Cards',    icon: Wrench },
    { href: '/sales/bookings/pending', label: 'Pending Actions', icon: Bell, showPendingBadge: true },
    { href: '/accounts/invoices',   label: 'Invoices',        icon: FileText },
    { href: '/accounts/payments',   label: 'Payments',        icon: BarChart3 },
    { href: '/accounts/materials',  label: 'Materials Used',  icon: Package },
    { href: '/manager/staff',       label: 'Staff',        icon: UserCog },
    { href: '/owner/hr',            label: 'HR',           icon: ClipboardList },
    { href: '/owner/reports/sales', label: 'Reports',      icon: BarChart3 },
    { href: '/manager/activity',    label: 'Activity Log', icon: Activity },
    { href: '/accounts/tally',      label: 'Tally',        icon: Database },
    { href: '/owner/settings',      label: 'Settings',     icon: Settings },
  ],
  branch_manager: [
    { href: '/manager',                 label: 'Overview',   icon: LayoutDashboard },
    { href: '/manager/leads',           label: 'Leads',      icon: Users },
    { href: '/manager/jobs',            label: 'Workshop',   icon: Wrench },
    { href: '/sales/bookings/pending',  label: 'Pending Actions', icon: Bell, showPendingBadge: true },
    { href: '/manager/faults',          label: 'Faults',     icon: AlertTriangle },
    { href: '/manager/attendance',      label: 'Attendance', icon: UserCheck },
    { href: '/manager/staff',           label: 'Staff',      icon: UserCog },
    { href: '/sales/whatsapp',          label: 'WhatsApp',   icon: MessageCircle },
    { href: '/manager/activity',        label: 'Activity Log', icon: Activity },
    { href: '/manager/settings',        label: 'Settings',   icon: Settings },
  ],
  sales_executive: [
    { href: '/sales',                   label: 'My Pipeline',     icon: LayoutDashboard },
    { href: '/sales/leads',             label: 'Leads',           icon: Users },
    { href: '/sales/quotations',        label: 'Quotations',      icon: FileText },
    { href: '/sales/bookings',          label: 'Bookings',        icon: Calendar },
    { href: '/sales/bookings/pending',  label: 'Pending Actions', icon: Bell, showPendingBadge: true },
    { href: '/sales/whatsapp',          label: 'WhatsApp',        icon: MessageCircle },
    { href: '/sales/settings',          label: 'Settings',        icon: Settings },
  ],
  accounts_finance: [
    { href: '/accounts',               label: 'Overview',        icon: LayoutDashboard },
    { href: '/accounts/invoices',      label: 'Invoices',        icon: FileText },
    { href: '/accounts/payments',      label: 'Payments',        icon: BarChart3 },
    { href: '/accounts/materials',     label: 'Materials Used',  icon: Package },
    { href: '/accounts/certificates',  label: 'Certificates',    icon: ClipboardList },
    { href: '/accounts/tally',         label: 'Tally Export',    icon: Database },
    { href: '/accounts/settings',      label: 'Settings',        icon: Settings },
  ],
  front_desk: [
    { href: '/front-desk',          label: 'Quick Lead', icon: Users },
    { href: '/sales/whatsapp',      label: 'WhatsApp',   icon: MessageCircle },
    { href: '/sales/leads',         label: 'All Leads',  icon: Users },
    { href: '/front-desk/settings', label: 'Settings',   icon: Settings },
  ],
  workshop_technician: [],
  qc_inspector: [],
}

export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role] ?? []

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href + '/'))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors group',
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <item.icon
              className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive ? 'text-sidebar-primary' : ''
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.showPendingBadge && !isActive && <PendingBadge />}
            {isActive && (
              <ChevronRight className="h-3 w-3 text-sidebar-primary opacity-70" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
