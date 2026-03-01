import { useEffect, useState } from 'react'

interface Claim {
  id: number
  content: string
  created_at: string
}

export default function MyClaims() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch('http://localhost:8000/claims', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        if (!res.ok) throw new Error('Failed to load claims')
        setClaims(await res.json())
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchClaims()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="alert alert-error max-w-sm"><span>{error}</span></div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
      <h1 className="text-2xl font-bold">My Claims</h1>

      {claims.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-base-content/40">
          No claims submitted yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr key={claim.id}>
                  <td className="font-mono text-sm">{claim.id}</td>
                  <td className="max-w-xs truncate">{claim.content}</td>
                  <td className="text-sm text-base-content/60 whitespace-nowrap">
                    {new Date(claim.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
