import { createClient } from '@/lib/supabase/server'
import { LeadForm } from '@/components/leads/lead-form'
import type { Vertical } from '@/types/database'

export default async function FrontDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from('verticals').select('id, name').eq('is_active', true).order('sort_order')

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Quick Lead Entry</h1>
        <p className="text-sm text-muted-foreground">Capture a walk-in or phone enquiry</p>
      </div>
      <LeadForm
        verticals={(data ?? []) as Pick<Vertical, 'id' | 'name'>[]}
        errorMsg={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  )
}
