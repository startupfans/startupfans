# tasks

open items that need a human. tick them off as you go.

## slack posting (needs a slack app)

the code is live. react with 📣 on a slack message and it becomes a post on your startup page. to switch it on:

- [ ] go to https://api.slack.com/apps, "create new app", "from a manifest", pick the workspace, paste the contents of `slack-app-manifest.json`, create
- [ ] on the app's "basic information" page copy the client id, client secret and signing secret
- [ ] generate the token encryption key: `openssl rand -base64 32`
- [ ] add the four vars to the vercel project (settings, environment variables, all environments, mark them sensitive): `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `SLACK_TOKEN_KEY`
- [ ] redeploy (any push to main, or "redeploy" in vercel)
- [ ] in the slack app, "event subscriptions": the request url from the manifest should show "verified". if not, retry after the deploy
- [ ] install the app to the workspace from "install app" if slack asks for it
- [ ] on startupfans, sign in as an owner, open `/s/<your-startup>/settings`, click "connect slack", approve
- [ ] in each slack channel you want to post from: `/invite @startupfans`
- [ ] react 📣 on a message. the bot replies in the thread with the post link

notes: one slack workspace per startup page. the first jpeg, png, webp or gif on the message comes along. bot messages and messages over 5,000 characters are skipped. "disconnect" in settings turns it off.

## launch

- [ ] sign in on www.startupfans.co, post the first real update with a photo
- [ ] invite the team from `/s/startupfans/settings` (link or email)
- [ ] landing page: point "for startups" at `/start` and add a nav link to `/feed` (ian)
- [ ] import the waitlist once the csv is exported: `pnpm import:waitlist <file.csv>` from the repo with the shared `.env`
- [ ] dm the first 50 startups

## housekeeping

- [ ] vercel: add `DATABASE_URL` for preview deployments if branch previews should work against the real database
- [ ] add more site admins to `ADMIN_EMAILS` on vercel when needed (comma separated)
- [ ] resend: watch the first real sign-in emails for spam placement

## later, from the brief

- [ ] careers page embed widget
- [ ] founding spot payment (stripe link), parked
- [ ] verified metrics
