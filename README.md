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

## Slack

1. Create a Slack app at [Your apps](https://api.slack.com/apps) using
   `slack-app-manifest.json`. It contains the bot scopes, OAuth callback and
   `reaction_added` event subscription.
2. Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_SIGNING_SECRET` from
   Basic Information. Generate `SLACK_TOKEN_KEY` with `openssl rand -base64 32`.
   Tokens are encrypted with AES-256-GCM before storage. Keep the key secret and
   stable; changing it requires reconnecting every workspace.
3. Set `APP_URL=https://www.startupfans.co`, configure `BLOB_READ_WRITE_TOKEN`
   for image attachments, apply `pnpm db:migrate`, and deploy. Enable event
   subscriptions after the request URL passes Slack's challenge verification.
4. Sign in as a startup owner, open the startup's settings and choose Connect
   Slack. Approve the app and invite `startupfans` into each channel you want to
   publish from, including private channels.
5. React to a human message with 📣 (`:mega:`). The message becomes a public
   post, with its first supported image (JPEG, PNG, WebP or GIF, up to 10 MB).
   The reacting user's email selects their account only if they are a startup
   team member; otherwise the connecting account is used, provided it is still
   a team member. A confirmation links to the post in the Slack thread.

One workspace connects to one startup, and each startup connects to one
workspace. Repeated reactions and concurrent deliveries create one post per
workspace/channel/message. Disconnect stops future publishing; existing posts
remain. It removes the local connection; uninstall the app in Slack to revoke
its permissions. Empty messages without supported images, bot messages and
messages longer than 5,000 characters are skipped. Messages are fetched using
[`conversations.history`](https://docs.slack.dev/reference/methods/conversations.history/);
only messages accessible to the bot can be published. Thread replies use
[`reactions.get`](https://docs.slack.dev/reference/methods/reactions.get/)
when history doesn't return the exact message.

Without all four Slack values, settings shows "Slack isn't configured" and the
routes return 503. Signed events are acknowledged immediately and processed
using Next's `after()` within the route's 60-second duration. Failures are logged
without credentials. There is no durable retry queue; a failed event may need
another reaction. If the post succeeds but the thread reply fails, repeated
reactions do not create another post or retry the reply.

For local verification, use an HTTPS tunnel for Slack callbacks and update both
manifest URLs and `APP_URL` to that origin. `SLACK_API_BASE` can point at a local
stub (default `https://slack.com/api`); it is a server-only testing override and
must not be set in production.
