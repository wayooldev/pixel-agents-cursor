#!/usr/bin/env node
/**
 * Stage standalone CLI artifacts into desktop/resources/server for the Tauri shell.
 *
 * Layout mirrors the npm package so cli.js resolves hooks at <packageRoot>/dist/hooks/:
 *
 *   resources/server/           ← package root (spawn cwd)
 *     dist/cli.js
 *     dist/webview/
 *     dist/assets/
 *     dist/hooks/
 *     package.json + node_modules/  ← Fastify externals
 *
 * Prerequisite: `npm run package` at the repo root.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, '..');
const repoRoot = join(desktopRoot, '..');
const distRoot = join(repoRoot, 'dist');
const packageRoot = join(desktopRoot, 'resources', 'server');
const stagedDist = join(packageRoot, 'dist');

const required = [
  join(distRoot, 'cli.js'),
  join(distRoot, 'webview', 'index.html'),
  join(distRoot, 'assets'),
  join(distRoot, 'hooks'),
];

for (const path of required) {
  if (!existsSync(path)) {
    console.error(
      `[desktop:stage] Missing ${path}\nRun \`npm run package\` at the repo root first.`,
    );
    process.exit(1);
  }
}

rmSync(packageRoot, { recursive: true, force: true });
mkdirSync(stagedDist, { recursive: true });

cpSync(join(distRoot, 'cli.js'), join(stagedDist, 'cli.js'));
cpSync(join(distRoot, 'webview'), join(stagedDist, 'webview'), { recursive: true });
cpSync(join(distRoot, 'assets'), join(stagedDist, 'assets'), { recursive: true });
cpSync(join(distRoot, 'hooks'), join(stagedDist, 'hooks'), { recursive: true });

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const deps = {
  fastify: rootPkg.dependencies.fastify,
  '@fastify/cors': rootPkg.dependencies['@fastify/cors'],
  '@fastify/static': rootPkg.dependencies['@fastify/static'],
  '@fastify/websocket': rootPkg.dependencies['@fastify/websocket'],
};
for (const [name, version] of Object.entries(deps)) {
  if (!version) {
    console.error(`[desktop:stage] Root package.json missing dependency ${name}`);
    process.exit(1);
  }
}

writeFileSync(
  join(packageRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'pixel-agents-desktop-server',
      private: true,
      version: '0.0.0',
      type: 'commonjs',
      dependencies: deps,
    },
    null,
    2,
  ) + '\n',
);

console.log('[desktop:stage] Installing production Node deps next to package root…');
// On Windows, npm is a .cmd shim; spawn without a shell often fails with ENOENT.
// Args are fixed literals (no user input).
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const install = spawnSync(npm, ['install', '--omit=dev', '--no-fund', '--no-audit'], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
if (install.status !== 0) {
  console.error('[desktop:stage] npm install failed');
  process.exit(install.status ?? 1);
}

const checks = [
  join(stagedDist, 'cli.js'),
  join(stagedDist, 'webview', 'index.html'),
  join(stagedDist, 'hooks', 'cursor-hook.js'),
];
for (const path of checks) {
  if (!existsSync(path)) {
    console.error(`[desktop:stage] Staging incomplete: missing ${path}`);
    process.exit(1);
  }
}

console.log(`[desktop:stage] Ready: ${packageRoot}`);
console.log('[desktop:stage] Spawn: node dist/cli.js --port 3100 --host 127.0.0.1 --no-terminal');
