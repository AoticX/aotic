'use client'

import { useState, useEffect } from 'react'
import { getPendingActionsCount } from '@/lib/actions/pending'

export function PendingBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    getPendingActionsCount()
      .then(setCount)
      .catch(() => setCount(null))
  }, [])

  if (!count) return null

  return (
    <span className="ml-auto flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#FF7000] text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}
