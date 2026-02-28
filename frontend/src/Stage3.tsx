import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Line, Text } from 'react-konva'
import type Konva from 'konva'

interface Stage3Props {
  vehicles: string[]
  onComplete: (summary: string) => void
}

type StickerColor = 'green' | 'yellow' | 'red'

const STICKER_COLORS: Record<StickerColor, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

// Unified action history — undo pops from this
type Action =
  | { kind: 'line'; id: string; points: number[] }
  | { kind: 'sticker'; id: string; x: number; y: number; color: StickerColor }
  | { kind: 'vehicle'; id: string; x: number; y: number; label: string }

export default function Stage3({ vehicles, onComplete }: Stage3Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 600, height: 480 })

  const [tool, setTool] = useState<'pen' | 'select'>('select')
  const [actions, setActions] = useState<Action[]>([])
  // In-progress line while drawing (not yet committed to history)
  const [currentLine, setCurrentLine] = useState<number[] | null>(null)
  const isDrawing = useRef(false)

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // --- Drawing ---
  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool !== 'pen') return
    isDrawing.current = true
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setCurrentLine([pos.x, pos.y])
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!isDrawing.current || tool !== 'pen' || !currentLine) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setCurrentLine(prev => prev ? [...prev, pos.x, pos.y] : [pos.x, pos.y])
  }

  function handleMouseUp() {
    if (!isDrawing.current || !currentLine) return
    isDrawing.current = false
    // Commit the finished line to history
    if (currentLine.length >= 4) {
      setActions(prev => [...prev, { kind: 'line', id: crypto.randomUUID(), points: currentLine }])
    }
    setCurrentLine(null)
  }

  // --- Undo: removes last committed action ---
  function undo() {
    setActions(prev => prev.slice(0, -1))
  }

  // --- HTML drag-and-drop from toolbar onto canvas ---
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const type = e.dataTransfer.getData('type')

    if (type === 'sticker') {
      const color = e.dataTransfer.getData('color') as StickerColor
      setActions(prev => [...prev, { kind: 'sticker', id: crypto.randomUUID(), x, y, color }])
    } else if (type === 'vehicle') {
      const label = e.dataTransfer.getData('label')
      setActions(prev => [...prev, { kind: 'vehicle', id: crypto.randomUUID(), x, y, label }])
    }
  }

  // Derive display lists from actions
  const lines = actions.filter((a): a is Extract<Action, { kind: 'line' }> => a.kind === 'line')
  const stickers = actions.filter((a): a is Extract<Action, { kind: 'sticker' }> => a.kind === 'sticker')
  const vehicleStickers = actions.filter((a): a is Extract<Action, { kind: 'vehicle' }> => a.kind === 'vehicle')

  function handleSubmit() {
    const placeholderSummary = 'Based on your submission, our AI has drafted the following summary of your claim.'
    onComplete(placeholderSummary)
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Mark the incident</h2>
        <p className="text-base-content/60 text-sm">Drag markers onto the canvas to indicate what happened</p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 rounded-xl overflow-hidden border border-base-300"
          style={{ background: 'white' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: tool === 'pen' ? 'crosshair' : 'default' }}
          >
            {/* Drawing + vehicle layer */}
            <Layer>
              {lines.map(line => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke="#1e293b"
                  strokeWidth={3}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
              {/* In-progress line */}
              {currentLine && currentLine.length >= 4 && (
                <Line
                  points={currentLine}
                  stroke="#1e293b"
                  strokeWidth={3}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {vehicleStickers.map(v => (
                <Text
                  key={v.id}
                  text={`🚗 ${v.label}`}
                  x={v.x}
                  y={v.y}
                  fontSize={28}
                  fill="#1e293b"
                  draggable
                  onDragEnd={e => setActions(prev => prev.map(a =>
                    a.id === v.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                  ))}
                />
              ))}
            </Layer>
            {/* X stickers always on top */}
            <Layer>
              {stickers.map(s => (
                <Text
                  key={s.id}
                  text="✕"
                  x={s.x}
                  y={s.y}
                  fontSize={56}
                  fill={STICKER_COLORS[s.color]}
                  fontStyle="bold"
                  draggable
                  onDragEnd={e => setActions(prev => prev.map(a =>
                    a.id === s.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                  ))}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 items-center bg-base-200 rounded-xl p-3 w-20">
          {/* Pen tool */}
          <button
            className={`btn btn-square btn-sm w-full ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`}
            title="Pen"
            onClick={() => setTool(tool === 'pen' ? 'select' : 'pen')}
          >
            ✏️
          </button>

          {/* Undo */}
          <button
            className="btn btn-square btn-sm btn-ghost w-full"
            title="Undo"
            onClick={undo}
            disabled={actions.length === 0}
          >
            ↩
          </button>

          <div className="divider my-0 w-full" />

          {/* Draggable X stickers */}
          {(['green', 'yellow', 'red'] as StickerColor[]).map(color => (
            <div
              key={color}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('type', 'sticker')
                e.dataTransfer.setData('color', color)
              }}
              className="flex items-center justify-center w-full h-10 rounded-lg cursor-grab active:cursor-grabbing select-none text-2xl font-bold"
              style={{ color: STICKER_COLORS[color] }}
              title={`Drag ${color} marker onto canvas`}
            >
              ✕
            </div>
          ))}

          <div className="divider my-0 w-full" />

          {/* Draggable vehicle icons */}
          {vehicles.map((v, i) => (
            <div
              key={i}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('type', 'vehicle')
                e.dataTransfer.setData('label', v)
              }}
              className="flex flex-col items-center justify-center w-full h-12 rounded-lg cursor-grab active:cursor-grabbing select-none gap-0.5"
              title={`Drag ${v} onto canvas`}
            >
              <span className="text-2xl">🚗</span>
              <span className="text-xs text-base-content/60 truncate w-full text-center">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  )
}
