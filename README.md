# Fishing Manager (PWA)

Responsywna aplikacja webowa (desktop + mobile) do zarzadzania grupowymi wyjazdami wedkarskimi.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (credentials)
- PWA (`next-pwa`)
- Testy: Vitest + Playwright

## Moduly
- Grupy i role (`OWNER`, `ADMIN`, `MEMBER`)
- Lista rzeczy z podpowiedziami
- Wyjazdy + kalendarz + pogoda
- Rekordy ryb + rankingi
- Budzet grupy + rozliczenia

## Uruchomienie lokalne
1. `pnpm install`
2. `Copy-Item .env.example .env`
3. `docker compose up -d`
4. `pnpm prisma:migrate`
5. `pnpm seed`
6. `pnpm dev`

## Konta demo
- `adam@wedka.pl` / `test12345`
- `bartek@wedka.pl` / `test12345`

## Testy
- Unit: `pnpm test`
- E2E smoke: `pnpm test:e2e`

## Produkcja (Vercel + Neon/Supabase)

### 1. Baza danych
1. Utworz PostgreSQL (Neon albo Supabase).
2. Skopiuj connection string do `DATABASE_URL`.

### 2. Vercel
1. Podlacz repo do Vercel.
2. Ustaw Environment Variables (Production i Preview):
   - `DATABASE_URL`
   - `AUTH_SECRET` (dlugi losowy sekret, np. 64+ znakow)
   - `NEXTAUTH_URL` (np. `https://twoja-domena.pl`)
3. Deploy uruchomi sie automatycznie po pushu.

### 3. Migracje produkcyjne (GitHub Actions)
W repo jest workflow: `.github/workflows/prisma-migrate-deploy.yml`.

Co robi:
- uruchamia sie po pushu na `main` przy zmianach w `prisma/**` oraz recznie (`workflow_dispatch`),
- wykonuje `pnpm prisma:deploy` na bazie produkcyjnej.

Wymagany sekret GitHub:
- `DATABASE_URL` (produkcyjny connection string)

### 4. Rekomendowany flow zmian
1. Pracujesz lokalnie na branchu feature.
2. Otwierasz PR i testujesz na Preview w Vercel.
3. Merge do `main`.
4. Vercel robi deploy produkcji.
5. GitHub Action aplikuje migracje Prisma na produkcji.

## Monitoring / Healthcheck
- Endpoint: `GET /api/health`
- Odpowiedz `200` gdy API i DB dzialaja.
- Odpowiedz `503` gdy DB jest niedostepna.

## Dodatkowe pliki pod wdrozenie
- `vercel.json` - ustawienia deployu i bezpieczne naglowki HTTP
- `.github/workflows/prisma-migrate-deploy.yml` - automatyczne migracje produkcyjne

