import { useState, useCallback, useRef, useEffect } from 'react'
import type { Note, Notebook, Category, Highlight } from '../lib/types'
import { useDictation } from '../hooks/useDictation'
import { CategoryBadge } from './CategoryBadge'

interface Props {
  note: Note | null
  notebooks:  Notebook[]
  categories: Category[]
  categorizing: boolean
  onUpdate: (id: string, changes: Partial<Note>) => void
  onDelete: (id: string) => void
  onCategorize: (note: Note) => void
  onNew: () => void
}

// ── Font definitions ─────────────────────────────────────────────────────────
const FONTS = [
  { id: 'lora',        label: 'Lora',         family: 'Lora, Georgia, serif',                  size: 16 },
  { id: 'normal',      label: 'Normal',        family: 'Inter, sans-serif',                     size: 15 },
  { id: 'handwriting', label: 'Handwriting',   family: '"Caveat", cursive',                     size: 20 },
  { id: 'formal',      label: 'Formal',        family: '"Playfair Display", Georgia, serif',    size: 16 },
  { id: 'official',    label: 'Official',      family: '"EB Garamond", Georgia, serif',         size: 17 },
  { id: 'mono',        label: 'Mono',          family: '"JetBrains Mono", monospace',           size: 14 },
  { id: 'modern',      label: 'Modern',        family: '"Space Grotesk", sans-serif',           size: 15 },
  { id: 'elegant',     label: 'Elegant',       family: '"Cormorant Garamond", serif',           size: 18 },
]

const DEFAULT_FONT = FONTS[0]

// ── Highlight colours ────────────────────────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { id: 'yellow', color: '#FFE566', label: 'Yellow'   },
  { id: 'mint',   color: '#A8F0C6', label: 'Mint'     },
  { id: 'coral',  color: '#FFB3B3', label: 'Coral'    },
  { id: 'sky',    color: '#A8D8FF', label: 'Sky blue' },
  { id: 'lavend', color: '#DDB8FF', label: 'Lavender' },
]

// ── Highlight helpers ────────────────────────────────────────────────────────
function addOrToggleHighlight(
  highlights: Highlight[],
  start: number,
  end: number,
  color: string
): Highlight[] {
  // Remove any existing highlights in this exact range
  const cleaned = highlights.filter(h => h.end <= start || h.start >= end)
  // Check if we just removed one with the same colour (= toggle off)
  const wasHighlighted = highlights.some(
    h => h.color === color && h.start <= start && h.end >= end
  )
  if (wasHighlighted) return cleaned
  return [...cleaned, { start, end, color }].sort((a, b) => a.start - b.start)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderHighlighted(content: string, highlights: Highlight[]): string {
  if (!highlights.length) return escapeHtml(content) + '\n'
  const sorted = [...highlights].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  for (const h of sorted) {
    const start = Math.max(h.start, pos)
    const end   = Math.min(h.end, content.length)
    if (start > pos) out += escapeHtml(content.slice(pos, start))
    if (start < end) {
      out += `<mark style="background:${h.color};color:transparent;border-radius:2px;padding:0">`
      out += escapeHtml(content.slice(start, end))
      out += `</mark>`
    }
    pos = Math.max(pos, end)
  }
  if (pos < content.length) out += escapeHtml(content.slice(pos))
  return out + '\n'  // trailing newline keeps height accurate
}

// ── Component ─────────────────────────────────────────────────────────────────
export function NoteEditor({ note, notebooks, categories, categorizing, onUpdate, onDelete, onCategorize, onNew }: Props) {
  const [titleFocused,      setTitleFocused]      = useState(false)
  const [showFontPicker,    setShowFontPicker]    = useState(false)
  const [showNotebookPicker, setShowNotebookPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [hasSelection,      setHasSelection]      = useState(false)

  const contentRef   = useRef<HTMLTextAreaElement>(null)
  const overlayRef   = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentFont = FONTS.find(f => f.id === note?.font) ?? DEFAULT_FONT

  // ── Sync textarea + overlay height ────────────────────────────────────────
  const syncHeight = useCallback(() => {
    const ta = contentRef.current
    const ov = overlayRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
    if (ov) ov.style.minHeight = ta.scrollHeight + 'px'
  }, [])

  useEffect(() => { syncHeight() }, [note?.content, note?.font, syncHeight])

  // Close pickers on outside click
  useEffect(() => {
    if (!showFontPicker && !showNotebookPicker && !showCategoryPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-font-picker]'))     setShowFontPicker(false)
      if (!target.closest('[data-notebook-picker]')) setShowNotebookPicker(false)
      if (!target.closest('[data-category-picker]')) setShowCategoryPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFontPicker, showNotebookPicker, showCategoryPicker])

  // ── Content change ─────────────────────────────────────────────────────────
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!note) return
      const content = e.target.value
      onUpdate(note.id, { content })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (content.trim().length > 40) onCategorize({ ...note, content })
      }, 3000)
    },
    [note, onUpdate, onCategorize]
  )

  // ── Dictation ─────────────────────────────────────────────────────────────
  const handleDictationResult = useCallback(
    (text: string) => {
      if (!note) return
      const ta = contentRef.current
      if (ta) {
        const start   = ta.selectionStart
        const end     = ta.selectionEnd
        const updated = note.content.slice(0, start) + text + note.content.slice(end)
        onUpdate(note.id, { content: updated })
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + text.length
        })
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          if (updated.trim().length > 40) onCategorize({ ...note, content: updated })
        }, 2500)
      }
    },
    [note, onUpdate, onCategorize]
  )

  const { isListening, isSupported, start, stop, interimText } = useDictation({
    onResult: handleDictationResult,
  })

  // ── Selection tracking (for highlight buttons) ─────────────────────────────
  const checkSelection = useCallback(() => {
    const ta = contentRef.current
    setHasSelection(!!ta && ta.selectionStart !== ta.selectionEnd)
  }, [])

  // ── Apply highlight ────────────────────────────────────────────────────────
  const applyHighlight = useCallback((color: string) => {
    if (!note) return
    const ta = contentRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    if (start === end) return
    const highlights = addOrToggleHighlight(note.highlights ?? [], start, end, color)
    onUpdate(note.id, { highlights })
    // Restore focus so user can keep editing
    requestAnimationFrame(() => ta.focus())
  }, [note, onUpdate])

  const clearHighlights = useCallback(() => {
    if (!note) return
    onUpdate(note.id, { highlights: [] })
  }, [note, onUpdate])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!note) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center" style={{ background: '#FAFAF5' }}>
        <div className="text-5xl mb-4 opacity-10" style={{ color: '#3A3028' }}>✦</div>
        <p className="text-base mb-5" style={{ color: '#C8B8A0', fontFamily: 'Lora, serif' }}>
          Select a note or create one
        </p>
        <button
          onClick={onNew}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#D97757,#C24E2A)', color: '#FAFAF7', boxShadow: '0 2px 8px rgba(217,119,87,0.25)' }}
        >
          + New Note
        </button>
      </div>
    )
  }

  const updatedAt = new Date(note.updatedAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const sharedTextStyle: React.CSSProperties = {
    fontFamily:   currentFont.family,
    fontSize:     currentFont.size,
    lineHeight:   1.9,
    letterSpacing: currentFont.id === 'mono' ? '-0.01em' : 'normal',
    padding:      0,
    margin:       0,
    whiteSpace:   'pre-wrap',
    wordBreak:    'break-word',
    overflowWrap: 'break-word',
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ background: '#FAFAF5' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid #E8DED0', background: '#F5F0E8', minHeight: 44 }}
      >

        {/* Mic */}
        {isSupported && (
          <button
            onClick={isListening ? stop : start}
            title={isListening ? 'Stop dictation' : 'Start voice dictation'}
            className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0"
            style={isListening
              ? { background: '#D97757', color: '#fff', boxShadow: '0 0 0 3px rgba(217,119,87,0.25)' }
              : { background: '#EAE0D4', color: '#9A8878' }}
          >
            {isListening && <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#D97757' }} />}
            <MicIcon />
          </button>
        )}

        {/* Interim text */}
        {interimText && !interimText.includes('Loading') && !interimText.includes('transcrib') && (
          <span className="text-xs italic truncate max-w-xs" style={{ color: '#B89878', fontFamily: 'Lora, serif' }}>
            ❝ {interimText}
          </span>
        )}
        {interimText && (interimText.includes('Loading') || interimText.includes('transcrib')) && (
          <span className="text-xs" style={{ color: '#D97757' }}>{interimText}</span>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#E0D4C4', marginInline: 2 }} />

        {/* ── Notebook picker ──────────────────────────────────────────── */}
        <div style={{ position: 'relative' }} data-notebook-picker="">
          {(() => {
            const nb = notebooks.find(n => n.id === note.notebook)
            return (
              <button
                onClick={() => setShowNotebookPicker(p => !p)}
                title="Change notebook"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
                style={{
                  color: '#5A4A38',
                  background: showNotebookPicker ? '#EAE0D4' : 'transparent',
                  border: '1px solid #E0D4C4',
                }}
              >
                <span style={{ color: nb?.color ?? '#9A8878' }}>▣</span>
                <span>{nb?.name ?? 'No Notebook'}</span>
                <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
              </button>
            )
          })()}
          {showNotebookPicker && (
            <div className="absolute z-50 py-1 rounded-xl overflow-hidden"
              style={{
                top: 'calc(100% + 6px)', left: 0, minWidth: 160,
                background: '#FAFAF5', border: '1px solid #E8DED0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}>
              {notebooks.map(nb => (
                <button key={nb.id}
                  onClick={() => { onUpdate(note.id, { notebook: nb.id }); setShowNotebookPicker(false) }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{
                    color: note.notebook === nb.id ? '#D97757' : '#3A2A1A',
                    background: note.notebook === nb.id ? '#FFF5EE' : 'transparent',
                  }}
                  onMouseEnter={e => { if (note.notebook !== nb.id) e.currentTarget.style.background = '#F5EDE0' }}
                  onMouseLeave={e => { if (note.notebook !== nb.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: nb.color }}>▣</span>
                  {nb.name}
                  {note.notebook === nb.id && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#E0D4C4', marginInline: 2 }} />

        {/* ── Font picker ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative' }} data-font-picker="">
          <button
            onClick={() => setShowFontPicker(p => !p)}
            title="Change font"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
            style={{
              fontFamily: currentFont.family,
              color: '#5A4A38',
              background: showFontPicker ? '#EAE0D4' : 'transparent',
              border: '1px solid #E0D4C4',
            }}
          >
            <span style={{ fontFamily: currentFont.family }}>{currentFont.label}</span>
            <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
          </button>

          {showFontPicker && (
            <div
              className="absolute z-50 py-1 rounded-xl overflow-hidden"
              style={{
                top: 'calc(100% + 6px)',
                left: 0,
                minWidth: 170,
                background: '#FAFAF5',
                border: '1px solid #E8DED0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => { onUpdate(note.id, { font: f.id }); setShowFontPicker(false) }}
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{
                    fontFamily: f.family,
                    fontSize: 14,
                    color: note.font === f.id ? '#D97757' : '#3A2A1A',
                    background: note.font === f.id ? '#FFF5EE' : 'transparent',
                  }}
                  onMouseEnter={e => { if (note.font !== f.id) e.currentTarget.style.background = '#F5EDE0' }}
                  onMouseLeave={e => { if (note.font !== f.id) e.currentTarget.style.background = 'transparent' }}
                >
                  {f.label}
                  <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 8, fontFamily: 'Inter, sans-serif' }}>
                    {f.id === 'handwriting' ? 'Caveat' : f.id === 'formal' ? 'Playfair' : f.id === 'official' ? 'Garamond' : f.id === 'mono' ? 'JetBrains' : f.id === 'modern' ? 'Space Grotesk' : f.id === 'elegant' ? 'Cormorant' : f.id === 'normal' ? 'Inter' : 'Lora'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#E0D4C4', marginInline: 2 }} />

        {/* ── Highlight swatches ───────────────────────────────────────── */}
        <div className="flex items-center gap-1" title={hasSelection ? 'Highlight selected text' : 'Select text first'}>
          {HIGHLIGHT_COLORS.map(({ id, color, label }) => (
            <button
              key={id}
              onClick={() => applyHighlight(color)}
              title={label}
              className="rounded transition-transform"
              style={{
                width: 16,
                height: 16,
                background: color,
                border: '1.5px solid rgba(0,0,0,0.15)',
                opacity: hasSelection ? 1 : 0.35,
                cursor: hasSelection ? 'pointer' : 'default',
                transform: hasSelection ? 'scale(1)' : 'scale(0.9)',
                transition: 'opacity 0.15s, transform 0.15s',
                borderRadius: 3,
              }}
            />
          ))}
          {(note.highlights?.length ?? 0) > 0 && (
            <button
              onClick={clearHighlights}
              title="Clear all highlights"
              className="text-xs px-1 rounded transition-colors"
              style={{ color: '#9A8878', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#C05040'}
              onMouseLeave={e => e.currentTarget.style.color = '#9A8878'}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Categorizing spinner */}
        {categorizing && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#B89878' }}>
            <span className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: '#D97757', borderTopColor: 'transparent' }} />
            Categorising…
          </div>
        )}

        {/* AI Categorize */}
        <button
          onClick={() => onCategorize(note)}
          disabled={categorizing || !note.content.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: '#D97757', border: '1px solid #D9775750', background: 'transparent' }}
          onMouseEnter={e => { if (!categorizing && note.content.trim()) e.currentTarget.style.background = '#D9775514' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          ✦ AI Categorise
        </button>

        {/* Delete */}
        <button
          onClick={() => { if (confirm('Delete this note?')) onDelete(note.id) }}
          title="Delete note"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#C8B8A0' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#C05040'; e.currentTarget.style.background = '#C0504010' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#C8B8A0'; e.currentTarget.style.background = 'transparent' }}
        >
          <TrashIcon />
        </button>
      </div>

      {/* ── Editor body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-8 py-8 min-w-0">

          {/* Title */}
          <input
            type="text"
            value={note.title}
            onChange={e => onUpdate(note.id, { title: e.target.value })}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder="Note title"
            className="w-full bg-transparent border-none outline-none mb-2"
            style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: 26, fontWeight: 600, color: '#2A1F14', lineHeight: 1.3,
              borderBottom: titleFocused ? '1px solid #D97757' : '1px solid transparent',
              paddingBottom: 4,
            }}
          />

          {/* Meta */}
          <div className="flex items-center gap-3 mb-4" style={{ color: '#B89878', fontSize: 12 }}>
            <span>{updatedAt}</span>
            {note.connections.length > 0 && (
              <span>· {note.connections.length} connection{note.connections.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Categories, Tags & manual category picker */}
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            {note.categories.map(c => (
              <button key={c}
                onClick={() => onUpdate(note.id, { categories: note.categories.filter(x => x !== c) })}
                className="group flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all"
                style={{ background: '#EAE0D4', color: '#7A5A38' }}
                title="Click to remove"
              >
                <CategoryBadge name={c} />
                <span className="opacity-0 group-hover:opacity-100 text-red-400 leading-none ml-0.5">✕</span>
              </button>
            ))}
            {note.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EAE0D4', color: '#9A8878' }}>
                #{t}
              </span>
            ))}

            {/* + category picker */}
            <div style={{ position: 'relative' }} data-category-picker="">
              <button
                onClick={() => setShowCategoryPicker(p => !p)}
                className="text-xs px-2 py-0.5 rounded-full transition-all"
                style={{
                  border: '1px dashed #C8B8A0', color: '#9A8878',
                  background: showCategoryPicker ? '#EAE0D4' : 'transparent',
                }}
              >
                + category
              </button>
              {showCategoryPicker && (
                <div className="absolute z-50 py-1 rounded-xl overflow-hidden"
                  style={{
                    top: 'calc(100% + 6px)', left: 0, minWidth: 180,
                    background: '#FAFAF5', border: '1px solid #E8DED0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}>
                  {categories.length === 0 && (
                    <p className="px-4 py-2 text-xs" style={{ color: '#9A8878' }}>
                      No categories yet — add one in the sidebar.
                    </p>
                  )}
                  {categories.map(cat => {
                    const active = note.categories.includes(cat.name)
                    return (
                      <button key={cat.id}
                        onClick={() => {
                          const next = active
                            ? note.categories.filter(c => c !== cat.name)
                            : [...note.categories, cat.name]
                          onUpdate(note.id, { categories: next })
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                        style={{ color: active ? cat.color : '#3A2A1A', background: active ? '#FFF5EE' : 'transparent' }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5EDE0' }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ color: cat.color }}>{cat.icon}</span>
                        {cat.name}
                        {active && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dictation status block */}
          {interimText && (
            <div
              className="mb-4 px-4 py-2.5 rounded-lg text-sm"
              style={{ background: '#FFF8F0', border: '1px solid #F0DCC8', color: '#B89878', fontFamily: 'Lora, serif' }}
            >
              {interimText.includes('Loading') || interimText.includes('transcrib')
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 animate-spin inline-block" style={{ borderColor: '#D97757', borderTopColor: 'transparent' }} />{interimText}</span>
                : <span className="italic">❝ {interimText}</span>
              }
            </div>
          )}

          <div style={{ borderTop: '1px solid #EAE0D4', marginBottom: 24 }} />

          {/* ── Content area with highlight overlay ──────────────────── */}
          <div style={{ position: 'relative', minHeight: 400 }}>

            {/* Highlight overlay (invisible text, visible marks) */}
            <div
              ref={overlayRef}
              aria-hidden="true"
              style={{
                ...sharedTextStyle,
                position:      'absolute',
                top:           0,
                left:          0,
                right:         0,
                pointerEvents: 'none',
                color:         'transparent',
                minHeight:     400,
                zIndex:        0,
              }}
              dangerouslySetInnerHTML={{ __html: renderHighlighted(note.content, note.highlights ?? []) }}
            />

            {/* Actual textarea (transparent bg so highlights show through) */}
            <textarea
              ref={contentRef}
              value={note.content}
              onChange={handleContentChange}
              onSelect={checkSelection}
              onMouseUp={checkSelection}
              onKeyUp={checkSelection}
              onBlur={() => setTimeout(checkSelection, 100)}
              placeholder="Start writing, or click the microphone to dictate…"
              className="w-full border-none outline-none resize-none"
              style={{
                ...sharedTextStyle,
                position:   'relative',
                zIndex:     1,
                background: 'transparent',
                color:      '#3A2A1A',
                caretColor: '#D97757',
                minHeight:  400,
                display:    'block',
                width:      '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg className="w-3.5 h-3.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 16.93V20H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
