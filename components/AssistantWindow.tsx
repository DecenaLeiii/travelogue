import React from 'react'
import SmartAssistant from './SmartAssistant'

export function AssistantBubbleIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3C6.9 3 3 6.6 3 11.1c0 2.4 1.2 4.5 3.1 6V21l3.3-1.9c.8.2 1.7.3 2.6.3 5.1 0 9-3.6 9-8.1S17.1 3 12 3z" fill="#fff" />
      <circle cx="8" cy="11.2" r="1.2" fill="#1877f2" />
      <circle cx="12" cy="11.2" r="1.2" fill="#1877f2" />
      <circle cx="16" cy="11.2" r="1.2" fill="#1877f2" />
    </svg>
  )
}

export default function AssistantWindow({ onClose, destinationSlug, destinationName }: { onClose: () => void; destinationSlug?: string; destinationName?: string }) {
  return (
    <div className="assistant-panel open assistant-floating-panel" onClick={(e) => e.stopPropagation()}>
      <div className="assistant-floating-shell" style={{ position: 'relative' }}>
        <div className="assistant-window-header">
          <span className="assistant-window-avatar" aria-hidden="true">
            <AssistantBubbleIcon />
          </span>
          <span className="assistant-window-title">
            <strong>Smart Assistant</strong>
            <small>Ask about destinations and contacts</small>
          </span>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="assistant-close-button">
            ×
          </button>
        </div>
        <div className="assistant-floating-chat">
          <SmartAssistant destinationSlug={destinationSlug} destinationName={destinationName} />
        </div>
      </div>
    </div>
  )
}
