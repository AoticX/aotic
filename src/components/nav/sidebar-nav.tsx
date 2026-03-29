'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href + '/'))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors group',
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <item.icon
              className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive ? 'text-sidebar-primary' : ''
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {isActive && (
              <ChevronRight className="h-3 w-3 text-sidebar-primary opacity-70" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
