import { useState, useEffect, useCallback } from 'react'
import type { TodoItem, Reminder } from '../lib/types'
import { getTodos, saveTodos, addTodo, getReminders, saveReminders, addReminder } from '../lib/todo-storage'

const PRIORITY_COLORS = { low: '#57B894', medium: '#D9A857', high: '#D97757' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High' }

export function TodoPanel() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  const [todosOpen, setTodosOpen] = useState(true)
  const [remindersOpen, setRemindersOpen] = useState(true)

  const [newTodo, setNewTodo] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<TodoItem['priority']>('medium')
  const [newTodoDue, setNewTodoDue] = useState('')

  const [newReminder, setNewReminder] = useState('')
  const [newReminderDate, setNewReminderDate] = useState('')

  useEffect(() => {
    setTodos(getTodos())
    setReminders(getReminders())
  }, [])

  // ── TODOS ────────────────────────────────────────────────────────────────
  const handleAddTodo = useCallback(() => {
    if (!newTodo.trim()) return
    const item = addTodo(newTodo.trim(), newTodoPriority, newTodoDue || undefined)
    setTodos(prev => [item, ...prev])
    setNewTodo('')
    setNewTodoDue('')
  }, [newTodo, newTodoPriority, newTodoDue])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      saveTodos(updated)
      return updated
    })
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => { const u = prev.filter(t => t.id !== id); saveTodos(u); return u })
  }, [])

  // ── REMINDERS ────────────────────────────────────────────────────────────
  const handleAddReminder = useCallback(() => {
    if (!newReminder.trim() || !newReminderDate) return
    const item = addReminder(newReminder.trim(), newReminderDate)
    setReminders(prev => [item, ...prev])
    setNewReminder('')
    setNewReminderDate('')
  }, [newReminder, newReminderDate])

  const toggleReminder = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, done: !r.done } : r)
      saveReminders(updated)
      return updated
    })
  }, [])

  const deleteReminder = useCallback((id: string) => {
    setReminders(prev => { const u = prev.filter(r => r.id !== id); saveReminders(u); return u })
  }, [])

  const pending = todos.filter(t => !t.done).length
  const upcoming = reminders.filter(r => !r.done && new Date(r.datetime) > new Date()).length

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#18140F' }}>
      <div className="max-w-xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <h2 style={{ fontFamily: 'Lora, serif', color: '#EAE0D4', fontSize: 22, fontWeight: 600 }}>
            Tasks & Reminders
          </h2>
          <p style={{ color: '#5A4A38', fontSize: 12, marginTop: 4 }}>
            {pending} pending · {upcoming} upcoming
          </p>
        </div>

        {/* ── TODOS ── */}
        <Section
          label="Todos"
          count={pending}
          open={todosOpen}
          onToggle={() => setTodosOpen(o => !o)}
          accent="#D97757"
        >
          {/* Add form */}
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add a task…"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                style={{
                  background: '#221C15', border: '1px solid #3A3028',
                  color: '#EAE0D4', fontFamily: 'Inter, sans-serif',
                }}
              />
              <button
                onClick={handleAddTodo}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#D97757', color: '#fff' }}
              >
                +
              </button>
            </div>
            <div className="flex gap-2 items-center">
              {(['low', 'medium', 'high'] as TodoItem['priority'][]).map(p => (
                <button
                  key={p}
                  onClick={() => setNewTodoPriority(p)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: newTodoPriority === p ? PRIORITY_COLORS[p] + '33' : 'transparent',
                    color: PRIORITY_COLORS[p],
                    border: `1px solid ${newTodoPriority === p ? PRIORITY_COLORS[p] : '#3A3028'}`,
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
              <input
                type="date"
                value={newTodoDue}
                onChange={e => setNewTodoDue(e.target.value)}
                className="ml-auto text-xs px-2 py-1 rounded-lg outline-none"
                style={{ background: '#221C15', border: '1px solid #3A3028', color: '#9A8878' }}
              />
            </div>
          </div>

          {/* List */}
          {todos.length === 0 ? (
            <p style={{ color: '#3A3028', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No tasks yet</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {todos.map(todo => (
                <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
            </div>
          )}
        </Section>

        {/* ── REMINDERS ── */}
        <Section
          label="Reminders"
          count={upcoming}
          open={remindersOpen}
          onToggle={() => setRemindersOpen(o => !o)}
          accent="#9B8BD4"
        >
          {/* Add form */}
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={newReminder}
                onChange={e => setNewReminder(e.target.value)}
                placeholder="Remind me to…"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                style={{
                  background: '#221C15', border: '1px solid #3A3028',
                  color: '#EAE0D4', fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="datetime-local"
                value={newReminderDate}
                onChange={e => setNewReminderDate(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: '#221C15', border: '1px solid #3A3028', color: '#9A8878' }}
              />
              <button
                onClick={handleAddReminder}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#9B8BD4', color: '#fff' }}
              >
                Set
              </button>
            </div>
          </div>

          {/* List */}
          {reminders.length === 0 ? (
            <p style={{ color: '#3A3028', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No reminders yet</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {reminders.map(r => (
                <ReminderRow key={r.id} reminder={r} onToggle={toggleReminder} onDelete={deleteReminder} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ label, count, open, onToggle, accent, children }: {
  label: string; count: number; open: boolean
  onToggle: () => void; accent: string; children: React.ReactNode
}) {
  return (
    <div className="mb-6" style={{ border: '1px solid #2E2418', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: '#1E1810' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: accent, fontSize: 16 }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontFamily: 'Lora, serif', color: '#EAE0D4', fontWeight: 600, fontSize: 15 }}>{label}</span>
          {count > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: accent + '22', color: accent }}
            >
              {count}
            </span>
          )}
        </div>
      </button>

      <div
        style={{
          maxHeight: open ? 2000 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          background: '#18140F',
          padding: open ? '16px' : '0 16px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── TodoRow ───────────────────────────────────────────────────────────────────
function TodoRow({ todo, onToggle, onDelete }: {
  todo: TodoItem; onToggle: (id: string) => void; onDelete: (id: string) => void
}) {
  const overdue = todo.dueDate && !todo.done && new Date(todo.dueDate) < new Date()
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg group"
      style={{ background: '#1E1810', opacity: todo.done ? 0.5 : 1 }}
    >
      <button
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
        style={{
          border: `1.5px solid ${PRIORITY_COLORS[todo.priority]}`,
          background: todo.done ? PRIORITY_COLORS[todo.priority] : 'transparent',
        }}
      >
        {todo.done && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            color: '#C8B8A8',
            textDecoration: todo.done ? 'line-through' : 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {todo.text}
        </p>
        {todo.dueDate && (
          <p className="text-xs mt-0.5" style={{ color: overdue ? '#D97757' : '#5A4A38' }}>
            {overdue ? '⚠ ' : ''}Due {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: PRIORITY_COLORS[todo.priority] + '22', color: PRIORITY_COLORS[todo.priority] }}>
          {PRIORITY_LABELS[todo.priority]}
        </span>
        <button
          onClick={() => onDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
          style={{ color: '#5A4A38' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── ReminderRow ───────────────────────────────────────────────────────────────
function ReminderRow({ reminder, onToggle, onDelete }: {
  reminder: Reminder; onToggle: (id: string) => void; onDelete: (id: string) => void
}) {
  const dt = new Date(reminder.datetime)
  const isPast = dt < new Date()
  const formatted = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg group"
      style={{ background: '#1E1810', opacity: reminder.done ? 0.5 : 1 }}
    >
      <button
        onClick={() => onToggle(reminder.id)}
        className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all"
        style={{
          border: `1.5px solid #9B8BD4`,
          background: reminder.done ? '#9B8BD4' : 'transparent',
        }}
      >
        {reminder.done && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: '#C8B8A8', textDecoration: reminder.done ? 'line-through' : 'none' }}>
          {reminder.text}
        </p>
        <p className="text-xs mt-0.5" style={{ color: isPast && !reminder.done ? '#D97757' : '#5A4A38' }}>
          {isPast && !reminder.done ? '⚠ ' : '◷ '}{formatted}
        </p>
      </div>
      <button
        onClick={() => onDelete(reminder.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
        style={{ color: '#5A4A38' }}
      >
        ×
      </button>
    </div>
  )
}
