import assert from 'node:assert/strict';
import { readFileSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

const output = join('dist', 'iam-portal-module', 'browser');
const main = join(output, 'main.js');
const entry = join(output, 'entry.js');
const bundle = readFileSync(main, 'utf8');

assert.ok(statSync(join(output, 'auth-clinic-background.png')).isFile());
assert.doesNotMatch(bundle, /staff@example\.test|StrongPass1/);

const exportsBlock = bundle.match(/\bexport\s*\{[^}]*\}/g)?.join('') ?? '';
for (const name of ['portalId', 'contractVersion', 'mount']) {
  assert.match(exportsBlock, new RegExp(`\\b${name}\\b`));
}

renameSync(main, entry);
console.log(`IAM portal module ready: ${entry}`);