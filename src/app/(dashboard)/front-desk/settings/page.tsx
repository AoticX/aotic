import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { Settings } from 'lucide-react'

export default function FrontDeskSettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Preferences for this device</p>
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
    </div>
  )
}
