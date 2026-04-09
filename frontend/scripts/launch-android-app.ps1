$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

$adbPath = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe'
$appId = 'com.androidseed'

if (-not (Test-Path $adbPath)) {
  throw "adb nao encontrado em $adbPath"
}

& $adbPath start-server | Out-Null
& $adbPath wait-for-device | Out-Null
& $adbPath reverse tcp:8081 tcp:8081 | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao configurar adb reverse para a porta 8081.'
}

Write-Host "Relancando $appId no dispositivo conectado..."
& $adbPath shell am force-stop $appId | Out-Null
& $adbPath shell monkey -p $appId -c android.intent.category.LAUNCHER 1 | Out-Null
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
