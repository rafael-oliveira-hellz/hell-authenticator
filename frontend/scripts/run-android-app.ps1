$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

$adbPath = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe'

if (-not (Test-Path $adbPath)) {
  throw "adb nao encontrado em $adbPath"
}

Write-Host 'Garantindo conexao do app debug com o Metro em 8081...'
& $adbPath start-server | Out-Null
& $adbPath wait-for-device | Out-Null
& $adbPath reverse tcp:8081 tcp:8081 | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao configurar adb reverse para a porta 8081.'
}

& npx.cmd react-native run-android --mode debug --no-packager
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
