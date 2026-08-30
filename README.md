# Arunika · WA

**A multi-tenant WhatsApp Gateway SaaS with a built-in agentic AI assistant.** Manage devices, run broadcasts, automate replies, and let **Arunika** — an AI assistant that can *act* (call tools, look things up, book appointments, hand off to a human) — handle your customers across **WhatsApp and Telegram**, all from one clean dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white) ![License](https://img.shields.io/badge/license-proprietary-lightgrey)

---

## Overview

Arunika-WA is a production, self-hosted platform that turns a self-hosted WhatsApp connection into a real business tool: a multi-user admin panel, per-tenant plans & billing, a team inbox, scheduled/recurring broadcasts, and a genuinely capable AI assistant. It is built as an authenticated Next.js app — the underlying WhatsApp engine's credentials never leave the server; the browser only ever talks to this app's own authenticated API.

## Features

### 🤖 Arunika — the AI assistant
- **Agentic tool-use ("Mode Agent")** — Arunika doesn't just reply, it *acts*: a modular **skill registry** of 13 tools it can call mid-conversation (check time & business hours, search the knowledge base, calculate totals/discounts, track shipments, estimate shipping cost, check stock, take notes, log orders, **book appointments**, search the web, mark chats resolved, hand off to a human).
- **Knowledge Base + RAG-lite** — retrieval over the tenant's own business info (keyword-relevance, no external vector DB) so answers are grounded and cheap.
- **Multi-provider** — 9 LLM providers (Anthropic, OpenAI, Gemini, Groq, Mistral, Qwen, DeepSeek, OpenRouter, Vikey.ai); pick per tenant. Key rotation + model fallback for reliability.
- **Long-term memory**, **time-awareness**, **free-chat persona**, and **web search** (optional).
- **Smart handoff** — detects "I need a human" / complaints, flags the chat, notifies an agent, and pauses the bot for that conversation.
- **AI co-pilot** — a "Suggest reply" button drafts a response for a human agent to edit and send.
- **Cost-aware** — prompt caching, triviality skip, response cache for repeat FAQs, and a model router that sends simple messages to a cheaper sibling model.

### 🌐 Multi-channel
- One **channel-agnostic brain** answers on both **WhatsApp** and **Telegram** with the same persona, knowledge base, and skills. New channels plug in as adapters.

### 💬 Messaging & inbox
- **Team inbox** — live chat list & threads, send text/media, reply/forward/react/star/pin/delete, typing indicators, read receipts, conversation assignment & open/resolved status, per-contact tags & notes, canned replies.
- **Quick send** with number-existence check.
- **Contacts, groups & profile** management.

### 📣 Broadcast (built to survive)
- Scheduled **and recurring** (daily/weekly) broadcasts, CSV audience upload, template variables.
- **Anti-ban layer**: human-like randomized pacing, per-number daily **warm-up** limits, auto-pause on repeated failures, **spintax** message variation, optional number pre-check, and a per-number **health score**.

### 🏢 Multi-tenant SaaS
- Roles (superadmin / tenant / tenant-staff), plans with device/quota limits, **QRIS** payments, referral program, unlimited team seats on every plan.
- **Transactional emails** (welcome, invoice, payment) + **security/monitoring notifications** on login, registration, password change, and payment — to both the user and the platform admin.

### 🔌 Integrations & developer tools
- **Integrations control dashboard** — connect Telegram, courier tracking (shipping), and web search from the UI, no server edits.
- Self-service **API keys** (`X-Api-Key`) and **outbound webhooks** (HMAC-signed) for external systems.
- Interactive, Swagger-style **API documentation** with live "try it".

### 🎨 UX
- Clean, modern dashboard (Minimals-inspired), light/dark theme, lucide icons.

## Tech stack

- **[Next.js 16](https://nextjs.org/)** (App Router) · **React 19** · **TypeScript** (strict)
- Server Route Handlers proxy all engine calls — engine credentials stay server-side
- **File-based storage** for accounts, sessions, settings & state (no external database required)
- **Vitest** test suite; **ESLint** + strict `tsc`
- A self-hosted, unofficial WhatsApp connection engine (WhatsApp-Web protocol) runs alongside as the message transport

## Getting started

### Prerequisites
- Node.js 22+
- A running self-hosted WhatsApp engine (Docker) reachable from the app

### Setup
```bash
git clone https://github.com/rsamjkt/arunika-wa.git
cd arunika-wa
npm install
cp .env.example .env.local   # then fill in the values
npm run build
npm run start                # serves on port 4000
```

Configuration lives in `.env.local` (engine base URL & key, admin bootstrap, SMTP for email, payment gateway, app URL, and optional AI/provider keys). Per-tenant and integration settings (AI provider keys, Telegram, shipping, web search) are managed from the dashboard and stored under `data/` (git-ignored — never committed).

### Docker / Portainer
A `Dockerfile` and `docker-compose.yml` are included (host-network mode). See `CATATAN-DEPLOY-PORTAINER.md`.

## Scripts
```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run start    # start production server (port 4000)
npm run test     # Vitest suite
npm run lint     # ESLint
```

## Security notes
- All tenant-owned data is scoped to the authenticated session — never to client-supplied IDs.
- Outbound user-supplied URLs pass through an SSRF-safe fetch (DNS-validated, no redirects).
- AI system prompts are hardened against prompt injection from inbound messages.
- Secrets live only in `.env.local` / `data/` and are never committed.

## License

Proprietary — © Arunika. All rights reserved.
