import { apiFetch } from './fetch'
import { SYS_BASE, SYS_WEB } from '../utils/constants'

// ─── Anthropic / Claude ───────────────────────────────────────────────────────
export async function callAnthropic(prompt, _key, webCtx, history = []) {
  const sys  = webCtx ? SYS_WEB(webCtx.summary) : SYS_BASE
  const msgs = [...history, { role: 'user', content: prompt }]

  const r = await apiFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: sys,
      messages: msgs,
    }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `Anthropic ${r.status}`)
  const text = d.content?.[0]?.text || 'No response'
  return { text, in: d.usage?.input_tokens || 0, out: d.usage?.output_tokens || 0 }
}

// ─── OpenAI / GPT-4o ─────────────────────────────────────────────────────────
export async function callOpenAI(prompt, key, webCtx, history = []) {
  if (!key) throw new Error('OpenAI API key required — add in Config ⚙')
  const sys  = webCtx ? SYS_WEB(webCtx.summary) : SYS_BASE
  const msgs = [{ role: 'system', content: sys }, ...history, { role: 'user', content: prompt }]

  const r = await apiFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 2000, messages: msgs }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `OpenAI ${r.status}`)
  const text = d.choices?.[0]?.message?.content || 'No response'
  return { text, in: d.usage?.prompt_tokens || 0, out: d.usage?.completion_tokens || 0 }
}

// ─── Google / Gemini ─────────────────────────────────────────────────────────
export async function callGemini(prompt, key, webCtx, history = []) {
  if (!key) throw new Error('Gemini API key required — add in Config ⚙')
  const prefix = webCtx ? `[LIVE WEB DATA]\n${webCtx.summary}\n\n` : ''
  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: prefix + prompt }] },
  ]

  const r = await apiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 2000 },
        systemInstruction: { parts: [{ text: SYS_BASE }] },
      }),
    },
  )

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `Gemini ${r.status}`)
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
  return {
    text,
    in:  d.usageMetadata?.promptTokenCount    || 0,
    out: d.usageMetadata?.candidatesTokenCount || 0,
  }
}

// ─── Groq / Llama 3 ──────────────────────────────────────────────────────────
export async function callGroq(prompt, key, webCtx, history = []) {
  if (!key) throw new Error('Groq API key required — add in Config ⚙')
  const sys  = webCtx ? SYS_WEB(webCtx.summary) : SYS_BASE
  const msgs = [{ role: 'system', content: sys }, ...history, { role: 'user', content: prompt }]

  const r = await apiFetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama3-70b-8192', max_tokens: 2000, messages: msgs }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `Groq ${r.status}`)
  const text = d.choices?.[0]?.message?.content || 'No response'
  return { text, in: d.usage?.prompt_tokens || 0, out: d.usage?.completion_tokens || 0 }
}

// ─── Mistral ─────────────────────────────────────────────────────────────────
export async function callMistral(prompt, key, webCtx, history = []) {
  if (!key) throw new Error('Mistral API key required — add in Config ⚙')
  const sys  = webCtx ? SYS_WEB(webCtx.summary) : SYS_BASE
  const msgs = [{ role: 'system', content: sys }, ...history, { role: 'user', content: prompt }]

  const r = await apiFetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'mistral-large-latest', max_tokens: 2000, messages: msgs }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `Mistral ${r.status}`)
  const text = d.choices?.[0]?.message?.content || 'No response'
  return { text, in: d.usage?.prompt_tokens || 0, out: d.usage?.completion_tokens || 0 }
}

// ─── Cohere ──────────────────────────────────────────────────────────────────
export async function callCohere(prompt, key, webCtx, history = []) {
  if (!key) throw new Error('Cohere API key required — add in Config ⚙')
  const sys  = webCtx ? SYS_WEB(webCtx.summary) : SYS_BASE
  const msgs = [...history, { role: 'user', content: prompt }]

  const r = await apiFetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'command-r-plus', max_tokens: 2000, system: sys, messages: msgs }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.message || `Cohere ${r.status}`)
  const text = d.message?.content?.[0]?.text || 'No response'
  return {
    text,
    in:  d.usage?.billed_units?.input_tokens  || 0,
    out: d.usage?.billed_units?.output_tokens || 0,
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const CALLERS = {
  anthropic: callAnthropic,
  openai:    callOpenAI,
  gemini:    callGemini,
  groq:      callGroq,
  mistral:   callMistral,
  cohere:    callCohere,
}
