/**
 * Provider registry: re-exports all bundled providers.
 *
 * Adding a new CLI provider:
 *   1. Create `server/src/providers/hook/<cli>/<cli>.ts` implementing HookProvider.
 *      (File-based and stream-based provider types will land when the first such
 *       provider ships.)
 *   2. Add an export line below.
 *
 * The adapter (VS Code extension, standalone CLI, etc.) imports from here rather
 * than reaching into each provider directory directly.
 */

import type { HookProvider } from '../../../core/src/provider.js';
import { claudeProvider } from './hook/claude/claude.js';
import { cursorProvider } from './hook/cursor/cursor.js';

export { claudeProvider };
export { cursorProvider };
export { copyHookScript } from './hook/claude/claudeHookInstaller.js';
export { copyCursorHookScript } from './hook/cursor/cursorHookInstaller.js';

/**
 * Providers that can normalize inbound `/api/hooks/:providerId` events.
 * Claude stays here so leftover Claude hooks still route if present; this
 * fork does not offer Claude in the consent / Settings install surface.
 */
export const inboundHookProviders: readonly HookProvider[] = [claudeProvider, cursorProvider];

/**
 * Consent + Settings install loop. Cursor-only for this workspace: Claude Code
 * hooks are not asked for or installed from the office UI.
 */
export const hookProviders: readonly HookProvider[] = [cursorProvider];

/** Resolve a wire-supplied provider id, or undefined for an unknown one —
 *  the caller writes nothing on undefined (fail-closed, like a junk choice). */
export function hookProviderById(id: unknown): HookProvider | undefined {
  return typeof id === 'string' ? inboundHookProviders.find((p) => p.id === id) : undefined;
}
