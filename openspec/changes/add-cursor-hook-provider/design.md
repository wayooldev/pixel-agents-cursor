## Context

See `proposal.md` for motivation. This workspace currently holds OpenSpec planning and read-only `_ref/` clones; product source is absent. Upstream pixel-agents already has a Claude `HookProvider`, `hookProviders[]` consent gate, `POST /api/hooks/:providerId`, and hook-script install under `~/.pixel-agents/hooks/`. Closed PR #400 added a Cursor provider + lounge UI; we take the provider/installer/hook-script ideas only. `cursor-office` confirms Cursor’s official hooks and transcript paths exist but is not the integration model (single avatar + transcript primary path).

## Goals / Non-Goals

**Goals:**

- Bootstrap a real pixel-agents tree in this workspace without losing OpenSpec.
- Implement Cursor as a second `HookProvider` with multi-session characters (`conversation_id` → session).
- Match Claude’s safety pattern: consent, backup, atomic hooks write, uninstall, loopback-only POST.
- Ship unit tests for normalize + installer; keep Claude and webview assets unchanged.

**Non-Goals:**

- Transcript/JSONL watching as detection.
- Lounge idle behavior, ConnectedEditorLabel, README i18n from #400.
- Spawning `cursor-agent` from the panel; new npm dependencies; non-localhost networking; reading `~/.ssh` / `.env` / arbitrary home files.

## Decisions

1. **Workspace bootstrap before code**  
   Apply clones `https://github.com/pixel-agents-hq/pixel-agents` into the project root (or a staging dir then merge), preserving `openspec/`. Add `_ref/` to `.gitignore` (or leave untracked). OpenSpec remains source of planning truth.  
   _Alternative:_ work only under `_ref/pixel-agents` — rejected; user wants this project folder to be the product.

2. **Hooks as sole Cursor ingress**  
   Same architecture as Claude: script in `~/.pixel-agents/hooks/cursor-hook.js`, entries in `~/.cursor/hooks.json`, POST `/api/hooks/cursor`.  
   _Alternative:_ cursor-office transcript watcher — rejected (reads chat content; collapses to one agent).

3. **Session key = `conversation_id` (fallback `session_id`)**  
   Enables N characters for N chats. Subagents via `subagentStart`/`subagentStop` use existing runtime child lifecycle.  
   _Alternative:_ single global Cursor avatar — rejected (product requirement: show several when several exist).

4. **Rewrite #400 provider code, don’t cherry-pick the PR**  
   Port patterns (event list, consent copy, installer safeguards) onto current `main` APIs; omit lounge/UI. Avoid forcing `hooks.json` `version` downgrades if a higher compatible version already exists—set `version: 1` only when missing.

5. **Register in `hookProviders`**  
   Rely on existing consent loop / `hooksConsentResponse` rather than bespoke UI. Extend `esbuild` hook bundle and uninstall to cover Cursor script + hooks.json entries. Copy Cursor hook script wherever Claude’s script is copied today (extension activate / CLI start).

6. **No new dependencies**  
   Use Node `http` + `fs` like Claude hook. Any dep needs explicit user approval.

## Risks / Trade-offs

- [Cursor hook payload drift] → Mitigation: normalize defensively; ignore unknown events; cover fixtures in unit tests; document manual smoke with current Cursor.
- [Parallel Agent chats don’t emit distinct `conversation_id`] → Mitigation: spec still requires per-id mapping; manual verify; if Cursor coalesces ids, document limitation (fewer characters).
- [Clone overwrites OpenSpec] → Mitigation: clone strategy that keeps `openspec/`; never delete planning artifacts.
- [Hook payload includes sensitive `tool_input`] → Mitigation: loopback + token only; truncate/redact in status strings like Claude; never log full payloads by default.
- [Stale #400 vs main 1.5.x] → Mitigation: implement against cloned `main`, not PR branch merge.

## Migration Plan

1. Clone pixel-agents into workspace; keep OpenSpec; ignore `_ref/`.
2. Land Cursor provider + tests; build extension.
3. User enables hooks via consent → backup hooks.json → reload Cursor if needed.
4. Rollback: disable hooks / uninstall extension (removes owned entries); restore from `hooks.json.pixel-agents.backup` if user needs full restore.

## Open Questions

- Exact merge mechanics for clone into a non-empty folder (git init + remote vs clone-to-temp + copy): resolve at apply start without changing specs.
- Whether `cursor-agent` CLI always hits the same `~/.cursor/hooks.json` as the editor on Windows: confirm in manual smoke; if not, document gap.
