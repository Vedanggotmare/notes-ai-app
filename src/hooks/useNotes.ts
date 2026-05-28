import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Note, Notebook, Category, SidebarSelection } from '../lib/types'
import {
  getNotes, saveNote, deleteNote,
  getNotebooks, saveNotebook, deleteNotebook,
  getCategories, saveCategory, deleteCategory,
} from '../lib/storage'
import { categorizeNote } from '../lib/claude'

export function useNotes() {
  const [notes,      setNotes]      = useState<Note[]>([])
  const [notebooks,  setNotebooks]  = useState<Notebook[]>(() => getNotebooks())
  const [categories, setCategories] = useState<Category[]>(() => getCategories())
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [categorizing,   setCategorizing]   = useState<string | null>(null)
  const [sidebarSelection, setSidebarSelection] = useState<SidebarSelection>({ type: 'all' })

  useEffect(() => {
    const loaded = getNotes()
    setNotes(loaded)
    if (loaded.length > 0) setSelectedNoteId(loaded[0].id)
  }, [])

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null

  const filteredNotes = notes.filter(note => {
    switch (sidebarSelection.type) {
      case 'all':      return true
      case 'notebook': return note.notebook === sidebarSelection.value
      case 'category': return note.categories.includes(sidebarSelection.value ?? '')
      case 'tag':      return note.tags.includes(sidebarSelection.value ?? '')
      default:         return true
    }
  })

  // ── Notes CRUD ─────────────────────────────────────────────────────────────
  const createNote = useCallback((notebook = 'default'): Note => {
    const note: Note = {
      id: uuidv4(), title: 'Untitled Note', content: '',
      categories: [], tags: [], notebook,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connections: [],
    }
    saveNote(note)
    setNotes(prev => [note, ...prev])
    setSelectedNoteId(note.id)
    return note
  }, [])

  const updateNote = useCallback((id: string, changes: Partial<Note>) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n
      const updated = { ...n, ...changes, updatedAt: new Date().toISOString() }
      saveNote(updated)
      return updated
    }))
  }, [])

  const removeNote = useCallback((id: string) => {
    deleteNote(id)
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id)
      if (selectedNoteId === id) setSelectedNoteId(filtered[0]?.id ?? null)
      return filtered
    })
  }, [selectedNoteId])

  // ── Notebooks CRUD ─────────────────────────────────────────────────────────
  const addNotebook = useCallback((name: string, color: string) => {
    const nb: Notebook = { id: uuidv4(), name, color }
    saveNotebook(nb)
    setNotebooks(prev => [...prev, nb])
  }, [])

  const removeNotebook = useCallback((id: string) => {
    deleteNotebook(id)
    setNotebooks(prev => prev.filter(n => n.id !== id))
    // Move notes from deleted notebook to default
    setNotes(prev => prev.map(n => {
      if (n.notebook !== id) return n
      const updated = { ...n, notebook: 'default', updatedAt: new Date().toISOString() }
      saveNote(updated)
      return updated
    }))
    if (sidebarSelection.type === 'notebook' && sidebarSelection.value === id) {
      setSidebarSelection({ type: 'all' })
    }
  }, [sidebarSelection])

  // ── Categories CRUD ────────────────────────────────────────────────────────
  const addCategory = useCallback((name: string, color: string, icon: string) => {
    const cat: Category = { id: uuidv4(), name, color, icon }
    saveCategory(cat)
    setCategories(prev => [...prev, cat])
  }, [])

  const removeCategory = useCallback((id: string) => {
    const cat = categories.find(c => c.id === id)
    deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
    // Strip this category from all notes
    if (cat) {
      setNotes(prev => prev.map(n => {
        if (!n.categories.includes(cat.name)) return n
        const updated = { ...n, categories: n.categories.filter(c => c !== cat.name), updatedAt: new Date().toISOString() }
        saveNote(updated)
        return updated
      }))
    }
    if (sidebarSelection.type === 'category' && sidebarSelection.value === cat?.name) {
      setSidebarSelection({ type: 'all' })
    }
  }, [categories, sidebarSelection])

  // ── AI categorisation ──────────────────────────────────────────────────────
  const triggerCategorization = useCallback(async (note: Note) => {
    if (!note.content.trim()) return
    setCategorizing(note.id)
    try {
      const otherNotes = notes.filter(n => n.id !== note.id)
      const result = await categorizeNote(
        note.content,
        otherNotes.map(n => n.id),
        otherNotes.map(n => n.title),
        categories.map(c => c.name),
      )
      updateNote(note.id, {
        categories: result.categories,
        tags: result.tags,
        title: result.suggestedTitle || note.title,
        connections: result.connections,
      })
    } catch (err) {
      console.error('Categorization failed:', err)
    } finally {
      setCategorizing(null)
    }
  }, [notes, categories, updateNote])

  return {
    notes, filteredNotes, selectedNote, selectedNoteId, setSelectedNoteId,
    notebooks, categories,
    sidebarSelection, setSidebarSelection,
    categorizing,
    createNote, updateNote, removeNote,
    addNotebook, removeNotebook,
    addCategory, removeCategory,
    triggerCategorization,
  }
}
