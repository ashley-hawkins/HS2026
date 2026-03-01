import { useState } from 'react'
import Stage1 from './Stage1'
import Stage2 from './Stage2'
import Stage3 from './Stage3'
import Stage4 from './Stage4'
import Stage5 from './Stage5'
import Login from './Login'
import Register from './Register'

const STAGE_LABELS = [
  'ID Verification',
  'Description',
  'Incident Map',
  'Review Summary',
  'Feedback',
]

const TOTAL_STAGES = 5

type View = 'claim' | 'my-claims' | 'login' | 'register'

export function App() {
  const [view, setView] = useState<View>('claim')
  const [stage, setStage] = useState(1)
  const [vehicles, setVehicles] = useState<string[]>([])
  const [summary, setSummary] = useState('')

  const progress = ((stage - 1) / (TOTAL_STAGES - 1)) * 100

  function startNewClaim() {
    setStage(1)
    setVehicles([])
    setSummary('')
    setView('claim')
  }

  return (
    <div className="h-full w-full flex flex-col max-h-screen overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-2 bg-base-100 border-b border-base-300 shrink-0">
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setView('my-claims')}
          >
            My Claims
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={startNewClaim}
          >
            + New Claim
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setView('register')}
          >
            Register
          </button>
          <button
            className="btn btn-sm btn-secondary btn-outline"
            onClick={() => setView('login')}
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Page content */}
      {view === 'my-claims' && (
        <div className="flex-1 flex items-center justify-center text-base-content/40 text-lg">
          My Claims — coming soon
        </div>
      )}

      {view === 'login' && (
        <Login onSuccess={() => setView('claim')} />
      )}

      {view === 'register' && (
        <Register onSuccess={() => setView('claim')} />
      )}

      {view === 'claim' && (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-center">Submit a claim</h1>
            <p className="text-center text-base-content/50 text-sm mt-1">
              Step {stage} of {TOTAL_STAGES} — {STAGE_LABELS[stage - 1]}
            </p>
          </div>

          {/* Stage content */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {stage === 1 && (
              <Stage1 onComplete={() => setStage(2)} />
            )}
            {stage === 2 && (
              <Stage2 onComplete={v => { setVehicles(v); setStage(3) }} />
            )}
            {stage === 3 && (
              <Stage3 vehicles={vehicles} onComplete={s => { setSummary(s); setStage(4) }} />
            )}
            {stage === 4 && (
              <Stage4 initialSummary={summary} onComplete={() => setStage(5)} />
            )}
            {stage === 5 && (
              <Stage5 />
            )}
          </div>

          {/* Progress bar */}
          <div>
            <progress
              className="progress progress-primary w-full"
              value={progress}
              max="100"
            />
            <div className="flex justify-between mt-1">
              {STAGE_LABELS.map((label, i) => (
                <span
                  key={i}
                  className={`text-xs ${i + 1 <= stage ? 'text-primary font-medium' : 'text-base-content/30'}`}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
