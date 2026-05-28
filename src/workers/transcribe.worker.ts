import { pipeline, env } from '@xenova/transformers'

// Use Hugging Face CDN, cache in browser IndexedDB
env.allowLocalModels = false
env.useBrowserCache = true

let asr: any = null

async function getModel() {
  if (asr) return asr
  self.postMessage({ type: 'loading', progress: 0 })
  asr = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny.en',
    {
      progress_callback: (p: any) => {
        if (p.status === 'downloading' && p.total) {
          self.postMessage({ type: 'loading', progress: Math.round((p.loaded / p.total) * 100) })
        }
      },
    }
  )
  self.postMessage({ type: 'ready' })
  return asr
}

self.addEventListener('message', async (e: MessageEvent) => {
  // Preload message — just warm up the model
  if (e.data?.type === 'preload') {
    await getModel()
    return
  }

  const { audio, id } = e.data ?? {}
  if (!audio) return

  try {
    const model = await getModel()
    const output = await model(audio as Float32Array, {
      language: 'english',
      task: 'transcribe',
      return_timestamps: false,
    })
    self.postMessage({ type: 'result', id, text: (output as any).text ?? '' })
  } catch (err: any) {
    self.postMessage({ type: 'error', id, error: String(err?.message ?? err) })
  }
})
