# Contributing

Thanks for helping with **Pixel Agents (Cursor)** — a Cursor-focused derivative of [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents).

Licensed under [MIT](LICENSE). No CLA/DCO required. Please also follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- [Node.js](https://nodejs.org/) matching [`.nvmrc`](.nvmrc) (v22)
- [Cursor](https://cursor.com) if you are testing hooks end-to-end
- Optional (Windows desktop shell only):
  - [Rust](https://rustup.rs/) stable
  - VS 2022 Build Tools with C++ workload — see [desktop/README.md](desktop/README.md)

## Setup

```bash
git clone https://github.com/wayooldev/pixel-agents-cursor.git
cd pixel-agents-cursor
npm install
npm run build
```

Standalone smoke:

```bash
npm run package
node dist/cli.js --port 3100 --host 127.0.0.1 --no-terminal
```

Desktop (Windows):

```powershell
npm run package
npm run desktop:stage
powershell -ExecutionPolicy Bypass -File desktop\scripts\build-windows.ps1
```

## What to work on

High-value areas for this fork:

1. **Cursor `HookProvider`** — `server/src/providers/hook/cursor/` (normalize events, installer safety, new Cursor hook names)
2. **Desktop shell** — `desktop/` (Tauri launcher, packaging, UX)
3. **Docs / install friction** — README, desktop prerequisites, first-run consent copy
4. **Upstream merges** — see [docs/UPSTREAM.md](docs/UPSTREAM.md)

Please open an issue before large architectural changes that would diverge further from upstream without a clear Cursor benefit.

## Development workflow

```bash
npm run watch          # extension/server esbuild + tsc (webview not included)
cd webview-ui && npm run dev   # Vite for the SPA, separate terminal
```

Tests:

```bash
npm test                 # webview + server
npm run test:server      # Vitest in server/
npm run test:webview
```

Focused Cursor / consent suites (examples):

```bash
cd server && npx vitest run __tests__/cursor.test.ts __tests__/consentFlow.test.ts
```

**VS Code e2e** launches real Electron windows and steals focus — ask before running, and never from a subagent. Standalone Playwright specs under `e2e/tests/standalone/` are fine for CI-like checks.

## Code conventions

Same as upstream (see their CONTRIBUTING for deeper detail):

- Layering: `core/` ← `server/` / `webview-ui/` ← `adapters/vscode/` / `desktop/` (desktop must not import the VS Code adapter)
- No `enum` in webview (`erasableSyntaxOnly`) — use `as const` objects
- `.js` extensions on relative imports in extension/server (Node16)
- Magic numbers/strings in the existing `constants.ts` files
- Exhaustive `switch` on discriminated unions (`never` in `default`)
- Pixel UI ESLint rules in the webview (no raw hex outside `constants.ts`, etc.)

New CLI integrations belong under `server/src/providers/hook/<id>/`. This fork’s consent list is **Cursor-only** (`hookProviders` in `server/src/providers/index.ts`); inbound Claude events may still resolve via `inboundHookProviders`.

## Pull requests

1. Branch from `main`.
2. Keep PRs focused (Cursor provider ≠ unrelated webview polish).
3. Include tests for installer / normalize / consent behavior when you touch those paths.
4. Mention upstream issue/PR links when you port a fix.
5. Do not commit secrets, `desktop/resources/server/node_modules`, or `target/` build trees (see `.gitignore`).

## Reporting bugs

Include:

- OS + Node version (`node -v`)
- Desktop vs CLI vs VS Code
- Whether Cursor hooks are installed (`~/.cursor/hooks.json` contains `cursor-hook.js`)
- Relevant lines from `%USERPROFILE%\.pixel-agents\desktop-server.log` (desktop) or the CLI terminal

## Security

Do not open public issues for sensitive hook/token bugs — see [SECURITY.md](SECURITY.md). Never paste standalone `?token=` URLs into tickets.
