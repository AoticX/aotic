'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { QuotationStatus } from '@/types/database'

type QItemInput = {
  service_package_id?: string
  vertical_id?: string
  description: string
  tier?: string
  segment?: string
  quantity: number
  unit_price: number
  sort_order: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertQuotationItems(db: any, lineItems: Array<Record<string, unknown>>) {
  const withServiceVertical = lineItems.map((item) => ({
    ...item,
    // Keep compatibility with DBs that added this column in later migrations.
    service_vertical: item.vertical_id ?? null,
  }))

  let { error } = await db.from('quotation_items').insert(withServiceVertical)
  if (!error) return

  const msg = String(error.message || '').toLowerCase()
  const missingColumn = msg.includes('service_vertical') && (msg.includes('does not exist') || msg.includes('schema cache'))

  if (missingColumn) {
    const retry = await db.from('quotation_items').insert(lineItems)
    if (!retry.error) return
    error = retry.error
  }

  throw new Error(error.message || 'Failed to insert quotation items')
}

async function resolveVerticalByPackage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  items: QItemInput[],
): Promise<Map<string, string>> {
  const packageIds = Array.from(
    new Set(
      items
        .filter((item) => !item.vertical_id && item.service_package_id)
        .map((item) => item.service_package_id as string),
    ),
  )

  if (!packageIds.length) return new Map<string, string>()

  const { data } = await db
    .from('service_packages')
    .select('id, vertical_id')
    .in('id', packageIds)

  const rows = (data ?? []) as { id: string; vertical_id: string | null }[]
  return new Map(rows.filter((r) => !!r.vertical_id).map((r) => [r.id, r.vertical_id as string]))
}

export async function createQuotation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const leadId = formData.get('lead_id') as string
  const items: QItemInput[] = JSON.parse(formData.get('items') as string || '[]')

  if (!items.length) {
    redirect(`/sales/quotations/new?lead=${leadId}&error=${encodeURIComponent('Add at least one service item')}`)
  }

  const discountPct = Number(formData.get('discount_pct') || 0)
  const discountReasonId = formData.get('discount_reason_id') as string || null
  const taxAmount = Number(formData.get('tax_amount') || 0)

  if (discountPct > 0 && !discountReasonId) {
    redirect(`/sales/quotations/new?lead=${leadId}&error=${encodeURIComponent('A reason code is required for any discount')}`)
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + item.unit_price * item.quantity
  }, 0)
  const headerDiscount = subtotal * (discountPct / 100)
  const total = subtotal - headerDiscount + taxAmount
  const needsApproval = discountPct > 5
  const status: QuotationStatus = needsApproval ? 'pending_approval' : 'draft'

  const { data: profileData } = await supabase
    .from('profiles').select('branch_id').eq('id', user.id).single()
  const profile = profileData as { branch_id: string | null } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: quotation, error } = await db.from('quotations')
    .insert({
      lead_id: leadId,
      customer_id: formData.get('customer_id') as string || null,
      status,
      subtotal,
      discount_amount: headerDiscount,
      discount_reason_id: discountReasonId,
      discount_notes: formData.get('discount_notes') as string || null,
      tax_amount: taxAmount,
      total,
      discount_percent: discountPct,
      valid_until: formData.get('valid_until') as string || null,
      notes: formData.get('notes') as string || null,
      branch_id: profile?.branch_id ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) redirect(`/sales/quotations/new?lead=${leadId}&error=${encodeURIComponent(error.message)}`)

  const qId = (quotation as { id: string }).id

  const verticalByPackage = await resolveVerticalByPackage(db, items)

  const missingVertical = items.find((item) => {
    const resolvedVertical = item.vertical_id || (item.service_package_id ? verticalByPackage.get(item.service_package_id) : undefined)
    return !resolvedVertical
  })

  if (missingVertical) {
    redirect(`/sales/quotations/new?lead=${leadId}&error=${encodeURIComponent('Each quotation item must include a valid service vertical.')}`)
  }

  const lineItems = items.map((item, i) => {
    const resolvedVertical = item.vertical_id || (item.service_package_id ? verticalByPackage.get(item.service_package_id) : undefined)
    return {
      quotation_id: qId,
      service_package_id: item.service_package_id || null,
      vertical_id: resolvedVertical,
      service_vertical: resolvedVertical,
      heading: item.heading || null,
      description: item.description,
      tier: item.tier || null,
      segment: item.segment || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.unit_price * item.quantity,
      sort_order: i,
    }
  })

  try {
    await insertQuotationItems(db, lineItems)
  } catch (err) {
    await db.from('quotations').delete().eq('id', qId)
    const message = err instanceof Error ? err.message : 'Failed to save quotation items'
    redirect(`/sales/quotations/new?lead=${leadId}&error=${encodeURIComponent(message)}`)
  }

  if (needsApproval && discountReasonId) {
    await db.from('discount_approvals').insert({
      quotation_id: qId,
      requested_pct: discountPct,
      reason_id: discountReasonId,
      reason_notes: formData.get('discount_notes') as string || null,
      status: 'pending',
      requested_by: user.id,
    })
  }

  revalidatePath('/sales/quotations')
  revalidatePath(`/sales/leads/${leadId}`)
  redirect(`/sales/quotations/${qId}`)
}

export async function updateQuotation(quotationId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const items: QItemInput[] = JSON.parse(formData.get('items') as string || '[]')
  if (!items.length) {
    redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent('Add at least one service item')}`)
  }

  const discountPct = Number(formData.get('discount_pct') || 0)
  const discountReasonId = formData.get('discount_reason_id') as string || null
  const taxAmount = Number(formData.get('tax_amount') || 0)

  if (discountPct > 0 && !discountReasonId) {
    redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent('A reason code is required for any discount')}`)
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + item.unit_price * item.quantity
  }, 0)
  const headerDiscount = subtotal * (discountPct / 100)
  const total = subtotal - headerDiscount + taxAmount
  const needsApproval = discountPct > 5
  const status: QuotationStatus = needsApproval ? 'pending_approval' : 'draft'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from('quotations')
    .update({
      status,
      subtotal,
      discount_amount: headerDiscount,
      discount_reason_id: discountReasonId,
      discount_notes: formData.get('discount_notes') as string || null,
      tax_amount: taxAmount,
      total,
      discount_percent: discountPct,
      valid_until: formData.get('valid_until') as string || null,
      notes: formData.get('notes') as string || null,
    })
    .eq('id', quotationId)

  if (error) redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent(error.message)}`)

  const { data: existingItems } = await db.from('quotation_items').select('*').eq('quotation_id', quotationId)

  // Replace line items
  const { error: deleteErr } = await db.from('quotation_items').delete().eq('quotation_id', quotationId)
  if (deleteErr) {
    redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent(deleteErr.message)}`)
  }
  const verticalByPackage = await resolveVerticalByPackage(db, items)

  const missingVertical = items.find((item) => {
    const resolvedVertical = item.vertical_id || (item.service_package_id ? verticalByPackage.get(item.service_package_id) : undefined)
    return !resolvedVertical
  })

  if (missingVertical) {
    redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent('Each quotation item must include a valid service vertical.')}`)
  }

  const lineItems = items.map((item, i) => {
    const resolvedVertical = item.vertical_id || (item.service_package_id ? verticalByPackage.get(item.service_package_id) : undefined)
    return {
      quotation_id: quotationId,
      service_package_id: item.service_package_id || null,
      vertical_id: resolvedVertical,
      service_vertical: resolvedVertical,
      heading: item.heading || null,
      description: item.description,
      tier: item.tier || null,
      segment: item.segment || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.unit_price * item.quantity,
      sort_order: i,
    }
  })
  try {
    await insertQuotationItems(db, lineItems)
  } catch (err) {
    if (existingItems?.length) {
      await db.from('quotation_items').insert(existingItems)
    }
    const message = err instanceof Error ? err.message : 'Failed to update quotation items'
    redirect(`/sales/quotations/${quotationId}/edit?error=${encodeURIComponent(message)}`)
  }

  if (needsApproval && discountReasonId) {
    // Upsert approval record
    await db.from('discount_approvals').upsert({
      quotation_id: quotationId,
      requested_pct: discountPct,
      reason_id: discountReasonId,
      reason_notes: formData.get('discount_notes') as string || null,
      status: 'pending',
      requested_by: user.id,
    }, { onConflict: 'quotation_id' })
  }

  revalidatePath(`/sales/quotations/${quotationId}`)
  revalidatePath('/sales/quotations')
  redirect(`/sales/quotations/${quotationId}`)
}

export async function updateQuotationStatus(quotationId: string, status: QuotationStatus) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('quotations')
    .update({ status })
    .eq('id', quotationId)

  if (error) return { error: error.message }
  revalidatePath(`/sales/quotations/${quotationId}`)
  return { success: true }
}

export async function approveDiscount(approvalId: string, quotationId: string, approved: boolean, reviewNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  await db.from('discount_approvals').update({
    status: approved ? 'approved' : 'rejected',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes ?? null,
  }).eq('id', approvalId)

  if (approved) {
    await db.from('quotations').update({ status: 'draft' }).eq('id', quotationId)
  }

  revalidatePath(`/sales/quotations/${quotationId}`)
  revalidatePath('/owner')
  return { success: true }
}
