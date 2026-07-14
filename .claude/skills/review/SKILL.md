---
name: review
description: Use this after any significant change to Arunika-WA (new feature, security-sensitive route, anything touching money/tenant-data/external APIs) or whenever the user asks to "audit", "review code", "cek keamanan", or "cek kualitas kode". Runs a security + code-quality pass over what changed and reports findings via ReportFindings.
---

# Security & code-quality review for Arunika-WA

Adopt the mindset of a senior security engineer and a professional software engineer reviewing a colleague's PR on a live production system with real paying tenants and real money moving through it. The goal stated by the project owner: keep the app **smooth, fast, and solid** ("smooth lancar dan mantap") — this review exists to catch what would undermine that before it ships, not to nitpick style.

## Scope

Default to reviewing **what changed**, not the whole repo:
```sh
git diff HEAD~<n>..HEAD --stat   # or git diff against the last reviewed commit
```
Read every changed file in full — diffs alone hide missing context (e.g. a new route that forgot the auth check every sibling route has). Widen to a full-codebase pass only when explicitly asked to "audit" without a specific change in mind, or when a change touches a cross-cutting concern (auth, tenancy, money, the WA engine boundary).

## Checklist

### 1. Tenant isolation (this app's #1 invariant)
- Every route touching tenant-owned data derives the tenant id from the authenticated session — `getEffectiveTenantId(user)` / `getGoverningUser(user)` from `src/lib/users.ts`, or `requireSessionAccess(session)` from `src/lib/tenancy.ts` for anything WA-session-scoped. **Never** a client-supplied `ownerId`/`userId`/`tenantId` trusted for a read or write.
- `tenant_staff` role must always collapse to its owning tenant, never see siblings.
- A route reachable pre-login (registration flow, payment status polling) still needs an ownership check for the case where a session *does* happen to exist — see `qris/status/[orderId]` for the established pattern (public when anonymous, scoped when authenticated).
- Check `src/proxy.ts`'s prefix lists (`ADMIN_PREFIXES`, `TENANT_OWNER_PREFIXES`, `COOKIE_ONLY_PREFIXES`) actually match the new route's path — a route under `/api/foo/bar` needs `/api/foo` (or more specific) in the relevant list, not just relying on the route's own in-handler check as the sole layer.

### 2. External API / money / real-world-effect boundaries
- Any new call to a paid external API (LLM, SMS, maps, payment gateway) needs a cost/abuse safety net — a per-tenant rate limit or daily cap independent of existing message quota (see `src/lib/aiAutoReply.ts`'s `canUseAIToday`/`recordAIUsage` for the pattern).
- Anything that sends a real WhatsApp message, email, or payment action based on **attacker-influenced input** (a knowledge-base field a tenant edits, conversation history from a stranger) — check for prompt-injection-style risk: could the content of an inbound message make an LLM-backed auto-reply say something the business didn't intend, leak the system prompt, or take an action it shouldn't? The AI auto-reply's system prompt should keep instructing "don't hallucinate, defer to a human" — flag if a change weakens that framing.
- Webhook/callback routes must verify signatures (HMAC, `crypto.timingSafeEqual`) before trusting payload contents — never string `===` on a secret.
- Never let test/verification code send a real message to a real, non-test recipient — confirm this wasn't done to "verify" the change being reviewed either.

### 3. Correctness & race conditions
- Async state updates from `setInterval`/polling: does a later response beat an earlier one back (stale-overwrite)? Is there an in-flight guard (see `messagesInFlight`/`chatsInFlight` refs in `inbox/page.tsx`) preventing overlapping requests from piling up?
- Flex/grid layout children holding scrollable content need `min-height: 0` on every ancestor in the flex chain, or the browser lets them grow past their box instead of scrolling — this exact bug shipped once already in this app.
- Effects that both reset state (e.g. clearing a list on prop/id change) and react to that state's later population need to guard against the reset's own transient empty state being misread as "real" data (see the `messages.length === 0` early-return in the inbox scroll-fix).
- Credential/secret handling: no raw secret ever appears in a Bash command's argument list, committed file, or client-visible API response.

### 4. Consistency with established patterns
This codebase has clear, repeated conventions — flag deviation as a defect, not a style preference:
- Data stores: one file per concern in `data/*.json` via `readJson`/`writeJson` from `src/lib/store.ts`, keyed by ownerId, with a `deleteXForOwner`/cascade-delete function wired into the tenant-deletion route in `src/app/api/admin/tenants/[id]/route.ts`.
- API routes: thin handler, auth/ownership check first, then delegate to a `src/lib` function; errors via `WahaError`-style status-carrying exceptions where relevant.
- No emoji on customer-facing marketing/auth pages or transactional emails (internal dashboard nav icons are fine, established exception).
- Public pages use the brand-neutral slate/white/black palette. The internal dashboard uses a neutral slate sidebar/chrome with a muted forest-green accent (`--primary`, not the bright WhatsApp `#25d366`) — don't reintroduce the old neon-green/mint-tinted look on either surface.
- Never expose the underlying WA engine's name/vendor identity on any customer-facing surface.

### 5. Smooth/fast/solid
- No unhandled promise rejections, no missing loading/error states on new UI, no layout that visibly shifts as async content (images, fetched data) resolves.
- Polling/interval-driven UI shouldn't fight user interaction (see the scroll-yank bug) — new real-time-ish UI should default to "don't interrupt what the user is doing" unless there's a clear signal they want to jump to the latest state.
- Build must be clean (`npx tsc --noEmit`, `npm run build`) before this review is considered passed — a review isn't a substitute for that, it's in addition to it.

## Process

1. Identify scope (diff since last commit/session, or full-repo if asked to audit generally).
2. Read every relevant file in full — don't review from grep snippets alone.
3. Verify findings before reporting: reproduce logically (or live-test with a throwaway account + cleanup, following `/ship`'s test-data-hygiene rules) rather than asserting from a read-through alone when a live check is feasible and cheap.
4. Report using the `ReportFindings` tool — most-severe first, empty array if nothing survives verification. Do not also restate findings as prose; let the structured output speak.
5. For anything CONFIRMED and cheap to fix, fix it in the same pass (following `/ship`'s build-verify-restart-commit-push cycle) rather than just reporting it — this project's owner wants working fixes, not just a list of problems, when the fix is unambiguous.
