# Upstream attribution

This repository is a **derivative** of [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT License, © Pablo De Lucca / Pixel Agents).

## What we keep

- Core office runtime (`core/`, `server/`, `webview-ui/`)
- AsyncAPI protocol, AgentRuntime, layout editor, standalone CLI shape
- VS Code adapter structure
- MIT license terms (see [LICENSE](../LICENSE))

## What this fork adds / changes

| Area                | Change                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Cursor hooks**    | `HookProvider` for Cursor Agent (`server/src/providers/hook/cursor/`), consent + install into `~/.cursor/hooks.json` |
| **Consent surface** | Office asks to install **Cursor hooks only** (Claude Code hooks are not offered in Settings / Intro)                 |
| **Defaults**        | `Watch All Sessions` and `Always Show Labels` default to **on**                                                      |
| **Windows desktop** | Optional Tauri shell under `desktop/` — one-click window around the standalone server (`--port 3100 --no-terminal`)  |

Claude Code support in the runtime (transcript scanning, `/api/hooks/claude`) may still exist for leftover installs, but this product path is **Cursor-first**.

## Syncing with upstream

```bash
git remote add upstream https://github.com/pixel-agents-hq/pixel-agents.git   # if missing
git fetch upstream
git merge upstream/main   # or rebase — resolve conflicts carefully around providers/index + Intro/Settings
```

Prefer small, reviewable merges. Desktop and Cursor provider paths are fork-owned; avoid blindly overwriting them.

## Community / layouts

- Upstream Discord: https://discord.gg/Yk7jXebv9H
- Community layout index: https://pixel-agents-hq.github.io/index/
- Upstream discussions: https://github.com/pixel-agents-hq/pixel-agents/discussions
