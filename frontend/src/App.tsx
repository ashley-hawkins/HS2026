import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { WebcamCapture } from './WebcamCapture'

export function App() {

  return (
    <div className="h-full w-full flex flex-col">
      <h1 className="text-3xl font-bold text-center">Submit a claim</h1>
      <WebcamCapture></WebcamCapture>
      {/* spacer */}
      <div className="flex-0"></div>
      <progress className="progress progress-accent" value="70" max="100"></progress>
    </div>
  )
}
