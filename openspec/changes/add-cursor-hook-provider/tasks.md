## 1. Workspace bootstrap

- [x] 1.1 Clone `https://github.com/pixel-agents-hq/pixel-agents` into this workspace without deleting `openspec/`; verify `package.json` / `server/` exist at the product root and `openspec/changes/add-cursor-hook-provider/` still exists
- [x] 1.2 Ensure `_ref/` stays local-only (e.g. `.gitignore` entry) and verify `git status` does not require committing audit clones
- [x] 1.3 Run `npm install` at the product root and verify install completes without adding unauthorized new dependencies

## 2. Cursor HookProvider

- [x] 2.1 Add `server/src/providers/hook/cursor/` (`cursor.ts`, `constants.ts`, `consentCopy.ts`, `cursorHookInstaller.ts`, `hooks/cursor-hook.ts`) implementing `HookProvider` id `cursor`, mapping `conversation_id`→session, supported events only, loopback POST; verify TypeScript compiles for these modules
- [x] 2.2 Register `cursorProvider` in `server/src/providers/index.ts` `hookProviders` and wire `copyCursorHookScript` beside Claude’s copy helper; verify `hookProviderById('cursor')` resolves
- [x] 2.3 Extend `esbuild.js` to bundle `cursor-hook.ts` into `dist/hooks/cursor-hook.js` and verify the file is produced by `npm run build` (or the project’s hook build step)
- [x] 2.4 Ensure extension/CLI paths that copy Claude’s hook script also copy the Cursor hook script, and uninstall removes Cursor hooks.json entries + does not strip third-party hooks; verify by reading uninstall/activate wiring

## 3. Tests

- [x] 3.1 Add `server/__tests__/cursor.test.ts` covering normalize for session/tool/subagent/stop and ignore-unknown; verify tests pass
- [x] 3.2 Add `server/__tests__/cursorHookInstaller.test.ts` covering install backup/preserve third-party, uninstall, and no-write without install path as applicable; verify tests pass

## 4. Verification

- [x] 4.1 Run project lint, typecheck, and unit tests (`npm run check-types`, `npm run lint`, `npm test` or documented equivalents) and verify all pass
- [x] 4.2 Re-scan the diff for non-localhost network, `child_process` in Cursor provider, transcript watching, and new dependencies; verify none were introduced beyond the approved design
- [x] 4.3 Document manual smoke: build VSIX, Install from VSIX in Cursor, grant Cursor hooks consent, open two Agent chats, confirm two characters; verify the doc is in the change notes or PR description ready for the user
