import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Line, Text, Transformer, Image as KonvaImage, Group } from 'react-konva'
import type Konva from 'konva'

interface Stage3Props {
  description: string
  onComplete: (report: string) => void
}

type StickerColor = 'green' | 'yellow' | 'red'

const STICKER_COLORS: Record<StickerColor, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

type Action =
  | { kind: 'line'; id: string; points: number[] }
  | { kind: 'sticker'; id: string; x: number; y: number; rotation: number; color: StickerColor }
  | { kind: 'vehicle'; id: string; x: number; y: number; rotation: number; label: string; carColor: 'blue' | 'red' }

const CAR_TYPES = [
  { label: 'Your car', carColor: 'blue' as const, src: '/car-blue.svg' },
  { label: 'Other car', carColor: 'red' as const, src: '/car-red.svg' },
]

function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new window.Image()
    img.src = src
    img.onload = () => setImage(img)
  }, [src])
  return image
}

// --- Draggable + rotatable X sticker ---
function DraggableSticker({
  sticker, isSelected, onSelect, onDeselect, onUpdate,
}: {
  sticker: Extract<Action, { kind: 'sticker' }>
  isSelected: boolean
  onSelect: () => void
  onDeselect: () => void
  onUpdate: (patch: Partial<typeof sticker>) => void
}) {
  const nodeRef = useRef<Konva.Text>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current])
      trRef.current.getLayer()?.batchDraw()
    } else if (!isSelected && trRef.current) {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Text
        ref={nodeRef}
        text="✕"
        x={sticker.x}
        y={sticker.y}
        rotation={sticker.rotation}
        fontSize={56}
        fill={STICKER_COLORS[sticker.color]}
        fontStyle="bold"
        draggable
        onClick={e => { e.cancelBubble = true; onSelect() }}
        onTap={e => { e.cancelBubble = true; onSelect() }}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={e => onUpdate({
          x: e.target.x(),
          y: e.target.y(),
          rotation: e.target.rotation(),
        })}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={[]}
          rotateEnabled={true}
          borderStroke="#64748b"
          borderStrokeWidth={1.5}
          anchorStroke="#64748b"
          anchorFill="#fff"
          anchorSize={10}
        />
      )}
    </>
  )
}

// --- Draggable + rotatable car image ---
function DraggableVehicle({
  vehicle, isSelected, onSelect, onUpdate,
}: {
  vehicle: Extract<Action, { kind: 'vehicle' }>
  isSelected: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<typeof vehicle>) => void
}) {
  const nodeRef = useRef<Konva.Group>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const src = vehicle.carColor === 'blue' ? '/car-blue.svg' : '/car-red.svg'
  const image = useImage(src)

  useEffect(() => {
    if (isSelected && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current])
      trRef.current.getLayer()?.batchDraw()
    } else if (!isSelected && trRef.current) {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Group
        ref={nodeRef}
        x={vehicle.x}
        y={vehicle.y}
        rotation={vehicle.rotation}
        draggable
        onClick={e => { e.cancelBubble = true; onSelect() }}
        onTap={e => { e.cancelBubble = true; onSelect() }}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={e => onUpdate({
          x: e.target.x(),
          y: e.target.y(),
          rotation: e.target.rotation(),
        })}
      >
        {image && (
          <KonvaImage
            image={image}
            width={168}
            height={168}
            offsetX={84}
            offsetY={84}
          />
        )}
        <Text
          text={vehicle.label}
          fontSize={16}
          fill={vehicle.carColor === 'blue' ? '#3b82f6' : '#ef4444'}
          fontStyle="bold"
          width={90}
          offsetX={45}
          y={88}
          align="center"
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={[]}
          rotateEnabled={true}
          borderStroke="#64748b"
          borderStrokeWidth={1.5}
          anchorStroke="#64748b"
          anchorFill="#fff"
          anchorSize={10}
        />
      )}
    </>
  )
}

export default function Stage3({ description, onComplete }: Stage3Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 600, height: 480 })

  const [tool, setTool] = useState<'pen' | 'select'>('select')
  const [actions, setActions] = useState<Action[]>([])
  const [currentLine, setCurrentLine] = useState<number[] | null>(null)
  const isDrawing = useRef(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    if (currentLine.length >= 4) {
      setActions(prev => [...prev, { kind: 'line', id: crypto.randomUUID(), points: currentLine }])
    }
    setCurrentLine(null)
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) setSelectedId(null)
  }

  function undo() {
    setActions(prev => prev.slice(0, -1))
    setSelectedId(null)
  }

  function updateAction(id: string, patch: object) {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  // --- HTML drag-and-drop ---
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
      setActions(prev => [...prev, { kind: 'sticker', id: crypto.randomUUID(), x, y, rotation: 0, color }])
    } else if (type === 'vehicle') {
      const label = e.dataTransfer.getData('label')
      const carColor = e.dataTransfer.getData('carColor') as 'blue' | 'red'
      setActions(prev => [...prev, { kind: 'vehicle', id: crypto.randomUUID(), x, y, rotation: 0, label, carColor }])
    }
  }

  const lines = actions.filter((a): a is Extract<Action, { kind: 'line' }> => a.kind === 'line')
  const stickers = actions.filter((a): a is Extract<Action, { kind: 'sticker' }> => a.kind === 'sticker')
  const vehicleStickers = actions.filter((a): a is Extract<Action, { kind: 'vehicle' }> => a.kind === 'vehicle')

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const canvasDataUrl = stageRef.current?.toDataURL({ mimeType: 'image/png' })
      if (!canvasDataUrl) throw new Error('Failed to capture canvas')
      const base64Image = canvasDataUrl.split(',')[1]

      const res = await fetch('http://localhost:8000/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: description,
          canvas_image: base64Image,
        }),
      })
      const data = await res.json()
      onComplete(data.report ?? 'Could not generate report.')
    } catch {
      onComplete('Could not generate report. Please proceed and edit manually.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Mark the incident</h2>
        <p className="text-base-content/60 text-sm">Drag markers onto the canvas · Click to rotate</p>
      </div>

      {/* Damage legend */}
      <div className="flex gap-4 items-center justify-center text-sm flex-wrap font-medium">
        <span style={{ color: STICKER_COLORS.green }}>✕</span>
        <span className="text-base-content/70">Green = light damage</span>
        <span style={{ color: STICKER_COLORS.yellow }}>✕</span>
        <span className="text-base-content/70">Yellow = medium damage</span>
        <span style={{ color: STICKER_COLORS.red }}>✕</span>
        <span className="text-base-content/70">Red = heavy damage</span>
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
            onClick={handleStageClick}
            style={{ cursor: tool === 'pen' ? 'crosshair' : 'default' }}
          >
            {/* Drawing + vehicles layer */}
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
                <DraggableVehicle
                  key={v.id}
                  vehicle={v}
                  isSelected={selectedId === v.id}
                  onSelect={() => setSelectedId(v.id)}
                  onUpdate={patch => updateAction(v.id, patch)}
                />
              ))}
            </Layer>
            {/* X stickers always on top */}
            <Layer>
              {stickers.map(s => (
                <DraggableSticker
                  key={s.id}
                  sticker={s}
                  isSelected={selectedId === s.id}
                  onSelect={() => setSelectedId(s.id)}
                  onDeselect={() => setSelectedId(null)}
                  onUpdate={patch => updateAction(s.id, patch)}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 items-center bg-base-200 rounded-xl p-2 w-24 shrink-0 overflow-y-auto min-h-0">
          <button
            className={`btn btn-square btn-sm w-10 h-10 ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`}
            title="Pen"
            onClick={() => setTool(tool === 'pen' ? 'select' : 'pen')}
          >
            <span style={{ fontSize: '1.25rem' }}>✏️</span>
          </button>

          <button
            className="btn btn-square btn-ghost btn-sm w-10 h-10"
            title="Undo"
            onClick={undo}
            disabled={actions.length === 0}
          >
            <span style={{ fontSize: '1.25rem' }}>↩</span>
          </button>

          <div className="divider my-0 w-full" />

          {(['green', 'yellow', 'red'] as StickerColor[]).map(color => (
            <div
              key={color}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('type', 'sticker')
                e.dataTransfer.setData('color', color)
              }}
              className="flex items-center justify-center w-full rounded-lg cursor-grab active:cursor-grabbing select-none font-bold"
              style={{ color: STICKER_COLORS[color], fontSize: '2.5rem', lineHeight: '1' }}
              title={`Drag ${color} marker onto canvas`}
            >
              ✕
            </div>
          ))}

          <div className="divider my-0 w-full" />

          {CAR_TYPES.map(car => (
            <div
              key={car.label}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('type', 'vehicle')
                e.dataTransfer.setData('label', car.label)
                e.dataTransfer.setData('carColor', car.carColor)
              }}
              className="flex flex-col items-center justify-center w-full rounded-lg cursor-grab active:cursor-grabbing select-none gap-1 p-1"
              title={`Drag ${car.label} onto canvas`}
            >
              <img src={car.src} style={{ width: 52, height: 52 }} alt={car.label} />
              <span className="text-xs font-medium text-center text-base-content/70">{car.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <><span className="loading loading-spinner" /> Generating report…</> : 'Submit'}
      </button>
    </div>
  )
}
