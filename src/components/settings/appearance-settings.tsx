'use client'

import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppearanceSettings() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('aotic-theme') === 'dark' ? 'dark' : 'light'
  )

  function applyTheme(t: 'light' | 'dark') {
    setTheme(t)
    localStorage.setItem('aotic-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Choose your preferred color scheme. Saved locally on this device.</p>
      <div className="flex gap-3">
        <button
          onClick={() => applyTheme('light')}
          className={cn(
            'flex-1 flex flex-col items-center gap-2 rounded-lg border-2 py-4 transition-colors cursor-pointer',
            theme === 'light'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/40'
          )}
        >
          <Sun className="h-5 w-5" />
          <span className="text-xs font-medium">Light</span>
        </button>
        <button
          onClick={() => applyTheme('dark')}
          className={cn(
            'flex-1 flex flex-col items-center gap-2 rounded-lg border-2 py-4 transition-colors cursor-pointer',
            theme === 'dark'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/40'
          )}
        >
          <Moon className="h-5 w-5" />
          <span className="text-xs font-medium">Dark</span>
        </button>
      </div>
    </div>
  )
}
