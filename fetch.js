/**
 * fetch with AbortController timeout
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} timeout ms
 */
export async function apiFetch(url, opts = {}, timeout = 40000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal })
    clearTimeout(tid)
    return r
  } catch (e) {
    clearTimeout(tid)
    throw e.name === 'AbortError' ? new Error('Request timed out (40s)') : e
  }
}
