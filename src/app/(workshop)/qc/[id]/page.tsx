import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QcChecklistForm } from '@/components/qc/qc-checklist-form'
import { getQcTemplates, getJobVertical } from '@/lib/actions/qc'
import { ChevronLeft } from 'lucide-react'

export default async function QcJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('job_cards')
    .select('id, reg_number, status, bay_number, customer_concerns, customers(full_name), qc_records(id, overall_result, rework_required, signed_off_at)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const j = data as {
    id: string; reg_number: string; status: string; bay_number: string | null
    customer_concerns: string | null
    customers: { full_name: string } | null
    qc_records: { id: string; overall_result: string | null; rework_required: boolean; signed_off_at: string | null }[]
  }

  const cust = j.customers as { full_name: string } | null
  const existingQc = j.qc_records?.[0] ?? null
  const alreadySigned = !!existingQc?.signed_off_at

  const verticalId = await getJobVertical(id)
  const templates = verticalId ? await getQcTemplates(verticalId) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/qc" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{j.reg_number}</h1>
          <p className="text-sm text-muted-foreground">{cust?.full_name}</p>
        </div>
        <Badge variant="warning" className="text-xs flex-shrink-0">
          {j.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {j.bay_number && (
        <p className="text-sm text-muted-foreground">Bay {j.bay_number}</p>
      )}

      {j.customer_concerns && (
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Customer Concerns</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{j.customer_concerns}</p></CardContent>
        </Card>
      )}

      {alreadySigned ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-green-600 font-medium">QC already signed off</p>
            <p className="text-xs text-muted-foreground mt-1">
              {existingQc.signed_off_at ? new Date(existingQc.signed_off_at).toLocaleString('en-IN') : ''}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>QC Checklist</span>
              {templates.length === 0 && (
                <span className="text-xs font-normal text-muted-foreground">No templates — add items manually</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QcChecklistForm
              jobCardId={id}
              verticalId={verticalId}
              templates={templates}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
