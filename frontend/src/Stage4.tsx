import { useState } from 'react'

interface Stage4Props {
  initialSummary: string
  onComplete: (text: string) => void
}

export default function Stage4({ initialSummary, onComplete }: Stage4Props) {
  const [text, setText] = useState(initialSummary)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      onComplete(text.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Review your claim summary</h2>
        <p className="text-base-content/60 text-sm">Edit the text below if anything needs correcting</p>
      </div>

      <textarea
        className="textarea textarea-bordered w-full text-base resize-none"
        style={{ minHeight: '24rem' }}
        value={text}
        onChange={e => setText(e.target.value)}
      />

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
