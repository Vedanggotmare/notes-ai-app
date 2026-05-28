import { useState, useRef, useCallback, useEffect } from 'react'

interface UseDictationOptions {
  onResult: (text: string) => void
}

interface UseDictationReturn {
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  interimText: string
}

// ── Voice command substitutions ──────────────────────────────────────────────
const VOICE_COMMANDS: Record<string, string> = {
  'period': '.', 'full stop': '.', 'comma': ',',
  'question mark': '?', 'exclamation mark': '!', 'exclamation point': '!',
  'colon': ':', 'semicolon': ';', 'new line': '\n', 'new paragraph': '\n\n',
  'dash': ' — ', 'hyphen': '-',
  'open bracket': '(', 'close bracket': ')',
  'open quote': '"', 'close quote': '"',
}

function cleanTranscript(text: string): string {
  let t = text.trim()
  for (const [cmd, rep] of Object.entries(VOICE_COMMANDS))
    t = t.replace(new RegExp(`\\b${cmd}\\b`, 'gi'), rep)
  t = t
    .replace(/(^|\.\s+|!\s+|\?\s+)([a-z])/g, (_, b, c) => b + c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase())
  if (t && !t.endsWith('\n')) t += ' '
  return t
}

// ── Shared worker singleton ──────────────────────────────────────────────────
let _worker: Worker | null = null
function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(
      new URL('../workers/transcribe.worker.ts', import.meta.url),
      { type: 'module' }
    )
  }
  return _worker
}

// ── Audio helpers ─────────────────────────────────────────────────────────────
async function blobToFloat32At16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer()
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(buf)
  } finally {
    ctx.close()
  }
  // Resample to 16 kHz mono (Whisper requirement)
  const target = 16000
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * target), target)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useDictation({ onResult }: UseDictationOptions): UseDictationReturn {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')

  const streamRef       = useRef<MediaStream | null>(null)
  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const activeRef       = useRef(false)     // whether we should keep recording
  const onResultRef     = useRef(onResult)  // always-current callback ref

  // Keep callback ref current without re-subscribing workers
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // Pre-warm the model as soon as the hook mounts
  useEffect(() => {
    const w = getWorker()
    w.postMessage({ type: 'preload' })
    const h = (e: MessageEvent) => {
      if (e.data?.type === 'loading') setInterimText(
        e.data.progress ? `Loading model ${e.data.progress}%…` : 'Loading speech model…'
      )
      if (e.data?.type === 'ready') setInterimText('')
    }
    w.addEventListener('message', h)
    return () => w.removeEventListener('message', h)
  }, [])

  // ── Chunk recording loop ─────────────────────────────────────────────────
  const startChunk = useCallback((stream: MediaStream) => {
    if (!activeRef.current) return

    chunksRef.current = []
    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' : ''

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    recorderRef.current = mr

    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      if (blob.size > 3000 && activeRef.current) {
        try {
          const audio = await blobToFloat32At16k(blob)
          const id    = Date.now()
          const w     = getWorker()

          const handler = (e: MessageEvent) => {
            if (e.data?.id !== id) return
            w.removeEventListener('message', handler)
            if (e.data.type === 'result') {
              const t = e.data.text?.trim()
              if (t && t.length > 1) onResultRef.current(cleanTranscript(t))
            }
            if (activeRef.current) setInterimText('🎤 listening…')
          }
          w.addEventListener('message', handler)
          setInterimText('⏳ transcribing…')
          w.postMessage({ audio, id }, [audio.buffer])
        } catch (err) {
          console.warn('[Dictation] audio error', err)
        }
      }
      // Loop: start next chunk
      if (activeRef.current) startChunk(stream)
    }

    mr.start()
    // Stop this chunk after 5 s so we get rolling transcription
    setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 5000)
  }, [])

  // ── Public API ──────────────────────────────────────────────────────────
  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const start = useCallback(async () => {
    if (!isSupported || activeRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      activeRef.current = true
      setIsListening(true)
      setInterimText('🎤 listening…')
      startChunk(stream)
    } catch (err: any) {
      console.error('[Dictation] mic error:', err)
      setInterimText(err.name === 'NotAllowedError' ? '🚫 Microphone denied' : '❌ Mic error')
      setTimeout(() => setInterimText(''), 3000)
    }
  }, [isSupported, startChunk])

  const stop = useCallback(() => {
    activeRef.current = false
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsListening(false)
    setInterimText('')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    activeRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  return { isListening, isSupported, start, stop, interimText }
}
