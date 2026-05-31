/**
 * Sandboxed JS code runner (browser eval via new Function).
 * Captures console.log / console.error output.
 * @param {string} code
 * @returns {{ output: string, error: string|null }}
 */
export function runJavaScript(code) {
  try {
    const logs = []
    const fakeConsole = {
      log:   (...args) => logs.push(args.map(String).join(' ')),
      error: (...args) => logs.push('ERR: ' + args.join(' ')),
      warn:  (...args) => logs.push('WARN: ' + args.join(' ')),
    }
    // eslint-disable-next-line no-new-func
    const fn  = new Function('console', code)
    const res = fn(fakeConsole)
    const out = logs.join('\n') || (res !== undefined ? String(res) : '✓ Executed (no output)')
    return { output: out, error: null }
  } catch (e) {
    return { output: '', error: e.message }
  }
}
