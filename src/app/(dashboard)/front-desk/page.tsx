import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus, MessageSquare } from 'lucide-react'

export default function FrontDeskDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Front Desk</h1>
          <p className="text-muted-foreground text-sm">Quick lead entry and customer communication logs</p>
        </div>
        <Badge variant="outline">Phase 1 — Schema Ready</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Add New Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Quickly capture a walk-in or phone enquiry
            </p>
            <Button size="sm" disabled>
              Quick Lead Entry (Phase 3)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Communication Log</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              WhatsApp and call tracking timeline
            </p>
            <Button variant="outline" size="sm" disabled>
              View Timeline (Phase 3)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
