# startupfans

Get the inside track on startups. Website for startupfans.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm lint && pnpm typecheck
```

See `AGENTS.md` for what we're building, structure, and conventions.

## Database

Start the local Postgres database and apply the generated migrations:

```bash
cp .env.example .env
corepack pnpm db:up
corepack pnpm db:migrate
```

Postgres runs on port 5433 and persists data in a named Docker volume. The app
and Drizzle CLI read `DATABASE_URL` from `.env`; an exported variable takes precedence.
After editing `db/schema.ts`, run `corepack pnpm db:generate` and then
`corepack pnpm db:migrate`. Use `corepack pnpm db:studio` to inspect the database.
