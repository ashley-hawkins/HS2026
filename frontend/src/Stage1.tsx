import { useState, useRef } from 'react'

interface Stage1Props {
  onComplete: () => void
}

export default function Stage1({ onComplete }: Stage1Props) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [mode, setMode] = useState<'choose' | 'camera' | 'upload'>('choose')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function startCamera() {
    setMode('camera')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Could not access camera. Please allow camera permissions.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setPhoto(canvas.toDataURL('image/png'))
    stopCamera()
    setMode('choose')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
    setMode('choose')
  }

  function retake() {
    setPhoto(null)
    stopCamera()
    setMode('choose')
  }

  async function handleSubmit() {
    if (!photo) return
    setSubmitting(true)
    try {
      // TODO: send photo to backend
      // await fetch('/api/id-upload', { method: 'POST', body: JSON.stringify({ image: photo }) })
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Upload your ID</h2>
        <p className="text-base-content/60 text-sm">Take a photo or upload an image of your ID document</p>
      </div>

      {error && <div className="alert alert-error w-full"><span>{error}</span></div>}

      {!photo && mode === 'choose' && (
        <div className="flex gap-4 w-full">
          <button className="btn btn-primary flex-1" onClick={startCamera}>Use Camera</button>
          <button className="btn btn-outline flex-1" onClick={() => fileRef.current?.click()}>Upload File</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {mode === 'camera' && !photo && (
        <div className="flex flex-col items-center gap-4 w-full">
          <video ref={videoRef} autoPlay playsInline muted className="rounded-xl w-full aspect-video object-cover bg-base-200" />
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={takePhoto}>Capture</button>
            <button className="btn btn-ghost" onClick={() => { stopCamera(); setMode('choose') }}>Cancel</button>
          </div>
        </div>
      )}

      {photo && (
        <div className="flex flex-col items-center gap-4 w-full">
          <img src={photo} alt="ID" className="rounded-xl w-full aspect-video object-cover border border-base-300" />
          <button className="btn btn-ghost btn-sm" onClick={retake}>Retake / Change</button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <button
        className="btn btn-primary w-full"
        disabled={!photo || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <span className="loading loading-spinner" /> : 'Submit'}
      </button>
    </div>
  )
}
