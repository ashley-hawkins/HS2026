import { useState } from 'react'

interface Stage2Props {
  onComplete: (description: string) => void
}

export default function Stage2({ onComplete }: Stage2Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      onComplete(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Describe what happened</h2>
        <p className="text-base-content/60 text-sm">Write a description of the incident in your own words</p>
      </div>

      <div className="w-full">
        <textarea
          className="textarea textarea-bordered w-full h-32 text-base resize-none"
          placeholder="e.g. I was rear-ended at a traffic light while waiting for it to change..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary w-full"
        disabled={submitting || text.trim() === ''}
        onClick={handleSubmit}
      >
        {submitting ? <span className="loading loading-spinner" /> : 'Submit'}
      </button>
    </div>
  )
}
