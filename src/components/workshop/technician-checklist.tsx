'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, CheckCircle2, Circle, Loader2, SendHorizonal, Trash2 } from 'lucide-react'
import { createJobTask, updateJobTaskStatus, postTechnicianUpdate } from '@/lib/actions/job-tasks'

type Task = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'done'
}

export function TechnicianChecklist({
  jobCardId,
  initialTasks,
}: {
  jobCardId: string
  initialTasks: Task[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [updateSent, setUpdateSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const doneCount = tasks.filter((t) => t.status === 'done').length

  function toggleTask(task: Task) {
    if (isPending) return
    const next: 'pending' | 'in_progress' | 'done' =
      task.status === 'done' ? 'pending' : task.status === 'in_progress' ? 'done' : 'in_progress'
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t))
    startTransition(async () => {
      await updateJobTaskStatus(task.id, next, jobCardId)
    })
  }

  function addTask() {
    if (!newTitle.trim()) return
    const title = newTitle.trim()
    startTransition(async () => {
      const result = await createJobTask(jobCardId, title)
      if (!result.error) {
        setNewTitle('')
        setAdding(false)
        // Optimistic: add with a temp ID — server revalidation will refresh real data
        setTasks((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, title, status: 'pending' },
        ])
      }
    })
  }

  function handlePostUpdate() {
    startTransition(async () => {
      const result = await postTechnicianUpdate(jobCardId)
      if (!result.error) {
        setUpdateSent(true)
        setTimeout(() => setUpdateSent(false), 4000)
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Task list */}
      <div className="space-y-2">
        {tasks.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground italic">Add checklist items to track your work.</p>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-1">
            <button
              onClick={() => toggleTask(task)}
              disabled={isPending}
              className="flex-shrink-0 text-muted-foreground disabled:opacity-40"
              aria-label={`Mark ${task.title} as ${task.status === 'done' ? 'pending' : 'done'}`}
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : task.status === 'in_progress' ? (
                <Loader2 className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </span>
          </div>
        ))}
      </div>

      {/* Add item */}
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done..."
            className="h-9 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            autoFocus
          />
          <Button size="sm" disabled={isPending || !newTitle.trim()} onClick={addTask}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle('') }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add item
        </Button>
      )}

      {/* Progress + Post Update */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-xs text-muted-foreground">
          {tasks.length > 0 ? `${doneCount} of ${tasks.length} done` : 'No items'}
        </span>
        <Button
          size="sm"
          disabled={isPending || tasks.length === 0}
          onClick={handlePostUpdate}
          variant={updateSent ? 'secondary' : 'default'}
        >
          {updateSent ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              Sent!
            </>
          ) : (
            <>
              <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />
              Post Update
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
