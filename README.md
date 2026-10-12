# startupfans

Get the inside track on startups. Website for startupfans.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm lint && pnpm typecheck
```

See `AGENTS.md` for what we're building, structure, and conventions.

## Database

For local development, teammates only need Docker running. Start Postgres, apply
the generated migrations, and run the app; no `.env` is required:

```bash
pnpm db:up
pnpm db:migrate
pnpm dev
```

Postgres runs on port 5433 and persists data in a named Docker volume. The app
and Drizzle CLI default to `postgres://startupfans:startupfans@localhost:5433/startupfans`.
Set `DATABASE_URL` in `.env` or your environment to override it; an exported variable takes precedence.
Production uses a Vercel-hosted Postgres with `DATABASE_URL` set on the Vercel project.
After editing `db/schema.ts`, run `pnpm db:generate` and then
`pnpm db:migrate`. Use `pnpm db:studio` to inspect the database.

## Auth

Visit `/login` to sign in with an email magic link. Links expire after 15 minutes
and can be used once; sessions last 30 days. `/me` shows your email and sign-out button.
Set `APP_URL` to the site's public origin, `RESEND_API_KEY` for delivery, and
`EMAIL_FROM` to a verified sender. Without a Resend key, the server logs the full
sign-in link with a `[startupfans email: dev fallback]` prefix; open it locally
to sign in. Auth requests require a running database; locally, the Docker default
works without setting `DATABASE_URL`.
