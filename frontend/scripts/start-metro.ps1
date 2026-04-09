$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

$listeners = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  $listenerPids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  $listenerProcesses = @()

  foreach ($listenerPid in $listenerPids) {
    try {
      $listenerProcesses += Get-Process -Id $listenerPid -ErrorAction Stop
    } catch {
      # Ignore transient processes.
    }
  }

  $hasForeignListener = $listenerProcesses | Where-Object { $_.ProcessName -notin @('node', 'cmd', 'powershell', 'pwsh') }
  if ($hasForeignListener) {
    $processSummary = ($hasForeignListener | ForEach-Object { "$($_.ProcessName) (PID=$($_.Id))" }) -join ', '
    throw "A porta 8081 ja esta em uso por: $processSummary. Libere essa porta antes de iniciar o Metro."
  }
}

Write-Host 'Iniciando Metro em http://0.0.0.0:8081 ...'
& npx.cmd react-native start --host 0.0.0.0 --port 8081
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
