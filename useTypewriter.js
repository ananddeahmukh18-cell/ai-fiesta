import { useState, useEffect, useRef } from 'react'

/**
 * Animates text character by character.
 * @param {string} text  — full target text
 * @param {boolean} active — start when true
 * @param {number} speed  — ms per character (default 9)
 */
export function useTypewriter(text, active, speed = 9) {
  const [out, setOut] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    clearInterval(timerRef.current)
    setOut('')
    if (!active || !text) return

    let i = 0
    timerRef.current = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(timerRef.current)
    }, speed)

    return () => clearInterval(timerRef.current)
  }, [text, active])

  return out
}
