/**
 * Generates build/icon.png (512×512) and build/icon.ico using Electron's
 * Chromium renderer so the SVG icon looks pixel-perfect.
 *
 * Run with:  node_modules\electron\dist\electron.exe scripts/generate-icon.cjs
 */

const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs   = require('fs')
const zlib = require('zlib')

app.disableHardwareAcceleration()

/* ── SVG design ──────────────────────────────────────────────────────────── */
const SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#2A1E15"/>
      <stop offset="100%" stop-color="#0F0A07"/>
    </linearGradient>
    <linearGradient id="paper" x1="110" y1="82" x2="400" y2="430" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#F5EDD8"/>
      <stop offset="100%" stop-color="#E8D9C0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <filter id="glow" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowsm" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- ── Background ─────────────────────────────────────────────────────── -->
  <rect width="512" height="512" rx="102" fill="url(#bg)"/>

  <!-- ── Paper (with drop-shadow) ───────────────────────────────────────── -->
  <g filter="url(#shadow)">
    <!-- Main page body — dog-eared top-right corner -->
    <path d="M 114 82 L 334 82 L 394 144 L 394 430 L 114 430 Z" fill="url(#paper)"/>
    <!-- Fold triangle — slightly darker cream -->
    <path d="M 334 82 L 394 144 L 334 144 Z" fill="#C8A87E" opacity="0.75"/>
    <!-- Crease line -->
    <line x1="334" y1="82" x2="394" y2="144" stroke="#A8885A" stroke-width="1.5"/>
  </g>

  <!-- ── Orange left spine ───────────────────────────────────────────────── -->
  <rect x="114" y="82" width="10" height="348" fill="#D97757" rx="0"/>
  <!-- Rounded bottom of spine -->
  <rect x="114" y="410" width="10" height="20" rx="5" fill="#D97757"/>

  <!-- ── Title placeholder ──────────────────────────────────────────────── -->
  <rect x="152" y="160" width="158" height="10" rx="5" fill="#8A6A48" opacity="0.45"/>

  <!-- ── Ruled lines ─────────────────────────────────────────────────────── -->
  <rect x="152" y="212" width="208" height="6" rx="3" fill="#B89870" opacity="0.55"/>
  <rect x="152" y="244" width="186" height="6" rx="3" fill="#B89870" opacity="0.55"/>
  <rect x="152" y="276" width="200" height="6" rx="3" fill="#B89870" opacity="0.55"/>
  <rect x="152" y="308" width="168" height="6" rx="3" fill="#B89870" opacity="0.38"/>
  <rect x="152" y="340" width="192" height="6" rx="3" fill="#B89870" opacity="0.38"/>
  <rect x="152" y="372" width="152" height="6" rx="3" fill="#B89870" opacity="0.25"/>

  <!-- ── AI Sparkle (✦) at fold corner ─────────────────────────────────── -->
  <!-- Ambient glow halo behind the spark -->
  <circle cx="364" cy="114" r="44" fill="#D97757" opacity="0.18" filter="url(#glow)"/>

  <!-- 4-pointed star using two rotated ellipses -->
  <g transform="translate(364, 114)" filter="url(#glow)">
    <ellipse rx="11" ry="46" fill="#D97757"/>
    <ellipse rx="46" ry="11" fill="#D97757"/>
    <ellipse rx="11" ry="46" fill="#D97757" transform="rotate(45)"/>
    <ellipse rx="46" ry="11" fill="#D97757" transform="rotate(45)"/>
    <!-- Bright centre -->
    <circle r="14" fill="#F0C080"/>
    <circle r="7"  fill="#FAF4E8"/>
  </g>

  <!-- Small satellite dots radiating from spark -->
  <g filter="url(#glowsm)" fill="#D97757">
    <circle cx="364" cy="58"  r="5" opacity="0.7"/>
    <circle cx="420" cy="114" r="5" opacity="0.7"/>
    <circle cx="408" cy="68"  r="3.5" opacity="0.5"/>
    <circle cx="318" cy="68"  r="3.5" opacity="0.4"/>
  </g>
</svg>
`

/* ── PNG → ICO helper (PNG-in-ICO, works on Windows Vista+) ─────────────── */
function buildIco(pngBuffers) {
  // pngBuffers: array of { size, data }
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const parts = []

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type = ICO
  header.writeUInt16LE(count, 4)
  parts.push(header)

  const directory = Buffer.alloc(count * 16)
  pngBuffers.forEach(({ size, data }, i) => {
    const s = size === 256 ? 0 : size
    directory.writeUInt8 (s,           i*16 + 0)  // width
    directory.writeUInt8 (s,           i*16 + 1)  // height
    directory.writeUInt8 (0,           i*16 + 2)  // palette
    directory.writeUInt8 (0,           i*16 + 3)  // reserved
    directory.writeUInt16LE(1,         i*16 + 4)  // planes
    directory.writeUInt16LE(32,        i*16 + 6)  // bit depth
    directory.writeUInt32LE(data.length, i*16 + 8)
    directory.writeUInt32LE(offset,    i*16 + 12)
    offset += data.length
  })
  parts.push(directory)
  pngBuffers.forEach(({ data }) => parts.push(data))
  return Buffer.concat(parts)
}

/* ── Electron main ───────────────────────────────────────────────────────── */
app.whenReady().then(async () => {
  const buildDir = path.join(__dirname, '..', 'build')
  fs.mkdirSync(buildDir, { recursive: true })

  const win = new BrowserWindow({
    width: 512, height: 512,
    show: false, frame: false,
    transparent: false,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: false },
  })

  const html = `<!DOCTYPE html><html><head>
<style>* { margin:0; padding:0; } html,body { width:512px; height:512px; overflow:hidden; background:transparent; }</style>
</head><body>${SVG}</body></html>`

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

  await new Promise(r => win.webContents.once('did-finish-load', r))
  await new Promise(r => setTimeout(r, 300))

  /* ── Capture 512×512 base PNG ─────────────────────────────────────────── */
  const full = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 })
  const png512 = full.toPNG()
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
  console.log(`✓ icon.png  (${(png512.length/1024).toFixed(1)} KB)`)

  /* ── Build ICO from multiple sizes ────────────────────────────────────── */
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngBuffers = []
  for (const size of sizes) {
    const resized = full.resize({ width: size, height: size, quality: 'best' })
    pngBuffers.push({ size, data: resized.toPNG() })
  }
  const icoBuffer = buildIco(pngBuffers)
  const icoPath = path.join(buildDir, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log(`✓ icon.ico  (${(icoBuffer.length/1024).toFixed(1)} KB, ${sizes.length} sizes)`)

  app.quit()
})

app.on('window-all-closed', () => app.quit())
