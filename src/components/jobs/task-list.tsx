'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle2, Circle, Loader } from 'lucide-react'
import { createJobTask, updateJobTaskStatus } from '@/lib/actions/job-tasks'

type Task = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  assigned_to: string | null
  order_index: number
  profiles: { full_name: string } | null
}

const STATUS_VARIANT: Record<string, string> = {
  pending: 'secondary', in_progress: 'warning', completed: 'success',
}

export function TaskList({
  jobCardId,
  tasks,
  canCreate = true,
}: {
  jobCardId: string
  tasks: Task[]
  canCreate?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  function addTask() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      await createJobTask(jobCardId, newTitle.trim())
      setNewTitle('')
      setAdding(false)
      router.refresh()
    })
  }

  function nextStatus(current: string): 'pending' | 'in_progress' | 'completed' {
    if (current === 'pending') return 'in_progress'
    if (current === 'in_progress') return 'completed'
    return 'completed'
  }

  function advanceTask(taskId: string, currentStatus: string) {
    if (currentStatus === 'completed') return
    const next = nextStatus(currentStatus)
    startTransition(async () => {
      await updateJobTaskStatus(taskId, next, jobCardId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No tasks yet.</p>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-1.5">
            <button
              onClick={() => advanceTask(task.id, task.status)}
              disabled={isPending || task.status === 'completed'}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {task.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : task.status === 'in_progress' ? (
                <Loader className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <span className={`flex-1 text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {task.profiles && (
                <span className="text-xs text-muted-foreground">{task.profiles.full_name}</span>
              )}
              <Badge
                variant={(STATUS_VARIANT[task.status] ?? 'secondary') as 'secondary' | 'warning' | 'success'}
                className="text-[10px] capitalize"
              >
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {canCreate && (
        adding ? (
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task description..."
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
              autoFocus
            />
            <Button size="sm" disabled={isPending || !newTitle.trim()} onClick={addTask}>
              {isPending ? '...' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle('') }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Task
          </Button>
        )
      )}
    </div>
  )
}
