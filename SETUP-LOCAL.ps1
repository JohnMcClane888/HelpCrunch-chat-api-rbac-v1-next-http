param(
  [string]$Email = 'test@example.com'
)

$ErrorActionPreference = 'Stop'

Write-Host 'HelpCrunch local setup'

# Prisma and Nest load environment variables from the project root.
# If .env is missing, create it from the safe local template.
if (-not (Test-Path -LiteralPath '.env')) {
  if (-not (Test-Path -LiteralPath '.env.example')) {
    throw 'Missing .env and .env.example. Restore the project files first.'
  }
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
  Write-Host 'Created .env from .env.example. Review DATABASE_URL and Redis settings if your local services use different credentials.'
}

# Load DATABASE_URL into this PowerShell process so the seed command cannot fail
# simply because Prisma CLI was invoked without dotenv loading.
$envLines = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' -and $_ -notmatch '^\s*#' }
foreach ($line in $envLines) {
  $parts = $line -split '=', 2
  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  if (-not [string]::IsNullOrWhiteSpace($name)) {
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw 'DATABASE_URL is missing from .env. Set it to your local PostgreSQL connection string and rerun this script.'
}

Write-Host '1/4 Installing dependencies...'
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }

Write-Host '2/4 Generating Prisma Client...'
npx.cmd prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed with exit code $LASTEXITCODE" }

Write-Host '3/4 Building application...'
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "nest build failed with exit code $LASTEXITCODE" }

Write-Host '4/4 Seeding RBAC and bootstrapping ADMIN...'
& "$PSScriptRoot\BOOTSTRAP-ADMIN.ps1" -Email $Email

Write-Host ''
Write-Host 'Local setup complete.'
Write-Host 'Start the API with: npm.cmd run start'
Write-Host 'Start Prisma Studio separately with: npx.cmd prisma studio --port 5555'
Write-Host 'IMPORTANT: after bootstrap, log in again and create a fresh Authorization header.'
