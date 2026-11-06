## Why

Looking at the Pixel Agents office inside the Cursor/VS Code panel is awkward when working across many Agent windows. The standalone CLI (`npx pixel-agents` / `node dist/cli.js`) already serves the same SPA and runs the hook server, but daily use still requires a terminal and knowing the repo/path. We need a one-click Windows desktop entry that keeps that server alive and opens the office without rewriting the runtime.

## What Changes

- Add a **Windows desktop shell** (Tauri + WebView2) that, on launch, starts (or reuses) the existing standalone Node server and opens the office UI at the privileged `http://127.0.0.1:<port>/?token=...` URL.
- Package the already-built standalone artifacts (`dist/cli.js`, `dist/webview/`, `dist/assets/`, `dist/hooks/`) plus production Node deps needed by the CLI externals; ship under a new `desktop/` (or equivalent) tree — **not** new runtime deps in product `core/` / root workspaces except packaging tooling scoped to that app.
- Prefer **system Node** for MVP; fixed listen port (e.g. `3100`); default **`--no-terminal`** so native `node-pty` is not required in the bundle.
- Document build, install, desktop/taskbar shortcut, and which Node process is spawned.
- **Non-goals:** rewrite server in Rust; change VS Code extension or npm CLI public contract; new hook consent flow; embed a portable Node runtime (v2); ship marketplace installers beyond local/dev packaging.

## Capabilities

### New Capabilities

- `desktop-office-launcher`: One-click Windows app that ensures a standalone Pixel Agents server is running on loopback and loads the same office SPA with a privileged token URL; reuses an already-running compatible standalone server instead of spawning a duplicate; tears down only the child it started.

### Modified Capabilities

- (none — Cursor hooks, consent, and standalone protocol stay as-is; this change only adds a host shell)

## Impact

- **New code:** `desktop/` Tauri project (Rust shell + config), optional root scripts to stage `dist/` into the app resources, short install/build doc (README under `desktop/` or a short section elsewhere).
- **Unchanged:** `server/` lifecycle/runtime (reuse as-is), `adapters/vscode/`, npm `bin` `pixel-agents`, Cursor/Claude hook install + consent in the SPA.
- **User machine:** WebView2 (Windows), Node ≥20 on PATH for MVP; writes still go through existing `~/.pixel-agents/` and (if consented) `~/.cursor/hooks.json`.
- **Build relation:** same `npm run package` that produces `dist/cli.js` also carries pending Cursor fixes (readoption + `/C:/` path normalize). Re-packing the `.vsix` is optional and parallel — required only if the IDE panel is still used; the desktop path needs the CLI bundle, not the VSIX.
