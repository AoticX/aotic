'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Zone = 'front' | 'rear' | 'left' | 'right' | 'roof' | 'interior'
type Condition = 'ok' | 'scratch' | 'dent' | 'both'

const ZONES: { key: Zone; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'rear', label: 'Rear' },
  { key: 'left', label: 'Left Side' },
  { key: 'right', label: 'Right Side' },
  { key: 'roof', label: 'Roof' },
  { key: 'interior', label: 'Interior' },
]

const CONDITIONS: { value: Condition; label: string; color: string }[] = [
  { value: 'ok', label: 'OK', color: 'bg-green-100 border-green-400 text-green-800' },
  { value: 'scratch', label: 'Scratch', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  { value: 'dent', label: 'Dent', color: 'bg-orange-100 border-orange-400 text-orange-800' },
  { value: 'both', label: 'Scratch+Dent', color: 'bg-red-100 border-red-400 text-red-800' },
]

type ZoneData = { condition: Condition; notes: string }
type ConditionMap = Record<Zone, ZoneData>

const DEFAULT_MAP: ConditionMap = {
  front: { condition: 'ok', notes: '' },
  rear: { condition: 'ok', notes: '' },
  left: { condition: 'ok', notes: '' },
  right: { condition: 'ok', notes: '' },
  roof: { condition: 'ok', notes: '' },
  interior: { condition: 'ok', notes: '' },
}

type Props = {
  onChange: (map: ConditionMap) => void
}

export function BodyConditionMap({ onChange }: Props) {
  const [map, setMap] = useState<ConditionMap>(DEFAULT_MAP)
  const [expanded, setExpanded] = useState<Zone | null>(null)

  function update(zone: Zone, patch: Partial<ZoneData>) {
    const next = { ...map, [zone]: { ...map[zone], ...patch } }
    setMap(next)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ZONES.map(({ key, label }) => {
          const { condition } = map[key]
          const condConfig = CONDITIONS.find((c) => c.value === condition)!
          return (
            <div key={key} className="space-y-1">
              <button
                type="button"
                onClick={() => setExpanded(expanded === key ? null : key)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md border text-xs font-medium transition-colors',
                  condConfig.color,
                  expanded === key && 'ring-2 ring-ring'
                )}
              >
                {label}
                <span className="block text-[10px] font-normal opacity-70">{condConfig.label}</span>
              </button>
              {expanded === key && (
                <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                  <div className="flex gap-1 flex-wrap">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => update(key, { condition: c.value })}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium border transition-all',
                          c.color,
                          map[key].condition === c.value && 'ring-2 ring-ring scale-105'
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {map[key].condition !== 'ok' && (
                    <Textarea
                      placeholder="Notes on damage..."
                      rows={2}
                      className="text-xs"
                      value={map[key].notes}
                      onChange={(e) => update(key, { notes: e.target.value })}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tap each zone to record condition. Customer acknowledges this map with their signature.
      </p>
    </div>
  )
}
