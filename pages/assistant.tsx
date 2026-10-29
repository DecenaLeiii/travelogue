import React from 'react'
import SmartAssistant from '../components/SmartAssistant'

export default function AssistantPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Smart Assistant</h1>
      <p>Use this assistant to ask about the app, destinations, or translations.</p>
      <SmartAssistant />
    </div>
  )
}
