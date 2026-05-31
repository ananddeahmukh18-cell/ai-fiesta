// ─── Agent Registry ───────────────────────────────────────────────────────────
export const AGENTS = [
  {
    id: 'claude',
    name: 'Claude Sonnet',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-20250514',
    color: '#D97757',
    accent: '#f0a07a',
    icon: '◈',
    specialty: 'Reasoning & Analysis',
    desc: 'Deep reasoning, synthesis, native web search built in.',
    endpoint: 'anthropic',
    freeNote: 'Built-in · no key needed',
    enabled: true,
    hasWeb: true,
  },
  {
    id: 'gpt4',
    name: 'GPT-4o',
    provider: 'OpenAI',
    model: 'gpt-4o',
    color: '#10A37F',
    accent: '#5eead4',
    icon: '◎',
    specialty: 'Content & Code',
    desc: 'Creative writing, code generation, structured output.',
    endpoint: 'openai',
    freeNote: 'platform.openai.com',
    enabled: false,
    hasWeb: false,
  },
  {
    id: 'gemini',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    model: 'gemini-1.5-pro',
    color: '#4285F4',
    accent: '#93c5fd',
    icon: '✦',
    specialty: 'Research & Multimodal',
    desc: 'Web-grounded research, fact-checking, long context.',
    endpoint: 'gemini',
    freeNote: 'aistudio.google.com',
    enabled: false,
    hasWeb: false,
  },
  {
    id: 'groq',
    name: 'Llama 3 · Groq',
    provider: 'Groq',
    model: 'llama3-70b-8192',
    color: '#FBBF24',
    accent: '#fde68a',
    icon: '⚡',
    specialty: 'Ultra-fast Inference',
    desc: 'Fastest open-source model via Groq — free tier available.',
    endpoint: 'groq',
    freeNote: 'console.groq.com — FREE',
    enabled: false,
    hasWeb: false,
  },
  {
    id: 'mistral',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    model: 'mistral-large-latest',
    color: '#EC4899',
    accent: '#f9a8d4',
    icon: '◆',
    specialty: 'Multilingual & Privacy',
    desc: 'European GDPR-native, strong multilingual reasoning.',
    endpoint: 'mistral',
    freeNote: 'console.mistral.ai',
    enabled: false,
    hasWeb: false,
  },
  {
    id: 'cohere',
    name: 'Command R+',
    provider: 'Cohere',
    model: 'command-r-plus',
    color: '#8B5CF6',
    accent: '#c4b5fd',
    icon: '◉',
    specialty: 'RAG & Enterprise',
    desc: 'Retrieval-augmented generation, enterprise workflows.',
    endpoint: 'cohere',
    freeNote: 'dashboard.cohere.com',
    enabled: false,
    hasWeb: false,
  },
]

// ─── Task Types ───────────────────────────────────────────────────────────────
export const TASK_TYPES = [
  'Research',
  'Content',
  'Code',
  'Data Analysis',
  'Debug',
  'Brainstorm',
]

export const TYPE_COLORS = {
  Research: '#4285F4',
  Content: '#D97757',
  Code: '#8B5CF6',
  'Data Analysis': '#10A37F',
  Debug: '#EC4899',
  Brainstorm: '#FBBF24',
}

export const TYPE_ICONS = {
  Research: '🔍',
  Content: '✍️',
  Code: '💻',
  'Data Analysis': '📊',
  Debug: '🐛',
  Brainstorm: '💡',
}

// ─── Voice Languages ──────────────────────────────────────────────────────────
export const VOICE_LANGS = [
  { code: 'en-IN', label: 'English (India)', flag: '🇮🇳' },
  { code: 'hi-IN', label: 'हिन्दी',           flag: '🇮🇳' },
  { code: 'mr-IN', label: 'मराठी',            flag: '🇮🇳' },
  { code: 'en-US', label: 'English (US)',     flag: '🇺🇸' },
]

// ─── Status ───────────────────────────────────────────────────────────────────
export const STATUS = {
  IDLE:      'idle',
  SEARCHING: 'searching',
  RUNNING:   'running',
  DONE:      'done',
  ERROR:     'error',
}

// ─── System Prompts ───────────────────────────────────────────────────────────
export const SYS_BASE =
  "You are a world-class AI assistant. Be precise, insightful, and well-structured. " +
  "Support English, Hindi (हिन्दी), and Marathi (मराठी) — always reply in the language the user used."

export const SYS_WEB = (ctx) =>
  `${SYS_BASE}\n\n[LIVE WEB DATA — use as primary source]\n${ctx}\n\nAlways reference specific data from the web results.`

// ─── Initial History ──────────────────────────────────────────────────────────
export const INITIAL_HISTORY = [
  { id: 'h1', title: 'Analyze Q2 market trends',    type: 'Data Analysis', status: 'done', time: '09:14 AM', agents: 1 },
  { id: 'h2', title: 'Write a product launch blog', type: 'Content',       status: 'done', time: '08:30 AM', agents: 2 },
]
