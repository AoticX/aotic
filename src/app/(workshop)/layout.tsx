// MOBILE-FIRST layout for: Workshop Technician and QC Inspector
// (docs: Strict UI Rule — large buttons, stacked layouts, easy to tap)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { ROLE_LABELS, MOBILE_ROLES } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'
import { ClipboardList, Camera, Clock, CheckSquare, LogOut } from 'lucide-react'

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  if (!profileData) redirect('/login')

  const profile = profileData as { full_name: string; role: AppRole }
  const role = profile.role

  if (!MOBILE_ROLES.includes(role)) redirect('/dashboard')

  const isTechnician = role === 'workshop_technician'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar — mobile */}
      <header className="sticky top-0 z-50 bg-sidebar-background border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-xs font-black text-white">A</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">AOTIC</p>
            <p className="text-xs text-white/50 leading-none">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {profile.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
      </header>

      {/* Page content — padded for thumbs */}
      <main className="flex-1 px-4 py-6 pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom navigation — large tap targets */}
      <nav className="fixed bottom-0 inset-x-0 bg-sidebar-background border-t border-sidebar-border">
        <div className="max-w-lg mx-auto flex items-center">
          {isTechnician ? (
            <>
              <a
                href="/workshop/technician"
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-sidebar-primary active:bg-sidebar-accent transition-colors"
              >
                <ClipboardList className="h-6 w-6" />
                <span className="text-xs font-medium">My Jobs</span>
              </a>
              <a
                href="/workshop/technician/upload"
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-sidebar-primary active:bg-sidebar-accent transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">Photos</span>
              </a>
              <a
                href="/workshop/technician/timer"
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-sidebar-primary active:bg-sidebar-accent transition-colors"
              >
                <Clock className="h-6 w-6" />
                <span className="text-xs font-medium">Timer</span>
              </a>
            </>
          ) : (
            <>
              <a
                href="/workshop/qc"
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-sidebar-primary active:bg-sidebar-accent transition-colors"
              >
                <CheckSquare className="h-6 w-6" />
                <span className="text-xs font-medium">QC Queue</span>
              </a>
              <a
                href="/workshop/qc/checklist"
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-sidebar-primary active:bg-sidebar-accent transition-colors"
              >
                <ClipboardList className="h-6 w-6" />
                <span className="text-xs font-medium">Checklist</span>
              </a>
            </>
          )}
          <form action={signOut} className="flex-1">
            <button
              type="submit"
              className="w-full flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/60 hover:text-destructive active:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-6 w-6" />
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </form>
        </div>
      </nav>
    </div>
  )
}
