import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { ROLE_LABELS, DESKTOP_ROLES } from '@/lib/auth/roles'
import { SidebarNav } from '@/components/nav/sidebar-nav'
import { TopBar } from '@/components/nav/top-bar'
import { Button } from '@/components/ui/button'
import type { AppRole } from '@/types/database'
import { LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('full_name, role, email').eq('id', user.id).single()
  if (!profileData) redirect('/login')

  const profile = profileData as { full_name: string; role: AppRole; email: string }
  const { role } = profile

  if (!DESKTOP_ROLES.includes(role)) redirect('/technician')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-white">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground leading-none">AOTIC</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        {/* Nav — client component handles active state */}
        <SidebarNav role={role} />

        {/* User footer */}
        <div className="border-t border-sidebar-border p-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="h-6 w-6 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-sidebar-foreground">
                {profile.full_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">
                {profile.full_name}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
                {profile.email}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit" variant="ghost" size="sm"
              className="w-full justify-start gap-2 h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar role={role} />
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
