interface Props {
  isListening: boolean
  isSupported: boolean
  interimText: string
  onToggle: () => void
}

export function DictationButton({ isListening, isSupported, interimText, onToggle }: Props) {
  if (!isSupported) return null

  return (
    <div className="flex items-center gap-2">
      {interimText && (
        <span className="text-xs text-evernote-muted italic max-w-xs truncate">
          {interimText}
        </span>
      )}
      <button
        onClick={onToggle}
        title={isListening ? 'Stop dictation' : 'Start dictation'}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
            : 'bg-evernote-hover text-evernote-muted hover:text-evernote-text hover:bg-evernote-border'
        }`}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
        )}
        <svg className="w-4 h-4 relative z-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 16.93V20H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
        </svg>
      </button>
    </div>
  )
}
