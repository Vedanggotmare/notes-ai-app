import { useMemo, useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { Note } from '../lib/types'
import { getCategories } from '../lib/storage'

interface Props {
  notes: Note[]
  selectedId: string | null
  onSelectNote: (id: string) => void
}

const categoryColors = Object.fromEntries(
  getCategories().map(c => [c.name, c.color])
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FGRef = any

export function KnowledgeGraph({ notes, selectedId, onSelectNote }: Props) {
  const fgRef = useRef<FGRef>(null)

  const graphData = useMemo(() => {
    const nodes: {
      id: string; label: string; type: 'note' | 'category'
      val: number; color: string; fx?: number; fy?: number
    }[] = []
    const links: { source: string; target: string; isConnection: boolean }[] = []
    const categorySet = new Set<string>()

    for (const note of notes) {
      nodes.push({
        id: note.id,
        label: note.title || 'Untitled',
        type: 'note',
        val: 3 + note.connections.length * 0.5,
        color: note.id === selectedId ? '#D97757' : '#7B9ED9',
      })

      for (const cat of note.categories) {
        if (!categorySet.has(cat)) {
          categorySet.add(cat)
          nodes.push({
            id: `cat:${cat}`,
            label: cat,
            type: 'category',
            val: 10,
            color: categoryColors[cat] ?? '#9A8878',
          })
        }
        links.push({ source: note.id, target: `cat:${cat}`, isConnection: false })
      }

      for (const connId of note.connections) {
        if (notes.find(n => n.id === connId)) {
          const exists = links.some(
            l =>
              (l.source === note.id && l.target === connId) ||
              (l.source === connId && l.target === note.id)
          )
          if (!exists) links.push({ source: note.id, target: connId, isConnection: true })
        }
      }
    }

    return { nodes, links }
  }, [notes, selectedId])

  // Configure springy forces after mount / data change
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Link spring: shorter rest length, higher strength = bouncy spring
    fg.d3Force('link')
      ?.distance((link: { isConnection: boolean }) => link.isConnection ? 80 : 55)
      .strength((link: { isConnection: boolean }) => link.isConnection ? 0.6 : 0.4)

    // Charge: stronger repulsion so nodes spread out, but not too much
    fg.d3Force('charge')?.strength(-220)

    // Gentle centering
    fg.d3Force('center')?.strength(0.05)

    // Collision: nodes don't overlap
    const d3 = (fg as FGRef).d3Force
    if (d3) {
      // reheat after changing forces
      fg.d3ReheatSimulation()
    }
  }, [graphData])

  const handleNodeClick = useCallback(
    (node: { id?: string | number; type?: string }) => {
      if (node.type === 'note' && typeof node.id === 'string') {
        onSelectNote(node.id)
      }
    },
    [onSelectNote]
  )

  const paintNode = useCallback(
    (
      node: { id?: string | number; label?: string; type?: string; val?: number; color?: string; x?: number; y?: number },
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const label = node.label ?? ''
      const isCategory = node.type === 'category'
      const r = Math.sqrt((node.val ?? 3)) * 3.5
      const isSelected = node.color === '#D97757'

      ctx.save()

      if (isCategory) {
        // Glowing ring for category nodes
        const grd = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.4)
        grd.addColorStop(0, (node.color ?? '#888') + '55')
        grd.addColorStop(1, (node.color ?? '#888') + '00')
        ctx.beginPath()
        ctx.arc(x, y, r * 1.4, 0, 2 * Math.PI)
        ctx.fillStyle = grd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2 * Math.PI)
        ctx.fillStyle = '#15110D'
        ctx.fill()
        ctx.strokeStyle = node.color ?? '#888'
        ctx.lineWidth = 2 / globalScale
        ctx.stroke()

        // Category icon text in center
        ctx.font = `bold ${(r * 1.1) / globalScale}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = node.color ?? '#888'
        ctx.fillText(label.slice(0, 2), x, y)
      } else {
        // Glow for selected note
        if (isSelected) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
          grd.addColorStop(0, '#D9775755')
          grd.addColorStop(1, '#D9775700')
          ctx.beginPath()
          ctx.arc(x, y, r * 2.5, 0, 2 * Math.PI)
          ctx.fillStyle = grd
          ctx.fill()
        }

        // Note node: filled circle
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2 * Math.PI)
        const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
        gradient.addColorStop(0, isSelected ? '#F0956F' : '#9BB8E8')
        gradient.addColorStop(1, isSelected ? '#D97757' : '#5A85C0')
        ctx.fillStyle = gradient
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = '#EAE0D4'
          ctx.lineWidth = 1.5 / globalScale
          ctx.stroke()
        }
      }

      // Label below node
      const fontSize = Math.max(9, 11 / globalScale)
      ctx.font = `${isCategory ? '600 ' : ''}${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      const truncated = label.length > 22 ? label.slice(0, 21) + '…' : label
      const textY = y + r + 3 / globalScale

      // Label shadow/background
      const textWidth = ctx.measureText(truncated).width
      ctx.fillStyle = 'rgba(21,17,13,0.75)'
      ctx.fillRect(x - textWidth / 2 - 2, textY - 1, textWidth + 4, fontSize + 2)

      ctx.fillStyle = isCategory ? (node.color ?? '#888') : (isSelected ? '#D97757' : '#C8D8EE')
      ctx.fillText(truncated, x, textY)

      ctx.restore()
    },
    []
  )

  const paintLink = useCallback(
    (
      link: { source: { x?: number; y?: number }; target: { x?: number; y?: number }; isConnection?: boolean },
      ctx: CanvasRenderingContext2D,
      _globalScale: number
    ) => {
      const start = link.source
      const end = link.target
      if (!start.x || !start.y || !end.x || !end.y) return

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)

      if (link.isConnection) {
        // Note-to-note: dashed warm line
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = '#D9775740'
        ctx.lineWidth = 1.5
      } else {
        // Note-to-category: solid subtle line
        ctx.setLineDash([])
        ctx.strokeStyle = '#EAE0D420'
        ctx.lineWidth = 1
      }
      ctx.stroke()
      ctx.restore()
    },
    []
  )

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: '#0D0A07' }}>
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 text-xs" style={{ color: '#9A8878' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7B9ED9' }} />
          <span>Note</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D97757' }} />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: '#9A8878' }} />
          <span>Category</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-4 border-t border-dashed" style={{ borderColor: '#D9775770' }} />
          <span>Connection</span>
        </div>
      </div>

      {/* Note count */}
      <div className="absolute top-4 right-4 z-10 text-xs" style={{ color: '#9A8878', fontFamily: 'Lora, serif' }}>
        {notes.length} notes · {graphData.nodes.filter(n => n.type === 'category').length} categories
      </div>

      {graphData.nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full" style={{ color: '#3A3028' }}>
          <div className="text-5xl mb-4 opacity-40">✦</div>
          <p className="text-sm">Create categorised notes to build the graph</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel="label"
          onNodeClick={handleNodeClick}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          backgroundColor="#0D0A07"
          enableNodeDrag
          enableZoomInteraction
          warmupTicks={60}
          cooldownTicks={200}
          cooldownTime={4000}
          d3AlphaDecay={0.018}
          d3VelocityDecay={0.25}
        />
      )}
    </div>
  )
}
