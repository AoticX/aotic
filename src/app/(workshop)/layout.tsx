import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLE_LABELS, MOBILE_ROLES } from '@/lib/auth/roles'
import { MobileBottomNav } from '@/components/nav/mobile-bottom-nav'
import { FeedbackButton } from '@/components/feedback/feedback-button'
import type { AppRole } from '@/types/database'

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  if (!profileData) redirect('/login')

  const profile = profileData as { full_name: string; role: AppRole }
  const { role } = profile

  if (!MOBILE_ROLES.includes(role)) redirect('/owner')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 bg-sidebar-background border-b border-sidebar-border px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-xs font-black text-white">A</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">AOTIC</p>
            <p className="text-[10px] text-white/40 leading-none mt-0.5">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {profile.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
      </header>

      {/* Page content — padded above bottom nav */}
      <main className="flex-1 px-4 py-5 pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Client component handles active state */}
      <MobileBottomNav isTechnician={role === 'workshop_technician'} />
      {/* bottom-20 clears the mobile nav bar (~64px) */}
      <FeedbackButton bottomOffset="bottom-20" />
    </div>
  )
}
