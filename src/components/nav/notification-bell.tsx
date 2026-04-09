'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { AppRole } from '@/types/database'

type Approval = {
  id: string
  quotation_id: string
  requested_pct: number
  reason_notes: string | null
  created_at: string
  quotations: { lead_id: string; leads: { contact_name: string } | null } | null
}

type InternalNotification = {
  id: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
  is_read: boolean
}

// Roles that receive internal (job-completion) notifications
const INTERNAL_NOTIF_ROLES: AppRole[] = ['accounts_finance', 'owner', 'branch_manager', 'front_desk']
// Roles that also see discount approval requests
const APPROVAL_ROLES: AppRole[] = ['owner', 'branch_manager']

export function NotificationBell({ role }: { role: AppRole }) {
  const supabase = createClient()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [internalNotifications, setInternalNotifications] = useState<InternalNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const showInternal = INTERNAL_NOTIF_ROLES.includes(role)
  const showApprovals = APPROVAL_ROLES.includes(role)

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

  async function fetchInternalNotifications() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setInternalNotifications([])
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('internal_notifications')
      .select('id, title, message, entity_type, entity_id, created_at, is_read')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    setInternalNotifications(data ?? [])
  }

  async function markInternalAsRead(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('internal_notifications').update({ is_read: true }).eq('id', id)
    setInternalNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = []

    if (showInternal) {
      fetchInternalNotifications()
      const ch = supabase
        .channel('internal-notifications-bell')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_notifications' }, () => fetchInternalNotifications())
        .subscribe()
      channels.push(ch)
    }

    if (showApprovals) {
      fetchApprovals()
      const ch = supabase
        .channel('discount-approvals-bell')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'discount_approvals' }, () => fetchApprovals())
        .subscribe()
      channels.push(ch)
    }

    return () => { channels.forEach((c) => supabase.removeChannel(c)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInternal, showApprovals])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = internalNotifications.length + (showApprovals ? approvals.length : 0)

  function notifLink(n: InternalNotification): string {
    if (n.entity_type === 'job_card' && n.entity_id) {
      return `/manager/jobs/${n.entity_id}/delivery`
    }
    if (role === 'accounts_finance') return '/accounts'
    return '/manager/jobs'
  }

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
        <div className="fixed right-4 top-[58px] z-[200] w-80 rounded-lg border bg-background shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 && <Badge variant="destructive" className="text-xs">{count} pending</Badge>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {/* Internal notifications (job completions, accounts alerts) */}
            {showInternal && internalNotifications.length > 0 && (
              <>
                {showApprovals && (
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-4 pt-2 pb-1">Job Alerts</p>
                )}
                {internalNotifications.map((n) => {
                  const isJobCard = n.entity_type === 'job_card' && n.entity_id
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-700">QC</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        {isJobCard && (
                          <div className="flex gap-2 mt-1.5">
                            <Link
                              href={`/manager/jobs/${n.entity_id}/delivery`}
                              onClick={() => { setOpen(false); void markInternalAsRead(n.id) }}
                              className="text-[11px] font-medium text-primary hover:underline"
                            >
                              Record Payment
                            </Link>
                            <span className="text-[11px] text-muted-foreground">·</span>
                            <Link
                              href={`/manager/jobs/${n.entity_id}`}
                              onClick={() => { setOpen(false); void markInternalAsRead(n.id) }}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Send Message
                            </Link>
                          </div>
                        )}
                        {!isJobCard && (
                          <Link
                            href={notifLink(n)}
                            onClick={() => { setOpen(false); void markInternalAsRead(n.id) }}
                            className="text-[11px] font-medium text-primary hover:underline block mt-1"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Discount approval requests (owner / manager) */}
            {showApprovals && approvals.length > 0 && (
              <>
                {showInternal && internalNotifications.length > 0 && (
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-4 pt-2 pb-1">Discount Approvals</p>
                )}
                {approvals.map((a) => {
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
                })}
              </>
            )}

            {/* Empty state */}
            {count === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">All clear — no pending alerts</p>
            )}
          </div>
          {count > 0 && (
            <div className="px-4 py-2 border-t">
              <Link
                href={role === 'accounts_finance' ? '/accounts' : showApprovals ? '/owner' : '/manager/jobs'}
                className={cn('text-xs text-primary hover:underline')}
                onClick={() => setOpen(false)}
              >
                {role === 'accounts_finance'
                  ? 'View all in Accounts Dashboard →'
                  : showApprovals
                    ? 'View all in Owner Dashboard →'
                    : 'View all jobs →'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
