import { useState } from 'react'
import type { Stage1TaskResult } from './App'

const FACES = [
  { level: 1, key: 'sad', label: 'Very unhappy' },
  { level: 5, key: 'happy', label: 'Very happy' },
]

export default function Stage5(props: {
  stage1TaskResult: Stage1TaskResult | null
  claimReport: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (selected === null) return
    setSubmitting(true)
    try {
      await fetch('http://localhost:8000/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content: props.claimReport }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto text-center">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold">Claim submitted!</h2>
        <p className="text-base-content/60">Thank you for your feedback. We'll be in touch soon.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">How satisfied are you?</h2>
        <p className="text-base-content/60 text-sm">Rate your experience with the help you received today</p>
      </div>

      <div className="flex gap-3 w-full justify-center">
        {FACES.map(face => (
          <button
            key={face.level}
            onClick={() => setSelected(face.level)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 flex-1 transition-all cursor-pointer
              ${selected === face.level
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-base-300 bg-base-200 hover:border-primary/50'
              }`}
          >
            {
              props.stage1TaskResult ? (
                <img
                  src={face.key === 'happy'
                    ? `data:image/png;base64,${props.stage1TaskResult.happyFaceBase64}`
                    : `data:image/png;base64,${props.stage1TaskResult.sadFaceBase64}`}
                  alt={face.label}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <span className="loading loading-spinner w-32 h-32" />
              )
            }
            <span className="text-xs text-base-content/60">{face.label}</span>
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary w-full max-w-xs"
        disabled={selected === null || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <span className="loading loading-spinner" /> : 'Submit'}
      </button>
    </div>
  )
}
