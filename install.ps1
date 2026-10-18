# vi-humanizer local app, Windows: installs llama.cpp (winget) if missing, then starts llama-server, which downloads the
# model on first run, serves the web app and the API on one port, and opens it in your browser. Run again any time.
#
#   .\install.ps1                    # Q6_K (3.8 GB), first free port from 7860
#   .\install.ps1 -Quant Q4_K_M      # the smallest file (3.4 GB)
#   .\install.ps1 -Port 9000 -Gguf C:\models\vi-humanizer-e2b-Q6_K.gguf
param([string]$Quant = "Q6_K", [int]$Port = 0, [string]$Gguf = "", [int]$Ctx = 8192)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Repo = if ($env:VI_HUMANIZER_REPO) { $env:VI_HUMANIZER_REPO } else { "contextboxai/vi-humanizer-gemma-4-e2b" }

if (-not (Get-Command llama-server -ErrorAction SilentlyContinue)) {
  winget install --id ggml.llamacpp -e
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

function Test-Taken([int]$p) {
  try { (New-Object Net.Sockets.TcpClient("127.0.0.1", $p)).Close(); $true } catch { $false }
}
if ($Port -eq 0) { $Port = 7860; while (Test-Taken $Port) { $Port++ } }
elseif (Test-Taken $Port) { throw "Port $Port is already in use; pick another with -Port." }

$model = if ($Gguf) { @("-m", $Gguf) } else { @("-hf", "${Repo}:$Quant") }
$url = "http://127.0.0.1:$Port"
Write-Host "Starting llama-server on $url (the first run downloads the model, this can take a while)"
$proc = Start-Process llama-server -NoNewWindow -PassThru -ArgumentList ($model + @(
  "--alias", "vi-humanizer", "--host", "127.0.0.1", "--port", $Port, "-c", $Ctx, "--jinja", "-ngl", "99", "--path", "web"))
try {
  while ($true) {
    if ($proc.HasExited) { throw "llama-server exited; its log is above." }
    try { if ((Invoke-WebRequest "$url/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { break } } catch {}
    Start-Sleep 1
  }
  Write-Host "vi-humanizer is ready: $url"
  Start-Process $url
  $proc.WaitForExit()
} finally {
  if (-not $proc.HasExited) { Stop-Process $proc.Id }
}
