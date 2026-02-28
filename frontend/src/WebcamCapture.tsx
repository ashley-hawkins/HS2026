import { useEffect, useRef, useState } from 'react'

interface WebcamCaptureProps {
  onCapture?: (dataUrl: string) => void
}

export function WebcamCapture({ onCapture }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setError('Could not access camera. Please allow camera permissions.')
        console.error(err)
      }
    }

    startCamera()

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/png')
    setPhoto(dataUrl)
    onCapture?.(dataUrl)
  }

  function retake() {
    setPhoto(null)
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 min-h-0">
      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className={photo ? 'hidden' : 'flex flex-col items-center gap-4 w-full min-h-0 flex-1 overflow-hidden'}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="rounded-xl h-full aspect-video object-cover bg-base-200"
            />
            <button className="btn btn-primary my-2" onClick={takePhoto}>
              Take Photo
            </button>
          </div>

          {photo && (
            <div className="flex flex-col items-center gap-4 w-full">
              <img src={photo} alt="Captured photo" className="rounded-xl w-full aspect-video object-cover" />
              <button className="btn btn-outline" onClick={retake}>
                Retake
              </button>
            </div>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
