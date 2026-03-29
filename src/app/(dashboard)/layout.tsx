// DESKTOP-FIRST layout for: Owner, Branch Manager, Sales, Accounts, Front Desk
// (docs: Strict UI Rule — desktop-first with data tables and wide metrics)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { ROLE_LABELS, DESKTOP_ROLES } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  owner: [
    { href: '/dashboard/owner', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/owner/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/owner/quotations', label: 'Quotations', icon: FileText },
    { href: '/dashboard/owner/jobs', label: 'Job Cards', icon: Wrench },
    { href: '/dashboard/owner/invoices', label: 'Invoices', icon: FileText },
    { href: '/dashboard/owner/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/owner/settings', label: 'Settings', icon: Settings },
  ],
  branch_manager: [
    { href: '/dashboard/manager', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/manager/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/manager/jobs', label: 'Workshop', icon: Wrench },
    { href: '/dashboard/manager/schedule', label: 'Schedule', icon: Calendar },
    { href: '/dashboard/manager/reports', label: 'Reports', icon: BarChart3 },
  ],
  sales_executive: [
    { href: '/dashboard/sales', label: 'My Pipeline', icon: LayoutDashboard },
    { href: '/dashboard/sales/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/sales/quotations', label: 'Quotations', icon: FileText },
    { href: '/dashboard/sales/bookings', label: 'Bookings', icon: Calendar },
  ],
  accounts_finance: [
    { href: '/dashboard/accounts', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/accounts/invoices', label: 'Invoices', icon: FileText },
    { href: '/dashboard/accounts/payments', label: 'Payments', icon: BarChart3 },
  ],
  front_desk: [
    { href: '/dashboard/front-desk', label: 'Quick Add Lead', icon: Users },
    { href: '/dashboard/front-desk/customers', label: 'Customers', icon: Users },
  ],
  workshop_technician: [],
  qc_inspector: [],
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user!.id)
    .single()

  if (!profileData) redirect('/login')

  const profile = profileData as { full_name: string; role: AppRole; email: string }
  const role = profile.role

  if (!DESKTOP_ROLES.includes(role)) redirect('/workshop/technician')

  const navItems = NAV_ITEMS[role] ?? []

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — dark, fixed width */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-black text-white">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">AOTIC CRM</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </a>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-sidebar-foreground">
                {profile.full_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
              <p className="text-xs text-sidebar-foreground/40 truncate">{profile.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0">
          <div />
          <Badge variant="secondary" className="text-xs">
            {ROLE_LABELS[role]}
          </Badge>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
