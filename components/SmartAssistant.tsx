import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '../lib/i18n'
import { atext, monthLabel } from '../lib/assistantI18n'
import { sendEngagement } from '../lib/engagement'

type Card = { name: string; slug: string; image?: string; region?: string; blurb?: string }
type FollowUp = { intent: 'plan' | 'month' | 'contact' | 'timing' | 'tips' | 'food' | 'popular'; slug?: string; name?: string }
type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  textKey?: string
  cards?: Card[]
  followUps?: FollowUp[]
  rating?: 'up' | 'down'
  question?: string
}

type Profile = { companions?: string; days?: string; budget?: string; interests?: string[]; month?: string }

type PlanOption = { value: string; label: string }
const PLAN_STEPS: { key: keyof Profile; question: string; options: { value: string; label: string }[]; multi?: boolean }[] = [
  { key: 'companions', question: 'qCompanions', options: [{ value: 'solo', label: 'solo' }, { value: 'couple', label: 'couple' }, { value: 'family with kids', label: 'family' }, { value: 'friends', label: 'friends' }] },
  { key: 'days', question: 'qDays', options: [{ value: '2 days', label: 'd1' }, { value: '5 days', label: 'd2' }, { value: '7 days', label: 'd3' }] },
  { key: 'budget', question: 'qBudget', options: [{ value: 'low budget', label: 'bLow' }, { value: 'mid-range', label: 'bMid' }, { value: 'luxury', label: 'bHigh' }] },
  { key: 'interests', question: 'qInterests', multi: true, options: ['beach', 'nature', 'culture', 'food', 'adventure'].map(v => ({ value: v, label: v })) },
  { key: 'month', question: 'qMonth', options: [{ value: 'this', label: 'mThis' }, { value: 'next', label: 'mNext' }, ...['january', 'april', 'august', 'december'].map(v => ({ value: v, label: `m:${v}` }))] },
]

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function resolveMonth(value: string) {
  const now = new Date().getMonth()
  if (value === 'this') return MONTH_NAMES[now]
  if (value === 'next') return MONTH_NAMES[(now + 1) % 12]
  return value
}

export default function SmartAssistant({ destinationSlug, destinationName }: { destinationSlug?: string; destinationName?: string } = {}) {
  const { lang } = useTranslation()
  const tr = (key: string, vars: Record<string, string> = {}) => atext(lang, key, vars)
  const optionLabel = (o: PlanOption) => (o.label.startsWith('m:') ? monthLabel(lang, o.label.slice(2)) : tr(o.label))
  const initialMessage = (): Message => destinationSlug && destinationName
    ? { id: 'm0', role: 'assistant', text: '', textKey: 'askAbout', followUps: [{ intent: 'timing', slug: destinationSlug, name: destinationName }, { intent: 'tips', slug: destinationSlug, name: destinationName }, { intent: 'food', slug: destinationSlug, name: destinationName }, { intent: 'plan' }] }
    : { id: 'm0', role: 'assistant', text: '', textKey: 'greeting', followUps: [{ intent: 'plan' }, { intent: 'popular' }, { intent: 'month' }, { intent: 'contact' }] }
  const [messages, setMessages] = useState<Message[]>([initialMessage()])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile>({})
  const [planStep, setPlanStep] = useState<number | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const userAtBottomRef = useRef(true)
  const shouldAutoScrollRef = useRef(false)
  const messagesRef = useRef<Message[]>(messages)
  messagesRef.current = messages

  const [dynamicSuggestions, setDynamicSuggestions] = useState<{ name: string }[]>([])
  const addMessage = (m: Omit<Message, 'id'>) => {
    shouldAutoScrollRef.current = true
    setMessages(prev => [...prev, { ...m, id: `${Date.now()}-${prev.length}` }])
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const last = messages[messages.length - 1]
    // Auto-scroll only when the user is at (or near) the bottom, or
    // when they just sent a message (shouldAutoScrollRef)
    if (userAtBottomRef.current || shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      shouldAutoScrollRef.current = false
    }
  }, [messages])

  useEffect(() => {
    // fetch dynamic suggestions from API
    let mounted = true
    fetch('/api/suggestions').then(r=>r.json()).then((j)=>{
      if (!mounted) return
      const items = (j?.suggestions || []).slice(0,8).map((d:any)=>({ name: d.name }))
      setDynamicSuggestions(items)
    }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 48
      userAtBottomRef.current = atBottom
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    // initialize
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const requestAssistant = async (text: string, extra: Record<string, unknown> = {}) => {
    const history = messagesRef.current
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.text)
      .slice(-8)
      .map(m => ({ role: m.role, text: m.text }))
    setLoading(true)
    try {
      let data: any = null
      for (let attempt = 1; attempt <= 2 && !data; attempt++) {
        try {
          const res = await fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history, plan: profile, lang, contextSlug: destinationSlug, ...extra }),
          })
          if (!res.ok) throw new Error(`API ${res.status}`)
          data = await res.json()
        } catch (err) {
          if (attempt === 2) throw err
          await new Promise(r => setTimeout(r, 300))
        }
      }
      addMessage({ role: 'assistant', text: data.reply, cards: data.destinations, followUps: data.followUps, question: text })
    } catch (err: any) {
      console.error('assistant error', err)
      addMessage({ role: 'assistant', text: tr('error') })
    } finally {
      setLoading(false)
    }
  }

  const askPlanQuestion = (index: number) => {
    setPlanStep(index)
    setPicked([])
    addMessage({ role: 'assistant', text: tr(PLAN_STEPS[index].question) })
  }

  const startPlan = () => {
    setProfile({})
    askPlanQuestion(0)
  }

  const finishPlan = async (finalProfile: Profile) => {
    setPlanStep(null)
    setProfile(finalProfile)
    addMessage({ role: 'assistant', text: tr('thanks') })
    await requestAssistant(tr('plan'), { mode: 'plan', plan: finalProfile })
  }

  const answerPlan = (answers: { value: string; text: string }[]) => {
    if (planStep === null || !answers.length) return
    const step = PLAN_STEPS[planStep]
    addMessage({ role: 'user', text: answers.map(a => a.text).join(', ') })
    const value = step.key === 'interests'
      ? answers.map(a => a.value.toLowerCase())
      : step.key === 'month' ? resolveMonth(answers[0].value.toLowerCase()) : answers[0].value
    const next = { ...profile, [step.key]: value } as Profile
    setProfile(next)
    if (planStep + 1 < PLAN_STEPS.length) askPlanQuestion(planStep + 1)
    else finishPlan(next)
  }

  const sendIntent = async (label: string, intent: FollowUp['intent'], extra: Record<string, unknown> = {}) => {
    if (intent === 'plan') {
      addMessage({ role: 'user', text: label })
      startPlan()
      return
    }
    addMessage({ role: 'user', text: label })
    await requestAssistant(label, { intent, ...extra })
  }

  const postMessage = async (text: string) => {
    setInput('')
    if (planStep === null && (text.trim().toLowerCase() === tr('plan').toLowerCase() || /^\s*(plan|help me plan)\b.*\btrip\b/i.test(text))) {
      addMessage({ role: 'user', text })
      startPlan()
      return
    }
    if (planStep !== null) {
      const step = PLAN_STEPS[planStep]
      const match = step.options.find(o => optionLabel(o).toLowerCase() === text.toLowerCase())
      if (step.multi) {
        if (match) setPicked(p => (p.includes(match.value) ? p : [...p, match.value]))
        return
      }
      answerPlan([{ value: match ? match.value : text, text }])
      return
    }
    addMessage({ role: 'user', text })
    await requestAssistant(text)
  }

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    postMessage(text)
  }

  const clearChat = () => {
    setMessages([initialMessage()])
    setPlanStep(null)
    setPicked([])
    setProfile({})
    setInput('')
  }

  const rate = (m: Message, rating: 'up' | 'down') => {
    if (m.rating) return
    setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, rating } : x)))
    sendEngagement('assistant_feedback', { rating, question: m.question || '', reply: (m.text || '').slice(0, 500), lang, destination: destinationSlug || null })
  }

  const chipStyle = (active = false): React.CSSProperties => ({ padding: '6px 10px', borderRadius: 18, border: active ? '1px solid #0366d6' : '1px solid #eee', background: active ? '#e8f1fc' : '#fafafa', cursor: loading ? 'not-allowed' : 'pointer' })
  const currentStep = planStep !== null ? PLAN_STEPS[planStep] : null
  const lastFollowUps = messages.length ? messages[messages.length - 1].followUps || [] : []

  const followUpLabel = (f: FollowUp) => {
    const n = f.name || ''
    switch (f.intent) {
      case 'plan': return tr('plan')
      case 'month': return tr('month')
      case 'popular': return tr('popular')
      case 'contact': return tr('contact')
      case 'timing': return tr('bestTimeFor', { n })
      case 'tips': return tr('tipsFor', { n })
      default: return tr('foodIn', { n })
    }
  }

  type Chip = { key: string; label: string; active?: boolean; onClick: () => void }
  const chips: Chip[] = currentStep
    ? currentStep.options.map(o => ({
        key: o.value,
        label: optionLabel(o),
        active: picked.includes(o.value),
        onClick: () => {
          if (currentStep.multi) setPicked(p => (p.includes(o.value) ? p.filter(x => x !== o.value) : [...p, o.value]))
          else answerPlan([{ value: o.value, text: optionLabel(o) }])
        },
      }))
    : [
        ...lastFollowUps.map((f, i) => ({
          key: `${f.intent}-${f.slug || i}`,
          label: followUpLabel(f),
          onClick: () => sendIntent(followUpLabel(f), f.intent, { slug: f.slug }),
        })),
        ...(messages.length === 1 ? dynamicSuggestions.map(d => ({ key: `d-${d.name}`, label: d.name, onClick: () => postMessage(d.name) })) : []),
      ]

  return (
    <div className="chat-shell assistant-chat-shell" style={{ boxSizing: 'border-box', border: 'none', borderRadius: 0, padding: 18, maxWidth: '100%', width: '100%', minWidth: 0, margin: '0 auto' }}>
      <div ref={containerRef} data-chat-body aria-live="polite" style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, height: '100%', overflow: 'auto', padding: 8, background: '#fff' }}>
        {messages.map(m => {
          const isUser = m.role === 'user'
          const body = m.textKey ? tr(m.textKey, { n: destinationName || '' }) : m.text
          return (
          <div key={m.id} className="assistant-message-row" style={{ margin: '10px 0', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', minWidth: 0 }}>
              <div className="assistant-message-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '8px 12px', borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: isUser ? '#0366d6' : '#f1f3f5', color: isUser ? '#fff' : '#111' }} dir="auto">
                {body.split(/(\/contact\b)/).map((part, i) => part === '/contact'
                  ? <Link key={i} href="/contact" style={{ color: isUser ? '#fff' : '#0366d6', textDecoration: 'underline' }}>{tr('contactLink')}</Link>
                  : <React.Fragment key={i}>{part}</React.Fragment>)}
              </div>
              {m.cards && m.cards.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8, paddingBottom: 4 }}>
                  {m.cards.map(card => (
                    <Link key={card.slug} href={`/destination/${card.slug}`} style={{ flex: '0 0 150px', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', color: '#111', background: '#fff' }}>
                      {card.image && <img src={card.image} alt={card.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />}
                      <div style={{ padding: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{card.name}</div>
                        {card.region && <div style={{ fontSize: 12, color: '#666' }}>{card.region}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {m.question && (
                <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#666' }}>
                  {m.rating ? <span>{tr('thanksFeedback')}</span> : (
                    <>
                      <button type="button" aria-label={tr('helpful')} title={tr('helpful')} onClick={() => rate(m, 'up')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>👍</button>
                      <button type="button" aria-label={tr('notHelpful')} title={tr('notHelpful')} onClick={() => rate(m, 'down')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>👎</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          )
        })}
        {loading && (
          <div className="assistant-message-row" style={{ margin: '10px 0', display: 'flex' }}>
            <div style={{ padding: '8px 12px', borderRadius: '14px 14px 14px 2px', background: '#f1f3f5', color: '#888' }}>{tr('typing')}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="assistant-suggestions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={() => { if (!loading) c.onClick() }} style={chipStyle(c.active)} disabled={loading} title={c.label}>
              {c.label}
            </button>
          ))}
          {currentStep?.multi && (
            <button type="button" onClick={() => answerPlan(picked.map(v => ({ value: v, text: tr(v) })))} disabled={loading || !picked.length} style={{ ...chipStyle(true), fontWeight: 600 }}>
              {tr('done')}
            </button>
          )}
          {currentStep && (
            <button type="button" onClick={() => { setPlanStep(null); setPicked([]); addMessage({ role: 'assistant', text: tr('cancelled'), followUps: [{ intent: 'plan' }] }) }} style={chipStyle()}>
              {tr('cancel')}
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="assistant-input-form" style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="Message"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={loading ? tr('phWait') : currentStep ? tr('phPick') : tr('phAsk')}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: '8px 12px', borderRadius: 6 }}>
          {tr('send')}
        </button>
        <button type="button" onClick={clearChat} disabled={loading || messages.length <= 1} style={{ padding: '8px 12px', borderRadius: 6 }}>
          {tr('clear')}
        </button>
        </form>
      </div>
    </div>
  )
}
