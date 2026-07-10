# Arunika · WA

A self-hosted WhatsApp Gateway dashboard — a clean, production-style frontend built on top of [WAHA](https://github.com/devlikeapro/waha) (WhatsApp HTTP API), giving you a real admin panel for managing WhatsApp devices, conversations, and integrations instead of raw API calls.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![License](https://img.shields.io/badge/license-proprietary-lightgrey)

## Overview

Arunika-WA sits between your business and a self-hosted [WAHA](https://github.com/devlikeapro/waha) instance (WEBJS engine). WAHA's own API key never leaves the server — this app is a thin, authenticated Next.js proxy that adds a real UI, multi-user access control, and a self-service API key system on top.

## Features

- **Device management** — QR pairing, connect/disconnect, restart, multi-session support
- **Inbox** — live chat list and thread view, send text/image, reply/forward/react/star/pin/delete, typing indicator, read receipts
- **Quick send** — one-off message sending to any number, with number-existence check
- **Contacts & groups** — browse, view, manage participants
- **Profile management** — update display name and status for connected devices
- **API documentation** — interactive, Swagger-style docs with live "try it out" support
- **Authentication**
  - Cookie-based login for the dashboard (multi-user, scrypt-hashed passwords)
  - Self-service API keys (`X-Api-Key` header) for external apps/integrations calling `/api/*` programmatically — generate, rename, revoke, and audit last-used time from the UI
- **Update awareness** — a scheduled check compares the installed WAHA image against the latest published version and surfaces a dashboard banner when an update is available (never applied automatically)

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19 + TypeScript
- Server-side Route Handlers proxy all WAHA calls — the WAHA API key is never exposed to the client
- File-based storage for accounts/sessions/API keys (no external database required)
- [WAHA](https://github.com/devlikeapro/waha) as the underlying WhatsApp engine (WEBJS / whatsapp-web.js)

## Getting started

### Prerequisites

- Node.js 22+
- A running [WAHA](https://github.com/devlikeapro/waha) instance (Docker) with its API key

### Setup

```bash
npm install
cp .env.example .env.local   # fill in WAHA_BASE_URL, WAHA_API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin credentials from `.env.local`. Additional users and API keys can be created afterwards from **Settings** in the dashboard.

### Production

```bash
npm run build
npm run start
```

## Authentication model

| Caller | Method | Notes |
|---|---|---|
| Browser (dashboard) | `arunika_session` httpOnly cookie | Set on login, tied to a user account in `data/users.json` |
| External app / script | `X-Api-Key: <key>` header | Generated and managed at **Settings → API Key** |

`/api/users` and `/api/api-keys` (account/key management) only accept the browser session — an API key can never manage other users or keys.

## Project structure

```
src/
  app/            Pages (App Router) and API route handlers
  components/     Shared UI components
  lib/            Server-only WAHA client, auth/session/user/API-key stores
  proxy.ts        Auth gate for the whole app (Next.js Proxy / middleware)
data/             Runtime storage — users, sessions, API keys (gitignored)
```

## License

Proprietary — all rights reserved.
