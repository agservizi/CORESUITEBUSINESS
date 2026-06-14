param(
  [Parameter(Mandatory = $false)]
  [string]$Password = $env:DEPLOY_SSH_PASSWORD,
  [string]$PrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_coresuite",
  [string]$ServerHost = "192.168.1.50",
  [string]$User = "Carmine",
  [string]$RemoteDir = "~/coresuite-business",
  [string]$HostKey = "SHA256:X4CG6019WOIp+1p0di66zfLFQNdXjl1JtKsSd3HBb9I"
)

if (-not $Password -and -not (Test-Path $PrivateKeyPath)) {
  Write-Error "Serve -PrivateKeyPath o -Password / DEPLOY_SSH_PASSWORD"
  exit 1
}

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Remote = "${User}@${ServerHost}"

Write-Host "==> Deploy CORESUITE BUSINESS to $Remote"

$staging = Join-Path $env:TEMP "coresuite-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host "==> Preparing bundle..."
robocopy $ProjectRoot $staging /E /XD node_modules .next .git terminals agent-transcripts .cursor /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item (Join-Path $ProjectRoot ".env") (Join-Path $staging ".env") -Force

function Invoke-Remote([string]$Command) {
  if (Test-Path $PrivateKeyPath) {
    ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $PrivateKeyPath $Remote $Command
  } else {
    & "${env:ProgramFiles}\PuTTY\plink.exe" -batch -hostkey $HostKey -pw $Password $Remote $Command
  }
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed (exit $LASTEXITCODE): $Command" }
}

function Copy-Remote([string]$LocalDir, [string]$RemotePath) {
  $remoteDir = $RemotePath.TrimEnd("/")
  $tarball = Join-Path $env:TEMP "coresuite-deploy.tar.gz"
  if (Test-Path $tarball) { Remove-Item $tarball -Force }
  tar -czf $tarball -C $LocalDir .
  $remoteTar = "~/coresuite-deploy.tar.gz"
  if (Test-Path $PrivateKeyPath) {
    $sshCmd = "ssh -i `"$PrivateKeyPath`" -o BatchMode=yes -o StrictHostKeyChecking=accept-new $Remote `"cat > $remoteTar`""
    cmd /c "$sshCmd < `"$tarball`""
    if ($LASTEXITCODE -ne 0) { throw "SSH upload failed (exit $LASTEXITCODE)" }
  } else {
    & "${env:ProgramFiles}\PuTTY\pscp.exe" -batch -hostkey $HostKey -pw $Password $tarball "${Remote}:$remoteTar"
    if ($LASTEXITCODE -ne 0) { throw "SCP failed (exit $LASTEXITCODE)" }
  }
  Invoke-Remote "mkdir -p $remoteDir && tar -xzf $remoteTar -C $remoteDir && rm -f $remoteTar"
  Remove-Item $tarball -Force -ErrorAction SilentlyContinue
}

if (Test-Path $PrivateKeyPath) {
  Write-Host "==> Using OpenSSH key: $PrivateKeyPath"
} else {
  Write-Host "==> Using PuTTY password auth"
}

Invoke-Remote "mkdir -p $RemoteDir"
Copy-Remote $staging $RemoteDir
Invoke-Remote "chmod +x $RemoteDir/deploy/remote-deploy.sh && cd $RemoteDir && bash deploy/remote-deploy.sh"

Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "==> Deploy finished"
