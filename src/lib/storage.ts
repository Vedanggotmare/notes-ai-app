import type { Note, Notebook, Category, Flowchart } from './types'
import { SEED_NOTES } from './seeds'

const NOTES_KEY = 'notes_ai_notes'
const SEEDED_KEY = 'notes_ai_seeded_v1'
const NOTEBOOKS_KEY = 'notes_ai_notebooks'
const CATEGORIES_KEY = 'notes_ai_categories'

const DEFAULT_NOTEBOOKS: Notebook[] = [
  { id: 'default', name: 'Research', color: '#D97757' },
  { id: 'work', name: 'Work', color: '#7B9ED9' },
  { id: 'personal', name: 'Personal', color: '#9B8BD4' },
]

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'mathematics',  name: 'Mathematics',  color: '#7B9ED9', icon: '∑' },
  { id: 'philosophy',   name: 'Philosophy',   color: '#9B8BD4', icon: '◈' },
  { id: 'economics',    name: 'Economics',    color: '#D9A857', icon: '◆' },
  { id: 'technology',   name: 'Technology',   color: '#57B894', icon: '⬡' },
  { id: 'science',      name: 'Science',      color: '#57A8D9', icon: '⬢' },
  { id: 'society',      name: 'Society',      color: '#D97757', icon: '◉' },
  { id: 'ideas',        name: 'Ideas',        color: '#C47DB8', icon: '✦' },
  { id: 'work',         name: 'Work',         color: '#A0B87A', icon: '▣' },
  { id: 'todo',         name: 'Todo',         color: '#E07070', icon: '▶' },
  { id: 'personal',     name: 'Personal',     color: '#D9AA78', icon: '◍' },
]

export function initSeeds(): void {
  if (localStorage.getItem(SEEDED_KEY)) return
  localStorage.setItem(NOTES_KEY, JSON.stringify(SEED_NOTES))
  localStorage.setItem(SEEDED_KEY, '1')
}

export function getNotes(): Note[] {
  try {
    const data = localStorage.getItem(NOTES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveNote(note: Note): void {
  const notes = getNotes()
  const index = notes.findIndex(n => n.id === note.id)
  if (index >= 0) {
    notes[index] = note
  } else {
    notes.unshift(note)
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

export function deleteNote(id: string): void {
  const notes = getNotes().filter(n => n.id !== id)
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

export function getNotebooks(): Notebook[] {
  try {
    const data = localStorage.getItem(NOTEBOOKS_KEY)
    if (!data) {
      localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(DEFAULT_NOTEBOOKS))
      return DEFAULT_NOTEBOOKS
    }
    return JSON.parse(data)
  } catch {
    return DEFAULT_NOTEBOOKS
  }
}

export function saveNotebook(notebook: Notebook): void {
  const notebooks = getNotebooks()
  const index = notebooks.findIndex(n => n.id === notebook.id)
  if (index >= 0) {
    notebooks[index] = notebook
  } else {
    notebooks.push(notebook)
  }
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks))
}

export function getCategories(): Category[] {
  try {
    const data = localStorage.getItem(CATEGORIES_KEY)
    if (!data) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES))
      return DEFAULT_CATEGORIES
    }
    return JSON.parse(data)
  } catch {
    return DEFAULT_CATEGORIES
  }
}

export function saveCategory(category: Category): void {
  const list = getCategories()
  const idx  = list.findIndex(c => c.id === category.id)
  if (idx >= 0) list[idx] = category
  else list.push(category)
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list))
}

export function deleteNotebook(id: string): void {
  const list = getNotebooks().filter(n => n.id !== id)
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(list))
}

export function deleteCategory(id: string): void {
  const list = getCategories().filter(c => c.id !== id)
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list))
}

// ── Flowcharts ───────────────────────────────────────────────────────────────
const FLOWCHARTS_KEY = 'notes_ai_flowcharts'

export function getFlowcharts(): Flowchart[] {
  try {
    const data = localStorage.getItem(FLOWCHARTS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveFlowchart(fc: Flowchart): void {
  const list = getFlowcharts()
  const idx = list.findIndex(f => f.id === fc.id)
  if (idx >= 0) list[idx] = fc
  else list.push(fc)
  localStorage.setItem(FLOWCHARTS_KEY, JSON.stringify(list))
}

export function deleteFlowchart(id: string): void {
  const list = getFlowcharts().filter(f => f.id !== id)
  localStorage.setItem(FLOWCHARTS_KEY, JSON.stringify(list))
}
