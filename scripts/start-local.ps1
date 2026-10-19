$ErrorActionPreference = 'Stop'
$clinicRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $clinicRoot

try {
    $clinicNode = Get-Command node -ErrorAction Stop
    $clinicNpm = Get-Command npm.cmd -ErrorAction Stop
    $clinicNodeMajor = [int]((& $clinicNode.Source --version).TrimStart('v').Split('.')[0])
    if ($clinicNodeMajor -ne 24) { throw 'Installez Node.js 24 pour lancer cette version de CIMA.' }

    $clinicConfigFile = Join-Path $clinicRoot 'server/network-settings.local.json'
    if ($env:NETWORK_CONFIG_PATH) { $clinicConfigFile = $env:NETWORK_CONFIG_PATH }
    $clinicPort = 3001
    if (Test-Path -LiteralPath $clinicConfigFile) { $clinicPort = (Get-Content -LiteralPath $clinicConfigFile -Raw | ConvertFrom-Json).port }
    if ($env:PORT) { $clinicPort = [int]$env:PORT }
    $clinicUrl = "http://localhost:$clinicPort"
    $clinicLogDirectory = Join-Path $clinicRoot 'server/logs'
    New-Item -ItemType Directory -Path $clinicLogDirectory -Force | Out-Null

    $clinicDependencyMarker = Join-Path $clinicRoot 'node_modules/.cima-package-lock'
    $clinicLockHash = (Get-FileHash -LiteralPath (Join-Path $clinicRoot 'package-lock.json') -Algorithm SHA256).Hash
    if (!(Test-Path -LiteralPath $clinicDependencyMarker) -or (Get-Content -LiteralPath $clinicDependencyMarker -Raw).Trim() -ne $clinicLockHash) {
        if (Test-Path -LiteralPath (Join-Path $clinicRoot 'node_modules')) { & $clinicNpm.Source install --include=dev }
        else { & $clinicNpm.Source ci --include=dev }
        if ($LASTEXITCODE -ne 0) { throw 'Installation des dependances impossible.' }
        Set-Content -LiteralPath $clinicDependencyMarker -Value $clinicLockHash
    }

    $clinicIndex = Join-Path $clinicRoot 'dist/index.html'
    $clinicSources = @(Get-ChildItem -LiteralPath (Join-Path $clinicRoot 'src') -Recurse -File)
    $clinicSources += Get-Item -LiteralPath (Join-Path $clinicRoot 'package-lock.json'), (Join-Path $clinicRoot 'vite.config.ts'), (Join-Path $clinicRoot 'index.html'), (Join-Path $clinicRoot 'finance-reference.html')
    $clinicLatestSource = ($clinicSources | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
    if (!(Test-Path -LiteralPath $clinicIndex) -or (Get-Item -LiteralPath $clinicIndex).LastWriteTimeUtc -lt $clinicLatestSource) {
        & $clinicNpm.Source run build
        if ($LASTEXITCODE -ne 0) { throw 'Preparation de l interface impossible. Consultez le message affiche.' }
    }

    $clinicRunning = $false
    try { $clinicHealth = Invoke-RestMethod -Uri "$clinicUrl/api/health" -TimeoutSec 2; $clinicRunning = $clinicHealth.system -like '*RadioMed*' } catch { }
    if (!$clinicRunning) {
        $env:NODE_ENV = 'production'
        $clinicProcess = Start-Process -FilePath $clinicNode.Source -ArgumentList @('server/index.js') -WorkingDirectory $clinicRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $clinicLogDirectory 'server.log') -RedirectStandardError (Join-Path $clinicLogDirectory 'server-error.log')
        for ($clinicAttempt = 0; $clinicAttempt -lt 40; $clinicAttempt++) {
            Start-Sleep -Milliseconds 500
            if ($clinicProcess.HasExited) { throw "Le serveur n’a pas démarré. Consultez server/logs/server-error.log." }
            try { $clinicHealth = Invoke-RestMethod -Uri "$clinicUrl/api/health" -TimeoutSec 2; if ($clinicHealth.system -like '*RadioMed*') { $clinicRunning = $true; break } } catch { }
        }
    }
    if (!$clinicRunning) { throw 'Le serveur est indisponible. Consultez server/logs/server-error.log.' }

    $clinicBrowser = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($clinicBrowser) { Start-Process -FilePath $clinicBrowser -ArgumentList "--app=$clinicUrl" }
    else { Start-Process $clinicUrl }
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'CIMA', 'OK', 'Error') | Out-Null
    exit 1
}
