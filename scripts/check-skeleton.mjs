import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function requireFile(path, nonempty = false) {
  const stat = statSync(path);
  assert.ok(stat.isFile(), `${path} must be a file`);
  if (nonempty) assert.ok(stat.size > 0, `${path} must not be empty`);
}

for (const path of [
  'README.md',
  'angular.json',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.federation.json',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
]) requireFile(path, true);

for (const path of [
  'federation.config.js',
  'src/index.html',
  'src/main.ts',
  'src/bootstrap.ts',
  'src/app/app.component.ts',
  'src/app/app.config.ts',
  'src/app/shell-contract.ts',
  'src/app/iam/iam.routes.ts',
  'src/app/iam/components/sign-in-form.component.ts',
  'src/app/iam/components/mfa-form.component.ts',
  'src/app/iam/data/iam-api.service.ts',
  'src/app/iam/model/auth.ts',
  'src/app/iam/pages/iam-page.component.ts',
  'deploy/Dockerfile',
  'deploy/compose.yml',
  'deploy/nginx.conf',
]) requireFile(path);

const manifest = readJson('package.json');
const lock = readJson('package-lock.json');
const angular = readJson('angular.json');
const appTsconfig = readJson('tsconfig.app.json');
readJson('tsconfig.json');
readJson('tsconfig.federation.json');

assert.equal(manifest.name, 'dlc-iam-portal');
assert.equal(lock.name, manifest.name);
assert.equal(lock.version, manifest.version);
assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);

const targets = angular.projects?.[manifest.name]?.architect;
assert.ok(targets, 'Angular project must match package name');
assert.ok(targets.build && targets.serve && targets['build-original'] && targets['serve-original']);
const options = targets['build-original'].options;
assert.equal(options.index, 'src/index.html');
assert.equal(options.browser, 'src/main.ts');
assert.equal(options.tsConfig, 'tsconfig.app.json');
assert.ok(appTsconfig.files?.includes(options.browser));

console.log('Portal skeleton structure is valid. Build and functional tests were not run.');
