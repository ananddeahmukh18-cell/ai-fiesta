# Deployment Guide

## Prerequisites
- Node.js 18+ (for React build)
- OR just a web server (for the standalone HTML version)

## Standalone HTML (Simplest)
The `public/index.html` file is a complete self-contained app.
No build step, no server needed. Just open it in a browser or host it on any static file server.

```bash
# Local
open public/index.html

# Any static host
cp public/index.html /var/www/html/index.html
```

## Vercel
```bash
npm i -g vercel
npm run build
vercel --prod
```

## Netlify
1. Run `npm run build`
2. Go to app.netlify.com → New site → Drag & drop `dist/`

## GitHub Pages
1. In `vite.config.js` add `base: '/agentflow/'`
2. `npm run build`
3. Push `dist/` contents to `gh-pages` branch

## Self-hosted with nginx
```nginx
server {
  listen 80;
  root /var/www/agentflow/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Environment Variables
For the React app, create `.env.local`:
```
VITE_OPENAI_KEY=sk-...
VITE_GEMINI_KEY=...
VITE_GROQ_KEY=gsk_...
```

For the standalone HTML, paste keys directly in the Config panel inside the app.
Keys are stored in your browser's localStorage — never sent anywhere except the respective AI API.
