import { useState } from 'react'

interface RegisterProps {
  onSuccess?: () => void
}

export default function Register({ onSuccess }: RegisterProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = password.length > 0 && password === repeat

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordsMatch) return
    setSubmitting(true)
    try {
      // TODO: call register API
      onSuccess?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="card bg-base-100 border border-base-300 shadow-sm w-full max-w-sm p-8 flex flex-col gap-5"
      >
        <h2 className="text-2xl font-bold text-center">Create Account</h2>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            className="input input-bordered w-full"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="input input-bordered w-full"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="reg-repeat">Repeat Password</label>
          <input
            id="reg-repeat"
            type="password"
            className={`input input-bordered w-full ${repeat.length > 0 && !passwordsMatch ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={repeat}
            onChange={e => setRepeat(e.target.value)}
            required
          />
          {repeat.length > 0 && !passwordsMatch && (
            <p className="text-error text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full mt-1"
          disabled={!passwordsMatch || submitting}
        >
          {submitting ? <span className="loading loading-spinner" /> : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
