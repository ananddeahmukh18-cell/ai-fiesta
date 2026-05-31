/**
 * AgentFlow — Master App
 * Combines: af1 repo + af2 repo + AIFiesta.jsx + agentflow.html
 * Features: 6 agents · live web search · voice (EN/HI/MR) · synthesis engine
 *           typewriter · code runner · follow-ups · dark/light · export MD+JSON
 *           per-agent history · progress bars · token counter · task history
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTypewriter }  from './hooks/useTypewriter'
import { useVoice }       from './hooks/useVoice'
import { usePersist }     from './hooks/usePersist'
import { CALLERS }        from './api/callers'
import { fetchWebContext } from './api/webSearch'
import { exportMarkdown, exportJSON } from './utils/export'
import { runJavaScript }  from './utils/codeRunner'
import {
  AGENTS, TASK_TYPES, TYPE_COLORS, TYPE_ICONS, VOICE_LANGS,
  STATUS, SYS_BASE, INITIAL_HISTORY,
} from './utils/constants'

// ─── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:'#0c0b0a', surface:'rgba(255,255,255,0.03)', surfaceHi:'rgba(255,255,255,0.07)',
    border:'rgba(255,255,255,0.08)', borderHi:'rgba(255,255,255,0.18)',
    text:'#f0ede8', textMid:'#a09890', textLow:'#666', textFaint:'#3a3835',
    inputBg:'rgba(0,0,0,0.35)', card:'rgba(255,255,255,0.025)',
    scroll:'#2a2825', navBg:'rgba(12,11,10,0.93)',
  },
  light: {
    bg:'#f4f3f1', surface:'rgba(0,0,0,0.03)', surfaceHi:'rgba(0,0,0,0.06)',
    border:'rgba(0,0,0,0.1)', borderHi:'rgba(0,0,0,0.2)',
    text:'#1a1917', textMid:'#5a5550', textLow:'#888', textFaint:'#bbb',
    inputBg:'rgba(255,255,255,0.9)', card:'rgba(255,255,255,0.8)',
    scroll:'#ccc', navBg:'rgba(244,243,241,0.95)',
  },
}

const initMap = v => Object.fromEntries(AGENTS.map(a => [a.id, typeof v === 'function' ? v(a) : v]))

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────
function CopyBtn({ text, T }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, fontSize:11,
        background: ok ? 'rgba(52,211,153,0.12)' : T.surface,
        border: `1px solid ${ok ? 'rgba(52,211,153,0.3)' : T.border}`,
        color: ok ? '#34d399' : T.textLow, cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap' }}>
      {ok ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function Badge({ status, color }) {
  const map = {
    idle:      { l:'IDLE',      bg:'rgba(255,255,255,0.04)', c:'#555' },
    searching: { l:'SEARCHING', bg:`${color}22`, c: color },
    running:   { l:'RUNNING',   bg:`${color}22`, c: color },
    done:      { l:'DONE',      bg:`${color}22`, c: color },
    error:     { l:'ERROR',     bg:'rgba(248,113,113,0.15)', c:'#f87171' },
  }
  const s = map[status] || map.idle
  return (
    <span style={{ fontSize:9, fontFamily:'monospace', letterSpacing:'0.09em', padding:'3px 8px',
      borderRadius:20, background: s.bg, color: s.c, border:`1px solid ${s.c}33`,
      display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap', flexShrink:0 }}>
      {(status === 'running' || status === 'searching') &&
        <span style={{ width:5, height:5, borderRadius:'50%', background:color, animation:'p 1s infinite' }}/>}
      {s.l}
    </span>
  )
}

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ code, lang, T }) {
  const [out, setOut] = useState(null)
  const isJS = !lang || /^(js|javascript|jsx|ts|typescript)$/.test(lang)
  return (
    <div style={{ margin:'10px 0', borderRadius:10, overflow:'hidden', border:`1px solid ${T.border}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px', background:'rgba(0,0,0,0.4)' }}>
        <span style={{ fontSize:10, color:'#666', fontFamily:'monospace' }}>{lang || 'code'}</span>
        <div style={{ display:'flex', gap:6 }}>
          <CopyBtn text={code} T={T}/>
          {isJS && (
            <button onClick={() => setOut(runJavaScript(code))}
              style={{ padding:'3px 8px', borderRadius:6, fontSize:10, background:'rgba(217,119,87,0.15)',
                border:'1px solid rgba(217,119,87,0.3)', color:'#D97757', cursor:'pointer' }}>
              ▶ Run
            </button>
          )}
        </div>
      </div>
      <pre style={{ margin:0, padding:'12px 14px', background:'rgba(0,0,0,0.35)', color:'#c0bab3',
        fontSize:12, lineHeight:1.65, overflowX:'auto', fontFamily:"'Fira Code',monospace",
        whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{code}</pre>
      {out && (
        <div style={{ padding:'10px 14px',
          background: out.error ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.06)',
          borderTop:`1px solid ${T.border}` }}>
          <pre style={{ margin:0, fontSize:11, color: out.error ? '#f87171' : '#34d399',
            fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{out.error || out.output}</pre>
        </div>
      )}
    </div>
  )
}

// ─── RICH TEXT (markdown-lite + code blocks) ──────────────────────────────────
function Rich({ text, T }) {
  if (!text) return null
  const parts = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t:'text', c: text.slice(last, m.index) })
    parts.push({ t:'code', lang: m[1], c: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ t:'text', c: text.slice(last) })
  return (
    <>
      {parts.map((p, i) => p.t === 'code'
        ? <CodeBlock key={i} code={p.c} lang={p.lang} T={T}/>
        : <span key={i} style={{ fontSize:13, lineHeight:1.8, color:T.textMid,
            whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{p.c}</span>
      )}
    </>
  )
}

// ─── AGENT CARD ───────────────────────────────────────────────────────────────
function AgentCard({ agent, status, result, progress, error, elapsed, tokens, onFollowUp, T }) {
  const isR  = status === 'running'
  const isS  = status === 'searching'
  const isDone = status === 'done'
  const isErr  = status === 'error'
  const active = isR || isS
  const typed    = useTypewriter(result, isDone, 9)
  const allTyped = isDone && typed.length >= (result?.length || 0)
  const [fu, setFu]       = useState('')
  const [showFu, setShowFu] = useState(false)
  const totalTok = (tokens?.in || 0) + (tokens?.out || 0)

  return (
    <article style={{
      background: isDone ? `linear-gradient(145deg,${agent.color}0d,${T.card})` : T.card,
      border: `1px solid ${isDone ? agent.color+'50' : isErr ? 'rgba(248,113,113,0.35)' : active ? agent.color+'40' : T.border}`,
      borderRadius:18, padding:'clamp(14px,3vw,20px)', position:'relative', overflow:'hidden',
      transition:'border-color 0.4s,box-shadow 0.4s',
      boxShadow: isDone ? `0 0 28px ${agent.color}18` : '0 2px 8px rgba(0,0,0,0.2)',
      display:'flex', flexDirection:'column',
    }}>
      {/* glow overlay */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background: isDone ? `radial-gradient(ellipse at top left,${agent.color}10,transparent 65%)` : 'transparent',
        transition:'background 0.6s' }}/>
      {/* shimmer */}
      {active && <div style={{ position:'absolute', top:0, left:'-100%', width:'100%', height:'100%',
        background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent)',
        animation:'sh 2s ease-in-out infinite', pointerEvents:'none' }}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12, position:'relative' }}>
        <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
          background:`${agent.color}20`, border:`1px solid ${agent.color}44`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:17, color:agent.color,
          boxShadow: active ? `0 0 16px ${agent.color}55` : 'none', transition:'box-shadow 0.3s' }}>
          {active ? <span style={{ display:'inline-block', animation:'sp 1.4s linear infinite' }}>⟳</span> : agent.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{agent.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:T.textLow }}>{agent.specialty}</span>
            {agent.hasWeb && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:99,
              background:'rgba(66,133,244,0.15)', color:'#93c5fd', border:'1px solid rgba(66,133,244,0.2)' }}>🌐</span>}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
          <Badge status={status} color={agent.color}/>
          {isDone && elapsed > 0 && <span style={{ fontSize:9, color:T.textFaint, fontFamily:'monospace' }}>{(elapsed/1000).toFixed(1)}s</span>}
          {isDone && totalTok > 0 && <span style={{ fontSize:9, color:T.textFaint, fontFamily:'monospace' }}>{totalTok.toLocaleString()} tok</span>}
        </div>
      </div>

      {status === 'idle' && <p style={{ fontSize:11, color:T.textFaint, lineHeight:1.6, marginBottom:4 }}>{agent.desc}</p>}
      {isS && <p style={{ fontSize:11, color:'#93c5fd', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><span style={{ animation:'p 1.2s infinite' }}>🌐</span>Fetching live internet data…</p>}

      {/* Progress bar */}
      {active && (
        <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:2, marginBottom:10, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`,
            background:`linear-gradient(90deg,${agent.color},${agent.accent})`,
            borderRadius:2, transition:'width 0.25s ease' }}/>
        </div>
      )}
      {/* Bouncing dots */}
      {active && (
        <div style={{ display:'flex', gap:4, justifyContent:'center', padding:'6px 0' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%',
            background:agent.color, opacity:0.7,
            animation:`bo 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
        </div>
      )}

      {/* Result with typewriter */}
      {isDone && result && (
        <div style={{ flex:1, background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'12px 14px',
          borderLeft:`2px solid ${agent.color}`, animation:'fi 0.45s ease', overflow:'hidden' }}>
          <Rich text={typed} T={T}/>
          {!allTyped && <span style={{ animation:'bl 0.9s step-end infinite', color:agent.color }}> ▍</span>}
        </div>
      )}
      {isErr && (
        <div style={{ fontSize:12, color:'#f87171', lineHeight:1.6, padding:'10px 12px',
          background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>
          ⚠ {error || 'API error — check your key in Config ⚙'}
        </div>
      )}

      {/* Action row */}
      {isDone && allTyped && (
        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <CopyBtn text={result} T={T}/>
          <button onClick={() => setShowFu(s => !s)}
            style={{ padding:'4px 10px', borderRadius:8, fontSize:11, background:T.surface,
              border:`1px solid ${T.border}`, color:T.textLow, cursor:'pointer' }}>
            💬 Follow-up
          </button>
        </div>
      )}

      {/* Follow-up input */}
      {showFu && isDone && (
        <div style={{ marginTop:8, display:'flex', gap:6 }}>
          <input value={fu} onChange={e => setFu(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && fu.trim()) { onFollowUp(agent.id, fu); setFu(''); setShowFu(false) } }}
            placeholder="Ask a follow-up…"
            style={{ flex:1, background:T.inputBg, border:`1px solid ${T.border}`,
              borderRadius:8, padding:'8px 12px', color:T.text, fontSize:12, outline:'none' }}/>
          <button onClick={() => { if (fu.trim()) { onFollowUp(agent.id, fu); setFu(''); setShowFu(false) } }}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:12,
              background:`linear-gradient(135deg,${agent.color},${agent.accent})`,
              border:'none', color:'#fff', cursor:'pointer', fontWeight:700 }}>→</button>
        </div>
      )}
    </article>
  )
}

// ─── VOICE BAR ────────────────────────────────────────────────────────────────
function VoiceBar({ onTranscript, T }) {
  const [lang, setLang] = useState('en-IN')
  const { listening, supported, interim, start, stop } = useVoice(onTranscript, lang)
  if (!supported) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
      background: listening ? 'rgba(239,68,68,0.08)' : T.surface,
      border: `1px solid ${listening ? 'rgba(239,68,68,0.3)' : T.border}`,
      borderRadius:12, marginBottom:12, transition:'all 0.2s', flexWrap:'wrap' }}>
      <button onClick={listening ? stop : start}
        style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
          border:`2px solid ${listening ? '#f87171' : 'rgba(217,119,87,0.5)'}`,
          background: listening ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,87,0.1)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:16, transition:'all 0.2s', animation: listening ? 'pu 1s ease-in-out infinite' : 'none' }}>
        {listening ? '⏹' : '🎤'}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        {listening
          ? <span style={{ fontSize:12, color:'#f87171', fontStyle:'italic' }}>{interim || 'Listening… speak now'}</span>
          : <span style={{ fontSize:12, color:T.textLow }}>Tap 🎤 to speak in English, हिन्दी or मराठी</span>}
      </div>
      <select value={lang} onChange={e => setLang(e.target.value)}
        style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8,
          padding:'5px 8px', color:T.text, fontSize:11, cursor:'pointer', flexShrink:0 }}>
        {VOICE_LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
      </select>
    </div>
  )
}

// ─── SYNTHESIS PANEL ──────────────────────────────────────────────────────────
function SynthPanel({ results, prompt, webCtx, autoRun, T }) {
  const [txt, setTxt]       = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const lastQ  = useRef('')
  const hasRun = useRef(false)

  useEffect(() => {
    if (prompt !== lastQ.current) { setTxt(''); setDone(false); lastQ.current = prompt; hasRun.current = false }
  }, [prompt])

  const run = useCallback(async () => {
    if (loading || hasRun.current) return
    hasRun.current = true; setLoading(true); setTxt(''); setDone(false)
    const ctx = Object.entries(results)
      .map(([id, t]) => `**${AGENTS.find(a => a.id === id)?.name || id}**:\n${t}`)
      .join('\n\n---\n\n')
    const p = `You are a synthesis engine. Task: "${prompt}"${webCtx ? '\n\nAll agents had live internet data.' : ''}\n\nAgent responses:\n\n${ctx}\n\nProvide:\n1. **Key Agreements** — what all models agree on\n2. **Differences** — contradictions or unique views\n3. **Best Insights** — standout points per agent\n4. **Final Answer** — your consolidated recommendation\n\nMatch the language used (English/Hindi/Marathi).`
    try {
      const { text } = await CALLERS.anthropic(p, null, null, [])
      setTxt(text); setDone(true)
    } catch (e) {
      setTxt(`Synthesis error: ${e.message}`); setDone(true)
    }
    setLoading(false)
  }, [results, prompt, webCtx, loading])

  useEffect(() => {
    if (autoRun && Object.keys(results).length > 0 && !hasRun.current && !loading && !done) run()
  }, [autoRun, results, loading, done, run])

  const typed    = useTypewriter(txt, done, 7)
  const allTyped = done && typed.length >= (txt?.length || 0)
  if (!Object.keys(results).length) return null

  return (
    <div style={{ marginTop:16, background:'linear-gradient(145deg,rgba(217,119,87,0.07),rgba(66,133,244,0.04),rgba(255,255,255,0.02))',
      border:`1px solid ${T.borderHi}`, borderRadius:18, padding:'20px 22px',
      animation:'fi 0.4s ease', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:'linear-gradient(90deg,transparent,#D97757,#4285F4,transparent)' }}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: done||loading ? 16 : 0, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9,
            background:'linear-gradient(135deg,rgba(217,119,87,0.25),rgba(66,133,244,0.15))',
            border:'1px solid rgba(217,119,87,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✦</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text }}>Synthesis Engine</div>
            <div style={{ fontSize:10, color:T.textLow, marginTop:1 }}>
              Claude meta-analyzes all responses{webCtx ? ' · web-grounded' : ''}{autoRun ? ' · auto' : ''}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {!loading && !done && (
            <button onClick={run}
              style={{ padding:'8px 16px', borderRadius:12, fontSize:12,
                background:'linear-gradient(135deg,#D97757,#4285F4)',
                border:'none', color:'#fff', fontWeight:700, cursor:'pointer',
                boxShadow:'0 4px 16px rgba(217,119,87,0.3)' }}>
              ✦ Synthesize All
            </button>
          )}
          {loading && <span style={{ fontSize:12, color:'#D97757', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ animation:'sp 1.2s linear infinite', display:'inline-block' }}>⟳</span>Synthesizing…
          </span>}
          {done && (
            <div style={{ display:'flex', gap:6 }}>
              <CopyBtn text={txt} T={T}/>
              <button onClick={() => { setTxt(''); setDone(false); hasRun.current = false }}
                style={{ padding:'4px 10px', borderRadius:8, fontSize:11, background:T.surface,
                  border:`1px solid ${T.border}`, color:T.textLow, cursor:'pointer' }}>↺</button>
            </div>
          )}
        </div>
      </div>
      {(done || loading) && (
        <>
          <div style={{ height:1, background:T.border, marginBottom:14 }}/>
          <div style={{ fontSize:13, lineHeight:1.85, color:T.textMid, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
            {loading && !txt && <span style={{ color:T.textFaint }}>Reading all agent responses…</span>}
            <Rich text={typed} T={T}/>
            {done && !allTyped && <span style={{ animation:'bl 0.9s step-end infinite', color:'#D97757' }}> ▍</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────
function ConfigPanel({ agents, keys, onKey, onToggle, webSearch, setWebSearch, autoSynth, setAutoSynth, T }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:'18px 20px', marginBottom:16, animation:'fi 0.2s ease' }}>
      {/* Feature toggles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { l:'🌐 Live Internet Search', s:'Claude fetches real-time web data before every task', v:webSearch, fn:setWebSearch, c:'#4285F4' },
          { l:'✦ Auto-Synthesize',       s:'Claude synthesizes when all agents finish',            v:autoSynth, fn:setAutoSynth, c:'#D97757' },
        ].map(f => (
          <div key={f.l} onClick={() => f.fn(x => !x)}
            style={{ padding:'11px 14px', borderRadius:12, cursor:'pointer', transition:'all 0.2s',
              background: f.v ? `${f.c}08` : T.surfaceHi,
              border: `1px solid ${f.v ? f.c+'25' : T.border}`,
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.text }}>{f.l}</div>
              <div style={{ fontSize:10, color:T.textFaint, marginTop:2 }}>{f.s}</div>
            </div>
            <div style={{ width:36, height:20, borderRadius:99, position:'relative', flexShrink:0, transition:'background 0.25s',
              background: f.v ? f.c : 'rgba(255,255,255,0.1)', boxShadow: f.v ? `0 0 10px ${f.c}40` : 'none' }}>
              <div style={{ position:'absolute', top:2, left: f.v ? 18 : 2, width:16, height:16,
                borderRadius:'50%', background:'#fff', transition:'left 0.25s' }}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, fontWeight:700, color:T.textLow, letterSpacing:'0.1em', marginBottom:12 }}>⚙ AGENT API KEYS</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:10 }}>
        {agents.map(a => (
          <div key={a.id} style={{ background: a.enabled ? `${a.color}08` : T.surface,
            border:`1px solid ${a.enabled ? a.color+'25' : T.border}`,
            borderRadius:12, padding:'12px 14px', transition:'all 0.25s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: a.enabled ? 10 : 0 }}>
              <span style={{ fontSize:15, color: a.enabled ? a.color : T.textFaint }}>{a.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color: a.enabled ? T.text : T.textLow }}>{a.name}</div>
                <div style={{ fontSize:9, color:T.textFaint, marginTop:1 }}>{a.freeNote}</div>
              </div>
              <div onClick={() => onToggle(a.id)}
                style={{ width:34, height:18, borderRadius:99, cursor:'pointer', flexShrink:0,
                  background: a.enabled ? a.color : 'rgba(255,255,255,0.1)', position:'relative', transition:'all 0.25s' }}>
                <div style={{ position:'absolute', top:2, left: a.enabled ? 18 : 2, width:14, height:14,
                  borderRadius:'50%', background:'#fff', transition:'left 0.25s' }}/>
              </div>
            </div>
            {a.enabled && a.id !== 'claude' && (
              <input type="password" value={keys[a.id] || ''} onChange={e => onKey(a.id, e.target.value)}
                placeholder="Paste API key…"
                style={{ width:'100%', background:T.inputBg, border:`1px solid ${keys[a.id] ? a.color+'45' : T.border}`,
                  borderRadius:8, padding:'7px 10px', color:T.text, fontSize:11, fontFamily:'monospace', outline:'none' }}/>
            )}
            {a.enabled && a.id === 'claude' && (
              <div style={{ fontSize:11, color:'#34d399' }}>✓ Built-in · no key needed</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WEB BANNER ───────────────────────────────────────────────────────────────
function WebBanner({ ctx, status, T }) {
  const [exp, setExp] = useState(false)
  if (!ctx && !status) return null
  return (
    <div style={{ marginBottom:14, padding:'11px 15px', borderRadius:12,
      background:'rgba(66,133,244,0.07)', border:'1px solid rgba(66,133,244,0.25)', animation:'fi 0.3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ display:'inline-block', animation: status === 'searching' ? 'sp 1.5s linear infinite' : 'none' }}>🌐</span>
          <span style={{ fontSize:12, color:'#93c5fd', fontWeight:600 }}>
            {status === 'searching' ? 'Searching the web…'
              : status === 'done' ? `Live web context ready · injected into all agents${ctx?.sources?.length ? ` (${ctx.sources.length} sources)` : ''}`
              : status === 'error' ? 'Web search failed — using training data' : ''}
          </span>
        </div>
        {ctx && <button onClick={() => setExp(e => !e)} style={{ fontSize:11, color:'#93c5fd', background:'none', border:'none', cursor:'pointer' }}>{exp ? '▲ hide' : '▼ show'}</button>}
      </div>
      {exp && ctx && (
        <div style={{ marginTop:10, borderTop:'1px solid rgba(66,133,244,0.2)', paddingTop:10 }}>
          <p style={{ fontSize:11.5, color:'#a0b4c8', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:160, overflowY:'auto' }}>{ctx.summary}</p>
          {ctx.sources?.length > 0 && (
            <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
              {ctx.sources.slice(0,6).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:10, color:'#60a5fa', background:'rgba(66,133,244,0.1)', padding:'2px 7px',
                    borderRadius:99, border:'1px solid rgba(66,133,244,0.2)', textDecoration:'none',
                    maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                  🔗 {s.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TASK ROW (history) ───────────────────────────────────────────────────────
function TaskRow({ task, onClick, T }) {
  const c = TYPE_COLORS[task.type] || '#888'
  return (
    <div onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', borderRadius:10,
        background:T.surface, border:`1px solid ${T.border}`, cursor:'pointer', transition:'background 0.15s',
        animation:'fi 0.3s ease', flexWrap:'wrap' }}
      onMouseEnter={e => e.currentTarget.style.background = T.surfaceHi}
      onMouseLeave={e => e.currentTarget.style.background = T.surface}>
      <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:`${c}22`,
        border:`1px solid ${c}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
        {TYPE_ICONS[task.type] || '📋'}
      </div>
      <div style={{ flex:1, minWidth:100 }}>
        <div style={{ fontSize:13, color:T.text, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'36ch' }}>{task.title}</div>
        <div style={{ fontSize:10, color:T.textLow, marginTop:1 }}>{task.type}{task.agents ? ` · ${task.agents} agents` : ''}</div>
      </div>
      <div style={{ fontSize:10, color:T.textFaint, flexShrink:0 }}>{task.time}</div>
      <Badge status={task.status} color={c}/>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AgentFlow() {
  const [themeKey,  setThemeKey]  = usePersist('af-theme', 'dark')
  const [apiKeys,   setApiKeys]   = usePersist('af-keys', {})
  const [agentList, setAgentList] = usePersist('af-agents', AGENTS)
  const T = THEMES[themeKey] || THEMES.dark

  const [taskTitle,  setTaskTitle]  = useState('')
  const [taskType,   setTaskType]   = useState(TASK_TYPES[0])
  const [showConfig, setShowConfig] = useState(false)
  const [webSearch,  setWebSearch]  = useState(true)
  const [autoSynth,  setAutoSynth]  = useState(false)
  const [isRunning,  setIsRunning]  = useState(false)
  const [history,    setHistory]    = useState(INITIAL_HISTORY)
  const [completedCount, setCompletedCount] = useState(INITIAL_HISTORY.length)
  const [completedResults, setCompletedResults] = useState({})
  const [synthText,  setSynthText]  = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [webCtx,    setWebCtx]    = useState(null)
  const [webStatus, setWebStatus] = useState(null)
  const [agentHistories, setAgentHistories] = useState(() => initMap([]))

  const [aStatus,   setAStatus]   = useState(() => initMap(STATUS.IDLE))
  const [aResult,   setAResult]   = useState(() => initMap(''))
  const [aError,    setAError]    = useState(() => initMap(''))
  const [aProgress, setAProgress] = useState(() => initMap(0))
  const [aElapsed,  setAElapsed]  = useState(() => initMap(0))
  const [aTokens,   setATokens]   = useState(() => initMap({}))

  const mounted    = useRef(true)
  const timers     = useRef([])
  const doneRes    = useRef({})
  const starts     = useRef({})
  const doneCount  = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; timers.current.forEach(id => { clearInterval(id); clearTimeout(id) }) }
  }, [])

  const safe = useCallback(fn => { if (mounted.current) fn() }, [])

  const enabled    = useMemo(() => agentList.filter(a => a.enabled), [agentList])
  const totalDone  = useMemo(() => enabled.filter(a => aStatus[a.id] === STATUS.DONE || aStatus[a.id] === STATUS.ERROR).length, [enabled, aStatus])
  const allSettled = useMemo(() => enabled.length > 0 && enabled.every(a => aStatus[a.id] === STATUS.DONE || aStatus[a.id] === STATUS.ERROR), [enabled, aStatus])
  const anyActive  = useMemo(() => enabled.some(a => aStatus[a.id] !== STATUS.IDLE), [enabled, aStatus])
  const totalTok   = Object.values(aTokens).reduce((s, t) => s + (t?.in || 0) + (t?.out || 0), 0)

  // Keyboard shortcut: ⌘↵ to run
  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runTask() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const hardReset = useCallback(() => {
    timers.current.forEach(id => { clearInterval(id); clearTimeout(id) }); timers.current = []
    doneRes.current = {}; starts.current = {}; doneCount.current = 0
    setAStatus(initMap(STATUS.IDLE)); setAResult(initMap('')); setAError(initMap(''))
    setAProgress(initMap(0)); setAElapsed(initMap(0)); setATokens(initMap({}))
    setIsRunning(false); setCompletedResults({}); setWebCtx(null); setWebStatus(null); setSynthText('')
  }, [])

  const runTask = useCallback(() => {
    if (!taskTitle.trim() || isRunning || enabled.length === 0) return
    timers.current.forEach(id => { clearInterval(id); clearTimeout(id) }); timers.current = []
    doneRes.current = {}; starts.current = {}; doneCount.current = 0

    const now    = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    const tid    = `t-${Date.now()}`
    const snap   = { prompt:taskTitle, agents:[...enabled], keys:{...apiKeys}, webSearch, hist:{...agentHistories} }

    safe(() => {
      setIsRunning(true); setCurrentPrompt(snap.prompt); setCompletedResults({}); setSynthText('')
      setWebCtx(null); setWebStatus(null)
      setAStatus(initMap(STATUS.IDLE)); setAResult(initMap('')); setAError(initMap(''))
      setAProgress(initMap(0)); setAElapsed(initMap(0)); setATokens(initMap({}))
      setHistory(prev => [{ id:tid, title:snap.prompt, type:taskType, status:'running', time:now, agents:snap.agents.length }, ...prev.slice(0,9)])
    })

    const dispatchAgents = (ctx) => {
      snap.agents.forEach(agent => {
        starts.current[agent.id] = Date.now()
        safe(() => setAStatus(s => ({ ...s, [agent.id]: STATUS.RUNNING })))
        let pct = 0
        const iv = setInterval(() => {
          pct = Math.min(pct + Math.random() * 4 + 1, 90)
          safe(() => setAProgress(p => ({ ...p, [agent.id]: Math.round(pct) })))
        }, 220)
        timers.current.push(iv)

        CALLERS[agent.endpoint](snap.prompt, snap.keys[agent.id] || '', ctx, snap.hist[agent.id] || [])
          .then(({ text, in: inp, out }) => {
            clearInterval(iv)
            const ms = Date.now() - starts.current[agent.id]
            doneRes.current[agent.id] = text
            safe(() => {
              setAProgress(p => ({ ...p, [agent.id]:100 }))
              setAElapsed(e => ({ ...e, [agent.id]:ms }))
              setAResult(r => ({ ...r, [agent.id]:text }))
              setATokens(t => ({ ...t, [agent.id]:{ in:inp, out } }))
              setAStatus(s => ({ ...s, [agent.id]:STATUS.DONE }))
              setAgentHistories(h => ({ ...h, [agent.id]:[...(h[agent.id]||[]),{ role:'user',content:snap.prompt },{ role:'assistant',content:text }] }))
            })
            doneCount.current++
            if (doneCount.current === snap.agents.length) finish(tid, snap.agents.length)
          })
          .catch(err => {
            clearInterval(iv)
            safe(() => {
              setAProgress(p => ({ ...p, [agent.id]:0 }))
              setAError(e => ({ ...e, [agent.id]:err.message }))
              setAStatus(s => ({ ...s, [agent.id]:STATUS.ERROR }))
            })
            doneCount.current++
            if (doneCount.current === snap.agents.length) finish(tid, snap.agents.length)
          })
      })
    }

    const finish = (id, count) => {
      safe(() => {
        setHistory(prev => prev.map(t => t.id === id ? { ...t, status:'done' } : t))
        setIsRunning(false)
        setCompletedCount(c => c + 1)
        setCompletedResults({ ...doneRes.current })
      })
    }

    if (snap.webSearch) {
      safe(() => {
        setWebStatus('searching')
        snap.agents.forEach(a => safe(() => setAStatus(s => ({ ...s, [a.id]:STATUS.SEARCHING }))))
      })
      fetchWebContext(snap.prompt)
        .then(ctx => {
          safe(() => {
            setWebCtx(ctx); setWebStatus('done')
            snap.agents.forEach(a => safe(() => setAStatus(s => ({ ...s, [a.id]:STATUS.IDLE }))))
          })
          dispatchAgents(ctx)
        })
        .catch(() => {
          safe(() => {
            setWebStatus('error')
            snap.agents.forEach(a => safe(() => setAStatus(s => ({ ...s, [a.id]:STATUS.IDLE }))))
          })
          dispatchAgents(null)
        })
    } else {
      dispatchAgents(null)
    }
  }, [taskTitle, taskType, enabled, isRunning, apiKeys, webSearch, agentHistories, safe])

  const handleFollowUp = useCallback((agentId, fu) => {
    if (isRunning) return
    const agent = enabled.find(a => a.id === agentId); if (!agent) return
    const hist = agentHistories[agentId] || []
    safe(() => { setAStatus(s => ({ ...s, [agentId]:STATUS.RUNNING })); setAProgress(p => ({ ...p, [agentId]:0 })); setAResult(r => ({ ...r, [agentId]:'' })) })
    let pct = 0
    const iv = setInterval(() => { pct = Math.min(pct + 4, 90); safe(() => setAProgress(p => ({ ...p, [agentId]:Math.round(pct) }))) }, 250)
    CALLERS[agent.endpoint](fu, apiKeys[agentId] || '', null, hist)
      .then(({ text, in: inp, out }) => {
        clearInterval(iv)
        safe(() => {
          setAProgress(p => ({ ...p, [agentId]:100 })); setAResult(r => ({ ...r, [agentId]:text }))
          setAStatus(s => ({ ...s, [agentId]:STATUS.DONE })); setATokens(t => ({ ...t, [agentId]:{ in:inp, out } }))
          setAgentHistories(h => ({ ...h, [agentId]:[...hist,{ role:'user',content:fu },{ role:'assistant',content:text }] }))
        })
      })
      .catch(err => { clearInterval(iv); safe(() => { setAError(e => ({ ...e, [agentId]:err.message })); setAStatus(s => ({ ...s, [agentId]:STATUS.ERROR })) }) })
  }, [enabled, isRunning, apiKeys, agentHistories, safe])

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text,
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", transition:'background 0.3s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:rgba(217,119,87,0.28);}
        input,button,select,textarea{font-family:inherit;outline:none;}
        button:focus-visible{outline:2px solid #D97757;outline-offset:2px;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.scroll};border-radius:4px;}
        a{color:inherit;}
        @keyframes p  {0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pu {0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
        @keyframes fi {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes sp {to{transform:rotate(360deg)}}
        @keyframes bl {0%,100%{opacity:1}50%{opacity:0}}
        @keyframes bo {0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes sh {from{left:-100%}to{left:100%}}
        .grid3{display:grid;gap:14px;grid-template-columns:repeat(3,1fr);}
        @media(max-width:900px){.grid3{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:560px){.grid3{grid-template-columns:1fr;}}
        .irow{display:flex;gap:10px;flex-wrap:wrap;}
        .irow input{flex:1;min-width:0;}
        @media(max-width:580px){.irow{flex-direction:column;}.irow input,.irow button{width:100%;}}
        .stats{display:flex;gap:18px;}
        @media(max-width:400px){.stat-label{display:none!important;}.stat-val{font-size:17px!important;}}
        .nav-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}
        @media(max-width:480px){.nav-actions button span.lab{display:none;}}
        .types{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
      `}</style>

      {/* ── NAVBAR ── */}
      <header style={{ borderBottom:`1px solid ${T.border}`, padding:'12px clamp(14px,4vw,36px)',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
        background:T.navBg, backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#D97757,#4285F4)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>⚡</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(13px,3vw,17px)',
              letterSpacing:'-0.02em', color:T.text, lineHeight:1.1 }}>AgentFlow</div>
            <div style={{ fontSize:9, color:T.textLow }}>multi-ai · web · voice · EN/HI/MR · export</div>
          </div>
        </div>

        <div className="stats">
          {[
            { l:'Done', v:completedCount, c:'#10A37F' },
            { l:'Active', v:isRunning ? enabled.length : 0, c:'#D97757' },
            { l:'Agents', v:enabled.length, c:'#4285F4' },
          ].map(s => (
            <div key={s.l} style={{ textAlign:'right' }}>
              <div className="stat-val" style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div className="stat-label" style={{ fontSize:9, color:T.textLow, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div className="nav-actions">
          <button onClick={() => setWebSearch(e => !e)}
            style={{ padding:'6px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
              background: webSearch ? 'rgba(66,133,244,0.15)' : T.surface,
              border: `1px solid ${webSearch ? 'rgba(66,133,244,0.35)' : T.border}`,
              color: webSearch ? '#93c5fd' : T.textLow,
              display:'flex', alignItems:'center', gap:4 }}>
            🌐<span className="lab"> {webSearch ? 'ON' : 'OFF'}</span>
          </button>
          <button onClick={() => setThemeKey(k => k === 'dark' ? 'light' : 'dark')}
            style={{ padding:'6px 9px', borderRadius:8, fontSize:13, background:T.surface, border:`1px solid ${T.border}`, cursor:'pointer' }}>
            {themeKey === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowConfig(s => !s)}
            style={{ padding:'6px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
              background: showConfig ? T.surfaceHi : T.surface,
              border: `1px solid ${showConfig ? T.borderHi : T.border}`,
              color: showConfig ? T.text : T.textMid,
              display:'flex', alignItems:'center', gap:4 }}>
            ⚙<span className="lab"> Config</span>
          </button>
          {(isRunning || allSettled) && (
            <button onClick={hardReset}
              style={{ padding:'6px 10px', borderRadius:8, fontSize:11,
                background:'rgba(255,255,255,0.04)', border:`1px solid ${T.border}`, color:T.textMid, cursor:'pointer' }}>
              ↺
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'clamp(16px,4vw,32px) clamp(14px,4vw,36px)' }}>
        {showConfig && (
          <ConfigPanel agents={agentList} keys={apiKeys}
            onKey={(id, v) => setApiKeys(k => ({ ...k, [id]:v }))}
            onToggle={id => setAgentList(l => l.map(a => a.id === id ? { ...a, enabled:!a.enabled } : a))}
            webSearch={webSearch} setWebSearch={setWebSearch}
            autoSynth={autoSynth} setAutoSynth={setAutoSynth} T={T}/>
        )}

        {/* ── Input card ── */}
        <section style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18,
          padding:'clamp(16px,3vw,26px)', marginBottom:16, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
            background:'linear-gradient(90deg,transparent,#D97757,#4285F4,#10A37F,transparent)' }}/>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:12, flexWrap:'wrap' }}>
            <div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'clamp(14px,3vw,18px)', color:T.text }}>New Task</h2>
              <p style={{ fontSize:11, color:T.textLow, marginTop:3 }}>
                {enabled.length} agent{enabled.length !== 1 ? 's' : ''} · {webSearch ? '🌐 live web · ' : ''}Enter to run · ⌘↵ anywhere
              </p>
            </div>
            {webSearch && (
              <div style={{ padding:'4px 9px', borderRadius:99, background:'rgba(66,133,244,0.1)',
                border:'1px solid rgba(66,133,244,0.25)', fontSize:10, color:'#93c5fd', flexShrink:0 }}>
                🌐 Live web active
              </div>
            )}
          </div>

          {/* Task type pills */}
          <div className="types">
            {TASK_TYPES.map(t => (
              <button key={t} onClick={() => setTaskType(t)}
                style={{ padding:'5px 11px', borderRadius:99, fontSize:11, cursor:'pointer', transition:'all 0.2s',
                  background: taskType === t ? `${TYPE_COLORS[t]}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${taskType === t ? TYPE_COLORS[t]+'55' : T.border}`,
                  color: taskType === t ? TYPE_COLORS[t] : T.textLow,
                  fontWeight: taskType === t ? 700 : 400 }}>
                {TYPE_ICONS[t]} {t}
              </button>
            ))}
          </div>

          {/* Voice input */}
          <VoiceBar onTranscript={t => setTaskTitle(prev => prev ? prev + ' ' + t : t)} T={T}/>

          {/* Text input + run */}
          <div className="irow">
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) runTask() }}
              placeholder="Type or speak your task in English, हिन्दी or मराठी…"
              style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:12,
                padding:'13px 16px', color:T.text, fontSize:14, transition:'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(217,119,87,0.5)'}
              onBlur={e => e.target.style.borderColor = T.border}/>
            <button onClick={runTask}
              disabled={!taskTitle.trim() || isRunning || enabled.length === 0}
              style={{ padding:'13px 20px', borderRadius:12, fontSize:13, fontWeight:700,
                background: isRunning ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#D97757,#c4603c)',
                border:'none', color:'#fff', cursor:'pointer',
                boxShadow: !isRunning && taskTitle.trim() ? '0 4px 18px rgba(217,119,87,0.35)' : 'none',
                transition:'all 0.25s', whiteSpace:'nowrap',
                fontFamily:"'Syne',sans-serif",
                opacity: !taskTitle.trim() || isRunning || enabled.length === 0 ? 0.38 : 1 }}>
              {isRunning
                ? <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ animation:'sp 1s linear infinite', display:'inline-block' }}>⟳</span>Running…</span>
                : `▶ Run ${enabled.length}`}
            </button>
          </div>
          {enabled.length === 0 && <p style={{ marginTop:8, fontSize:12, color:'#f87171' }}>⚠ Enable at least one agent in Config ⚙</p>}
        </section>

        {/* Web banner */}
        <WebBanner ctx={webCtx} status={webStatus} T={T}/>

        {/* Progress bar row */}
        {(isRunning || allSettled) && (
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'9px 14px',
            background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:11, color:T.textLow }}>
              {isRunning
                ? `⟳ ${webStatus === 'searching' ? 'Fetching web…' : `${totalDone}/${enabled.length} agents done`}`
                : `✓ All ${totalDone} agents complete${totalTok > 0 ? ` · ${totalTok.toLocaleString()} tokens` : ''}`}
            </span>
            <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', minWidth:60 }}>
              <div style={{ height:'100%', width:`${enabled.length > 0 ? (totalDone/enabled.length)*100 : 0}%`,
                background:'linear-gradient(90deg,#D97757,#4285F4)', borderRadius:99, transition:'width 0.4s ease' }}/>
            </div>
            {allSettled && Object.keys(completedResults).length > 0 && (
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => exportMarkdown(currentPrompt, completedResults, synthText, webCtx)}
                  style={{ padding:'3px 9px', borderRadius:7, fontSize:10, background:T.surface, border:`1px solid ${T.border}`, color:T.textLow, cursor:'pointer' }}>
                  📄 MD
                </button>
                <button onClick={() => exportJSON(currentPrompt, completedResults, synthText, webCtx, aTokens)}
                  style={{ padding:'3px 9px', borderRadius:7, fontSize:10, background:T.surface, border:`1px solid ${T.border}`, color:T.textLow, cursor:'pointer' }}>
                  {'{ }'} JSON
                </button>
              </div>
            )}
          </div>
        )}

        {/* Agent cards or empty state */}
        {anyActive ? (
          <>
            <div className="grid3" style={{ marginBottom:10 }}>
              {enabled.map(agent => (
                <AgentCard key={agent.id} agent={agent}
                  status={aStatus[agent.id]} result={aResult[agent.id]}
                  progress={aProgress[agent.id]} error={aError[agent.id]}
                  elapsed={aElapsed[agent.id]} tokens={aTokens[agent.id]}
                  onFollowUp={handleFollowUp} T={T}/>
              ))}
            </div>
            {Object.keys(completedResults).length > 0 && (
              <SynthPanel results={completedResults} prompt={currentPrompt} webCtx={webCtx} autoRun={autoSynth} T={T}/>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'56px 20px' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>⚡</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:T.textLow, marginBottom:10 }}>Ready to orchestrate</div>
            <div style={{ fontSize:12, lineHeight:1.9, color:T.textFaint }}>
              Type or 🎤 speak · English, हिन्दी, मराठी<br/>
              {enabled.length} agent{enabled.length !== 1 ? 's' : ''} standing by{webSearch ? ' · 🌐 live internet active' : ''}<br/>
              ⌘↵ to dispatch · results export as MD &amp; JSON · code blocks run in browser
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20, flexWrap:'wrap' }}>
              {enabled.map(a => (
                <span key={a.id} style={{ fontSize:11, padding:'4px 11px', borderRadius:99,
                  background:`${a.color}14`, color:a.color, border:`1px solid ${a.color}22` }}>
                  {a.icon} {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Task history */}
        {history.length > 0 && (
          <section style={{ marginTop:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.textLow, letterSpacing:'0.1em' }}>◷ HISTORY</span>
              <div style={{ flex:1, height:1, background:T.border }}/>
              <button onClick={() => setHistory([])}
                style={{ fontSize:10, color:T.textFaint, background:'none', border:'none', cursor:'pointer' }}>clear</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {history.slice(0,8).map(t => <TaskRow key={t.id} task={t} onClick={() => setTaskTitle(t.title)} T={T}/>)}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ marginTop:40, paddingTop:18, borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:20, height:20, borderRadius:5, background:'linear-gradient(135deg,#D97757,#4285F4)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>⚡</div>
              <span style={{ fontSize:11, fontWeight:700, color:T.textLow, fontFamily:"'Syne',sans-serif" }}>AgentFlow</span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {AGENTS.map(a => (
                <span key={a.id} style={{ fontSize:9, padding:'2px 7px', borderRadius:99,
                  background:`${a.color}14`, color:a.color, border:`1px solid ${a.color}22` }}>
                  {a.icon} {a.name}
                </span>
              ))}
            </div>
            <span style={{ fontSize:9, color:T.textFaint }}>Keys saved locally · voice EN/HI/MR · export MD+JSON · MIT</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
