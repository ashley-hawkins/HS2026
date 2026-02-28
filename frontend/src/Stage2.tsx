import { useState } from 'react'

interface Stage2Props {
  onComplete: (vehicles: string[]) => void
}

export default function Stage2({ onComplete }: Stage2Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length

  async function handleSubmit() {
    if (wordCount < 10 || wordCount > 15) {
      setError('Please write between 10 and 15 words.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      // TODO: send description to backend and receive vehicle list
      // const res = await fetch('/api/describe', { method: 'POST', body: JSON.stringify({ description: text }) })
      // const data = await res.json()
      // onComplete(data.vehicles)

      // Placeholder response
      onComplete(['Car', 'Truck'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Describe what happened</h2>
        <p className="text-base-content/60 text-sm">Write a brief explanation in 10–15 words</p>
      </div>

      <div className="w-full">
        <textarea
          className="textarea textarea-bordered w-full h-32 text-base resize-none"
          placeholder="e.g. I was rear-ended at a traffic light while waiting for it to change..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className={`text-sm mt-1 text-right ${wordCount > 15 ? 'text-error' : wordCount >= 10 ? 'text-success' : 'text-base-content/50'}`}>
          {wordCount} / 10–15 words
        </div>
      </div>

      {error && <div className="alert alert-error w-full"><span>{error}</span></div>}

      <button
        className="btn btn-primary w-full"
        disabled={submitting || wordCount < 10 || wordCount > 15}
        onClick={handleSubmit}
      >
        {submitting ? <span className="loading loading-spinner" /> : 'Submit'}
      </button>
    </div>
  )
}
