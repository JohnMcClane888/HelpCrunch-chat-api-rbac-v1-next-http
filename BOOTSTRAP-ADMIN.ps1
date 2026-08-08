param(
  [Parameter(Mandatory = $false)]
  [ValidatePattern('^[^\s@]+@[^\s@]+\.[^\s@]+$')]
  [string]$Email = 'test@example.com'
)

$ErrorActionPreference = 'Stop'

Write-Host "Bootstrapping local ADMIN for: $Email"
$env:RBAC_BOOTSTRAP_ADMIN_EMAIL = $Email.Trim().ToLowerInvariant()

Write-Host "Seeding RBAC and assigning ADMIN ..."
npm.cmd run prisma:seed:rbac
if ($LASTEXITCODE -ne 0) {
  throw "RBAC seed failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "ADMIN role assigned to $($env:RBAC_BOOTSTRAP_ADMIN_EMAIL)."
Write-Host "IMPORTANT: log in again and rebuild `$headers with the NEW access token."
Write-Host "The old JWT can still represent the previous role set."
Write-Host ""
Write-Host 'Example:'
Write-Host '$loginBody = @{ email = "'$($env:RBAC_BOOTSTRAP_ADMIN_EMAIL)'"; password = "YOUR_PASSWORD" } | ConvertTo-Json'
Write-Host '$login = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body $loginBody'
Write-Host '$headers = @{ Authorization = "Bearer $($login.accessToken)" }'
Write-Host '$roles = Invoke-RestMethod -Uri "http://localhost:3000/admin/authorization/roles" -Method Get -Headers $headers'
Write-Host '$roles | ConvertTo-Json -Depth 10'
