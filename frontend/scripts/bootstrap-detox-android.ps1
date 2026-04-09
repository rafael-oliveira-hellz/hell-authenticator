param(
  [string]$AvdName = 'test',
  [string]$ApiLevel = '34',
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'setup-android-env.ps1')

function Require-File {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path $Path)) {
    throw "$Name not found at: $Path"
  }
}

function Wait-ForPort {
  param(
    [string]$Address,
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect($Address, $Port, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(500)
      if ($ok -and $client.Connected) {
        $client.EndConnect($iar)
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {
      # keep waiting
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

function Stop-Port8081Listeners {
  $lines = netstat -ano -p tcp | Select-String ':8081'
  $pids = @()

  foreach ($line in $lines) {
    $text = ($line.Line -replace '\s+', ' ').Trim()
    if ($text -match '^TCP\s+[^ ]+:8081\s+[^ ]+\s+LISTENING\s+(\d+)$') {
      $listenerPid = [int]$Matches[1]
      if ($listenerPid -ne $PID -and $pids -notcontains $listenerPid) {
        $pids += $listenerPid
      }
    }
  }

  foreach ($listenerPid in $pids) {
    try {
      Write-Host "Stopping existing process on port 8081 (PID=$listenerPid)..."
      Stop-Process -Id $listenerPid -Force
    } catch {
      Write-Host "Warning: failed to stop PID=$listenerPid on port 8081."
    }
  }
}

function Read-MetroLogs {
  param([string]$OutPath, [string]$ErrPath)

  $lines = @()
  if (Test-Path $OutPath) {
    $lines += Get-Content $OutPath -Tail 60
  }
  if (Test-Path $ErrPath) {
    $lines += Get-Content $ErrPath -Tail 60
  }

  if (-not $lines -or $lines.Count -eq 0) {
    return 'No metro log available.'
  }

  return ($lines -join "`n")
}

$androidSdkRoot = $env:ANDROID_SDK_ROOT
$env:DETOX_AVD_NAME = $AvdName

$emulatorExe = Join-Path $androidSdkRoot 'emulator\emulator.exe'
$sdkManager = Join-Path $androidSdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
$avdManager = Join-Path $androidSdkRoot 'cmdline-tools\latest\bin\avdmanager.bat'
$adbExe = Join-Path $androidSdkRoot 'platform-tools\adb.exe'

Require-File -Path $emulatorExe -Name 'Android emulator'
Require-File -Path $sdkManager -Name 'sdkmanager.bat'
Require-File -Path $avdManager -Name 'avdmanager.bat'
Require-File -Path $adbExe -Name 'adb.exe'

Write-Host "Using ANDROID_SDK_ROOT=$androidSdkRoot"
Write-Host "Target AVD: $AvdName (API $ApiLevel)"

$installedAvds = & $emulatorExe -list-avds
$hasAvd = $false

if ($installedAvds) {
  foreach ($line in $installedAvds) {
    if ($line.Trim() -eq $AvdName) {
      $hasAvd = $true
      break
    }
  }
}

if (-not $hasAvd) {
  $image = "system-images;android-$ApiLevel;google_apis;x86_64"

  Write-Host "AVD '$AvdName' not found. Installing required SDK packages..."
  & $sdkManager --install 'platform-tools' 'emulator' $image
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to install SDK packages.'
  }

  Write-Host "Creating AVD '$AvdName' with image '$image'..."
  $createCmd = "echo no|`"$avdManager`" create avd -n `"$AvdName`" -k `"$image`" --force"
  cmd.exe /c $createCmd
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create AVD.'
  }
}

Write-Host 'Synchronizing React/renderer runtime version...'
& npm.cmd run e2e:prepare
if ($LASTEXITCODE -ne 0) {
  throw 'Detox prepare step failed.'
}

Write-Host 'Running Detox Android build...'
& npm.cmd run e2e:build
if ($LASTEXITCODE -ne 0) {
  throw 'Detox build failed.'
}

if (-not $SkipTests) {
  $metroProcess = $null
  $metroLogPath = Join-Path (Get-Location).Path '.metro-bootstrap.log'
  $metroErrLogPath = Join-Path (Get-Location).Path '.metro-bootstrap.err.log'

  try {
    Stop-Port8081Listeners

    Write-Host 'Starting Metro on port 8081...'
    if (Test-Path $metroLogPath) {
      Remove-Item $metroLogPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $metroErrLogPath) {
      Remove-Item $metroErrLogPath -Force -ErrorAction SilentlyContinue
    }

    $metroProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm.cmd run start -- --port 8081 --reset-cache') -WorkingDirectory (Get-Location).Path -PassThru -RedirectStandardOutput $metroLogPath -RedirectStandardError $metroErrLogPath

    $metroReady = $false
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
      if ($metroProcess.HasExited) {
        $logTail = Read-MetroLogs -OutPath $metroLogPath -ErrPath $metroErrLogPath
        throw "Metro process exited early (code=$($metroProcess.ExitCode)).`n$logTail"
      }

      if (Wait-ForPort -Address '127.0.0.1' -Port 8081 -TimeoutSeconds 1) {
        $metroReady = $true
        break
      }
    }

    if (-not $metroReady) {
      $logTail = Read-MetroLogs -OutPath $metroLogPath -ErrPath $metroErrLogPath
      throw "Metro did not start on port 8081 within timeout.`n$logTail"
    }

    Write-Host 'Configuring adb reverse tcp:8081 -> tcp:8081...'
    & $adbExe reverse tcp:8081 tcp:8081 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to configure adb reverse for Metro port 8081.'
    }

    Write-Host 'Running Detox tests...'
    & npm.cmd run e2e:test
    if ($LASTEXITCODE -ne 0) {
      throw 'Detox tests failed.'
    }
  }
  finally {
    if ($metroProcess -and -not $metroProcess.HasExited) {
      Write-Host 'Stopping Metro process started by bootstrap...'
      Stop-Process -Id $metroProcess.Id -Force
    }
  }
} else {
  Write-Host 'SkipTests enabled. Detox tests were not executed.'
}

Write-Host 'Detox bootstrap completed successfully.'
