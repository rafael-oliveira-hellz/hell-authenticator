param(
  [string]$BuildType = 'release'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$androidDir = Join-Path $workspaceRoot 'android'
$adbPath = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe'

if (-not (Test-Path $adbPath)) {
  throw "adb nao encontrado em $adbPath"
}

$gradleTask = switch ($BuildType.ToLowerInvariant()) {
  'debug' { 'installDebug' }
  'release' { 'installRelease' }
  default { throw "BuildType invalido: $BuildType. Use 'debug' ou 'release'." }
}

Write-Host "Instalando build Android com bundle embarcado ($BuildType)..."
Push-Location $androidDir
try {
  & '.\gradlew.bat' $gradleTask
  $gradleExitCode = $LASTEXITCODE
} finally {
  Pop-Location
}

if ($gradleExitCode -ne 0) {
  exit $gradleExitCode
}

$deviceSerial = (& $adbPath devices | Select-String 'device$' | Select-Object -First 1).ToString().Split("`t")[0]
if ([string]::IsNullOrWhiteSpace($deviceSerial)) {
  throw 'Nenhum dispositivo Android conectado foi encontrado.'
}

$appId = 'com.androidseed'

Write-Host "Relancando $appId no dispositivo $deviceSerial..."
& $adbPath -s $deviceSerial shell am force-stop $appId | Out-Null
& $adbPath -s $deviceSerial shell monkey -p $appId -c android.intent.category.LAUNCHER 1 | Out-Null
$adbExitCode = $LASTEXITCODE

if ($adbExitCode -ne 0) {
  exit $adbExitCode
}

Write-Host "Build instalado e app relancado com bundle embarcado."
