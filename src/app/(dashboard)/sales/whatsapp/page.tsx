import { createClient } from '@/lib/supabase/server'
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat'

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const { lead: initialLeadId } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()

  // Load all leads with last communication
  const [leadsRes, templatesRes] = await Promise.all([
    db.from('leads')
      .select('id, contact_name, contact_phone, status, vertical_id, verticals(name)')
      .neq('status', 'lost')
      .order('created_at', { ascending: false }),
    db.from('whatsapp_templates')
      .select('id, name, category, label, body, variables')
      .order('category'),
  ])

  const leadsRaw = (leadsRes.data ?? []) as {
    id: string; contact_name: string; contact_phone: string
    status: string; vertical_id: string | null; verticals: { name: string } | null
  }[]

  // Fetch last WhatsApp message for each lead (batch)
  const leadIds = leadsRaw.map((l) => l.id)
  let lastMessages: Record<string, { notes: string | null; created_at: string; type: string }> = {}

  if (leadIds.length > 0) {
    const { data: commsData } = await db
      .from('communications')
      .select('lead_id, notes, created_at, type')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })

    // Keep only the latest message per lead
    for (const c of (commsData ?? [])) {
      if (!lastMessages[c.lead_id]) {
        lastMessages[c.lead_id] = { notes: c.notes, created_at: c.created_at, type: c.type }
      }
    }
  }

  const leads = leadsRaw.map((l) => ({
    ...l,
    lastMessage: lastMessages[l.id] ?? null,
  }))

  const templates = (templatesRes.data ?? []) as {
    id: string; name: string; category: string; label: string; body: string; variables: string[]
  }[]

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-bold">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Select a contact and send messages via WhatsApp. Templates auto-fill with customer details.
        </p>
      </div>
      <WhatsAppChat
        leads={leads}
        templates={templates}
        initialLeadId={initialLeadId}
        currentUserId={user!.id}
      />
    </div>
  )
}
