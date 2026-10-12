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

## Seed and import

These manual commands use Node 24, load `.env` if present, and use the same
`DATABASE_URL` (or local Docker default) as the app. Apply migrations first.

```bash
SEED_OWNER_EMAILS=ian@example.com,tori@example.com pnpm seed
pnpm import:waitlist /path/to/getwaitlist.csv
```

The seed creates or updates `/s/startupfans`, makes every supplied email an
owner, and adds the first post only if the startup has no posts. The first email
is its creator and first-post author. Existing users and owners are preserved.
`SEED_OWNER_EMAILS` is required; use the team's actual emails.

Import requires the seed and a case-insensitive `email` column. Quoted commas,
escaped quotes, multiline fields, and UTF-8 BOMs are supported. Rows are sorted
ascending by the first available column in this order: `created_at`, `createdAt`,
`timestamp`, `date`, `priority`; otherwise file order is used. Use ISO dates or
Unix timestamps for date columns; priority is numeric. Missing or invalid sort
values go last, and ties keep file order. Import into a startup with no fans to
assign signup numbers starting at 1. Existing fans keep their numbers on reruns.

Emails are trimmed and lowercased. Invalid emails, rows with the wrong number of
fields, duplicates, and existing follows are skipped. The import reports created
users, new follows, skipped rows, and the first three invalid emails. Both
commands exit non-zero on failure and can be rerun after fixing the cause.

## Auth

Visit `/login` to sign in with an email magic link. Links expire after 15 minutes
and can be used once; sessions last 30 days. `/me` shows your email and sign-out button.
Set `APP_URL` to the site's public origin, `RESEND_API_KEY` for delivery, and
`EMAIL_FROM` to a verified sender. Without a Resend key, the server logs the full
sign-in link with a `[startupfans email: dev fallback]` prefix; open it locally
to sign in. Auth requests require a running database; locally, the Docker default
works without setting `DATABASE_URL`.
