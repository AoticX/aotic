import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const userRole = (profileData as { role: string } | null)?.role ?? ''

  // Use service client to bypass RLS for the lead lookup (auth is already verified above)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const [leadRes, verticalsRes, packagesRes, reasonsRes] = await Promise.all([
    svc.from('leads').select('id, contact_name, converted_customer_id, created_by, assigned_to').eq('id', leadId).maybeSingle(),
    supabase.from('verticals').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('service_packages').select('id, vertical_id, tier, segment, name, base_price').eq('is_active', true),
    supabase.from('discount_reasons').select('id, label').eq('is_active', true),
  ])

  if (!leadRes.data) notFound()

  const lead = leadRes.data as {
    id: string; contact_name: string; converted_customer_id: string | null
    created_by: string | null; assigned_to: string | null
  }

  // Explicit permission check: sales_executive can only access their own leads
  const privilegedRoles = ['owner', 'branch_manager', 'front_desk', 'accounts_finance']
  const canAccess = privilegedRoles.includes(userRole)
    || lead.created_by === user.id
    || lead.assigned_to === user.id
  if (!canAccess) notFound()

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">New Quotation</h1>
        <p className="text-sm text-muted-foreground">For: {lead.contact_name}</p>
      </div>
      <QuotationBuilder
        leadId={leadId}
        customerId={lead.converted_customer_id ?? undefined}
        verticals={(verticalsRes.data ?? []) as { id: string; name: string }[]}
        packages={(packagesRes.data ?? []) as Pick<ServicePackage, 'id' | 'vertical_id' | 'tier' | 'segment' | 'name' | 'base_price'>[]}
        discountReasons={(reasonsRes.data ?? []) as { id: string; label: string }[]}
        errorMsg={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  )
}
