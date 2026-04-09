param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

if (-not $env:ANDROID_SDK_ROOT -or [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (-not (Test-Path $defaultSdk)) {
    throw 'ANDROID_SDK_ROOT is not set and default SDK path was not found.'
  }

  $env:ANDROID_SDK_ROOT = $defaultSdk
}

$androidUserHome = Join-Path $WorkspaceRoot '.android-user-home'
$gradleUserHome = Join-Path $WorkspaceRoot '.gradle-user-home'

Ensure-Directory -Path $androidUserHome
Ensure-Directory -Path $gradleUserHome
Ensure-Directory -Path (Join-Path $androidUserHome '.android')

$env:ANDROID_USER_HOME = $androidUserHome
$env:ANDROID_SDK_HOME = $null
$env:GRADLE_USER_HOME = $gradleUserHome

$platformTools = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools'
$emulatorDir = Join-Path $env:ANDROID_SDK_ROOT 'emulator'
$cmdlineTools = Join-Path $env:ANDROID_SDK_ROOT 'cmdline-tools\latest\bin'

$pathEntries = @($platformTools, $emulatorDir, $cmdlineTools) | Where-Object { Test-Path $_ }
if ($pathEntries.Count -gt 0) {
  $env:PATH = (($pathEntries + @($env:PATH)) -join ';')
}

Write-Host "ANDROID_SDK_ROOT=$($env:ANDROID_SDK_ROOT)"
Write-Host "ANDROID_USER_HOME=$androidUserHome"
Write-Host "GRADLE_USER_HOME=$gradleUserHome"
