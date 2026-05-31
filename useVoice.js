import { useState, useRef, useCallback } from 'react'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * Browser Web Speech API hook.
 * Supports EN, Hindi (hi-IN), Marathi (mr-IN).
 *
 * @param {function} onResult  — called with final transcript string
 * @param {string}   langCode  — BCP-47 code e.g. 'hi-IN'
 */
export function useVoice(onResult, langCode = 'en-IN') {
  const [listening, setListening] = useState(false)
  const [interim,   setInterim]   = useState('')
  const [supported] = useState(() => !!SR)
  const recRef = useRef(null)

  const start = useCallback(() => {
    if (!SR || listening) return
    const rec = new SR()
    rec.lang            = langCode
    rec.continuous      = false
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)

    rec.onresult = e => {
      let final = '', inter = ''
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript
        else                inter += result[0].transcript
      }
      setInterim(inter)
      if (final) { onResult(final); setInterim('') }
    }

    rec.onerror = () => { setListening(false); setInterim('') }
    rec.onend   = () => { setListening(false); setInterim('') }

    recRef.current = rec
    rec.start()
  }, [listening, langCode, onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  return { listening, supported, interim, start, stop }
}
