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

- **Windows 10/11 SDK** (`windows.h`) — also required for the Rust/MSVC build. If `cl.exe` fails with `Cannot open include file: 'windows.h'`, install the SDK (Visual Studio Installer → Build Tools → individual components → “Windows 11 SDK”, or `winget install Microsoft.WindowsSDK.10.0.26100`).

- Repo already able to `npm run package`

## What process is launched

When no compatible server is already on port **3100**:

```text
node <app>/…/resources/server/dist/cli.js --port 3100 --host 127.0.0.1 --no-terminal
# cwd = that package root (npm-style so dist/hooks resolves)
```

NSIS installs often place the sidecar at:

```text
%LOCALAPPDATA%\Pixel Agents\_up_\resources\server\
```

`launch.rs` probes Tauri `resource_dir`, then `_up_/resources/server` next to the exe, then the staged repo path used in dev.

Then the window navigates to:

```text
http://127.0.0.1:3100/?token=<contents of %USERPROFILE%\.pixel-agents\standalone-token>
```

If a Pixel Agents standalone health endpoint is already up on 3100, the app **reuses** it and does not spawn Node. Closing the app kills only a child **this** launch started.

`--no-terminal` keeps the MVP free of native `node-pty` packaging. Cursor hooks still work via HTTP to `127.0.0.1`.

### Hidden launcher (recommended for shortcuts)

Until a rebuild ships the `_up_` path lookup in the installed `.exe`, pin **Desktop / Start Menu / taskbar** to the hidden launcher instead of the raw exe:

1. After NSIS install, copy `desktop/scripts/launch-pixel-agents.vbs` (and optionally `.cmd`) next to `pixel-agents-desktop.exe`.
2. Point shortcuts at the `.vbs` (icon = `pixel-agents-desktop.exe`).
3. The VBS starts Node with **no console / no taskbar button**, waits for `/api/health`, then opens the GUI.

Log: `%USERPROFILE%\.pixel-agents\desktop-launcher.log`.

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

1. Prefer a shortcut to `launch-pixel-agents.vbs` beside the installed exe (hidden Node sidecar), **or**
2. Pin / open `pixel-agents-desktop.exe` once the rebuild includes the `_up_` server probe (still needs Node ≥ 20 on the machine).

Daily use: double-click the shortcut — no `cd` to the repo, no `npx`. The source tree is not required at runtime after a successful NSIS install.

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
