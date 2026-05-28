import { useState, useRef, useEffect } from 'react'
import type { Note, Notebook, Category, SidebarSelection, ViewMode } from '../lib/types'

interface Props {
  notes:      Note[]
  notebooks:  Notebook[]
  categories: Category[]
  selection:  SidebarSelection
  onSelect:   (s: SidebarSelection) => void
  onNewNote:  () => void
  viewMode:   ViewMode
  onViewMode: (m: ViewMode) => void
  onAddNotebook:    (name: string, color: string) => void
  onRemoveNotebook: (id: string) => void
  onAddCategory:    (name: string, color: string, icon: string) => void
  onRemoveCategory: (id: string) => void
}

const VIEW_TABS: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'notes', icon: '≡', label: 'Notes' },
  { mode: 'graph', icon: '✦', label: 'Graph' },
  { mode: 'todo',  icon: '◉', label: 'Tasks' },
]

const PRESET_COLORS = [
  '#D97757','#7B9ED9','#9B8BD4','#57B894',
  '#D9A857','#C47DB8','#A0B87A','#E07070',
]

const PRESET_ICONS = ['◈','▣','◆','⬡','⬢','◉','✦','▶','◍','★','♦','●']

// ── tiny inline "add" form ────────────────────────────────────────────────────
function AddForm({
  placeholder, showIcon, onSubmit, onCancel,
}: {
  placeholder: string
  showIcon: boolean
  onSubmit: (name: string, color: string, icon: string) => void
  onCancel: () => void
}) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon,  setIcon]  = useState(PRESET_ICONS[0])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit() {
    if (name.trim()) onSubmit(name.trim(), color, icon)
  }

  return (
    <div className="mx-3 mb-2 p-2 rounded-lg" style={{ background: '#251E17', border: '1px solid #3A3028' }}>
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs outline-none border-none"
        style={{ color: '#EAE0D4', '::placeholder': { color: '#5A4A38' } } as React.CSSProperties}
      />

      {/* Colour swatches */}
      <div className="flex flex-wrap gap-1 mt-2">
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className="w-4 h-4 rounded-full transition-transform"
            style={{
              background: c,
              outline: color === c ? `2px solid #FAFAF5` : 'none',
              outlineOffset: 1,
              transform: color === c ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Icon picker (categories only) */}
      {showIcon && (
        <div className="flex flex-wrap gap-1 mt-2">
          {PRESET_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
              className="w-5 h-5 flex items-center justify-center rounded text-xs transition-all"
              style={{
                color: icon === ic ? color : '#5A4A38',
                background: icon === ic ? '#3D2A17' : 'transparent',
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 mt-2">
        <button onClick={submit}
          className="px-2.5 py-1 rounded text-xs font-medium"
          style={{ background: color, color: '#FAFAF5' }}
        >
          Add
        </button>
        <button onClick={onCancel}
          className="px-2 py-1 rounded text-xs"
          style={{ color: '#9A8878' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── collapsible section with optional "+" button ──────────────────────────────
function NavSection({
  label, children, onAdd,
}: {
  label: string; children: React.ReactNode; onAdd?: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mt-3">
      <div className="flex items-center px-4 pb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 flex-1 text-xs font-semibold uppercase tracking-widest transition-colors"
          style={{ color: '#5A4A38', letterSpacing: '0.1em' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9A8878')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
        >
          <span style={{ fontSize: 8 }}>{open ? '▾' : '▸'}</span>
          {label}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-5 h-5 flex items-center justify-center rounded text-base leading-none transition-colors"
            style={{ color: '#5A4A38' }}
            title={`Add ${label.toLowerCase().slice(0, -1)}`}
            onMouseEnter={e => (e.currentTarget.style.color = '#D97757')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
          >
            +
          </button>
        )}
      </div>
      <div style={{ maxHeight: open ? 800 : 0, overflow: 'hidden', transition: 'max-height 0.22s ease' }}>
        {children}
      </div>
    </div>
  )
}

// ── single nav item with optional delete button ───────────────────────────────
interface NavItemProps {
  icon: string; label: string; count: number
  active: boolean; onClick: () => void
  accent?: string; onDelete?: () => void
}
function NavItem({ icon, label, count, active, onClick, accent, onDelete }: NavItemProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors"
        style={
          active
            ? { background: '#3D2A17', color: '#D97757', borderRight: '2px solid #D97757' }
            : { color: '#9A8878', background: 'transparent', borderRight: '2px solid transparent' }
        }
      >
        <span className="text-base w-5 text-center shrink-0 leading-none"
          style={{ color: active ? '#D97757' : (accent ?? '#9A8878') }}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate" style={{ fontWeight: active ? 500 : 400 }}>
          {label}
        </span>
        {!hovered && count > 0 && (
          <span className="text-xs shrink-0 tabular-nums"
            style={{ color: active ? '#D97757' : '#5A4A38' }}>
            {count}
          </span>
        )}
      </button>
      {hovered && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded text-xs transition-colors"
          style={{ color: '#5A4A38' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E07070')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
          title="Delete"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ── main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar({
  notes, notebooks, categories,
  selection, onSelect, onNewNote,
  viewMode, onViewMode,
  onAddNotebook, onRemoveNotebook,
  onAddCategory, onRemoveCategory,
}: Props) {
  const [collapsed,        setCollapsed]        = useState(false)
  const [addingNotebook,   setAddingNotebook]   = useState(false)
  const [addingCategory,   setAddingCategory]   = useState(false)

  const allCount = notes.length
  const notebookCounts = Object.fromEntries(
    notebooks.map(nb => [nb.id, notes.filter(n => n.notebook === nb.id).length])
  )
  const categoryCounts = Object.fromEntries(
    categories.map(cat => [cat.name, notes.filter(n => n.categories.includes(cat.name)).length])
  )
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags))).sort()

  function isActive(s: SidebarSelection) {
    return s.type === selection.type && s.value === selection.value
  }

  /* ── Collapsed icon-strip ─────────────────────────────────────────────── */
  if (collapsed) {
    return (
      <aside className="flex flex-col items-center h-full shrink-0"
        style={{ width: 48, background: '#1C1814', borderRight: '1px solid #3A3028' }}>
        <div className="flex items-center justify-center py-4"
          style={{ borderBottom: '1px solid #3A3028', width: '100%' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg,#D97757 0%,#C24E2A 100%)', color: '#FAFAF7' }}>
            ✦
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 py-2 w-full"
          style={{ borderBottom: '1px solid #3A3028' }}>
          {VIEW_TABS.map(({ mode, icon }) => (
            <button key={mode} onClick={() => onViewMode(mode)} title={mode}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all"
              style={viewMode === mode
                ? { background: '#D97757', color: '#FAFAF7' }
                : { color: '#9A8878' }}>
              {icon}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-1 pb-3">
          <button onClick={onNewNote} title="New note"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757', border: '1px solid #D97757' }}>
            +
          </button>
          <button onClick={() => setCollapsed(false)} title="Expand"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
            style={{ color: '#5A4A38', border: '1px solid #3A3028' }}>
            ›
          </button>
        </div>
      </aside>
    )
  }

  /* ── Expanded sidebar ────────────────────────────────────────────────────── */
  return (
    <aside className="flex flex-col h-full select-none shrink-0"
      style={{ width: 220, background: '#1C1814', borderRight: '1px solid #3A3028' }}>

      {/* Brand + collapse */}
      <div className="flex items-center gap-2 px-3 py-4"
        style={{ borderBottom: '1px solid #3A3028' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
          style={{ background: 'linear-gradient(135deg,#D97757 0%,#C24E2A 100%)', color: '#FAFAF7' }}>
          ✦
        </div>
        <span className="flex-1 text-sm font-semibold tracking-wide"
          style={{ fontFamily: 'Lora, Georgia, serif', color: '#EAE0D4', letterSpacing: '0.04em' }}>
          Notes AI
        </span>
        <button onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition-colors"
          style={{ color: '#5A4A38' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9A8878')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}>
          ‹
        </button>
      </div>

      {/* View tabs */}
      <div className="flex p-2 gap-1" style={{ borderBottom: '1px solid #3A3028' }}>
        {VIEW_TABS.map(({ mode, label }) => (
          <button key={mode} onClick={() => onViewMode(mode)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
            style={viewMode === mode
              ? { background: '#D97757', color: '#FAFAF7', boxShadow: '0 1px 6px rgba(217,119,87,0.35)' }
              : { color: '#9A8878' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* All notes */}
        <NavItem icon="◈" label="All Notes" count={allCount}
          active={isActive({ type: 'all' })}
          onClick={() => onSelect({ type: 'all' })} />

        {/* ── Notebooks ──────────────────────────────────────────────────── */}
        <NavSection label="Notebooks" onAdd={() => { setAddingNotebook(true); setAddingCategory(false) }}>
          {notebooks.map(nb => (
            <NavItem key={nb.id} icon="▣" label={nb.name}
              count={notebookCounts[nb.id] ?? 0}
              active={isActive({ type: 'notebook', value: nb.id })}
              onClick={() => onSelect({ type: 'notebook', value: nb.id })}
              accent={nb.color}
              onDelete={() => {
                if (confirm(`Delete notebook "${nb.name}"? Notes will move to default.`))
                  onRemoveNotebook(nb.id)
              }}
            />
          ))}
          {addingNotebook && (
            <AddForm
              placeholder="Notebook name…"
              showIcon={false}
              onSubmit={(name, color) => { onAddNotebook(name, color); setAddingNotebook(false) }}
              onCancel={() => setAddingNotebook(false)}
            />
          )}
        </NavSection>

        {/* ── Categories ─────────────────────────────────────────────────── */}
        <NavSection label="Categories" onAdd={() => { setAddingCategory(true); setAddingNotebook(false) }}>
          {categories.map(cat => (
            <NavItem key={cat.id} icon={cat.icon} label={cat.name}
              count={categoryCounts[cat.name] ?? 0}
              active={isActive({ type: 'category', value: cat.name })}
              onClick={() => onSelect({ type: 'category', value: cat.name })}
              accent={cat.color}
              onDelete={() => {
                if (confirm(`Delete category "${cat.name}"?`))
                  onRemoveCategory(cat.id)
              }}
            />
          ))}
          {addingCategory && (
            <AddForm
              placeholder="Category name…"
              showIcon
              onSubmit={(name, color, icon) => { onAddCategory(name, color, icon); setAddingCategory(false) }}
              onCancel={() => setAddingCategory(false)}
            />
          )}
        </NavSection>

        {/* ── Tags ───────────────────────────────────────────────────────── */}
        {allTags.length > 0 && (
          <NavSection label="Tags">
            {allTags.slice(0, 20).map(tag => (
              <NavItem key={tag} icon="#" label={tag}
                count={notes.filter(n => n.tags.includes(tag)).length}
                active={isActive({ type: 'tag', value: tag })}
                onClick={() => onSelect({ type: 'tag', value: tag })} />
            ))}
          </NavSection>
        )}
      </div>

      {/* New note button */}
      <div className="p-3" style={{ borderTop: '1px solid #3A3028' }}>
        <button onClick={onNewNote}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg,#D97757,#C24E2A)',
            color: '#FAFAF7',
            boxShadow: '0 2px 8px rgba(217,119,87,0.25)',
          }}>
          <span className="text-base leading-none">+</span>
          New Note
        </button>
      </div>
    </aside>
  )
}
