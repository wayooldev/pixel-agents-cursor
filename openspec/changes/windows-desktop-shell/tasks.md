## 1. Scaffold and staging

- [x] 1.1 Create `desktop/` Tauri (Windows) project skeleton with app name/icon placeholders and verify `cargo check` / Tauri CLI recognizes the project
- [x] 1.2 Add a root or `desktop/` staging script that copies `dist/cli.js`, `dist/webview/`, `dist/assets/`, `dist/hooks/`, and production Node deps needed by CLI externals into `desktop/resources/server/`; verify the staged tree contains `cli.js` and `webview/index.html`
- [x] 1.3 Document prerequisite `npm run package` (and that Cursor server fixes ride in `cli.js`) in `desktop/README.md`; verify a reader can find build + shortcut + spawned process (`node …/cli.js --port 3100 --host 127.0.0.1 --no-terminal`) steps

## 2. Launcher behavior

- [x] 2.1 Implement system Node discovery (≥20) with a clear error dialog when missing/too old; verify the dialog appears when `node` is forced missing in a local test
- [x] 2.2 Implement “reuse if compatible standalone already up” (health + discovery/token) before spawn; verify a second app launch does not start a second Node when port 3100 already serves Pixel Agents
- [x] 2.3 Implement spawn of staged `cli.js` with `--port 3100 --host 127.0.0.1 --no-terminal`, wait for health + token, navigate WebView to `http://127.0.0.1:3100/?token=…`; verify the office SPA loads privileged (settings/consent reachable, not read-only)
- [x] 2.4 Implement shutdown: kill owned child on window close; leave reused server alone; verify with Task Manager / `Get-Process` that owned vs reused cases match the spec
- [x] 2.5 Handle port occupied by a non-Pixel process with an error UI; verify the app does not treat a random listener on 3100 as the office

## 3. Packaging and smoke

- [x] 3.1 Produce a local Windows build (portable dir or installer) and create/document Desktop or taskbar shortcut; verify double-click opens the office without `cd`/`npx`
  - Release: `desktop/src-tauri/target/release/pixel-agents-desktop.exe`
  - NSIS: `desktop/src-tauri/target/release/bundle/nsis/Pixel Agents_0.1.0_x64-setup.exe`
  - Shortcut steps in `desktop/README.md`; Desktop `.lnk` can point at the portable exe
- [x] 3.2 Smoke: with Cursor hooks already consented (or consent in-app), confirm a Cursor Agent event still reaches the desktop-backed server and a character appears; verify no product `core/`/extension contract changes were required beyond packaging scripts
  - No `core/` / AsyncAPI / extension contract changes in this change — desktop only stages `cli.js` + SPA
  - Manual checklist in `desktop/README.md` (cold start, reuse, Cursor character, owned-child kill)
- [x] 3.3 Optional parallel: `vsce`/existing VSIX package from the same `npm run package` output if the IDE panel is still needed; verify VSIX is not required for the desktop smoke path
  - Documented in README: `npx @vscode/vsce package` optional; desktop path does not need a VSIX
