/* eslint-disable @typescript-eslint/no-var-requires, no-console */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reactPkgPath = path.join(root, 'node_modules', 'react', 'package.json');

if (!fs.existsSync(reactPkgPath)) {
  throw new Error(`react package.json not found at ${reactPkgPath}`);
}

const reactVersion = JSON.parse(fs.readFileSync(reactPkgPath, 'utf8')).version;
const rendererFiles = [
  path.join(
    root,
    'node_modules',
    'react-native',
    'Libraries',
    'Renderer',
    'implementations',
    'ReactNativeRenderer-dev.js'
  ),
  path.join(
    root,
    'node_modules',
    'react-native',
    'Libraries',
    'Renderer',
    'implementations',
    'ReactNativeRenderer-prod.js'
  ),
  path.join(
    root,
    'node_modules',
    'react-native',
    'Libraries',
    'Renderer',
    'implementations',
    'ReactNativeRenderer-profiling.js'
  ),
];

let changedCount = 0;

for (const file of rendererFiles) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const original = fs.readFileSync(file, 'utf8');
  let updated = original;

  updated = updated.replace(
    /if \("[0-9]+\.[0-9]+\.[0-9]+" !== isomorphicReactPackageVersion\)/,
    `if ("${reactVersion}" !== isomorphicReactPackageVersion)`
  );

  updated = updated.replace(
    /react-native-renderer:\s+[0-9]+\.[0-9]+\.[0-9]+/,
    `react-native-renderer:  ${reactVersion}`
  );

  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    changedCount += 1;
  }
}

console.log(`sync-react-renderer-version: react=${reactVersion}, patchedFiles=${changedCount}`);
