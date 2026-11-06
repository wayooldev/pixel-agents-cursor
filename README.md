# Pixel Agents (Cursor)

Pixel-art office where your **Cursor Agent** chats become animated characters. Based on [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT), focused on Cursor hooks and an optional Windows desktop shell.

![Pixel Agents office](webview-ui/public/office.png)

## What this is

| Surface               | What you get                                                                         |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Standalone CLI**    | `node dist/cli.js` / local package — browser office on `127.0.0.1`                   |
| **Windows desktop**   | Tauri app under `desktop/` — one-click window (WebView2 + system Node)               |
| **VS Code extension** | Same tree can still build a `.vsix` (optional; Cursor users usually use desktop/CLI) |

Agents show up when Cursor fires official hooks into a local Pixel Agents server. One conversation → one character.

> **Not the Marketplace listing.** The official Claude-oriented extension remains [pablodelucca.pixel-agents](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents). This repo is a Cursor-oriented derivative — see [docs/UPSTREAM.md](docs/UPSTREAM.md).

## Requirements

### To run (end users)

| Need                             | Notes                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| **[Cursor](https://cursor.com)** | Editor / Agent chats you want to visualize                   |
| **Node.js ≥ 20**                 | On `PATH` (`node -v`). Desktop app spawns it for the sidecar |
| **Windows 10/11 + WebView2**     | For the desktop shell (WebView2 is usually preinstalled)     |

Optional:

- **Layouts** from the community [Layout Index](https://pixel-agents-hq.github.io/index/) → Settings → Import Layout
- Discord (upstream community): https://discord.gg/Yk7jXebv9H

### To build from source (developers)

| Need                                        | Notes                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| Node.js **22** (see [`.nvmrc`](.nvmrc))     | `npm install` at repo root                                                       |
| **Rust** (`rustup`, stable)                 | Only for the Windows desktop shell                                               |
| **VS 2022 Build Tools** (MSVC / `link.exe`) | Only for compiling Tauri on Windows — see [desktop/README.md](desktop/README.md) |

## Quick start (Windows desktop)

1. Install [Node.js 20+](https://nodejs.org/) and Cursor.
2. Build once (from a developer machine / this repo):

   ```powershell
   npm install
   npm run package
   npm run desktop:stage
   powershell -ExecutionPolicy Bypass -File desktop\scripts\build-windows.ps1
   ```

3. Run:

   - Portable: `desktop\src-tauri\target\release\pixel-agents-desktop.exe`
   - Or installer: `desktop\src-tauri\target\release\bundle\nsis\Pixel Agents_0.1.0_x64-setup.exe`

4. On first open, complete the in-app Intro and approve **Cursor hooks** (writes to `~/.cursor/hooks.json`, backup created). The printed/office URL includes a `?token=` — treat it as a secret.

5. Chat in Cursor. Characters should appear in the office (enable **Watch All Sessions** if a chat still does not show — it defaults to on in this fork).

Details, reuse of port `3100`, and troubleshooting: [desktop/README.md](desktop/README.md).

## Quick start (standalone CLI, any OS)

```bash
npm install
npm run package
node dist/cli.js --port 3100 --host 127.0.0.1 --no-terminal
```

Open the URL the CLI prints (with `?token=`). Approve Cursor hooks in the Intro/Settings. Same office SPA as the desktop shell.

```bash
# useful flags
node dist/cli.js --help
node dist/cli.js --port 3100
node dist/cli.js --no-terminal   # watch only (what the desktop app uses)
```

Default bind is `127.0.0.1`. Do not bind `0.0.0.0` on untrusted networks.

## Features (this fork)

- **Cursor Agent hooks** — live tool / session events via `~/.cursor/hooks.json`
- **Consent for Cursor only** — Settings → Instant Detection (Hooks) toggles Cursor; Claude Code is not asked in the Intro
- **Watch All Sessions** + **Always Show Labels** on by default
- **Layout editor** + Import/Export JSON (same as upstream)
- **Windows desktop shell** — Tauri + staged Node sidecar

## Project layout

```text
core/           Protocol + shared types (AsyncAPI → messages)
server/         Runtime, Fastify, HookProviders (incl. cursor/)
webview-ui/     React + Canvas office
adapters/vscode/  VS Code surface (optional for Cursor users)
desktop/        Windows Tauri shell + staging scripts
openspec/       Change proposals for this fork
docs/           Upstream notes, ADRs, external assets
```

## Development

```bash
npm install
npm run build          # asyncapi + types + lint + esbuild + vite
npm test               # server + webview unit tests
npm run desktop:stage  # copy dist into desktop/resources/server
```

Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md).  
Upstream sync / license notes: [docs/UPSTREAM.md](docs/UPSTREAM.md).  
External furniture packs: [docs/external-assets.md](docs/external-assets.md).

## Configuration & data on disk

Under `%USERPROFILE%\.pixel-agents\` (or `~/.pixel-agents/`):

| Path                   | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `config.json`          | Settings, hooks consent (`cursor`), directories |
| `layout.json`          | Office layout                                   |
| `standalone-token`     | Privileged browser/desktop token                |
| `hooks/cursor-hook.js` | Bundled Cursor hook script                      |

Cursor hooks live in `%USERPROFILE%\.cursor\hooks.json`.

## Security notes

- Hook traffic stays on **localhost** (`127.0.0.1`) unless you deliberately change `--host`.
- The `?token=` URL can approve hook installs and change settings — do not share it.
- Consent disclosure is shown in-app before the first write to Cursor’s hooks file.

## License

MIT — see [LICENSE](LICENSE). Upstream copyright retained; this fork’s additions are under the same license.

## Credits

- Original product: [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) by [Pablo De Lucca](https://github.com/pablodelucca) and contributors
- Character art basis: [JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)
- Community layouts: [pixel-agents-hq/index](https://pixel-agents-hq.github.io/index/)
