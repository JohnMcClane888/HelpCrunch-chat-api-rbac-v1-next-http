# Local Windows setup

## 1. Start PostgreSQL and Redis

```powershell
docker compose up -d
```

The temporary local PostgreSQL password is `888`. Do not use it in production.

## 2. Install dependencies

```powershell
npm.cmd install
```

## 3. Validate Prisma

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
```

## 4. Apply migrations

For this local disposable database:

```powershell
npx.cmd prisma migrate deploy
```

## 5. Build

```powershell
npm.cmd run build
```

## 6. Start

```powershell
npm.cmd run start:dev
```

The application uses `.env` from the project root. The archive intentionally contains a local `.env` with temporary credentials because this archive was requested for local verification. Do not commit or deploy that file.
