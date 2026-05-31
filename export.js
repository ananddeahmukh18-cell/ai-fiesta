import { AGENTS } from './constants'

function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportMarkdown(prompt, results, synthesis, webCtx) {
  let md = `# AgentFlow Results\n\n**Task:** ${prompt}\n**Date:** ${new Date().toLocaleString()}\n\n`
  if (webCtx) md += `## 🌐 Web Research\n${webCtx.summary}\n\n---\n\n`
  md += `## Agent Responses\n\n`
  Object.entries(results).forEach(([id, text]) => {
    const agent = AGENTS.find(a => a.id === id)
    md += `### ${agent?.icon} ${agent?.name}\n\n${text}\n\n---\n\n`
  })
  if (synthesis) md += `## ✦ Synthesis\n\n${synthesis}\n`
  download(md, `agentflow-${Date.now()}.md`, 'text/markdown')
}

export function exportJSON(prompt, results, synthesis, webCtx, tokens) {
  const data = {
    task:        prompt,
    timestamp:   new Date().toISOString(),
    webResearch: webCtx || null,
    agents:      Object.entries(results).map(([id, text]) => ({
      id,
      name:     AGENTS.find(a => a.id === id)?.name,
      response: text,
      tokens:   tokens[id] || {},
    })),
    synthesis: synthesis || null,
  }
  download(JSON.stringify(data, null, 2), `agentflow-${Date.now()}.json`, 'application/json')
}
