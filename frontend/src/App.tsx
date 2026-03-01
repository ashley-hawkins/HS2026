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
  const [view, setView] = useState<View>(() => localStorage.getItem('token') ? 'claim' : 'login')
  const [stage, setStage] = useState(1)
  const [vehicles, setVehicles] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('email'))
  const [menuOpen, setMenuOpen] = useState(false)

  function signOut() {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    setUserEmail(null)
    setView('login')
  }

  function requireAuth(action: () => void) {
    if (!localStorage.getItem('token')) {
      setView('login')
    } else {
      action()
    }
  }

  function navigate(action: () => void) {
    action()
    setMenuOpen(false)
  }

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
        {/* Desktop left buttons */}
        <div className="hidden md:flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => requireAuth(() => setView('my-claims'))}
          >
            My Claims
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => requireAuth(startNewClaim)}
          >
            + New Claim
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="btn btn-sm btn-ghost md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop right buttons */}
        <div className="hidden md:flex gap-2 items-center">
          {userEmail ? (
            <>
              <span className="text-sm">{userEmail}</span>
              <button className="btn btn-sm btn-ghost" onClick={signOut}>Sign Out</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-ghost" onClick={() => setView('register')}>Register</button>
              <button className="btn btn-sm btn-secondary btn-outline" onClick={() => setView('login')}>Log In</button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile side drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed top-0 left-0 h-full w-64 bg-base-100 shadow-xl z-50 flex flex-col p-6 gap-3 md:hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-base">Menu</span>
              <button
                className="btn btn-sm btn-ghost btn-circle"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              className="btn btn-ghost justify-start"
              onClick={() => navigate(() => requireAuth(() => setView('my-claims')))}
            >
              My Claims
            </button>
            <button
              className="btn btn-primary justify-start"
              onClick={() => navigate(() => requireAuth(startNewClaim))}
            >
              + New Claim
            </button>

            <div className="divider my-1" />

            {userEmail ? (
              <>
                <span className="text-sm text-base-content/60 px-1 truncate">{userEmail}</span>
                <button className="btn btn-ghost justify-start" onClick={() => { signOut(); setMenuOpen(false) }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost justify-start" onClick={() => navigate(() => setView('register'))}>
                  Register
                </button>
                <button className="btn btn-secondary btn-outline justify-start" onClick={() => navigate(() => setView('login'))}>
                  Log In
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Page content */}
      {view === 'my-claims' && (
        <div className="flex-1 flex items-center justify-center text-base-content/40 text-lg">
          My Claims — coming soon
        </div>
      )}

      {view === 'login' && (
        <Login onSuccess={(email) => { setUserEmail(email); setView('claim') }} onRegister={() => setView('register')} />
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
