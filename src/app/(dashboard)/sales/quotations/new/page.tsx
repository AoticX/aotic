import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuotationBuilder } from '@/components/quotations/quotation-builder'
import type { ServicePackage } from '@/types/database'

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; error?: string }>
}) {
  const { lead: leadId, error } = await searchParams
  if (!leadId) notFound()

  const supabase = await createClient()
  // Calling getUser() ensures the session token is refreshed before any DB query
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [leadRes, verticalsRes, packagesRes, reasonsRes] = await Promise.all([
    db.from('leads').select('id, contact_name, customer_id').eq('id', leadId).maybeSingle(),
    supabase.from('verticals').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('service_packages').select('id, vertical_id, tier, segment, name, base_price').eq('is_active', true),
    supabase.from('discount_reasons').select('id, label').eq('is_active', true),
  ])

  if (!leadRes.data) notFound()
  const lead = leadRes.data as { id: string; contact_name: string; customer_id: string | null }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">New Quotation</h1>
        <p className="text-sm text-muted-foreground">For: {lead.contact_name}</p>
      </div>
      <QuotationBuilder
        leadId={leadId}
        customerId={lead.customer_id ?? undefined}
        verticals={(verticalsRes.data ?? []) as { id: string; name: string }[]}
        packages={(packagesRes.data ?? []) as Pick<ServicePackage, 'id' | 'vertical_id' | 'tier' | 'segment' | 'name' | 'base_price'>[]}
        discountReasons={(reasonsRes.data ?? []) as { id: string; label: string }[]}
        errorMsg={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  )
}
