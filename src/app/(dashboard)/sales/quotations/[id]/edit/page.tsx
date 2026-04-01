import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { QuotationBuilder } from '@/components/quotations/quotation-builder'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { ServicePackage } from '@/types/database'

export default async function EditQuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const userRole = (profileData as { role: string } | null)?.role ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const [quotationRes, itemsRes, verticalsRes, packagesRes, reasonsRes] = await Promise.all([
    svc.from('quotations').select('*, leads(id, contact_name, converted_customer_id, created_by, assigned_to)').eq('id', id).maybeSingle(),
    svc.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
    supabase.from('verticals').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('service_packages').select('id, vertical_id, tier, segment, name, base_price').eq('is_active', true),
    supabase.from('discount_reasons').select('id, label').eq('is_active', true),
  ])

  if (!quotationRes.data) notFound()

  const q = quotationRes.data as {
    id: string
    status: string
    discount_pct: number
    discount_reason_id: string | null
    discount_notes: string | null
    tax_amount: number
    notes: string | null
    valid_until: string | null
    leads: {
      id: string; contact_name: string; converted_customer_id: string | null
      created_by: string | null; assigned_to: string | null
    } | null
  }

  // Only draft quotations can be edited
  if (q.status !== 'draft') {
    redirect(`/sales/quotations/${id}`)
  }

  // Explicit permission check
  const privilegedRoles = ['owner', 'branch_manager', 'front_desk', 'accounts_finance']
  const canAccess = privilegedRoles.includes(userRole)
    || q.leads?.created_by === user.id
    || q.leads?.assigned_to === user.id
  if (!canAccess) notFound()

  const existingItems = (itemsRes.data ?? []).map((item: {
    id: string; description: string; quantity: number; unit_price: number
    discount_pct: number; service_package_id: string | null; vertical_id: string | null
    tier: string | null; segment: string | null
  }) => ({
    id: crypto.randomUUID(),
    service_package_id: item.service_package_id ?? undefined,
    vertical_id: item.vertical_id ?? undefined,
    description: item.description,
    tier: item.tier ?? undefined,
    segment: item.segment ?? undefined,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_pct: item.discount_pct,
  }))

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/sales/quotations/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Edit Quotation</h1>
          <p className="text-sm text-muted-foreground">For: {q.leads?.contact_name}</p>
        </div>
      </div>
      <QuotationBuilder
        leadId={q.leads?.id ?? ''}
        customerId={q.leads?.converted_customer_id ?? undefined}
        quotationId={id}
        verticals={(verticalsRes.data ?? []) as { id: string; name: string }[]}
        packages={(packagesRes.data ?? []) as Pick<ServicePackage, 'id' | 'vertical_id' | 'tier' | 'segment' | 'name' | 'base_price'>[]}
        discountReasons={(reasonsRes.data ?? []) as { id: string; label: string }[]}
        errorMsg={error ? decodeURIComponent(error) : undefined}
        initial={{
          items: existingItems,
          discountPct: q.discount_pct,
          discountReasonId: q.discount_reason_id ?? undefined,
          discountNotes: q.discount_notes ?? undefined,
          taxAmount: q.tax_amount,
          notes: q.notes ?? undefined,
          validUntil: q.valid_until ?? undefined,
        }}
      />
    </div>
  )
}
