'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Send, CheckCircle2 } from 'lucide-react'
import { sendWhatsAppMessage } from '@/lib/actions/whatsapp'

type Template = {
  id: string; name: string; category: string; label: string; body: string; variables: string[]
}

export function WhatsAppCompose({
  phone,
  leadId,
  contactName,
  templates,
}: {
  phone: string
  leadId?: string
  contactName?: string
  templates: Template[]
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    let body = tpl.body
    if (contactName) body = body.replace(/\{name\}/gi, contactName).replace(/\{\{name\}\}/gi, contactName)
    setMessage(body)
    setSelectedTemplate(templateId)
  }

  function handleSend() {
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('to', phone)
      fd.set('message', message)
      if (leadId) fd.set('lead_id', leadId)
      const result = await sendWhatsAppMessage(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          setSent(false)
          setMessage('')
          setSelectedTemplate('')
        }, 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            Send WhatsApp — {phone}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-green-700">
            <CheckCircle2 className="h-10 w-10" />
            <p className="font-medium">Message sent!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Use a template</Label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Choose template (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Type your message..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/1600</p>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700"
                onClick={handleSend}
                disabled={!message.trim() || isPending}
              >
                <Send className="h-3.5 w-3.5" />
                {isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function WhatsAppQuickSend({ templates }: { templates: Template[] }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    let body = tpl.body
    if (name) body = body.replace(/\{name\}/gi, name).replace(/\{\{name\}\}/gi, name)
    setMessage(body)
    setSelectedTemplate(templateId)
  }

  function handleSend() {
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('to', phone)
      fd.set('message', message)
      const result = await sendWhatsAppMessage(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
        setTimeout(() => {
          setSent(false)
          setPhone('')
          setName('')
          setMessage('')
          setSelectedTemplate('')
        }, 2000)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-green-700">
        <CheckCircle2 className="h-12 w-12" />
        <p className="font-semibold text-lg">Message sent!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Phone Number <span className="text-destructive">*</span></Label>
          <Input
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Customer Name (for templates)</Label>
          <Input
            placeholder="Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Template</Label>
          <Select value={selectedTemplate} onValueChange={applyTemplate}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Message <span className="text-destructive">*</span></Label>
        <Textarea
          placeholder="Type your message..."
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{message.length}/1600</p>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          {error}
        </p>
      )}

      <Button
        className="w-full gap-2 bg-green-600 hover:bg-green-700"
        onClick={handleSend}
        disabled={!phone.trim() || !message.trim() || isPending}
      >
        <Send className="h-4 w-4" />
        {isPending ? 'Sending...' : 'Send WhatsApp Message'}
      </Button>
    </div>
  )
}
