/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkgPath = path.join(root, 'node_modules', 'react-native-safe-area-context', 'package.json');
const filePath = path.join(
  root,
  'node_modules',
  'react-native-safe-area-context',
  'android',
  'src',
  'main',
  'java',
  'com',
  'th3rdwave',
  'safeareacontext',
  'SafeAreaProviderManager.kt'
);

function log(message) {
  process.stdout.write(`${message}\n`);
}

if (!fs.existsSync(pkgPath) || !fs.existsSync(filePath)) {
  log('patch-safe-area-context-rn81: package/files not found, skipped');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = String(pkg.version || '');

if (!version.startsWith('4.')) {
  log(`patch-safe-area-context-rn81: version ${version} does not need patch`);
  process.exit(0);
}

let source = fs.readFileSync(filePath, 'utf8');

if (!source.includes('RNCSafeAreaProviderManagerDelegate(this)')) {
  log('patch-safe-area-context-rn81: already patched or unknown format');
  process.exit(0);
}

if (!source.includes('import com.facebook.react.uimanager.ViewManagerDelegate')) {
  source = source.replace(
    "import com.facebook.react.uimanager.ViewGroupManager\n",
    "import com.facebook.react.uimanager.ViewGroupManager\nimport com.facebook.react.uimanager.ViewManagerDelegate\n"
  );
}

source = source.replace(
  '  private val mDelegate = RNCSafeAreaProviderManagerDelegate(this)',
  '  private val mDelegate: ViewManagerDelegate<SafeAreaProvider> =\n      RNCSafeAreaProviderManagerDelegate<SafeAreaProvider, SafeAreaProviderManager>(this)'
);

source = source.replace(
  '  override fun getDelegate() = mDelegate',
  '  override fun getDelegate(): ViewManagerDelegate<SafeAreaProvider> = mDelegate'
);

fs.writeFileSync(filePath, source, 'utf8');
log(`patch-safe-area-context-rn81: patched ${version}`);
