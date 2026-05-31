import { useState, useCallback } from 'react'

/**
 * useState backed by localStorage.
 * @param {string} key
 * @param {*} initial
 */
export function usePersist(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback(val => {
    setValue(val)
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {}
  }, [key])

  return [value, set]
}
