param(
  [Parameter(Mandatory = $true)]
  [string]$Command,
  [string[]]$Arguments = @()
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

& $Command @Arguments
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
