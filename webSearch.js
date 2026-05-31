import { apiFetch } from './fetch'

/**
 * Fetch live web context via Claude's native web_search tool.
 * Returns { summary: string, sources: Array<{url, title}> }
 */
export async function fetchWebContext(query) {
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
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for current, accurate information about: "${query}". Summarize key facts, recent data, and statistics.`,
      }],
    }),
  })

  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `Search failed ${r.status}`)

  const summary = (d.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n') || 'No results found.'

  const sources = []
  for (const block of (d.content || [])) {
    try {
      const payload =
        block.type === 'tool_result' && block.content
          ? typeof block.content === 'string'
            ? JSON.parse(block.content)
            : block.content
          : null
      if (Array.isArray(payload)) {
        payload.forEach(s => s?.url && sources.push({ url: s.url, title: s.title || s.url }))
      }
    } catch (_) {}
  }

  return { summary, sources }
}
