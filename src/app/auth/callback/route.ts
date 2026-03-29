import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDefaultRoute } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const profile = profileData as { role: AppRole } | null

        if (profile?.role) {
          return NextResponse.redirect(`${origin}${getDefaultRoute(profile.role)}`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Auth+callback+failed`)
}
