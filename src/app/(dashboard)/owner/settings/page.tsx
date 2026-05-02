import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AdvanceSettingsForm } from '@/components/owner/advance-settings-form'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { Settings } from 'lucide-react'

export default async function OwnerSettingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? ''

  if (role !== 'owner') redirect('/owner')

  const { data: settingData } = await db
    .from('system_settings')
    .select('value, updated_at')
    .eq('key', 'advance_percentage')
    .maybeSingle()

  const setting = settingData as { value: { default: number }; updated_at: string } | null
  const currentPct = setting?.value?.default ?? 50

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Owner-only configuration</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription className="text-xs">
            Customize how AOTIC CRM looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Advance Payment Policy</CardTitle>
          <CardDescription className="text-xs">
            Set the minimum advance percentage required before a job card can be created.
            This applies to all new bookings. Manager override is still possible but requires
            a documented reason and is audit-logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvanceSettingsForm currentPct={currentPct} lastUpdated={setting?.updated_at ?? null} />
        </CardContent>
      </Card>
    </div>
  )
}
