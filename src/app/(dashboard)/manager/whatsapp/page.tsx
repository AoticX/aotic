import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WhatsAppCopyButton } from '@/components/whatsapp/copy-button'
import { MessageCircle } from 'lucide-react'

export default async function WhatsAppTemplatesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: templates } = await db
    .from('whatsapp_templates')
    .select('id, name, label, body, category, is_active')
    .eq('is_active', true)
    .order('category')
    .order('label')

  const tmps = (templates ?? []) as {
    id: string
    name: string
    label: string
    body: string
    category: string | null
  }[]

  const categories = [...new Set(tmps.map(t => t.category ?? 'General'))]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">WhatsApp Templates</h1>
        <p className="text-muted-foreground text-sm">
          Copy these messages and paste into WhatsApp. Replace placeholders like {'{'}{'{'} 1 {'}'}{'}'} with actual values.
        </p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> WhatsApp Business API integration is scheduled for a future phase. For now, copy the template text and send manually via WhatsApp.
      </div>

      {tmps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No templates available.</p>
          </CardContent>
        </Card>
      ) : (
        categories.map(cat => (
          <div key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold capitalize text-muted-foreground uppercase tracking-wide">{cat}</h2>
            {tmps.filter(t => (t.category ?? 'General') === cat).map((tmpl) => (
              <Card key={tmpl.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">{tmpl.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">{tmpl.name}</Badge>
                      <WhatsAppCopyButton text={tmpl.body} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans bg-muted/30 rounded-md px-3 py-2 border">
                    {tmpl.body}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
