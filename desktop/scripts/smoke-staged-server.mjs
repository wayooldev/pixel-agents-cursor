#!/usr/bin/env node
/**
 * Smoke the staged Node sidecar without Tauri: spawn cli.js on 3100, hit /api/health, then stop.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..', 'resources', 'server');
const cli = join(packageRoot, 'dist', 'cli.js');
const PORT = 3100;

if (!existsSync(cli)) {
  console.error('Missing staged server. Run: npm run desktop:stage');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [cli, '--port', String(PORT), '--host', '127.0.0.1', '--no-terminal'],
  { cwd: packageRoot, stdio: ['ignore', 'pipe', 'pipe'] },
);

let settled = false;
function fail(msg) {
  if (settled) return;
  settled = true;
  console.error(msg);
  child.kill();
  process.exit(1);
}

child.on('error', (e) => fail(String(e)));
child.stderr.on('data', (d) => process.stderr.write(d));

const deadline = Date.now() + 45_000;
(async () => {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) {
        const body = await res.json();
        if (body.status === 'ok' && body.pid) {
          settled = true;
          console.log('[smoke] health ok', body);
          child.kill();
          await new Promise((r) => child.on('exit', r));
          process.exit(0);
        }
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  fail('Timed out waiting for /api/health');
})();
