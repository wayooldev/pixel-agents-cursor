# Manual smoke: Cursor hooks

Run this after the unit checks. It is the check that two Cursor Agent chats become two office characters.

1. From the repo root, build a local VSIX (this runs the production package script first):

   ```bash
   npx @vscode/vsce package --allow-star-activation --out pixel-agents-local.vsix
   ```

2. In Cursor, open the Extensions view, choose **Install from VSIX...**, and pick `pixel-agents-local.vsix`. Then run **Developer: Reload Window**.
3. Open the Pixel Agents panel in the workspace you will chat in.
4. When the office asks, grant **Cursor hooks** consent. That is the only step that writes `~/.cursor/hooks.json` (on Windows, `%USERPROFILE%\.cursor\hooks.json`). Decline leaves that file untouched.
5. If characters do not appear, reload Cursor once so it picks up the new hook commands. Confirm the file contains `cursor-hook.js` entries and that unrelated hooks are still there. A one-time backup is `hooks.json.pixel-agents.backup`.
6. Open two Agent chats in that same workspace and send a message in each.
7. Expect two primary characters, one per chat. A subagent Cursor reports with `subagentStart` should show as a child of that chat's character and leave on `subagentStop`.

If both chats share one `conversation_id`, Cursor is collapsing them and the office can only show one character. That is a Cursor payload limit, not a merged install.

`cursor-agent` CLI hooks are only covered when that CLI reads the same `~/.cursor/hooks.json` as the editor. If a CLI session never appears, note that gap; do not point the hook script at a non-loopback host.

Uninstall the extension, or turn off Instant Detection (Hooks) for Cursor, to remove only Pixel Agents entries from `hooks.json`.
