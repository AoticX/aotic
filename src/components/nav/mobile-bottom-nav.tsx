'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, Camera, Clock, CheckSquare, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'

type MobileNavProps = {
  isTechnician: boolean
}

export function MobileBottomNav({ isTechnician }: MobileNavProps) {
  const pathname = usePathname()

  const techItems = [
    { href: '/technician', label: 'My Jobs', icon: ClipboardList },
    { href: '/technician/upload', label: 'Photos', icon: Camera },
    { href: '/technician/timer', label: 'Timer', icon: Clock },
  ]

  const qcItems = [
    { href: '/qc', label: 'QC Queue', icon: CheckSquare },
    { href: '/qc/checklist', label: 'Checklist', icon: ClipboardList },
  ]

  const items = isTechnician ? techItems : qcItems

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-sidebar-background border-t border-sidebar-border z-40">
      <div className="max-w-lg mx-auto flex items-center">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground active:bg-sidebar-accent'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-sidebar-primary rounded-t-full" />
              )}
            </Link>
          )
        })}
        <form action={signOut} className="flex-1">
          <button
            type="submit"
            className="w-full flex flex-col items-center justify-center py-3 gap-1 text-sidebar-foreground/50 hover:text-destructive active:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs font-medium">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
