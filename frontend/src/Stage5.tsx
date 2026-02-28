import { useState } from 'react'

const FACES = [
  { level: 1, emoji: '😞', label: 'Very unhappy' },
  { level: 2, emoji: '😕', label: 'Unhappy' },
  { level: 3, emoji: '😐', label: 'Neutral' },
  { level: 4, emoji: '🙂', label: 'Happy' },
  { level: 5, emoji: '😄', label: 'Very happy' },
]

export default function Stage5() {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (selected === null) return
    // TODO: send satisfaction rating to backend
    // await fetch('/api/satisfaction', { method: 'POST', body: JSON.stringify({ rating: selected }) })
    setSubmitted(true)
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
            <span className="text-5xl">{face.emoji}</span>
            <span className="text-xs text-base-content/60">{face.label}</span>
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary w-full max-w-xs"
        disabled={selected === null}
        onClick={handleSubmit}
      >
        Submit
      </button>
    </div>
  )
}
