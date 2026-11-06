# Pixel Agents — Windows desktop shell

One-click Tauri (WebView2) wrapper around the existing standalone server (`dist/cli.js`).  
It does **not** reimplement the office runtime: it starts or reuses the Node server and opens the SPA at a privileged URL.

## Prerequisites

- Windows 10/11 with **WebView2** (usually preinstalled)
- **Node.js ≥ 20** on PATH (spawned at runtime)
- **Rust** toolchain (`rustup`, default `stable`)
- **Visual Studio 2022 Build Tools** with the “Desktop development with C++” workload (`link.exe` / MSVC) — required to compile the Tauri shell on Windows. Example:

  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```

  Then open a **new** terminal so `link.exe` is on PATH (or use the “x64 Native Tools” prompt).

- Repo already able to `npm run package`

## What process is launched

When no compatible server is already on port **3100**:

```text
node <app>/resources/server/dist/cli.js --port 3100 --host 127.0.0.1 --no-terminal
# cwd = <app>/resources/server  (npm-style package root so dist/hooks resolves)
```

Then the window navigates to:

```text
http://127.0.0.1:3100/?token=<contents of %USERPROFILE%\.pixel-agents\standalone-token>
```

If a Pixel Agents standalone health endpoint is already up on 3100, the app **reuses** it and does not spawn Node. Closing the app kills only a child **this** launch started.

`--no-terminal` keeps the MVP free of native `node-pty` packaging. Cursor hooks still work via HTTP to `127.0.0.1`.

## Build

From the **repo root**:

```powershell
# 1) Product compile (CLI + SPA + hooks). Includes Cursor server fixes in cli.js.
npm run package

# 2) Stage dist/ + Fastify deps into desktop/resources/server
npm run desktop:stage

# 3) Install desktop CLI deps once
cd desktop
npm install

# 4) Generate icons from the product icon (once)
npx tauri icon ..\icon.png

# 5) Dev (hot) or release bundle (MSVC env required)
npm run dev
# or from repo root (loads vcvars64 + stages + builds):
powershell -ExecutionPolicy Bypass -File desktop\scripts\build-windows.ps1
```

Release output (NSIS): `desktop/src-tauri/target/release/bundle/nsis/`.  
Portable exe: `desktop/src-tauri/target/release/pixel-agents-desktop.exe`.

### Shortcut (Desktop / taskbar)

After install or after a release build:

1. Pin the installed **Pixel Agents** shortcut, **or**
2. Create a Desktop `.lnk` pointing at the built `.exe` (no working-directory requirement beyond PATH having `node`).

Daily use: double-click — no `cd` to the repo, no `npx`.

## Optional: VSIX in the same compile

`npm run package` also produces `dist/extension.js`. Packaging a `.vsix` is **optional** and only needed if you still use the IDE panel. The desktop path only needs the staged `cli.js` tree. Example:

```powershell
npx @vscode/vsce package
```

## Smoke checklist

1. Cold start app → office loads; Settings / hooks consent reachable (token present).
2. Leave server running, start app again → no second Node for port 3100.
3. With Cursor hooks consented, an Agent turn shows a character (same as `npx pixel-agents`).
4. Quit after cold start → owned Node exits. Quit after reuse → pre-existing server stays up.
