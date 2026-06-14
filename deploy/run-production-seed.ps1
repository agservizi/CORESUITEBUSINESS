param(
  [string]$EnvFile = "$PSScriptRoot\hpanel-import.env"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $EnvFile)) {
  Write-Error "File env non trovato: $EnvFile"
}

$dbLine = Select-String -Path $EnvFile -Pattern '^DATABASE_URL=(.+)$' -ErrorAction SilentlyContinue
if (-not $dbLine) {
  Write-Error "DATABASE_URL mancante in $EnvFile"
}

$env:DATABASE_URL = $dbLine.Matches.Groups[1].Value.Trim('"')
Write-Host "==> Seed produzione (purge demo + cataloghi sistema)"
Write-Host "    DB: $($env:DATABASE_URL -replace '://[^@]+@', '://***@')"

Push-Location $ProjectRoot
try {
  npx prisma db seed
  if ($LASTEXITCODE -ne 0) { throw "prisma db seed fallito (exit $LASTEXITCODE)" }
  Write-Host "==> Seed completato"
} finally {
  Pop-Location
}
