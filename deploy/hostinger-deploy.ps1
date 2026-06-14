param(
  [string]$Domain = "coresuite.it",
  [string]$Username = "u427445037",
  [string]$HapiPath = "$env:LOCALAPPDATA\Programs\hapi\hapi.exe",
  [int]$NodeVersion = 22,
  [string]$BuildScript = "build",
  [string]$PackageManager = "npm",
  [switch]$SkipProductionEnvPatch,
  [switch]$SkipEnvBundle,
  [switch]$PackageOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"
$SubdomainsFile = Join-Path $PSScriptRoot "service-subdomains.txt"

if (-not (Test-Path $HapiPath)) {
  Write-Error "hapi non trovato in $HapiPath. Scarica da https://github.com/hostinger/api-cli/releases"
}

$tokenLine = Select-String -Path $EnvFile -Pattern '^HOSTINGER_API_TOKEN=(.+)$' -ErrorAction SilentlyContinue
if (-not $tokenLine) {
  Write-Error "HOSTINGER_API_TOKEN mancante in .env"
}
$env:HAPI_API_TOKEN = $tokenLine.Matches.Groups[1].Value.Trim('"')

Write-Host "==> Hostinger deploy: $Domain ($Username)"
Write-Host "==> Architettura: hub su coresuite.it, servizi su *.coresuite.it"

$staging = Join-Path $env:TEMP "coresuite-hostinger-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host "==> Preparing archive..."
robocopy $ProjectRoot $staging /E /XD node_modules .next .git terminals agent-transcripts .cursor deploy\node_modules /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Remove-Item (Join-Path $staging "src\generated") -Recurse -Force -ErrorAction SilentlyContinue

Copy-Item $EnvFile (Join-Path $staging ".env") -Force
if ($SkipEnvBundle) {
  Remove-Item (Join-Path $staging ".env") -Force
  Write-Host "==> .env escluso dal bundle (-SkipEnvBundle): usa solo variabili hPanel"
} else {
  Write-Host "==> Generating clean production .env (unica fonte sul server)..."
  python (Join-Path $PSScriptRoot "create-production-env.py") (Join-Path $staging ".env")
  if ($LASTEXITCODE -ne 0) { throw "create-production-env.py fallito" }
}

$pkgPath = Join-Path $staging "package.json"
$pkgText = Get-Content $pkgPath -Raw
$pkgText = $pkgText -replace '\s*"postinstall"\s*:\s*"[^"]*"\s*,?\r?\n', "`n"
$hostingerBuild = "prisma generate && prisma migrate deploy && npm run db:seed && next build"
$pkgText = $pkgText -replace '"build"\s*:\s*"[^"]*"', ('"build": "' + $hostingerBuild + '"')
$pkgText = $pkgText -replace '"start"\s*:\s*"next start[^"]*"', '"start": "next start --hostname 0.0.0.0 --port 3000"'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($pkgPath, $pkgText, $utf8NoBom)

$archive = Join-Path $env:TEMP "coresuite-hostinger-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
if (Test-Path $archive) { Remove-Item $archive -Force }
python (Join-Path $PSScriptRoot "create-deploy-zip.py") $staging $archive
if ($LASTEXITCODE -ne 0) { throw "Creazione archivio fallita" }

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 2)
Write-Host "==> Archive: $archive ($sizeMb MB)"
if ($sizeMb -lt 0.5) {
  throw "Archivio troppo piccolo ($sizeMb MB). Verifica che il bundle contenga il progetto."
}
if ($sizeMb -gt 50) {
  throw "Archivio troppo grande ($sizeMb MB). Limite Hostinger: 50 MB."
}

$uploadZip = Join-Path $PSScriptRoot "coresuite-upload.zip"
Copy-Item $archive $uploadZip -Force
Write-Host "==> Zip pronto per hPanel: $uploadZip"

if ($PackageOnly) {
  Write-Host ""
  Write-Host "==> Modalita -PackageOnly: upload manuale richiesto in hPanel."
  Write-Host "    1. hPanel -> Websites -> Rimuovi sito $Domain (backup public_html se serve)"
  Write-Host "    2. Add Website -> Node.js Apps -> Upload your website files"
  Write-Host "    3. Carica: $uploadZip"
  Write-Host "    4. Framework: Next.js | Node 22 | Build: npm run build | Start: npm run start"
  Write-Host "       (build = migrate deploy + seed purge demo + next build)"
  Write-Host "    5. Deploy, poi node deploy/setup-hostinger-infra.mjs per DNS/sottodomini"
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $archive -Force -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "==> Installing Hostinger deploy helpers (first run only)..."
$deployPkg = Join-Path $PSScriptRoot "package.json"
if (Test-Path $deployPkg) {
  Push-Location $PSScriptRoot
  if (-not (Test-Path "node_modules")) { npm install --omit=dev 2>&1 | Out-Null }
  Pop-Location
}

Write-Host "==> Starting Node.js build on Hostinger..."
$token = $env:HAPI_API_TOKEN
$nodeScript = Join-Path $PSScriptRoot "hostinger-deploy.mjs"
$result = node $nodeScript --archive $archive --username $Username --domain $Domain `
  --node-version $NodeVersion --build-script $BuildScript --package-manager $PackageManager --token $token 2>&1
Write-Host $result
if ($LASTEXITCODE -ne 0) { throw "Hostinger upload failed (exit $LASTEXITCODE)" }

$build = ($result | Select-Object -Last 1) | ConvertFrom-Json
$uuid = $build.data.uuid
if (-not $uuid) { $uuid = $build.uuid }
if (-not $uuid) {
  throw "Build non avviato. Risposta: $result"
}

Write-Host "==> Build UUID: $uuid"
Write-Host "==> Polling build logs..."

for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 15
  $buildsRaw = & $HapiPath hosting nodejs list-builds $Username $Domain --format json
  $builds = $buildsRaw | ConvertFrom-Json
  $current = $builds.data | Where-Object { $_.uuid -eq $uuid } | Select-Object -First 1
  $status = $current.state
  Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] status=$status"
  $logsRaw = & $HapiPath hosting nodejs build-logs $Username $Domain $uuid --format json
  $logs = $logsRaw | ConvertFrom-Json
  if ($logs.logs) { ($logs.logs -split "`n") | Select-Object -Last 3 | ForEach-Object { Write-Host $_ } }
  if ($status -in @("completed", "failed")) {
    if ($logs.logs) { Write-Host $logs.logs }
    if ($status -ne "completed") { throw "Build fallita: $status" }
    break
  }
}

Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $archive -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==> Deploy completato: https://$Domain"
Write-Host "==> Il build include: prisma migrate deploy + db:seed (purge dati demo legacy)"
Write-Host "==> Seed manuale (se serve ripetere): .\deploy\run-production-seed.ps1"
Write-Host "==> 503 senza runtime logs = sito NON creato come Node.js Web App."
Write-Host "    Hostinger richiede: Add Website -> Node.js Apps (non solo build API su addon)."
Write-Host "    Usa: .\deploy\hostinger-deploy.ps1 -PackageOnly  poi upload manuale dello zip."
Write-Host "==> Se il sito e gia Node.js Web App:"
Write-Host "    1. Deployments -> status deve essere Running (altrimenti Restart)"
Write-Host "    2. Start command: npm run start"
Write-Host "    3. File Manager: verifica cartella nodejs/ e public_html/.htaccess"
Write-Host "==> Configura DNS (CNAME verso origin Hostinger / Cloudflare proxy):"
if (Test-Path $SubdomainsFile) {
  Get-Content $SubdomainsFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) { Write-Host "    - $line" }
  }
}
Write-Host "==> Un solo deploy Node.js: tutti i sottodomini devono puntare allo stesso origin di $Domain"
