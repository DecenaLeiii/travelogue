import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import AssistantWindow, { AssistantBubbleIcon } from './AssistantWindow'

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
        <span className="assistant-bubble" aria-hidden="true">
          <AssistantBubbleIcon />
        </span>
      </button>
      {open && createPortal(
        <AssistantWindow onClose={() => setOpen(false)} destinationSlug={destinationSlug} destinationName={destinationName} />,
        document.body
      )}
    </>
  )
}
