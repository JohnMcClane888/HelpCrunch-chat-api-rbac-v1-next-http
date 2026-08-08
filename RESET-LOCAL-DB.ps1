$ErrorActionPreference = 'Stop'

Write-Host 'WARNING: This permanently deletes the local PostgreSQL and Redis Docker volumes.' -ForegroundColor Yellow
$confirmation = Read-Host 'Type RESET to continue'
if ($confirmation -ne 'RESET') {
    Write-Host 'Cancelled.'
    exit 0
}

docker compose down -v
docker compose up -d

Write-Host 'Waiting for PostgreSQL and Redis health checks...'
docker compose ps

Write-Host 'Applying Prisma migrations...'
npx.cmd prisma migrate deploy
npx.cmd prisma generate

Write-Host 'Local database reset and migrations completed.' -ForegroundColor Green
