# ⚡ AgentFlow — Multi-AI Orchestration Platform

> One prompt. Six AI brains. One synthesized answer.

Dispatch tasks to **Claude, GPT-4o, Gemini, Groq (Llama 3), Mistral, and Cohere** simultaneously — with live web search, voice input (English/Hindi/Marathi), synthesis engine, code runner, and MD/JSON export.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🤖 **6 AI Agents** | Claude · GPT-4o · Gemini 1.5 · Llama 3 (Groq) · Mistral · Command R+ |
| 🌐 **Live Web Search** | Claude fetches real-time data before every task |
| 🎤 **Voice Input** | English 🇮🇳 · हिन्दी 🇮🇳 · मराठी 🇮🇳 via Web Speech API |
| ✦ **Synthesis Engine** | Claude meta-analyzes all responses → one final answer |
| 💬 **Follow-ups** | Per-agent conversation memory |
| 💻 **Code Runner** | JS code blocks execute in the browser |
| 📤 **Export** | Download as Markdown or JSON |
| 🌓 **Dark / Light** | Persisted theme preference |
| 🔒 **Privacy** | Keys in localStorage only — never sent to any server |
| ⌨️ **Keyboard** | ⌘↵ to run anywhere |

---

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/agentflow.git
cd agentflow
npm install
npm run dev
# → http://localhost:3000
```

**Claude works immediately — no key needed.**  
For other agents, open **Config ⚙** inside the app and paste your keys.

---

## 🔑 API Keys

| Agent | Where | Free? |
|---|---|---|
| Claude | Built-in (no key) | ✅ |
| GPT-4o | platform.openai.com | Paid |
| Gemini | aistudio.google.com | ✅ 1500/day |
| Groq (Llama 3) | console.groq.com | ✅ Generous |
| Mistral | console.mistral.ai | Trial |
| Cohere | dashboard.cohere.com | ✅ Free tier |

---

## 📁 Structure

```
agentflow/
├── src/
│   ├── App.jsx              ← Main app (all UI + logic)
│   ├── main.jsx             ← React entry point
│   ├── index.css            ← Global styles
│   ├── api/
│   │   ├── callers.js       ← All 6 API callers
│   │   ├── fetch.js         ← Fetch with timeout
│   │   └── webSearch.js     ← Claude live web search
│   ├── hooks/
│   │   ├── usePersist.js    ← localStorage state
│   │   ├── useTypewriter.js ← Typewriter animation
│   │   └── useVoice.js      ← Web Speech API (EN/HI/MR)
│   └── utils/
│       ├── constants.js     ← Agents, types, prompts
│       ├── export.js        ← MD + JSON export
│       └── codeRunner.js    ← Sandboxed JS runner
├── public/
│   ├── favicon.svg
│   └── index.html           ← Standalone HTML (no build needed)
├── .github/workflows/
│   └── deploy.yml           ← CI + GitHub Pages auto-deploy
├── docs/
│   └── DEPLOYMENT.md
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚢 Deploy

```bash
# Vercel (recommended)
npx vercel --prod

# Netlify — drag dist/ folder to app.netlify.com

# GitHub Pages — push to main, Actions auto-deploys
```

---

## 📜 License

MIT — free to use, modify, and distribute.
