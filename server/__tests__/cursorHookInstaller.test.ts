import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpBase: string;

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return { ...actual, homedir: () => tmpBase };
});

const { areHooksInstalled, installHooks, uninstallHooks, copyCursorHookScript } =
  await import('../src/providers/hook/cursor/cursorHookInstaller.js');
const { CURSOR_HOOK_EVENTS, SETTINGS_BACKUP_SUFFIX } =
  await import('../src/providers/hook/cursor/constants.js');

function hooksPath(): string {
  return path.join(tmpBase, '.cursor', 'hooks.json');
}

function readHooks(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(hooksPath(), 'utf-8')) as Record<string, unknown>;
}

function ourCommand(): string {
  return `node "${path.join(tmpBase, '.pixel-agents', 'hooks', 'cursor-hook.js')}"`;
}

describe('cursorHookInstaller', () => {
  beforeEach(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-cursor-hook-'));
    fs.mkdirSync(path.join(tmpBase, '.cursor'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('does not create hooks.json when only checking install state', () => {
    expect(areHooksInstalled()).toBe(false);
    expect(fs.existsSync(hooksPath())).toBe(false);
  });

  it('does not write hooks.json when the hook script source is missing', () => {
    const copied = copyCursorHookScript(path.join(tmpBase, 'missing-extension'));
    expect(copied).toBe(false);
    expect(fs.existsSync(hooksPath())).toBe(false);
  });

  it('backs up an existing file and keeps third-party hooks and a higher version', async () => {
    const thirdParty = { command: 'node /opt/other-tool/hook.js' };
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify(
        {
          version: 2,
          hooks: {
            preToolUse: [thirdParty],
            afterFileEdit: [{ command: 'node /opt/other-tool/edit.js' }],
          },
        },
        null,
        2,
      ),
    );

    await installHooks();

    const backup = fs.readFileSync(hooksPath() + SETTINGS_BACKUP_SUFFIX, 'utf-8');
    expect(backup).toContain('/opt/other-tool/hook.js');
    const file = readHooks();
    expect(file.version).toBe(2);
    const hooks = file.hooks as Record<string, Array<{ command: string }>>;
    expect(hooks.preToolUse.map((entry) => entry.command)).toEqual([
      thirdParty.command,
      ourCommand(),
    ]);
    expect(hooks.afterFileEdit).toEqual([{ command: 'node /opt/other-tool/edit.js' }]);
    for (const event of CURSOR_HOOK_EVENTS) {
      expect(hooks[event].some((entry) => entry.command === ourCommand())).toBe(true);
    }
    expect(areHooksInstalled()).toBe(true);
  });

  it('uninstall removes only Pixel Agents entries', async () => {
    fs.writeFileSync(
      hooksPath(),
      JSON.stringify({
        version: 2,
        hooks: {
          stop: [{ command: 'node /opt/other-tool/stop.js' }, { command: ourCommand() }],
          preToolUse: [{ command: ourCommand() }],
        },
      }),
    );

    await uninstallHooks();

    const file = readHooks();
    expect(file.version).toBe(2);
    const hooks = file.hooks as Record<string, Array<{ command: string }>>;
    expect(hooks.stop).toEqual([{ command: 'node /opt/other-tool/stop.js' }]);
    expect(hooks.preToolUse).toBeUndefined();
    expect(areHooksInstalled()).toBe(false);
  });
});
