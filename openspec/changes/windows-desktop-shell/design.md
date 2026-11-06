## Context

Standalone already serves the office SPA (`dist/webview/`), loads assets from `dist/`, writes `~/.pixel-agents/server.json` + registry, persists `standalone-token`, and prints a privileged URL. Hooks (including Cursor) POST to `127.0.0.1` and fan out via that registry. `esbuild` leaves `fastify` / `@fastify/*` / `node-pty` external on `dist/cli.js`, so a shippable sidecar must include production `node_modules` (or a later dedicated bundle target). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Tauri 2 Windows app: one process tree that ensures a compatible standalone server is up and shows the office in WebView2.
- Prefer reuse over double-spawn when a matching standalone is already live.
- Keep product layering intact: shell depends on packaged `dist/` outputs only; no imports from `adapters/vscode/`.

**Non-Goals:**

- Portable Node embedded in the installer (v2).
- Bundling `node-pty` / enabling browser-launched terminals in MVP (`--no-terminal`).
- Changing AsyncAPI, consent gate, or hook installer semantics.
- Cross-platform (macOS/Linux) packaging in this change.

## Decisions

### 1. Shell = Tauri; UI = existing SPA over HTTP (not `file://`)

- **Choice:** WebView navigates to `http://127.0.0.1:3100/?token=<standalone-token>`.
- **Why:** Privileged standalone clients prove the token via `?token=`; same-origin SPA + `/ws` already work. Loading the Vite build from disk would bypass the server and break hooks/WS/consent.
- **Alternatives:** Electron (heavier); open default browser only (no “app” window / lifecycle control).

### 2. Sidecar = system `node` + staged `dist/` + prod deps

- **Choice:** Resolve `node` on PATH (≥20). Resources layout roughly:

  ```
  resources/server/
    cli.js
    webview/
    assets/
    hooks/
    node_modules/   # fastify stack (and whatever else cli.js requires at runtime)
  ```

  Spawn: `node cli.js --port 3100 --host 127.0.0.1 --no-terminal` with cwd / paths such that `__dirname` resolves assets next to `cli.js`.

- **Why:** Matches current CLI packaging; avoids SEA/pkg fights with externals and native addons; user already has Node for Cursor/dev.
- **Alternatives:** Embed Node binary (size + redistribution); esbuild “desktop” target that inlines Fastify (touches root build, defer unless staging `node_modules` proves painful).

### 3. Fixed port `3100` + reuse-before-spawn

- **Choice:** Always target `--port 3100`. On launch: if registry/`server.json` shows a live standalone with compatible access (SPA + same host/terminal flags), **do not** spawn; read token from `~/.pixel-agents/standalone-token` (or health + known config) and navigate. Otherwise spawn and wait for `GET /api/health` (and token file / stdout URL).
- **Why:** Stable URL for WebView; avoids the CLI’s “reuse HTTP but still run a second AgentRuntime/scanners” half-process when a second `cli.js` attaches.
- **Alternatives:** Ephemeral port + parse stdout only (fragile for WebView boot).

### 4. Kill policy

- **Choice:** On window close, SIGTERM/kill only the Node child **this app started**. Never kill a pre-existing reused server (may be shared with `npx pixel-agents` or another tool).
- **Why:** Hooks should keep working if the user only closed the window while intending the server to stay — actually for “app” UX, closing usually means quit. Prefer: if we own the child, stop it; if we reused, leave it. Document that behavior.

### 5. Isolation from product npm graph

- **Choice:** New `desktop/` package with its own Rust/Tauri toolchain and docs. Root may gain a thin script (`npm run desktop:stage` / `desktop:build`) that copies `dist/` + prod deps into `desktop/resources` — no new runtime dependency in `core/` or server logic.
- **Why:** Honors “no new npm deps in product core except packaging.”

### 6. Same compile feeds desktop and optional VSIX

- **Choice:** Document that `npm run package` is the prerequisite; Cursor readoption + `normalizeHookWorkspacePath` ship in `cli.js` automatically. `.vsix` is a separate optional artifact from the same compile, not a dependency of the desktop MVP.

## Risks / Trade-offs

- **[Risk] Node missing / wrong version on PATH** → Show a clear dialog with install link; no silent hang. Mitigate later with embedded Node (v2).
- **[Risk] Staging incomplete `node_modules` (forgotten Fastify transitive)** → Smoke: spawn staged tree and hit `/api/health` in CI or a local script before tagging a build.
- **[Risk] Port 3100 busy with non-Pixel process** → Surface error; do not bind blindly; optional later: fall back to ephemeral + parse.
- **[Risk] Token file race on first boot** → Wait/retry read of `standalone-token` or parse the CLI’s printed URL line with a timeout.
- **[Trade-off] `--no-terminal`** → No launch/attach PTY from the office in MVP; Cursor Agents still appear via hooks. Acceptable for the stated workflow.
- **[Trade-off] System Node** → Not a fully offline single .exe; much smaller MVP.

## Migration Plan

1. `npm run package` in repo root (includes Cursor server fixes).
2. Stage artifacts into `desktop/resources/server`.
3. `cargo tauri build` (or npm script wrapper) → NSIS/MSI or portable exe + shortcut instructions in `desktop/README.md`.
4. Rollback: delete the app install dir; standalone/`npx` and extension remain untouched. Hooks left as user last consented (same as quitting CLI).

## Open Questions

- Exact Tauri version pin and whether the first ship is “portable folder + .lnk” vs full NSIS installer (does not change launcher behavior).
- Whether closing the window should offer “Quit server” vs always kill owned child (UX polish; default = kill owned child).
