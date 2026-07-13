---
name: ship
description: Use this skill whenever finishing a code change to Arunika-WA (this repo) — verifying, restarting, live-testing, and shipping it — or when the user asks to "cut a release" / "push ke github" / "jadikan release". Covers the standard build-verify-restart-commit-push cycle and the tag/GitHub-release process for this specific project.
---

# Ship a change to Arunika-WA

This project is a live production system (systemd service `arunika-wa.service` on port 4000, behind Caddy TLS, real paying tenants). Every change follows the same cycle before it's considered done — don't skip steps just because a change looks small.

## 1. Verify the code compiles

```sh
cd /root/arunika-wa
npx tsc --noEmit
npm run build
```

Both must be clean. Fix errors before moving on — don't restart the service on a build that didn't finish.

## 2. Restart and confirm clean startup

```sh
sudo systemctl restart arunika-wa
sleep 2
sudo systemctl is-active arunika-wa
sudo journalctl -u arunika-wa -n 20 --no-pager
```

Look for `✓ Ready in ...` with no stack traces above it.

## 3. Verify live, not just "it builds"

Prefer testing against the real running server over trusting the build alone:
- API routes: `curl` against `http://localhost:4000/...`, with a real session cookie when the route requires auth.
- UI/visual changes: Playwright (`npm install playwright --no-save` in the scratchpad dir if not already installed) — screenshot or assert on real DOM state, don't just eyeball the diff.

**Credential handling — never put raw secrets in a Bash command's argument list.** Read them from `.env.local` inside a script file instead:
```sh
USER=$(grep '^ADMIN_USERNAME=' .env.local | cut -d= -f2-)
PASS=$(grep '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
```
For Playwright scripts, write a `.js` file that reads `.env.local` itself (see pattern: `fs.readFileSync(".env.local")` + regex extract) rather than passing values as CLI args or inline env vars.

**Never trigger actions that reach a real third party just to test.** Don't send a real WhatsApp message, a real email to a stranger, or similar, purely to verify a fix works — the auto-mode classifier will (correctly) block this. If a feature genuinely can't be verified without a live send, say so and ask the user rather than working around the block.

## 4. Test data hygiene

When verification requires creating data (a test tenant, a test lead, a test transaction):
- Use an obviously-fake, prefixed username (`qatest...`, `qa...`) so it's easy to find and never confusable with a real customer.
- **Always clean up afterward.** A test tenant touches multiple files, not just `users.json` — check and remove from all of: `users.json`, `transactions.json`, `web-sessions.json`, `session-owners.json`, `webhook-config.json`, `message-log.json`, and any other `data/*.json` keyed by that user's id. Use a small `node -e "..."` snippet reading/filtering/rewriting each file; verify with `grep -rln "<test-username-or-id>" data/*.json` that nothing remains.
- If a Playwright screenshot captured real customer data (real conversations, PII, medical info, etc. — this is a real live system with real hospital/business tenants), delete the screenshot immediately after use. Never send it to the user or leave it sitting in scratchpad.

## 5. Commit and push

```sh
git add <specific files>   # not -A blindly — check git status first for anything that looks like a secret
git commit -m "$(cat <<'EOF'
<what changed and why, not just what>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: <this session's URL>
EOF
)"
git push
git status   # confirm clean + up to date with origin/main
```

Prefer a new commit over `--amend`. `data/*.json` is gitignored — never force-add it.

## Cutting a version release

When asked to "release", "push ke github" as a release, or tag a version:

1. Bump `"version"` in `package.json` (semver — first tagged release starts at `1.0.0` if none exists yet), commit it on its own.
2. Tag and push:
   ```sh
   git tag -a vX.Y.Z -m "Arunika-WA vX.Y.Z"
   git push origin vX.Y.Z
   ```
3. Write release notes grouped by theme (core platform, messaging, billing, security, design, growth — whatever's relevant), not a raw commit dump. Pull the full picture from `git log --oneline --reverse` since the last tag (or from the beginning, for the first release).
4. Publish:
   ```sh
   gh release create vX.Y.Z --title "Arunika · WA vX.Y.Z" --notes-file <path>
   ```
5. Check `gh repo view rsamjkt/arunika-wa --json visibility -q .visibility` — this repo is **public**, so release notes are world-readable. That's not a new exposure (the commit history is already public), but keep notes professional/no-secrets regardless.

## Standing rules specific to this project

- Never expose the underlying engine name ("WAHA") on any customer-facing surface — sidebar, dashboard, docs, emails, meta tags. Internal code identifiers (`waha.ts`, `WahaError`) are fine.
- Tenant data isolation is load-bearing: any new route touching tenant-owned data must derive the tenant id from the authenticated session (`getEffectiveTenantId(user)` / `getGoverningUser(user)`), never trust a client-supplied `ownerId`/`userId`.
- Public-facing pages (landing `/`, `/help`, login/register/forgot/reset-password) use a brand-neutral palette (near-black/slate/white + one blue accent) — not Arunika's own green/orange brand colors. The internal authenticated dashboard keeps its WhatsApp-green branding; don't mix the two up.
- No emoji on customer-facing marketing/auth surfaces or transactional emails; the internal dashboard's existing emoji-based nav icons are fine to leave as-is.
