'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Approval = {
  id: string
  quotation_id: string
  requested_pct: number
  reason_notes: string | null
  created_at: string
  quotations: { lead_id: string; leads: { contact_name: string } | null } | null
}

export function NotificationBell() {
  const supabase = createClient()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function fetchApprovals() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('discount_approvals')
      .select('id, quotation_id, requested_pct, reason_notes, created_at, quotations(lead_id, leads(contact_name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    setApprovals(data ?? [])
  }

  useEffect(() => {
    fetchApprovals()

    const channel = supabase
      .channel('discount-approvals-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discount_approvals' }, () => fetchApprovals())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = approvals.length

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 p-0"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{count > 9 ? '9+' : count}</span>
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-background shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold">Pending Approvals</p>
            {count > 0 && <Badge variant="destructive" className="text-xs">{count} pending</Badge>}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All clear — no pending approvals</p>
            ) : (
              approvals.map((a) => {
                const lead = (a.quotations as { lead_id: string; leads: { contact_name: string } | null } | null)?.leads
                return (
                  <Link
                    key={a.id}
                    href="/owner"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-orange-700">{Math.round(a.requested_pct)}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lead?.contact_name ?? 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.requested_pct}% discount requested
                        {a.reason_notes ? ` · ${a.reason_notes}` : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
          {count > 0 && (
            <div className="px-4 py-2 border-t">
              <Link
                href="/owner"
                className={cn('text-xs text-primary hover:underline')}
                onClick={() => setOpen(false)}
              >
                View all in Owner Dashboard →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
