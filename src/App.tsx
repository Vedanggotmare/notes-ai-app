import { useState } from 'react'
import { Sidebar }        from './components/Sidebar'
import { NoteList }       from './components/NoteList'
import { NoteEditor }     from './components/NoteEditor'
import { KnowledgeGraph } from './components/KnowledgeGraph'
import { TodoPanel }      from './components/TodoPanel'
import { PomodoroTimer }  from './components/PomodoroTimer'
import { useNotes }       from './hooks/useNotes'
import type { ViewMode }  from './lib/types'

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('notes')
  const {
    notes, filteredNotes, selectedNote, selectedNoteId, setSelectedNoteId,
    notebooks, categories,
    sidebarSelection, setSidebarSelection,
    categorizing,
    createNote, updateNote, removeNote,
    addNotebook, removeNotebook,
    addCategory, removeCategory,
    triggerCategorization,
  } = useNotes()

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#15110D' }}>
      {!apiKey && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 text-xs"
          style={{ background: '#2E1A08', color: '#C8956A', borderBottom: '1px solid #3A2818' }}
        >
          <span>✦</span>
          <span>
            <strong>VITE_ANTHROPIC_API_KEY</strong> not set — AI categorisation disabled.{' '}
            Add it to <code className="font-mono px-1 rounded" style={{ background: '#3A2818' }}>.env</code> and restart.
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          notes={notes}
          notebooks={notebooks}
          categories={categories}
          selection={sidebarSelection}
          onSelect={setSidebarSelection}
          onNewNote={() => createNote(
            sidebarSelection.type === 'notebook' ? sidebarSelection.value : 'default'
          )}
          viewMode={viewMode}
          onViewMode={setViewMode}
          onAddNotebook={addNotebook}
          onRemoveNotebook={removeNotebook}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
        />

        {viewMode === 'graph' ? (
          <KnowledgeGraph
            notes={notes}
            selectedId={selectedNoteId}
            onSelectNote={id => { setSelectedNoteId(id); setViewMode('notes') }}
          />
        ) : viewMode === 'todo' ? (
          <TodoPanel />
        ) : (
          <>
            <NoteList
              notes={filteredNotes}
              selectedId={selectedNoteId}
              categorizing={categorizing}
              onSelect={setSelectedNoteId}
              onNew={() => createNote()}
            />
            <NoteEditor
              note={selectedNote}
              notebooks={notebooks}
              categories={categories}
              categorizing={categorizing === selectedNoteId}
              onUpdate={updateNote}
              onDelete={removeNote}
              onCategorize={triggerCategorization}
              onNew={() => createNote()}
            />
          </>
        )}
      </div>

      <PomodoroTimer />
    </div>
  )
}
