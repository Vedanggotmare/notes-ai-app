import { useState } from 'react'
import type { Note } from '../lib/types'
import { CategoryBadge } from './CategoryBadge'

interface Props {
  notes: Note[]
  selectedId: string | null
  categorizing: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function NoteList({ notes, selectedId, categorizing, onSelect, onNew }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  /* ── Collapsed strip ──────────────────────────────────────────────── */
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center h-full shrink-0"
        style={{
          width: 32,
          background: '#211C17',
          borderRight: '1px solid #3A3028',
          transition: 'width 0.22s ease',
        }}
      >
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          title="Expand notes list"
          className="flex-1 w-full flex items-center justify-center transition-colors"
          style={{ color: '#5A4A38' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#D97757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12, writingMode: 'horizontal-tb' }}>›</span>
            Notes
          </span>
        </button>
      </div>
    )
  }

  /* ── Expanded list ────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col h-full shrink-0"
      style={{ width: 280, background: '#211C17', borderRight: '1px solid #3A3028', transition: 'width 0.22s ease' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid #3A3028' }}
      >
        <div className="flex items-center gap-2">
          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse notes list"
            className="text-base leading-none transition-colors"
            style={{ color: '#5A4A38' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9A8878')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
          >
            ‹
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5A4A38' }}>
            {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
          </span>
        </div>
        <button
          onClick={onNew}
          className="transition-colors text-lg leading-none"
          style={{ color: '#5A4A38' }}
          title="New note"
          onMouseEnter={e => (e.currentTarget.style.color = '#D97757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="text-4xl mb-3 opacity-20" style={{ color: '#9A8878' }}>◈</div>
            <p className="text-sm mb-3" style={{ color: '#5A4A38' }}>No notes here yet</p>
            <button
              onClick={onNew}
              className="text-sm transition-colors"
              style={{ color: '#D97757' }}
            >
              Create your first note
            </button>
          </div>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              selected={note.id === selectedId}
              categorizing={categorizing === note.id}
              onClick={() => onSelect(note.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface NoteCardProps {
  note: Note
  selected: boolean
  categorizing: boolean
  onClick: () => void
}

function NoteCard({ note, selected, categorizing, onClick }: NoteCardProps) {
  const preview = note.content.replace(/\n/g, ' ').slice(0, 90)
  const date = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition-colors"
      style={{
        borderBottom: '1px solid #2A2218',
        background: selected ? '#2E1F10' : 'transparent',
        borderLeft: selected ? '2px solid #D97757' : '2px solid transparent',
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className="text-sm font-medium truncate leading-snug"
          style={{
            color: selected ? '#D97757' : '#C8B8A8',
            fontFamily: 'Lora, Georgia, serif',
          }}
        >
          {note.title || 'Untitled'}
        </span>
        {categorizing ? (
          <span
            className="shrink-0 w-3 h-3 rounded-full border-2 animate-spin mt-0.5"
            style={{ borderColor: '#D97757', borderTopColor: 'transparent' }}
          />
        ) : (
          <span className="text-xs shrink-0 mt-0.5" style={{ color: '#5A4A38' }}>{date}</span>
        )}
      </div>

      {/* Preview */}
      <p className="text-xs line-clamp-2 mb-2" style={{ color: '#6A5848', lineHeight: 1.5 }}>
        {preview || 'No content'}
      </p>

      {/* Category badges */}
      {note.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {note.categories.slice(0, 2).map(c => (
            <CategoryBadge key={c} name={c} />
          ))}
        </div>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs" style={{ color: '#4A3A2A' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
