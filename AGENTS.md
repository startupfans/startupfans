<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# StartupFans

This repo is the public website for StartupFans (live at startupfans.co, hosted on Vercel). Working title; the final name isn't decided (see Naming). Team: Ian, Tori, Irakli, Jake. Coordination happens in Slack `#startupfans`.

**Hard rule for the public site:** nothing public-facing (page copy, metadata, OG tags, alt text, client-shipped comments) may mention the hackathon, launchathon, offsite, Lightdash, "72 hours", "3 days", or that this is a time-boxed experiment. The site should read like StartupFans' own website. All of that context lives here instead.

## Context (internal)

- Built during the Lightdash company offsite, October 2026, as part of a launchathon.
- 3 days to launch a new product and make as much money as possible.
- Scoring priorities, in order:
  1. Launch: a real, live product within 3 days
  2. Traction: a clear signal that people want it. Revenue is the gold standard; a waitlist with a card on file beats a plain waitlist
  3. Attention: something people share and talk about

## The idea

"OnlyFans for startups." Tongue-in-cheek: exclusive, insider content straight from the team.

A feed that takes the best parts of X, LinkedIn, Substack and Instagram. Any startup can sign up, and anyone on its team can post:

- an update on what they're working on today
- something they shipped
- a photo from the offsite, a team dinner, a launch, etc.

Anyone can follow a startup and see its feed.

## The problem

- Every startup has a #wins or #shipped Slack channel full of good content nobody outside the company ever sees.
- What does get shared publicly is scattered across employees' personal LinkedIn and X accounts.
- LinkedIn company pages are mostly dead.
- There's no single place to see what a team is shipping and what it's like to work there.

## Who it's for and why they'd join

Marketing
- The team already creates content every day; this gives it somewhere to live
- Behind-the-scenes posts feel human compared with polished brand posts
- Gives people a reason to follow the company, beyond the founder

GTM and sales
- Prospects see the team is real and shipping fast
- A more interesting link to send in outbound than a case study
- Customers see their feature requests getting built

Hiring
- Candidates see the real team and work before applying
- Better than a generic "life at" careers page
- Job posts reach people who already follow the company (needs job posts feature)

Fundraising
- Angels and scouts track momentum between monthly investor updates
- Somewhere for warm inbound to land after a pitch or demo day

Team and culture
- Credit goes to the people who did the work, beyond the founders
- A public record of what the team has shipped

Community
- Founders learn from each other
- Startups in the same portfolio or community can support each other

## Business model

**Current decision: StartupFans is free for everyone (fans and startups). Nothing is charged yet.** The plan below is the longer-term direction, not what's live.

The OnlyFans mechanic (fans pay creators) doesn't fit: few people will pay to follow a startup. The money is with startups, who have hiring and brand budgets.

- Free for followers ("fans")
- Startups pay
- Launch offer: founding spot, £99/year, first 50 startups (Stripe payment link)

Later revenue options:
- Verified / Pro company page: custom domain, careers page embed, analytics
- Paid job posts (around £99 each), pinned in the feed
- Investor tier: angels and scouts pay for early signal / deal flow

## Differentiators

1. Zero-effort posting. Teams already post wins in Slack. A Slack bot or emoji reaction publishes a chosen message to the company page, so the feed fills itself. This is the main answer to "why not just post on LinkedIn?"
2. One aggregated team feed per company, instead of updates scattered across personal accounts.
3. Embeddable feed for the company's careers page.
4. Verified metrics (later): live charts in posts (e.g. Stripe MRR, usage) built with Lightdash embedding, plus a leaderboard. Ties the product to Lightdash and makes it a marketing channel for the core business.

## Where it could go

- Employer brand and hiring platform (strongest revenue path)
- Public / semi-public investor updates
- Open-startup verified metrics and leaderboards
- Fantasy startup league: fans "back" startups with points and climb a leaderboard

## MVP scope (3 days)

Must have
- Landing page with waitlist and founding spot payment
- Company pages (name, logo, description, website)
- Team members can join a company
- Posts: text plus image
- Global feed and per-company feed
- Follow a company
- Stripe payment link for the founding spot

Nice to have
- Slack bot / emoji reaction to publish from Slack
- Leaderboard (most active, most followed)
- Careers page embed widget

Out of scope for the 3 days
- Fan subscriptions / paywalled content
- Job posts
- Verified metrics
- Native mobile app (PWA is fine)

## Suggested stack (suggestion only)

- Frontend: Next.js (in use)
- Backend / auth / DB: Supabase
- Payments: Stripe (payment links first, subscriptions later)
- Email: Resend
- Hosting: Vercel (in use)

## Data model sketch

- companies: id, name, slug, logo_url, website, description, stage, team_size, is_founding, created_at
- users: id, name, email, avatar_url
- memberships: user_id, company_id, role (owner, member)
- posts: id, company_id, author_id, body, image_url, created_at, source (web, slack)
- follows: user_id, company_id, created_at
- waitlist_entries: company_name, website, contact_name, role, email, team_size, stage, main_reason, first_post_idea, wants_founding_spot, created_at
- payments: company_id, stripe_session_id, amount, status, created_at

## 3-day plan

Day 1
- Build company pages, posts, feed, follow, Stripe founding spot
- Lightdash is the first startup on the platform and posts the offsite
- Post the LinkedIn announcement, open the waitlist
- DM 50 startups

Day 2
- Onboard 10 to 20 startups by hand
- Each posts a team photo or what they're shipping

Day 3
- Public launch on X, LinkedIn and Product Hunt, leaning on the joke
- Leaderboard live
- Count results

## Distribution

- Lightdash team posts first (offsite content is day-one material)
- Lightdash team reposts the announcement with their own one-liners and photos
- Investor portfolio network (e.g. Moonfire portfolio founders group)
- London builder communities (e.g. Ramen Club, Encode Club, cr3w)
- Friendly startups in the Lightdash customer and partner network
- Also floated: launch on tinylaunch

## Success metrics (priority order)

1. Paid founding spots
2. Startups actively posting
3. Waitlist signups
4. Followers / feed views
5. Launch post engagement

## Risks and mitigations

- Cold start: hand-onboard startups, have Lightdash post first, make posting zero effort through Slack
- "Why not LinkedIn?": one company feed, Slack posting, careers embed, no algorithm burying posts
- Category graveyard: professional networks often die (Polywork and Read.cv both shut down; verify before citing publicly). Peerlist and Indie Hackers already exist. Go niche and lead with distribution, not features
- Brand risk: an OnlyFans joke under the Lightdash name while selling to enterprise. Get leadership sign-off. Option: keep the joke in launch copy and use a less explicit product name, or run it as a separate brand
- Trademark: run a check on any name containing "Fans"
- Wrong audience: the name may attract NSFW expectations or spam signups. Keep basic moderation and a clear content policy

## Naming

Domains and trademarks not checked.

- Keeps the riff: StartupFans, OnlyStartups, OnlyShips, OnlyBuilders, ShipFans, FounderFans
- Fan energy without the porn reference: Groupie, Superfan, Fanbase, Startup Crush
- Insider / leak: Out of Stealth, Unstealth, Leaked, Backstage, Off the Record, Inner Circle, Sneak Peek, Keyhole
- Says what you post: Standup, Shiplog, Shipped, Build Log, Dispatch, Pulse, Today I Shipped
- Instagram / BeReal style: Startupgram, Candid, Unfiltered, BeShipping

Favourites:
- Out of Stealth: startup in-joke with the same "exclusive" energy, no porn reference needed
- Groupie: keeps the fan mechanic, brand-safe
- OnlyShips: if fully committing to the joke
- Option: use "OnlyFans for startups" as the tagline, e.g. "Out of Stealth: OnlyFans for startups"

## Copy voice

Copy is written in Ian's voice:
- mostly lowercase, conversational
- no em dashes
- never "shout" as in "shout if..."
- no "it's not X, it's Y" framing
- spare emoji, rare exclamation marks
- no bold in posts
- avoid AI words like pivotal, robust, landscape, foster, enhance

## LinkedIn announcement (main)

```text
we have 3 days to launch a startup and make some money.

we're at the lightdash offsite running a launchathon, and the idea we landed on is StartupFans 😏

onlyfans for startups. exclusive content, straight from the team.

every startup has a #wins channel full of great stuff nobody outside the company ever sees. the feature that finally shipped, the customer message that made someone's week, the offsite photos. it gets buried in slack or scattered across thirty personal linkedin accounts.

StartupFans gives your company one feed for all of it. anyone on the team can post what they're working on today, and anyone can follow along.

why you'd want your startup on it:
- marketing: a steady stream of real content from the people building the product
- gtm: prospects and customers see what you're shipping, as you ship it
- hiring: candidates see what it's like to work with you before they apply
- fundraising: investors see your momentum between update emails
- team: everyone gets credit for their work, beyond the founders

we're letting the first startups in this week. if you want your company on it, the waitlist is here: [link]

first exclusive drop is our offsite. subscribe to unlock 🔒
```

## LinkedIn announcement (short)

```text
we're building onlyfans for startups.

3 days, one lightdash offsite, and a launchathon where the goal is real users and real revenue.

StartupFans is a feed where anyone on your team can post what they're working on, what they shipped, or the photos from your offsite. one place for prospects, candidates and investors to see what you're really like.

first startups get in this week. waitlist: [link]
```

Irakli's live launch post (fan-side framing: open up the kitchen, fans get it first): linkedin.com/feed/update/urn:li:activity:7515469992105213952

## Posting tips

- Put the waitlist link in the first comment; LinkedIn is commonly reported to show posts with external links to fewer people
- Optional hook: "comment FANS and I'll send you an invite" (gets comments and a DM list)
- Team reposts with a photo of everyone building beat a logo

## Waitlist form fields (target)

- Company name and website
- Your name, role and email
- Team size and stage
- Main reason for joining (marketing, sales, hiring, fundraising, team)
- What you'd post first
- Optional: "Want a founding spot? £99/year, first 50 startups" with Stripe link

## Open questions

- Final name and domain
- Lightdash-branded or a separate brand
- Leadership sign-off on the OnlyFans angle
- Founding spot price and whether it's annual or lifetime
- Which nice-to-haves (Slack bot, leaderboard, embed) make the 3-day cut
- Who owns build, distribution and copy during the launchathon

## How we got here

Picked from a shortlist of about 50 ideas from Ian's notes, scored on launch speed, revenue traction and attention. Other strong options were GTM/Attio office hours, a SaaS vendor-onboarding concierge, a plain-English contract reviewer, a feedback-to-roadmap agent and a wine menu decoder. Ian's own app (miniti) was ruled out.

## What's built vs the brief

Built:
- Slack publishing: owners connect a workspace in settings; a 📣 reaction publishes a human message and its first supported image, with email-matched team attribution, encrypted tokens, deduplication and a thread confirmation.
- Landing page (`app/page.tsx`): static hero "Get the inside track on startups." with waitlist form, a "For fans" section and a "For startups" section (three value props each), and a second waitlist form at the bottom. Client `SessionLink` checks `/api/session` once on mount to offer signed-in visitors their feed in the nav and join card, reserving space for both labels.
- Waitlist: email only, via GetWaitlist (`app/waitlist-form.tsx`).
- Invite-only sign-up: existing accounts can sign in; new accounts need an admin waitlist admission, an active email or link team invite, or an `ADMIN_EMAILS` entry. Unknown emails see an invite-only message and a waitlist link. Link eligibility is rechecked before account creation.
- Manual seed: `pnpm seed` upserts startupfans with owners from `SEED_OWNER_EMAILS` and its first post.
- Waitlist admissions (`/admin/waitlist`): automatically syncs GetWaitlist on page load when the last successful server-instance sync is older than 60 seconds, with a 10-second timeout, stored-list fallback and manual sync. Admins see waiting, invited and joined counts, and send individual or ordered batches of up to 25 welcome emails after the admission transaction commits, spaced 600 ms apart. Failed deliveries remain invited for resend; seven-day single-use sign-in links and repeat sends preserve existing fan numbers. Unverified signups are flagged and team members are marked invited without email. Sessions expiring after the invitation or follows created after it mark entries as joined on page load.
- Startup creation (`app/start/`): signed-in users create a public page and become its owner, with optional stage and team size.
- Public startup pages (`app/s/[slug]/`): profile, team members, current fan count and a markdown feed, plus member settings links.
- Company profiles: a 3:1 cover and overlapping logo, a short bio, location and social icon links. Owners upload logo and cover images, edit social profiles and keep a longer description in settings; creators upload a logo and add a bio at `/start`. Image uploads support previews, progress, removal, HEIC conversion and an HTTPS URL fallback.
- Public team pages (`app/s/[slug]/team`): member cards with roles, join dates, public post counts and latest post quotes; startup profiles link there through a compact avatar row.
- Posting: team members publish markdown updates with one optional image or video uploaded directly to Vercel Blob, selected by picker, drag and drop or image paste. JPEG, PNG, WebP, GIF, AVIF, HEIC and HEIF photos are accepted up to 10 MB; HEIC and HEIF convert to JPEG in the browser. MP4, WebM, MOV and M4V videos are accepted up to 200 MB. Public post pages have share metadata; authors and owners can delete posts.
- Follow and unfollow: signed-in fans receive unique member numbers; unfollowing never reuses a number. Team members see an "On the team" badge and cannot follow their own startup; accepting an invite removes any existing follow without reusing its number.
- Global feed (`app/feed/`): public posts newest first, startup names and logos, a signed-in following filter, and cursor pagination with 20 posts per page.
- Leaderboard (`app/leaderboard/`): most followed startups and most active teams by public posts in the last seven days, refreshed every five minutes and linked from the shared top nav.
- Team settings: owners edit page details, remove members while keeping at least one owner, and create, email or revoke single-use invite links that expire after 7 days. Signed-in teammates accept links to join as editors.
- Sticker-style sign-in and team invite emails share a table-based HTML shell and plain-text content, with a console fallback without a Resend key. Dev-only previews live at `/dev/emails`.
- Profiles: optional names and avatar URLs, avatars or initial badges on member lists and `/me`, plus followed startups and fan numbers on `/me`.
- Share previews: a default site image and dynamic startup images with the tagline and current fan count; unknown slugs use the default image.
- Moderation: database-backed sign-in limits (5 requests per email and 30 per IP per 15-minute window), public post reports, and an admin report queue. Site admins configured in `ADMIN_EMAILS` can delete any post or startup; startup deletion requires confirmation and cascades to its content. App pages include a content policy and takedown contact.

Also built: Postgres + Drizzle data layer (`db/`, shared hosted database) and email magic-link sign-in with sessions (`app/login`, `app/auth`, `app/me`, `lib/auth.ts`).

Not built yet (from MVP must-haves):
- Richer startup waitlist fields above

Parked for now: founding spot payment (£99/year Stripe link). It's free for everyone at the moment.

Site copy only promises what exists. No pricing on the site (for fans or startups), and no paywalls, job posts or verified metrics until they exist.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19, TypeScript 6, Tailwind CSS v4 (CSS-first config, no `tailwind.config`).
- pnpm. `pnpm-workspace.yaml` only holds `allowBuilds` (pnpm 12 build-script approvals).
- TypeScript is pinned to 6.x because `typescript-eslint` does not support TS 7 yet.

## Commands

- `pnpm dev`: dev server. In a sandbox it may crash on `uv_interface_addresses`; run it unsandboxed.
- `pnpm build`, `pnpm typecheck`, `pnpm lint`: run all three before calling work done. No test suite yet.

## Layout

- `app/components/icons.tsx`: named UI icon wrappers use Lucide Image, Video, Send, Flag, Trash2, Link2, X, Globe and MapPin at 20px with a 2.25px absolute stroke. Round sticker button classes and hand-drawn social brand glyphs stay shared here; `Star` in `sticker.tsx` remains brand art.
- `lib/slack.ts` and `lib/crypto.ts`: Slack Web API, signed OAuth state, event signature verification, markdown conversion, image copying and encrypted bot tokens. `slack_connections` binds one workspace to one startup; `slack_posts` records published messages atomically with post creation.
- `app/api/slack/`: owner-only install and OAuth callbacks, plus signed events acknowledged with `after()` before publishing. `slack-app-manifest.json` configures the app and its scopes.
- `scripts/seed.ts`: manual, idempotent startupfans seed. The command loads `.env` with Node 24 and runs through `tsx` with the `react-server` condition for server-only imports.
- `db/`: Drizzle schema, migrations, and the lazy Postgres client exported as `db`. Everyone uses the shared hosted Postgres through `DATABASE_URL` in the team's `.env`. Without it, database access throws a clear setup error; imports and builds do not need a connection.
- `lib/`: server-only auth and session helpers (`lib/auth.ts`) and Resend email delivery with a console fallback (`lib/email.ts`).
- `lib/signup.ts`: shared `canSignUp(email, { inviteToken? })` eligibility and `existingUser(email)` lookup, with trimmed, case-insensitive emails. The mobile auth request API should call `canSignUp` after its branch merges; it is not present on this branch.
- `lib/ratelimit.ts`, `lib/reports.ts`, `lib/admin.ts`: atomic hashed sign-in counters, private post report submission and resolution, and site admin authorization/deletion. Reports retain their resolved timestamp so signed-in users cannot report a post twice.
- `app/admin/`: admin-only open report queue with post excerpts, reasons, counts, resolution and confirmed deletion. `ADMIN_EMAILS` grants access through comma-separated email addresses or `@domain` entries (case-insensitive, whitespace tolerant, exact domains only); other visitors receive a 404.
- `app/admin/waitlist/` and `lib/waitlist.ts`: admin-gated automatic GetWaitlist sync via `GETWAITLIST_API_KEY`, last-sync status and manual sync, ordered admission batches and resends using the follow allocator, and persisted join detection. Missing configuration or sync failures keep the stored list available. Dates are shown in UTC; signup verification and detected join timestamps live alongside waitlist entries.
- `lib/emails/`: pure sign-in, invite and welcome templates using a shared inline-styled, table-based sticker layout and matching plain text. `welcome.ts` sends "You're in" with a fan number and seven-day sign-in link.
- `app/dev/emails/`: development-only template index and HTML previews, with `?text=1` for plain text; all routes return 404 in production.
- `lib/startups.ts`: startup creation with owner membership, profile lookup, team members, public posts and current fan counts. `lib/follows.ts` serializes follow changes with a startup row lock and keeps the member-number counter increasing. `lib/slug.ts` holds shared slug suggestions and validation.
- `lib/socials.ts`: validates social profile hosts and paths, normalizes handles or pasted profile URLs, and builds canonical links for X, LinkedIn, GitHub, Instagram, YouTube and TikTok.
- `app/s/[slug]/profile-header.tsx`: server-rendered company cover, overlapping logo, bio, facts and social links, with follow controls alongside on wide screens. `settings/image-upload.tsx` shares image uploads and the live bio counter between settings and startup creation. Profile images use `startups/<slug>/profile/`; the upload route authorizes owners or signed-in creators using an unused slug, with creator-prefixed filenames, image-only content types and a 10 MB limit. `isStartupProfileImageUrl` validates stored profile images and HTTPS fallbacks.
- `app/components/sticker.tsx`: shared `Star`, `Sticker`, `SectionHeading` and `TopNav` components, plus confirmed admin startup deletion and `SiteFooter` for app pages. The footer uses `PRICING_CONTACT_EMAIL` or `hello@startupfans.co` for takedowns.
- `app/leaderboard/page.tsx` and `lib/leaderboard.ts`: public sticker-style rankings with logos, taglines, fan and weekly post counts, and empty states; each list uses one aggregate query and excludes zero counts. The page renders on demand with queries cached for 300 seconds.
- `app/opengraph-image.tsx`: site-wide 1200 by 630 share preview (logo, hero headline, fan-club card), prerendered at build time from local fonts in `assets/fonts/`. Inherited by every route without its own image.
- `app/share-image.tsx`: `createShareImage`, the startup share renderer with a cached Bricolage Grotesque font fetch and a default font fallback. Kept separate from `app/opengraph-image.tsx` so dynamic routes don't load the homepage image's local font files.
- `app/s/[slug]/opengraph-image.tsx`: dynamic startup share preview using the current follower count, with the generic `createShareImage()` card for unknown slugs.
- `app/s/[slug]/team/`: public team page and server-rendered member cards, with one, two and three columns on phones, tablets and desktop. `getTeam` in `lib/startups.ts` queries membership join dates and public post activity for the current startup; owners get a settings link.
- `app/start/`: protected startup creation page and validated server action. Its client form wrapper lives alongside `FollowButton` in `app/s/[slug]/follow-button.tsx`; fields render on the server.
- `app/s/[slug]/`: public startup profile, team list, member composer and markdown post cards, startup metadata, and follow actions with pending and error states. `post-actions.ts` checks membership for creation and author/owner deletion; `/p/[postId]` renders individual public posts.
- `app/feed/`: public global feed with Everyone and Following filters, sign-in and discovery empty states, and server-rendered load-more links.
- `lib/media.ts`: shared image/video MIME types, case-insensitive extensions, picker accept lists and size limits for the composer, upload authorization and server-side media URL checks. HEIC and HEIF are picker-only formats converted to JPEG; raw uploads and media URLs are rejected by the server.
- `app/api/upload/route.ts`: Vercel Blob client upload authorization for startup media and owner/creator profile images, plus image-only avatars under the signed-in user's `users/<userId>/avatar/` path, with shared type and size limits; text posting works without a Blob store token.
- `lib/posts.ts`: public post queries with author and startup details, cursor-paginated global and following feeds, membership lookup, and startup media URL validation.
- `lib/members.ts` and `lib/invites.ts`: owner authorization, serialized team changes, profiles and followed startups, plus hashed single-use invite creation, revocation and acceptance.
- `app/s/[slug]/settings/`: owner-only page editing, member management and unused invites; `invite-link.tsx` creates and copies invite links and offers email invites through the settings action.
- `app/join/[token]/`: signed-in invite confirmation with atomic editor membership creation and friendly invalid-link messages; signed-out visitors carry the invite token through login and return to the confirmation page. Email invites also store the invited address for sign-up eligibility.
- `app/components/markdown.tsx` and `post-media.tsx`: safe markdown rendering and sticker-framed images and videos.
- `app/login/`: sign-in link request form, development inbox and server action with shared invite-only eligibility checks and a waitlist link for unknown emails.
- `app/auth/`: magic-link verification route that creates a session and sets the `sf_session` cookie.
- `app/me/`: profile name and avatar editing with picker, drop and paste uploads, browser HEIC/HEIF conversion, progress, removal and an HTTPS URL fallback (open when Blob uploads are off), followed startups with member numbers, and sign out, protected by `requireUser`. Blob avatars must use the user's own image path on a public Blob host.
- `app/page.tsx`: the static landing page (`force-static`; client components are the waitlist form and `SessionLink`). Session links load the private, uncached `/api/session` endpoint for signed-in feed navigation. Copy and data are typed arrays at the top (`FAN_PROPS`, `STARTUP_PROPS`, `TICKER_WORDS`); edit those to change content. Both audience sections render through `AudienceSection` (`#fans` light, `#startups` dark), linked from the nav.
- `app/globals.css`: design tokens in `@theme` (colors `cream/ink/pink/sun/lime/sky/tangerine`, `shadow-sticker`, marquee/wobble animations). Reduced motion disables animations.
- `app/layout.tsx`: fonts (Bricolage Grotesque display, Geist sans/mono via `next/font`), root `metadata` (`metadataBase`, default title, site-wide OG/Twitter fields, robots), `viewport` (theme colour) and Organization/WebSite JSON-LD. No title template, because page titles already include "on startupfans". OG/Twitter title, description and url are left unset at the root so Next fills them from each page's own title and description; the canonical URL is set only in `app/page.tsx`.
- `app/site.ts`: single source for site URL, name, tagline, description and brand hex colours (used by metadata routes and the OG image, which can't read CSS tokens).
- SEO/metadata file conventions in `app/`: `opengraph-image.tsx` (1200x630, built at build time with `next/og`; X/Twitter reuses it automatically), `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.svg`, `apple-icon.png`. OG fonts are static woff files in `assets/fonts/` (from Fontsource; Satori needs ttf/otf/woff, not variable or woff2). PWA icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) live in `public/` and were rendered from the mark with `sharp`. Satori ignores `radial-gradient` dot backgrounds, so the OG image uses flat cream.
- File-based OG image URLs use `metadataBase` in production but `localhost` under `next dev`; check `og:image` against a `next build && next start` run.
- `app/waitlist-form.tsx`: client component rendered twice: in the hero (primary CTA, top of page) and again in `JoinSection`. Posts emails straight to the GetWaitlist API (unauthenticated, waitlist ID in `WAITLIST_ID`) and shows queue position plus referral link on success. Signups are managed in the GetWaitlist dashboard.
- `public/logo/`: brand assets, served at `/logo/...`. `startupfans-logo` is the full logo (SF wing monogram + wordmark), `startupfans-mark` is the square SF monogram (avatars, favicons). Each comes as SVG (outlined paths, no font dependency) and transparent PNG (logo 1820px wide, mark 1024px). Default files have a white wing and "Fans" for dark backgrounds; `-on-light` swaps those to ink. Logo blue is `#b6d3de` on dark backgrounds and the deeper `#2f7493` in the `-on-light` files (4.8:1 on cream; the pale blue was 1.4:1); wordmark is Fira Sans Condensed Bold. The nav and footer render `startupfans-logo-on-light.svg` via `next/image`; `app/icon.svg` (favicon) is the mark on an ink rounded square.
- `Untitled/`: stray empty git repo, unrelated; excluded from TS and ESLint.

### Responsive app layouts

All app routes were reasoned about at **390, 768, 834, 1024 and 1440px**. Shared navigation wraps with the signed-in admin link, controls have 44px minimum heights, and pages retain 20px side gutters. Wide app shells cap at 72rem; feeds cap at 48rem and post bodies at 65ch. The landing page and global tokens were not edited.

| Route | 390px | 768 and 834px | 1024 and 1440px |
| --- | --- | --- | --- |
| `/login` | Full-width fields and actions; long inbox addresses and development links wrap | Single capped form with comfortable padding | Form stays capped at 36rem |
| `/me` | Avatar above a width-constrained name; full-width actions and fan cards | Avatar and wrapping name share a row; admin navigation can wrap | Account column stays capped at 36rem |
| `/start` | Fields fit the card; fieldset can shrink; textarea resizes vertically | Stage and team-size fields share a row | Form stays capped at 42rem |
| `/s/[slug]` | Logo above name; star stays above content; team pills and follow controls fill the card; composer and media fit | Profile and follow panel stay stacked; text remains capped | Profile and follow panel share a grid; updates use a separate 48rem column |
| `/s/[slug]/p/[postId]` | Startup and author names wrap; report textarea fits; media and code lines stay inside the card | Post body stays at most 65ch | Single post column stays capped at 48rem |
| `/s/[slug]/settings` | Long slugs wrap; fields and member actions fit; invite controls fill available width | Page details and team stay stacked; invite forms have their own rows | Members sit beside the page form in a 72rem shell |
| `/join/[token]` | Startup names and closed-invite copy wrap; primary action fills the card | One capped invitation card | Invitation column stays capped at 36rem |
| `/feed` | Full-width filter pills; wrapping author/startup names; media and expanded reports fit | One readable feed column; post text caps at 65ch | Feed stays capped at 48rem |
| `/leaderboard` | Ranking cards and long startup names fit; startup links are tap-sized | Rankings remain stacked to leave room for names and logos | Two ranking columns in a 72rem shell |
| `/admin` | Report excerpts/reasons wrap; actions stack and confirmation labels are tap-sized | Action forms wrap when needed | Report column stays capped at 56rem |
| `/dev/emails` | Preview links wrap into rows with 44px targets | Preview index stays a single card | Index stays capped at 36rem; production 404 behavior is preserved |

Verification: the page components and production styles were rendered in headless Chromium with synthetic long names, addresses, post text, image/video attachments, admin navigation and expanded report forms. All 65 renders (11 routes plus startup fan and closed-invite variants, each at five widths) had no horizontal overflow or measured controls below 44px. Build, typecheck and lint passed without application environment variables.

## Style

Playful "fan club / sticker" look: thick `border-ink` outlines, hard offset shadows, slight rotations, bright fills on cream. Keep new sections consistent with that.
