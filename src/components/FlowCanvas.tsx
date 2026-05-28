import { useState, useRef, useEffect } from 'react'
import type { Flowchart, FlowNode, FlowEdge, FlowShapeType } from '../lib/types'
import {
  getFlowcharts, saveFlowchart, deleteFlowchart as delFC,
} from '../lib/storage'

/* ══════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════ */
const GRID = 20
const ANCHOR_R = 5

type Anchor = 'top' | 'right' | 'bottom' | 'left'
const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left']

type Tool = 'select' | FlowShapeType

type Interaction =
  | null
  | { type: 'dragging'; nodeId: string; ox: number; oy: number }
  | { type: 'connecting'; fromId: string; fromAnchor: Anchor; mx: number; my: number }
  | { type: 'panning'; sx: number; sy: number; px: number; py: number }

const SHAPE_DEFAULTS: Record<FlowShapeType, { w: number; h: number }> = {
  rect:    { w: 160, h: 80  },
  rounded: { w: 160, h: 60  },
  diamond: { w: 130, h: 110 },
  circle:  { w: 90,  h: 90  },
  text:    { w: 130, h: 40  },
}

const PALETTE = [
  '#D97757','#7B9ED9','#9B8BD4','#57B894',
  '#D9A857','#C47DB8','#E07070','#9A8878',
]

const TOOLS: { tool: Tool; icon: string; tip: string; key: string }[] = [
  { tool: 'select',  icon: '↖', tip: 'Select (V)',             key: 'v' },
  { tool: 'rect',    icon: '▭', tip: 'Rectangle (R)',          key: 'r' },
  { tool: 'rounded', icon: '▢', tip: 'Rounded / Terminal (U)', key: 'u' },
  { tool: 'diamond', icon: '◇', tip: 'Diamond (D)',            key: 'd' },
  { tool: 'circle',  icon: '○', tip: 'Circle (O)',             key: 'o' },
  { tool: 'text',    icon: 'T',      tip: 'Text (T)',               key: 't' },
]

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function snap(v: number) { return Math.round(v / GRID) * GRID }

function anchorPos(n: FlowNode, a: Anchor) {
  const cx = n.x + n.width / 2, cy = n.y + n.height / 2
  switch (a) {
    case 'top':    return { x: cx,              y: n.y }
    case 'bottom': return { x: cx,              y: n.y + n.height }
    case 'left':   return { x: n.x,             y: cy }
    case 'right':  return { x: n.x + n.width,   y: cy }
  }
}

function bestPair(a: FlowNode, b: FlowNode): { fA: Anchor; tA: Anchor } {
  const dx = (b.x + b.width / 2) - (a.x + a.width / 2)
  const dy = (b.y + b.height / 2) - (a.y + a.height / 2)
  if (Math.abs(dx) > Math.abs(dy))
    return dx > 0 ? { fA: 'right', tA: 'left' } : { fA: 'left', tA: 'right' }
  return dy > 0 ? { fA: 'bottom', tA: 'top' } : { fA: 'top', tA: 'bottom' }
}

const DIR: Record<Anchor, [number, number]> = {
  top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0],
}

function curvePath(
  fx: number, fy: number, fa: Anchor,
  tx: number, ty: number, ta: Anchor,
) {
  const d = Math.max(40, Math.hypot(tx - fx, ty - fy) * 0.4)
  const [fdx, fdy] = DIR[fa]
  const [tdx, tdy] = DIR[ta]
  return `M${fx} ${fy} C${fx + fdx * d} ${fy + fdy * d} ${tx + tdx * d} ${ty + tdy * d} ${tx} ${ty}`
}

function hitNode(nodes: FlowNode[], wx: number, wy: number): FlowNode | undefined {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.type === 'diamond') {
      const cx = n.x + n.width / 2, cy = n.y + n.height / 2
      if (Math.abs(wx - cx) / (n.width / 2) + Math.abs(wy - cy) / (n.height / 2) <= 1.15) return n
    } else if (n.type === 'circle') {
      const cx = n.x + n.width / 2, cy = n.y + n.height / 2
      if (Math.hypot(wx - cx, wy - cy) <= n.width / 2 + 4) return n
    } else {
      if (wx >= n.x - 4 && wx <= n.x + n.width + 4 &&
          wy >= n.y - 4 && wy <= n.y + n.height + 4) return n
    }
  }
  return undefined
}

function hitAnchor(n: FlowNode, wx: number, wy: number): Anchor | null {
  for (const a of ANCHORS) {
    const p = anchorPos(n, a)
    if (Math.hypot(wx - p.x, wy - p.y) < 10) return a
  }
  return null
}

/* ══════════════════════════════════════════════════════════════
   FlowCanvas component
   ══════════════════════════════════════════════════════════════ */
export function FlowCanvas() {
  const svgRef = useRef<SVGSVGElement>(null)

  /* ── flowchart list ────────────────────────────────────────── */
  const [charts, setCharts] = useState<Flowchart[]>(() => {
    const c = getFlowcharts()
    if (c.length) return c
    const fc: Flowchart = {
      id: uid(), name: 'Untitled', nodes: [], edges: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    saveFlowchart(fc)
    return [fc]
  })

  const first = charts[0]
  const [activeId, setActiveId] = useState(first.id)
  const [nodes, setNodes]       = useState<FlowNode[]>(first.nodes)
  const [edges, setEdges]       = useState<FlowEdge[]>(first.edges)
  const [fcName, setFcName]     = useState(first.name)

  /* ── canvas state ──────────────────────────────────────────── */
  const [tool, setTool]             = useState<Tool>('select')
  const [color, setColor]           = useState(PALETTE[0])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId]   = useState<string | null>(null)
  const [interaction, setInteraction] = useState<Interaction>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editText, setEditText]     = useState('')

  /* ── camera ────────────────────────────────────────────────── */
  const [pan, setPan]   = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(zoom)
  const panRef  = useRef(pan)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan },   [pan])

  /* ── auto-save (debounced) ─────────────────────────────────── */
  useEffect(() => {
    if (!activeId) return
    const t = setTimeout(() => {
      const old = charts.find(c => c.id === activeId)
      const fc: Flowchart = {
        id: activeId, name: fcName, nodes, edges,
        createdAt: old?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      saveFlowchart(fc)
      setCharts(getFlowcharts())
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, fcName, activeId])

  /* ── wheel zoom (non-passive) ──────────────────────────────── */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = svg!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const z = zoomRef.current, p = panRef.current
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const nz = Math.min(3, Math.max(0.15, z * f))
      setPan({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) })
      setZoom(nz)
    }
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [])

  /* ── keyboard shortcuts ────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); e.preventDefault() }
      if (e.key === 'Escape') { setSelectedId(null); setInteraction(null); setTool('select') }
      for (const t of TOOLS) {
        if (e.key === t.key && !e.ctrlKey && !e.metaKey) { setTool(t.tool); e.preventDefault() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, selectedId, nodes, edges])

  /* ── coordinate helpers ────────────────────────────────────── */
  function toWorld(ex: number, ey: number) {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (ex - r.left - pan.x) / zoom, y: (ey - r.top - pan.y) / zoom }
  }

  /* ── flowchart CRUD ────────────────────────────────────────── */
  function saveCurrent() {
    if (!activeId) return
    const old = charts.find(c => c.id === activeId)
    saveFlowchart({
      id: activeId, name: fcName, nodes, edges,
      createdAt: old?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setCharts(getFlowcharts())
  }

  function switchChart(id: string) {
    saveCurrent()
    const fc = charts.find(c => c.id === id)
    if (!fc) return
    setActiveId(id); setNodes(fc.nodes); setEdges(fc.edges); setFcName(fc.name)
    setSelectedId(null); setEditingId(null); setPan({ x: 0, y: 0 }); setZoom(1)
  }

  function createChart() {
    saveCurrent()
    const fc: Flowchart = {
      id: uid(), name: 'Untitled', nodes: [], edges: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    saveFlowchart(fc)
    setCharts(getFlowcharts())
    setActiveId(fc.id); setNodes([]); setEdges([]); setFcName('Untitled')
    setSelectedId(null); setEditingId(null); setPan({ x: 0, y: 0 }); setZoom(1)
  }

  function deleteChart() {
    if (charts.length <= 1) return
    if (!confirm('Delete this flowchart?')) return
    delFC(activeId)
    const rest = getFlowcharts()
    setCharts(rest)
    const fc = rest[0]
    setActiveId(fc.id); setNodes(fc.nodes); setEdges(fc.edges); setFcName(fc.name)
    setSelectedId(null); setPan({ x: 0, y: 0 }); setZoom(1)
  }

  /* ── node / edge actions ───────────────────────────────────── */
  function deleteSelected() {
    if (!selectedId) return
    if (nodes.find(n => n.id === selectedId)) {
      setNodes(ns => ns.filter(n => n.id !== selectedId))
      setEdges(es => es.filter(e => e.from !== selectedId && e.to !== selectedId))
    } else {
      setEdges(es => es.filter(e => e.id !== selectedId))
    }
    setSelectedId(null)
  }

  function placeShape(wx: number, wy: number) {
    if (tool === 'select') return
    const d = SHAPE_DEFAULTS[tool as FlowShapeType]
    const n: FlowNode = {
      id: uid(), type: tool as FlowShapeType,
      x: snap(wx - d.w / 2), y: snap(wy - d.h / 2),
      width: d.w, height: d.h,
      label: tool === 'text' ? 'Text' : '',
      fill: tool === 'text' ? 'transparent' : `${color}18`,
      stroke: color,
    }
    setNodes(ns => [...ns, n])
    setSelectedId(n.id)
    setTool('select')
    if (tool === 'text') { setEditingId(n.id); setEditText('Text') }
  }

  function commitEdit() {
    if (!editingId) return
    setNodes(ns => ns.map(n => n.id === editingId ? { ...n, label: editText } : n))
    setEditingId(null)
  }

  /* ── pointer handlers ──────────────────────────────────────── */
  function onPointerDown(e: React.PointerEvent) {
    // middle-click or Alt+click → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      svgRef.current?.setPointerCapture(e.pointerId)
      setInteraction({ type: 'panning', sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y })
      e.preventDefault(); return
    }
    if (e.button !== 0) return

    const w = toWorld(e.clientX, e.clientY)

    // anchor drag → start connecting
    if (hoveredId) {
      const hn = nodes.find(n => n.id === hoveredId)
      if (hn) {
        const a = hitAnchor(hn, w.x, w.y)
        if (a) {
          svgRef.current?.setPointerCapture(e.pointerId)
          setInteraction({ type: 'connecting', fromId: hn.id, fromAnchor: a, mx: w.x, my: w.y })
          return
        }
      }
    }

    // shape tool → place
    if (tool !== 'select') { placeShape(w.x, w.y); return }

    // click node → select & drag
    const clicked = hitNode(nodes, w.x, w.y)
    if (clicked) {
      svgRef.current?.setPointerCapture(e.pointerId)
      setSelectedId(clicked.id)
      setInteraction({ type: 'dragging', nodeId: clicked.id, ox: w.x - clicked.x, oy: w.y - clicked.y })
    } else {
      // click edge?
      setSelectedId(null)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const ia = interaction
    if (ia?.type === 'panning') {
      setPan({ x: ia.px + (e.clientX - ia.sx), y: ia.py + (e.clientY - ia.sy) }); return
    }
    const w = toWorld(e.clientX, e.clientY)
    if (ia?.type === 'dragging') {
      setNodes(ns => ns.map(n => n.id === ia.nodeId
        ? { ...n, x: snap(w.x - ia.ox), y: snap(w.y - ia.oy) } : n))
      return
    }
    if (ia?.type === 'connecting') {
      setInteraction({ ...ia, mx: w.x, my: w.y }); return
    }
    // hover detection
    setHoveredId(hitNode(nodes, w.x, w.y)?.id ?? null)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (interaction?.type === 'connecting') {
      const w = toWorld(e.clientX, e.clientY)
      const target = hitNode(nodes, w.x, w.y)
      if (target && target.id !== interaction.fromId) {
        // don't duplicate
        const dup = edges.find(
          ed => (ed.from === interaction.fromId && ed.to === target.id) ||
                (ed.from === target.id && ed.to === interaction.fromId))
        if (!dup) {
          setEdges(es => [...es, {
            id: uid(), from: interaction.fromId, to: target.id, label: '', color: '#9A8878',
          }])
        }
      }
    }
    setInteraction(null)
  }

  function onDoubleClick(e: React.MouseEvent) {
    const w = toWorld(e.clientX, e.clientY)
    const n = hitNode(nodes, w.x, w.y)
    if (n) { setEditingId(n.id); setEditText(n.label); setSelectedId(n.id); e.preventDefault() }
  }

  /* ── render helpers ────────────────────────────────────────── */
  function shapeJSX(n: FlowNode, isSelected: boolean) {
    const sw = isSelected ? 2.5 : 1.5
    const sc = isSelected ? '#D97757' : n.stroke
    switch (n.type) {
      case 'rect':
        return <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={6}
          fill={n.fill} stroke={sc} strokeWidth={sw} />
      case 'rounded':
        return <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={n.height / 2}
          fill={n.fill} stroke={sc} strokeWidth={sw} />
      case 'diamond': {
        const cx = n.x + n.width / 2, cy = n.y + n.height / 2
        return <polygon
          points={`${cx},${n.y} ${n.x + n.width},${cy} ${cx},${n.y + n.height} ${n.x},${cy}`}
          fill={n.fill} stroke={sc} strokeWidth={sw} />
      }
      case 'circle':
        return <ellipse cx={n.x + n.width / 2} cy={n.y + n.height / 2}
          rx={n.width / 2} ry={n.height / 2}
          fill={n.fill} stroke={sc} strokeWidth={sw} />
      case 'text':
        return null
    }
  }

  /* ── cursor ────────────────────────────────────────────────── */
  const cursor =
    interaction?.type === 'panning' ? 'grabbing' :
    interaction?.type === 'dragging' ? 'grabbing' :
    interaction?.type === 'connecting' ? 'crosshair' :
    tool !== 'select' ? 'crosshair' :
    hoveredId ? 'grab' : 'default'

  /* ══════════════════════════════════════════════════════════════
     JSX
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#15110D' }}>

      {/* ── TOOLBAR ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2 shrink-0"
        style={{ background: '#1C1814', borderBottom: '1px solid #3A3028' }}>

        {/* flowchart selector */}
        <select value={activeId} onChange={e => switchChart(e.target.value)}
          className="px-2 py-1 rounded-md text-xs outline-none"
          style={{ background: '#251E17', color: '#EAE0D4', border: '1px solid #3A3028', maxWidth: 140 }}>
          {charts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <button onClick={createChart} title="New flowchart"
          className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
          style={{ color: '#9A8878' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#D97757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9A8878')}>+</button>

        <button onClick={deleteChart} title="Delete flowchart"
          className="w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors"
          style={{ color: '#5A4A38' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E07070')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A4A38')}
        >{'✕'}</button>

        {/* divider */}
        <div className="w-px h-6 mx-1" style={{ background: '#3A3028' }} />

        {/* shape tools */}
        {TOOLS.map(t => (
          <button key={t.tool} onClick={() => setTool(t.tool)} title={t.tip}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
            style={tool === t.tool
              ? { background: '#D97757', color: '#FAFAF7', boxShadow: '0 1px 6px rgba(217,119,87,0.35)' }
              : { color: '#9A8878' }}>
            {t.icon}
          </button>
        ))}

        <div className="w-px h-6 mx-1" style={{ background: '#3A3028' }} />

        {/* colour palette */}
        <div className="flex gap-1">
          {PALETTE.map(c => (
            <button key={c}
              onClick={() => {
                setColor(c)
                if (selectedId && nodes.find(n => n.id === selectedId)) {
                  setNodes(ns => ns.map(n => n.id === selectedId
                    ? { ...n, stroke: c, fill: n.type === 'text' ? 'transparent' : `${c}18` } : n))
                }
              }}
              className="w-5 h-5 rounded-full transition-transform"
              style={{
                background: c,
                outline: color === c ? '2px solid #FAFAF5' : 'none',
                outlineOffset: 1,
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
              }} />
          ))}
        </div>

        <div className="w-px h-6 mx-1" style={{ background: '#3A3028' }} />

        {/* delete selected */}
        <button onClick={deleteSelected} title="Delete selected (Del)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
          style={{ color: selectedId ? '#E07070' : '#3A3028' }}
        >{'✖'}</button>

        <div className="flex-1" />

        {/* flowchart name */}
        <input value={fcName} onChange={e => setFcName(e.target.value)}
          className="px-2 py-1 rounded-md text-xs text-right outline-none w-32"
          style={{ background: 'transparent', color: '#9A8878', border: '1px solid transparent' }}
          onFocus={e => { e.target.style.borderColor = '#3A3028'; e.target.style.background = '#251E17' }}
          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}
          placeholder="Flowchart name" />

        <div className="w-px h-6 mx-1" style={{ background: '#3A3028' }} />

        {/* zoom controls */}
        <button onClick={() => setZoom(z => Math.max(0.15, z / 1.15))}
          className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ color: '#9A8878' }}>{'−'}</button>
        <span className="text-xs w-10 text-center tabular-nums" style={{ color: '#9A8878' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.min(3, z * 1.15))}
          className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ color: '#9A8878' }}>+</button>
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1) }} title="Reset view"
          className="w-6 h-6 rounded flex items-center justify-center text-xs"
          style={{ color: '#5A4A38' }}>{'⬜'}</button>
      </div>

      {/* ── CANVAS ───────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%"
          style={{ cursor, display: 'block' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onDoubleClick}>

          <defs>
            {/* dot grid */}
            <pattern id="flowgrid" width={GRID} height={GRID}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <circle cx={GRID / 2} cy={GRID / 2} r={0.7} fill="#2A2218" />
            </pattern>
            {/* arrowhead markers */}
            <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 1 L8 5 L0 9z" fill="#9A8878" />
            </marker>
            <marker id="flow-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 1 L8 5 L0 9z" fill="#D97757" />
            </marker>
          </defs>

          {/* background */}
          <rect width="100%" height="100%" fill="#15110D" />
          <rect width="100%" height="100%" fill="url(#flowgrid)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* ── edges ──────────────────────────────────────── */}
            {edges.map(ed => {
              const fn = nodes.find(n => n.id === ed.from)
              const tn = nodes.find(n => n.id === ed.to)
              if (!fn || !tn) return null
              const { fA, tA } = bestPair(fn, tn)
              const fp = anchorPos(fn, fA), tp = anchorPos(tn, tA)
              const d = curvePath(fp.x, fp.y, fA, tp.x, tp.y, tA)
              const isSel = selectedId === ed.id
              return (
                <g key={ed.id}>
                  {/* wide hit area */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedId(ed.id)} />
                  {/* visible line */}
                  <path d={d} fill="none"
                    stroke={isSel ? '#D97757' : ed.color}
                    strokeWidth={isSel ? 3 : 2}
                    markerEnd={isSel ? 'url(#flow-arrow-sel)' : 'url(#flow-arrow)'}
                    style={{ pointerEvents: 'none' }} />
                  {/* edge label */}
                  {ed.label && (() => {
                    const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2
                    return (
                      <text x={mx} y={my - 6} textAnchor="middle" fontSize={11}
                        fill="#9A8878" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {ed.label}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* ── connection preview ─────────────────────────── */}
            {interaction?.type === 'connecting' && (() => {
              const fn = nodes.find(n => n.id === interaction.fromId)
              if (!fn) return null
              const fp = anchorPos(fn, interaction.fromAnchor)
              return (
                <line x1={fp.x} y1={fp.y} x2={interaction.mx} y2={interaction.my}
                  stroke="#D97757" strokeWidth={2} strokeDasharray="6 3"
                  style={{ pointerEvents: 'none' }} />
              )
            })()}

            {/* ── nodes ──────────────────────────────────────── */}
            {nodes.map(n => {
              const isSel = selectedId === n.id
              const isHov = hoveredId === n.id
              return (
                <g key={n.id}>
                  {/* shape */}
                  {shapeJSX(n, isSel)}

                  {/* label (read-only) */}
                  {editingId !== n.id && n.label && (
                    <text x={n.x + n.width / 2} y={n.y + n.height / 2}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#EAE0D4" fontSize={13}
                      fontFamily="Inter, system-ui, sans-serif"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {n.label}
                    </text>
                  )}

                  {/* inline label edit */}
                  {editingId === n.id && (
                    <foreignObject x={n.x} y={n.y} width={n.width} height={n.height}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: '100%',
                      }}>
                        <input
                          autoFocus
                          value={editText}
                          onChange={ev => setEditText(ev.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') commitEdit()
                            if (ev.key === 'Escape') setEditingId(null)
                            ev.stopPropagation()
                          }}
                          style={{
                            background: 'transparent', color: '#EAE0D4',
                            textAlign: 'center', border: 'none', outline: 'none',
                            width: '90%', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
                          }}
                        />
                      </div>
                    </foreignObject>
                  )}

                  {/* anchor dots (show on hover or selection) */}
                  {(isHov || isSel) && ANCHORS.map(a => {
                    const p = anchorPos(n, a)
                    return (
                      <circle key={a} cx={p.x} cy={p.y} r={ANCHOR_R}
                        fill="#D97757" stroke="#FAFAF7" strokeWidth={1.5}
                        style={{ cursor: 'crosshair' }} />
                    )
                  })}
                </g>
              )
            })}
          </g>
        </svg>

        {/* empty-state hint */}
        {nodes.length === 0 && !interaction && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center" style={{ color: '#5A4A38' }}>
              <p className="text-lg mb-1" style={{ color: '#9A8878' }}>Start building your flowchart</p>
              <p className="text-sm">Click a shape tool above or press&ensp;
                <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#251E17', color: '#9A8878', border: '1px solid #3A3028' }}>R</kbd>
                &ensp;for rectangle&ensp;&middot;&ensp;
                <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#251E17', color: '#9A8878', border: '1px solid #3A3028' }}>D</kbd>
                &ensp;for diamond&ensp;&middot;&ensp;
                <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#251E17', color: '#9A8878', border: '1px solid #3A3028' }}>O</kbd>
                &ensp;for circle</p>
              <p className="text-xs mt-3">Drag from anchor dots to connect shapes with arrows</p>
              <p className="text-xs mt-1">Alt + drag to pan&ensp;&middot;&ensp;Scroll to zoom</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
