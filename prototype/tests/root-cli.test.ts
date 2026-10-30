import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('root dev/start retain root env configuration without relying on Next project env loading', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const fixture = mkdtempSync(join(tmpdir(), 'caption-cli-'));
  try {
    mkdirSync(join(fixture, 'node_modules/next/dist/bin'), { recursive: true });
    writeFileSync(join(fixture, '.env.local'), 'CLI_LOCAL_PROBE=from-local\n');
    writeFileSync(join(fixture, '.env'), 'CLI_BASE_PROBE=from-base\n');
    writeFileSync(join(fixture, 'node_modules/next/dist/bin/next'), 'console.log(JSON.stringify([process.env.CLI_LOCAL_PROBE,process.env.CLI_BASE_PROBE]))');
    for (const command of ['dev', 'start']) {
      const [node, ...args] = scripts[command].split(' ');
      assert.equal(node, 'node');
      const result = spawnSync(process.execPath, args, { cwd: fixture, encoding: 'utf8', env: { SystemRoot: process.env.SystemRoot, NODE_ENV: 'test' } });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), ['from-local', 'from-base'], command);
    }
  } finally {
    assert.ok(resolve(fixture).startsWith(join(resolve(tmpdir()), 'caption-cli-')));
    rmSync(fixture, { recursive: true });
  }
});

test('marketing image paths match exact filesystem case for Linux hosting', () => {
  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  for (const file of ['../app/page.tsx', '../app/about/page.tsx', '../components/SiteFooter.tsx']) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const [, asset] of text.matchAll(/["'](\/image\/[\w/.-]+)["']/g)) {
      let directory = publicDir;
      for (const part of asset.split('/').filter(Boolean)) {
        assert.ok(readdirSync(directory).includes(part), `Asset path/case mismatch: ${asset}`);
        directory = join(directory, part);
      }
    }
  }
});
