$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

& npx.cmd detox build -c android.emu.debug
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
