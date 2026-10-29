import React, { useState } from 'react'
import SmartAssistant from './SmartAssistant'

export default function FloatingAssistant({ destinationSlug, destinationName }: { destinationSlug?: string; destinationName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="floating-assistant-button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide assistant' : 'Open assistant'}
        title={open ? 'Hide assistant' : 'Open assistant'}
      >
        <span className="assistant-bubble">AI</span>
      </button>
      {open && (
        <div className="assistant-panel open assistant-floating-panel">
          <div className="assistant-floating-shell" style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="assistant-close-button">×</button>
            <div className="assistant-floating-chat">
              <SmartAssistant destinationSlug={destinationSlug} destinationName={destinationName} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
