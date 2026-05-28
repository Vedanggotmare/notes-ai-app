const { app, BrowserWindow, shell, session } = require('electron')
const path = require('path')
const fs = require('fs')

// Enable Web Speech API in Electron's Chromium
app.commandLine.appendSwitch('enable-speech-input')
app.commandLine.appendSwitch('enable-features', 'SpeechRecognitionAPI')

// Detect dev vs production: if dist/index.html exists we're built
const distIndex = path.join(__dirname, '../dist/index.html')
const isProd = fs.existsSync(distIndex)

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#15110D',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    title: 'Notes AI',
  })

  // ── Grant microphone + media permissions automatically ──────────────────
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'notifications']
    callback(allowed.includes(permission))
  })

  // Also handle check-permission (newer Electron API)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'notifications']
    return allowed.includes(permission)
  })

  if (isProd) {
    win.loadFile(distIndex)
  } else {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.once('ready-to-show', () => win.show())

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[Electron] Failed to load ${url} — ${code} ${desc}`)
    win.webContents.loadURL(`data:text/html,<h2 style="font-family:sans-serif;color:#D97757;background:#15110D;padding:40px">
      Could not connect to Vite dev server.<br><br>
      Run <code>Launch Notes AI.bat</code> to start properly.
    </h2>`)
    win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
