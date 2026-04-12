'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitFeedback } from '@/lib/actions/feedback'
import { MessageSquare, Bug, Lightbulb, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_LOG_ENTRIES = 25

type Props = {
  /** Extra bottom offset to clear fixed bottom bars (e.g. mobile nav). Defaults to 6 (1.5 rem). */
  bottomOffset?: string
}

export function FeedbackButton({ bottomOffset = 'bottom-6' }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'issue' | 'suggestion'>('issue')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [pageInfo, setPageInfo] = useState({ title: '', path: '' })
  const [isPending, startTransition] = useTransition()
  const [logCount, setLogCount] = useState(0)
  const logsRef = useRef<string[]>([])

  // Capture console.error and console.warn once on mount
  useEffect(() => {
    const orig = { error: console.error, warn: console.warn }

    const capture = (level: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (...args: any[]) => {
        const msg = `[${level}] ${args
          .map((a) => {
            try {
              return typeof a === 'object' ? JSON.stringify(a) : String(a)
            } catch {
              return String(a)
            }
          })
          .join(' ')}`
        logsRef.current = [...logsRef.current.slice(-(MAX_LOG_ENTRIES - 1)), msg]
        setLogCount(logsRef.current.length)
      }

    console.error = (...args) => {
      capture('ERROR')(...args)
      orig.error(...args)
    }
    console.warn = (...args) => {
      capture('WARN')(...args)
      orig.warn(...args)
    }

    return () => {
      console.error = orig.error
      console.warn = orig.warn
    }
  }, [])

  // Populate metadata when dialog opens
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setPageInfo({ title: document.title, path: window.location.href })
      setUserEmail(data.user?.email ?? '')
    })
  }, [open])

  function handleOpen() {
    setOpen(true)
    setSubmitted(false)
    setFormError('')
    setDescription('')
    setType('issue')
  }

  function handleSubmit() {
    if (!description.trim()) {
      setFormError('Please describe the issue or suggestion.')
      return
    }
    setFormError('')
    startTransition(async () => {
      const result = await submitFeedback({
        type,
        userEmail,
        pageTitle: pageInfo.title,
        url: pageInfo.path,
        description: description.trim(),
        consoleLogs: logsRef.current.join('\n') || '(none)',
      })
      if (result.error) {
        setFormError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed right-4 z-50 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground',
          'shadow-lg px-3 py-2 text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all',
          bottomOffset,
        )}
        aria-label="Send feedback"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Send Feedback</DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-green-600 font-semibold">Submitted — thank you!</p>
              <p className="text-sm text-muted-foreground">We&apos;ll look into it.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('issue')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm border transition-colors',
                    type === 'issue'
                      ? 'bg-destructive/10 border-destructive text-destructive font-medium'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => setType('suggestion')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm border transition-colors',
                    type === 'suggestion'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Suggestion
                </button>
              </div>

              {/* Auto-captured context */}
              <div className="rounded-md bg-muted/50 px-3 py-2 space-y-0.5 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Page:</span>{' '}
                  {pageInfo.title || '…'}
                </p>
                <p className="truncate">
                  <span className="font-medium text-foreground">URL:</span>{' '}
                  {pageInfo.path
                    ? new URL(pageInfo.path).pathname
                    : '…'}
                </p>
                {userEmail && (
                  <p>
                    <span className="font-medium text-foreground">User:</span> {userEmail}
                  </p>
                )}
                <p>
                  <span className="font-medium text-foreground">Console logs:</span>{' '}
                  {logCount} captured
                </p>
              </div>

              {/* Description */}
              <Textarea
                placeholder={
                  type === 'issue'
                    ? 'Describe what went wrong and how to reproduce it…'
                    : 'What improvement or feature would help you most?'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[90px] text-sm resize-none"
                autoFocus
              />

              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full"
                size="sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Submitting…
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
