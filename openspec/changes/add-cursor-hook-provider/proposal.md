## Why

Pixel Agents today only visualizes Claude Code sessions. This workspace is meant to run that office inside Cursor for users who only use Cursor Agent (editor chat + `cursor-agent` CLI), so characters never appear. Upstream PR #400 sketched a Cursor `HookProvider` but was closed unmerged; we need that capability on current pixel-agents `main`, multi-session (one character per Cursor conversation).

## What Changes

- **Bootstrap this workspace with the product source**: the folder is not a pixel-agents clone yet (only OpenSpec + audit refs under `_ref/`). Apply must start by cloning `https://github.com/pixel-agents-hq/pixel-agents` into the project root (or replacing the empty tree), preserving `openspec/` and deciding how `_ref/` is ignored or kept local-only.
- Add a Cursor `HookProvider` parallel to Claude Code: normalize Cursor hook events, install/uninstall opt-in hooks in `~/.cursor/hooks.json`, forward events only to `127.0.0.1`.
- Map each Cursor `conversation_id` to one office character; map `subagentStart` / `subagentStop` to child characters when Cursor emits them.
- Register the provider in the existing `hookProviders` consent/install loop; bundle `cursor-hook.js` in the extension build; uninstall cleans Cursor hooks as well as Claude.
- Unit tests for Cursor normalize + installer. No new npm dependencies without explicit approval.
- Reuse ideas from closed PR #400 and read-only lessons from `ofershap/cursor-office`; rewrite rather than blind-copy. Do not adopt transcript JSONL watching as the primary path.

## Capabilities

### New Capabilities

- `cursor-agent-hooks`: Opt-in Cursor Agent detection via official hooks; multi-session characters keyed by conversation/session id; localhost-only event delivery; reversible install with consent and uninstall.

### Modified Capabilities

- (none — no canonical specs under `openspec/specs/` yet; Claude behavior stays unchanged)

## Impact

- **Repo bootstrap**: git clone of pixel-agents is a hard prerequisite before any provider code lands; OpenSpec artifacts stay in this workspace across that import.
- **Code (after clone)**: `server/src/providers/hook/cursor/*`, `server/src/providers/index.ts`, `esbuild.js` hook bundle, VS Code/CLI uninstall + hook-script copy wiring, server unit tests. Claude provider, webview graphics, and office UI stay untouched.
- **User machine**: optional write to `~/.cursor/hooks.json` (backup + own entries only) and `~/.pixel-agents/hooks/cursor-hook.js`; HTTP POST only to local Pixel Agents server.
- **Security constraints (from Fase 0)**: no network beyond localhost; no `child_process` spawn for Cursor; no reading `agent-transcripts` as primary source; no new deps without permission.
- **Out of scope**: lounge/UI/README changes from PR #400; launching Cursor Agent from the panel; Claude Code changes; marketplace publish.
