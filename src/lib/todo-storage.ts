import { v4 as uuidv4 } from 'uuid'
import type { TodoItem, Reminder } from './types'

const TODOS_KEY = 'notes_ai_todos'
const REMINDERS_KEY = 'notes_ai_reminders'

export function getTodos(): TodoItem[] {
  try { return JSON.parse(localStorage.getItem(TODOS_KEY) ?? '[]') } catch { return [] }
}
export function saveTodos(todos: TodoItem[]): void {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
}
export function addTodo(text: string, priority: TodoItem['priority'] = 'medium', dueDate?: string): TodoItem {
  const item: TodoItem = { id: uuidv4(), text, done: false, priority, dueDate, createdAt: new Date().toISOString() }
  saveTodos([item, ...getTodos()])
  return item
}

export function getReminders(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? '[]') } catch { return [] }
}
export function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
}
export function addReminder(text: string, datetime: string): Reminder {
  const item: Reminder = { id: uuidv4(), text, datetime, done: false, createdAt: new Date().toISOString() }
  saveReminders([item, ...getReminders()])
  return item
}
