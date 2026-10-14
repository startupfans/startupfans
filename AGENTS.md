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

- companies: id, name, slug, logo_url, website, description, stage, is_founding, created_at. The legacy team_size column remains unused; member counts come from startup_members.
- users: id, name, email, handle (required, unique, permanent), avatar_url
- memberships: user_id, company_id, role (owner, member)
- posts: id, company_id, author_id, body, image_url, created_at, source (web, slack)
- post_comments: id, post_id, parent_id (nullable top-level comment), user_id, body (1 to 1000 characters), created_at, deleted_at (soft delete)
- follows: user_id, company_id, member_no, created_at
- startup_follows: follower_startup_id, startup_id, member_no, created_at; shared per-startup fan-number counter with follows, no self-follow
- comment_likes: comment_id, user_id (composite primary key), created_at; cascading comment and user references
- post_reactions: post_id, user_id (composite primary key), kind (like, heart or tomato), created_at; cascading post and user references and an index on post_id/kind
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

### GTM drafts (`gtm/`)

Full social and outreach drafts live in [`gtm/`](gtm/README.md) (Grok bot pack + edits). Use those files for X, Reddit, outreach, newsletters, launch directories, team kit and investor DMs. For Reddit, use **`gtm/reddit-v2.md` only** (older reddit drafts were discarded).

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

## LinkedIn announcement (whiteboard / launch)

Origin story angle: joke idea on the offsite whiteboard that became the product. Put the waitlist or site link in the first comment.

```text
at the Lightdash offsite in Lisbon, we're doing a launch-a-thon.
launch any product and get as much traction as possible in 48 hours.

at the beginning, we wrote up our ideas on a whiteboard.
mostly as a joke, I submitted: "OnlyFans for startups"

it turned some heads and we actually made something valuable out of it.
today we're launching StartupFans (link in comments)

and no, there are no nudes on this one...
it's one for those that build in public
and for those that want to follow them
without the modern social media slop.

if you're a startup, this helps you with your brand
if you're a fan, or investor, you get the inside track on your favourite early stage startups

seriously, no nudes pls
```

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
- Post reactions: signed-in people can like, heart or tomato a public post, switch their reaction or clear it. Counts and the viewer's choice load with posts in one query across feeds, startup pages, public profiles and single posts. Round sticker buttons update optimistically with the existing burst animation and suppress bursts for reduced motion; signed-out visitors return through sign-in. The shared database rate limit allows 60 requests per person per 15 minutes. PostHog captures `post_reacted` and `post_unreacted` with post, startup and kind. Replies keep their single heart. Apply the generated `post_reactions` migration before serving these queries.
- Handle mentions: posts and replies link existing `@handle` tokens to public `/u/<handle>` profiles, excluding code and existing links. Server queries resolve handles in batches per render. Both composers offer keyboard and pointer autocomplete ranked by team, fans and the writer's circle, through a signed-in, rate-limited endpoint that returns no emails. Public profiles show join month, startups, fan clubs and the latest 20 public posts.
- Slack publishing: owners connect a workspace in settings; a 📣 reaction publishes a human message and its first supported image, with email-matched team attribution, encrypted tokens, deduplication and a thread confirmation.
- Landing page (`app/page.tsx`): static, startup-first hero ("Get your startup in front of fans.") with open sign-up CTAs to `/login`, honest "launching today · free to join" badge, fan path to sign-in, startups section before fans, and a second sign-up CTA at the bottom. Positioning: early startups post what they're shipping; free for everyone. Client `SessionLink` checks `/api/session` once on mount to offer signed-in visitors `/start` and their feed, reserving space for both labels. Client `LandingGate` shares one private, uncached `/api/session` check with `SessionLink`: a centred cream sticker spinner covers the static landing until signed-in visitors are replaced to `/feed`, or signed-out visitors see a 200 ms fade. Pending content reveals and its overlay hides through CSS after 1.5 seconds, even when hydration never runs; JavaScript can reveal it sooner and skips the fade once CSS has revealed the content. Reduced motion reveals it instantly and `noscript` keeps the full landing visible.
- Open sign-up: anyone with a valid email can request a magic link; clicking it creates the account and session. No waitlist admission gate. After sign-in, `/start` creates a startup immediately.
- Manual seed: `pnpm seed` upserts startupfans with owners from `SEED_OWNER_EMAILS` and its first post.
- Legacy waitlist admin (`/admin/waitlist`): still syncs GetWaitlist and can admit historical entries, but the public site no longer uses the waitlist funnel. `app/waitlist-form.tsx` remains in the repo unused.
- Startup creation (`app/start/`): signed-in users create a public page and become its owner, with an optional stage.
- Public startup pages (`app/s/[slug]/`): profile, team members, current fan count and a markdown feed, plus member settings links. The people pill counts startup_members rows and updates as members join or leave; creation and settings have no manual team-size field.
- Company profiles: a 3:1 cover and overlapping logo, a short bio, location and social icon links. Owners upload logo and cover images, edit social profiles and keep a longer description in settings; creators upload a logo and add a bio at `/start`. Logo and cover uploads share `ImageDrop` with avatars: picker, drag and drop, focused paste, previews, progress, removal, HEIC/HEIF conversion and an HTTPS URL disclosure. Logos use a 96px square preview and covers use 3:1; page-address changes cancel and clear scoped uploads.
- Public team pages (`app/s/[slug]/team`): member cards with roles, join dates, public post counts and latest post quotes; startup profiles link there through a compact avatar row.
- Posting: team members publish markdown updates with one optional image or video uploaded directly to Vercel Blob, selected by picker, drag and drop or image paste. JPEG, PNG, WebP, GIF, AVIF, HEIC and HEIF photos are accepted up to 10 MB; HEIC and HEIF convert to JPEG in the browser. MP4, WebM, MOV and M4V videos are accepted up to 200 MB. Public post pages have share metadata; authors and owners can delete posts.
- Startup fans: team members follow or unfollow other startups on behalf of any startup they belong to, with a selector for multiple teams. Personal and startup fans share the increasing fan-number allocator. Profiles show linked fan and following counts under the socials; public `/s/[slug]/fans` and `/s/[slug]/following` lists paginate 100 entries at a time. The fans list combines people and startups in ascending fan-number order with a member-number cursor. Current profile, share-preview and leaderboard fan counts include people and startups.
- Replies: public plain-text replies on individual posts, with chronological threads and one level of nesting through shared reply items and composers. Feed and startup post cards open independent inline panels on the leftmost reply button, fetching the latest three threads only when opened through the private, no-store public replies endpoint; the full thread stays on the post page. Posting and deleting refresh the panel and card count. Hearts retain the confirmed action result and update the local preview immediately, including nested replies. Reply timestamps share the post relative-date helper and show an absolute UTC fallback until mounted; closed panels are never marked busy. Overflow threads link to the full thread. Replies to nested comments attach to the same top-level parent, enforced on the server. Reply counts on every post card include nested replies. Deleting a parent hides its content while keeping visible child replies. Fans, team members and site admins can reply, limited to 30 per user per 15 minutes through the shared hashed database counter helper. Authors, startup owners and site admins can confirm a soft deletion through the shared sticker modal. PostHog captures `comment_created` and `comment_deleted` with post and startup ids. `/api/mobile/v1` has no replies yet.
- Reply hearts: everyone sees like counts on top-level and nested replies. Signed-in people can like and unlike with optimistic feedback, limited to 60 requests per user per 15 minutes through the shared rate-limit helper. Counts and viewer likes load with replies in one aggregate query. Liking fires a small pink and sun heart burst, disabled for reduced motion; signed-out hearts link to sign-in with the post return URL. PostHog captures `comment_liked` and `comment_unliked` with post and startup ids only.
- Follow and unfollow: signed-in fans receive unique member numbers; unfollowing never reuses a number. Team members see an "On the team" badge and cannot follow their own startup; accepting an invite removes any existing follow without reusing its number.
- Global feed (`app/feed/`): public posts newest first, startup names and logos, a signed-in following filter, and cursor pagination with 20 posts per page. Team members post through the shared composer above the list, with a startup chip for one membership or a native Post as picker with a 20px logo for several. The last choice is stored per user in localStorage; changing startup resets the draft and upload, and posting clears the composer and refreshes Everyone without a full reload.
- Leaderboard (`app/leaderboard/`): most followed startups and most active teams by public posts in the last seven days, refreshed every five minutes and linked from the shared top nav.
- Team settings: owners edit page details, change member roles and remove members while keeping at least one owner, and create or revoke team invite links that work for multiple people until they expire after 7 days. Email invites are single-use and restricted to the invited address. Active link invites show their use count and expiry; email invites show the recipient, creation and expiry dates. Expired open invites can be cleared. Signed-in teammates accept links to join as editors; existing members see a link to the startup page without counting another use. Acceptance increments `startup_invites.uses`; `used_at` closes accepted email invites and revoked invites, while accepted link invites stay open. PostHog `startup_invite_accepted` includes `kind: "link" | "email"`.
- Sticker-style sign-in and team invite emails share a table-based HTML shell and plain-text content, with a console fallback without a Resend key. Dev-only previews live at `/dev/emails`.
- Profiles: optional names and avatar URLs, avatars or initial badges on member lists and `/me`, plus followed startups and fan numbers on `/me`. Every user has a permanent, unique lowercase handle assigned from their email at creation; existing users are backfilled from their email local parts. Handles appear beside names on post cards, team cards, team avatar labels and `/me`, and replace email-based name fallbacks in those displays, team metadata and the composer label. Handles have no editable field or update action.
- Share previews: a default site image and dynamic startup images with the tagline and current fan count; unknown slugs use the default image.
- Moderation: database-backed sign-in limits (5 requests per email and 30 per IP per 15-minute window), public post reports, and an admin report queue. Site admins configured in `ADMIN_EMAILS` can delete any post or startup; startup deletion requires confirmation and cascades to its content. App pages include a content policy and takedown contact.

Also built: Postgres + Drizzle data layer (`db/`, shared hosted database) and email magic-link sign-in with sessions (`app/login`, `app/auth`, `app/me`, `lib/auth.ts`).

Parked for now: founding spot payment (£99/year Stripe link). It's free for everyone at the moment.

Site copy only promises what exists. No pricing on the site (for fans or startups), and no paywalls, job posts or verified metrics until they exist. No fake startup counts or social proof numbers.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19, TypeScript 6, Tailwind CSS v4 (CSS-first config, no `tailwind.config`).
- pnpm. `pnpm-workspace.yaml` only holds `allowBuilds` (pnpm 12 build-script approvals).
- TypeScript is pinned to 6.x because `typescript-eslint` does not support TS 7 yet.

## Commands

- `pnpm dev`: dev server. In a sandbox it may crash on `uv_interface_addresses`; run it unsandboxed.
- `pnpm build`, `pnpm typecheck`, `pnpm lint`: run all three before calling work done. No test suite yet.

## Layout

- `lib/mentions.ts`: request-cached regex scans skip markdown code and link syntax for posts; replies use a plain scan once and reuse its tokens. Handle lookups share the per-render cache, including missing handles, and batch only unresolved handles. Markdown rendering adds profile links through a remark plugin.
- `lib/users.ts`: request-cached public profile lookup with memberships, fan clubs and the latest 20 public posts, shared by profile rendering and metadata.
- `app/u/[handle]/`: public profiles with name and handle metadata and a short description; unknown handles return 404 metadata and a 404 page.
- `app/api/mentions/`: signed-in, rate-limited autocomplete returning public names, handles, avatars and ranking reasons. Composers retain suggestions during subsequent fetches and intercept Escape only while the list is open.
- Forms: `app/components/submit-button.tsx` shares pending labels, a reduced-motion-aware spinner, reserved label width for text buttons, busy form attributes (cleared on unmount) and duplicate-submit protection for server actions and client pending flags. Icon mode keeps round 40px buttons with the spinner replacing the icon and accessible idle/pending labels. Covers sign-in, sign-out, profile save, startup creation, follow/unfollow, startup settings save, Slack disconnect, member removal, invite email/link creation and revocation, post creation/deletion/reporting, team invite acceptance, admin report resolution and post/startup deletion, waitlist batch/individual admission, resend and sync. Destructive post/startup deletion, member removal, invite revocation, Slack disconnection and first-N waitlist admission use the native sticker modal in `app/components/confirm-dialog.tsx` (`ConfirmDialog` and server-form-friendly `ConfirmSubmit`), with Cancel focus, Escape/backdrop dismissal, focus return and pending confirmation buttons.
- `app/components/icons.tsx`: named UI icon wrappers use Lucide Image, Video, Send, Flag, Trash2, Link2, X, Globe and MapPin at 20px with a 2.25px absolute stroke. Round sticker button classes and hand-drawn social brand glyphs stay shared here; `Star` in `sticker.tsx` remains brand art.
- `lib/slack.ts` and `lib/crypto.ts`: Slack Web API, signed OAuth state, event signature verification, markdown conversion, image copying and encrypted bot tokens. `slack_connections` binds one workspace to one startup; `slack_posts` records published messages atomically with post creation.
- `app/api/slack/`: owner-only install and OAuth callbacks, plus signed events acknowledged with `after()` before publishing. `slack-app-manifest.json` configures the app and its scopes.
- `scripts/seed.ts`: manual, idempotent startupfans seed. The command loads `.env` with Node 24 and runs through `tsx` with the `react-server` condition for server-only imports.
- `db/`: Drizzle schema, migrations, and the lazy Postgres client exported as `db`. Everyone uses the shared hosted Postgres through `DATABASE_URL` in the team's `.env`. Without it, database access throws a clear setup error; imports and builds do not need a connection.
- `lib/`: server-only auth and session helpers (`lib/auth.ts`) and Resend email delivery with a console fallback (`lib/email.ts`).
- `lib/signup.ts`: open `canSignUp(email)` (any non-empty trimmed email) and `existingUser(email)` lookup, with case-insensitive emails. The mobile auth request API should call `canSignUp` after its branch merges; it is not present on this branch.
- `lib/ratelimit.ts`, `lib/reports.ts`, `lib/admin.ts`: atomic hashed sign-in counters, private post report submission and resolution, and site admin authorization/deletion. Reports retain their resolved timestamp so signed-in users cannot report a post twice.
- `app/admin/`: admin-only open report queue with post excerpts, reasons, counts, resolution and confirmed deletion. `ADMIN_EMAILS` grants access through comma-separated email addresses or `@domain` entries (case-insensitive, whitespace tolerant, exact domains only); other visitors receive a 404.
- `app/admin/waitlist/` and `lib/waitlist.ts`: legacy admin tooling for the old GetWaitlist funnel (sync via `GETWAITLIST_API_KEY`, admission batches and resends). Not used by public sign-up. Missing configuration or sync failures keep the stored list available. Dates are shown in UTC.
- `lib/emails/`: pure sign-in, invite and welcome templates using a shared inline-styled, table-based sticker layout and matching plain text. `welcome.ts` sends "you're off the waitlist" to admitted waitlist entries with a fan number, a short pitch for fans and startups, and a seven-day sign-in link.
- `app/dev/emails/`: development-only template index and HTML previews, with `?text=1` for plain text; all routes return 404 in production.
- `lib/startups.ts`: startup creation with owner membership, profile lookup, team members, public posts and current fan counts. `normalizeWebsiteUrl` accepts bare domains, `http://` or `https://` on create and settings (no https-only requirement). `lib/follows.ts` serializes follow changes with a startup row lock and keeps the member-number counter increasing. `lib/slug.ts` holds shared slug suggestions and validation.
- `lib/socials.ts`: validates social profile hosts and paths, normalizes handles or pasted profile URLs (bare host, `http://` or `https://`), and builds canonical https links for X, LinkedIn, GitHub (profile, org, or repo), Instagram, YouTube and TikTok.
- `app/s/[slug]/profile-header.tsx`: server-rendered company cover, overlapping logo, bio, facts and social links, with follow controls alongside on wide screens. `settings/image-upload.tsx` shares image uploads and the live bio counter between settings and startup creation. Profile images use `startups/<slug>/profile/`; the upload route authorizes owners or signed-in creators using an unused slug, with creator-prefixed filenames, image-only content types and a 10 MB limit. `isStartupProfileImageUrl` validates stored profile images and HTTPS fallbacks.
- `app/components/sticker.tsx`: shared `Star`, `Sticker`, `PageHeader`, `SectionHeading` and `TopNav` components, plus `SiteFooter` for app pages. The footer uses `PRICING_CONTACT_EMAIL` or `hello@startupfans.co` for takedowns.
- Startup deletion lives only in the final settings section, `settings/danger-zone.tsx`, with the shared confirmation dialog. Owners and site admins can delete; the server action rechecks authorization under the startup lock, cascades to its content and redirects to `/me?message=startup-deleted`.
- Navigation: signed-in app visitors get a compact pink "Start a startup" sticker linking to `/start` immediately before "Your account" ("Start" below `lg`). `TopNav` stays on one row with 44px targets and no horizontal scrolling from 390px up: below `sm` the home link uses a 36px square mark, Leaderboard reads "Board", and links use 12px text with 4px gaps; from `sm` the wordmark is 128px, growing to 176px at `lg`. Link text and gaps grow to 14px/8px at `sm` and 16px/16px at `lg`; every app page renders the server `AppHeader` in `app/components/app-shell.tsx`. `AppHeader` and `AppShell` share one `max-w-6xl` band and one `px-5 sm:px-8` gutter, defined once in that file. Feed, account, admin, startup, team, fans, following, post, public profile, leaderboard and settings columns start at the logo's left edge, with their width caps inside the band. `TopNav` fills this band without overhang or translation. The links row keeps `pr-1` (4px right padding) after its final link, leaving space for its sticker shadow; the home link aligns the visible mark to the shared left edge while retaining its 44px target. `AppHeader` owns 40px top padding (64px from `sm`), a 32px gap to optional `SubNav`, and a 40px gap before content, clearing the first content block's top margin. The app admin pill shows its labelled icon below `lg` and adds "Admin" from `lg`; its landing variant keeps its existing labels. Leaderboard remains visible in every session state. Below 390px only, the links can scroll horizontally as a last resort. The static landing nav and hero use `SessionLink` to show `/start` CTAs when signed in, reserving space for both states; signed-out visitors retain the waitlist nav link and hero form. The join card keeps its existing feed link. Admins get the shared sun-yellow `AdminLink` sticker pill linking to `/admin` in `TopNav` and the static landing nav. Landing `SessionLink` appends it after the private `/api/session` check without reserving space for non-admins; the endpoint returns only signed-in status, name and admin status. Server `SubNav` in `app/components/sub-nav.tsx` shares wrapping and 44px sticker tabs. Its inline variant removes standalone margins. Feed filters, both admin pages and startup team/fans/following/post navigation now sit in `PageHeader`; the startup profile and settings pages retain their existing `AppHeader` tabs. Active tabs are sun-yellow with `aria-current="page"`. Startup Settings appears only for owners and site admins, matching existing access; post pages have Page/Team and owner-or-admin Settings with none active. `/me` keeps its existing main navigation because account/feed links would duplicate it; leaderboard has no secondary tabs.
- `app/leaderboard/page.tsx` and `lib/leaderboard.ts`: public sticker-style rankings with logos, taglines, fan and weekly post counts, and empty states; each list uses one aggregate query and excludes zero counts. The page renders on demand with queries cached for 300 seconds.
- `app/opengraph-image.tsx`: site-wide 1200 by 630 share preview (logo, `SITE_TAGLINE` headline, "Your startup" card mirroring the hero), prerendered at build time from local fonts in `assets/fonts/`. Inherited by every route without its own image.
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
- `app/s/[slug]/settings/`: owners and site admins can edit any page, manage members and pending invites, and upload profile images; non-member admins see a site admin note. Slack is owner-only: always shows the 📣 value prop; without platform Slack env vars it says coming soon (no Connect); when configured, owners connect or disconnect a workspace. Slack connect and disconnect require a real owner membership. Role changes capture `team_role_changed`; role changes and member removal keep at least one owner, with the last owner's demote and remove buttons disabled. Pending invites show the email recipient or link label and UTC creation/expiry dates, with a clear-expired button only when expired unused invites remain. Creation dates are derived from expiry minus the fixed seven-day lifetime because the table has no creation timestamp. Page details use client `page-details-form.tsx` with `useActionState` autosave: debounced saves on input (~700ms), immediate saves on stage change, blur flush and image URL changes. Each edited field shows Saving… only while that save runs, then a Saved pill that clears when any field is edited again; validation errors stay on the fields. Submit uses `preventDefault` + `startTransition` so React 19 does not wipe uncontrolled fields; success returns saved state (no redirect) and revalidates. Website, location and social inputs use `IconField` with shared 20px glyphs and left padding. `invite-link.tsx` creates and copies invite links and offers email invites through the settings action.
- `app/join/[token]/`: signed-in invite confirmation with atomic editor membership creation and friendly invalid-link messages; signed-out visitors carry the invite token through login and return to the confirmation page. Email invites still store the invited address for the join flow.
- `app/components/markdown.tsx` and `post-media.tsx`: safe markdown rendering and sticker-framed images and videos. Post media fills the card width at its intrinsic aspect ratio with no height cap; the white frame hugs the media and clips it to the rounded corners. Images use `next/image` with responsive sizes, a 1600px square ratio placeholder and the default image quality. Images load lazily and decode asynchronously; optional `priority` enables preload. Dimensions are not stored, so their real ratio is established on load.
- `app/login/`: sign-in / sign-up link request form, development inbox and server action; open to any valid email.
- `app/auth/`: magic-link verification route that creates the user if needed, creates a session and sets the `sf_session` cookie.
- `app/components/image-drop.tsx`: shared client image drop zone with round, square and wide previews, scoped upload cancellation, progress, browser HEIC/HEIF conversion and an HTTPS URL disclosure (open when uploads are off).
- `app/me/`: "Your startups" lists every membership with role, current fan count and page/post actions, plus owner settings and startup creation. Admins also see the newest 200 startups with fan/member counts, UTC creation dates, page/settings links and a cap note. Profile name and avatar editing uses the shared image drop zone with picker, drop and paste uploads, browser HEIC/HEIF conversion, progress, removal and an HTTPS URL fallback (open when Blob uploads are off). Followed startups with member numbers and sign out remain, protected by `requireUser`. Blob avatars must use the user's own image path on a public Blob host.
- `app/page.tsx`: the static landing page (`force-static`; client `SessionLink` for auth-aware CTAs). Session links load the private, uncached `/api/session` endpoint. Copy and data are typed arrays at the top (`FAN_PROPS`, `STARTUP_PROPS`, `TICKER_WORDS`); edit those to change content. Both audience sections render through `AudienceSection` (`#fans` light, `#startups` dark), linked from the nav.
- `app/globals.css`: design tokens in `@theme` (colors `cream/ink/pink/sun/lime/sky/tangerine`, `shadow-sticker`, marquee/wobble animations). Reduced motion disables animations.
- `app/layout.tsx`: fonts (Bricolage Grotesque display, Geist sans/mono via `next/font`), root `metadata` (`metadataBase`, default title, site-wide OG/Twitter fields, robots), `viewport` (theme colour) and Organization/WebSite JSON-LD. No title template, because page titles already include "on startupfans". OG/Twitter title, description and url are left unset at the root so Next fills them from each page's own title and description; the canonical URL is set only in `app/page.tsx`.
- `app/site.ts`: single source for site URL, name, tagline, description and brand hex colours (used by metadata routes and the OG image, which can't read CSS tokens).
- SEO/metadata file conventions in `app/`: `opengraph-image.tsx` (1200x630, built at build time with `next/og`; X/Twitter reuses it automatically), `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.svg`, `apple-icon.png`. OG fonts are static woff files in `assets/fonts/` (from Fontsource; Satori needs ttf/otf/woff, not variable or woff2). PWA icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) live in `public/` and were rendered from the mark with `sharp`. Satori ignores `radial-gradient` dot backgrounds, so the OG image uses flat cream.
- File-based OG image URLs use `metadataBase` in production but `localhost` under `next dev`; check `og:image` against a `next build && next start` run.
- `app/waitlist-form.tsx`: unused GetWaitlist client form kept for possible admin/history reuse; not rendered on the public site.
- `public/logo/`: brand assets, served at `/logo/...`. `startupfans-logo` is the full logo (SF wing monogram + wordmark), `startupfans-mark` is the square SF monogram (avatars, favicons). Each comes as SVG (outlined paths, no font dependency) and transparent PNG (logo 1820px wide, mark 1024px). Default files have a white wing and "Fans" for dark backgrounds; `-on-light` swaps those to ink. Logo blue is `#b6d3de` on dark backgrounds and the deeper `#2f7493` in the `-on-light` files (4.8:1 on cream; the pale blue was 1.4:1); wordmark is Fira Sans Condensed Bold. The nav and footer render `startupfans-logo-on-light.svg` via `next/image`; `app/icon.svg` (favicon) is the mark on an ink rounded square.
- `Untitled/`: stray empty git repo, unrelated; excluded from TS and ESLint.

### Responsive app layouts

`PageHeader` supplies one wrapping row with a 30px title (36px from `sm`), optional identity, metadata, actions and inline navigation for two or three tabs. Larger tab groups use their own row. It owns 24px top and bottom margins, preserving the top margin against the app shell reset and clearing the next content block's margin. At 390px, navigation wraps below the heading; at 834px and 1440px, titles and tabs share a row where the content column has room. Feed and leaderboard eyebrows and page subtitles are removed; leaderboard sections use plain 24px headings; startup profiles retain their hero and use a small `Latest` feed heading. Post headings show the startup name and retain the original update phrase for screen readers. Account greetings and public names now sit in this row with their handles; the account header places `Handles are permanent.` directly under its handle; team headings read `<startup name> team` with the member count alongside; `Your startups` and `Your fan clubs` have plain 24px section headings; startup item cards retain their sticker frames.

`AppHeader` and `AppShell` share the same 72rem outer band and `px-5 sm:px-8` gutter: 20px at 390px and 32px from `sm`. `AppShell` content columns align their left edges with the visible nav logo, including narrower feed, account, report and public profile columns. Columns retain their width caps inside this band; feeds cap at 48rem and post bodies at 65ch. Startup updates also start at the shared left edge. From **390px** up, the logo and links share one row, including the signed-in admin pill; controls have 44px minimum heights. The nav links row retains `pr-1` (4px right padding) after its last link. The landing page and global tokens were not edited.

| Route | 390px | 768, 834 and 900px | 1024, 1280 and 1440px |
| --- | --- | --- | --- |
| Shared app header | One row: square mark, Board, Start, icon-only admin, 12px links and 4px gaps | One row: 128px wordmark, short Start, icon-only admin, 14px links and 8px gaps | One row: 176px wordmark, full labels, 16px links and 16px gaps; 72rem band |
| `/login` | Full-width fields and actions; long inbox addresses and development links wrap | Single capped form with comfortable padding | Form stays capped at 36rem |
| `/me` | Greeting and handle beside the avatar; permanence note under the handle; plain startup and fan-club headings | Identity wraps as needed; content and logo share the 32px gutter | Account column stays capped at 36rem and starts at the nav logo |
| `/start` | Fields fit the card; fieldset can shrink; textarea resizes vertically | Stage and team-size fields share a row | Form stays capped at 42rem |
| `/s/[slug]` | Logo above name; star stays above content; team pills and follow controls fill the card; composer and media fit | Profile and follow panel stay stacked; text remains capped | Profile and follow panel share a grid; updates use a left-aligned 48rem column |
| `/s/[slug]/p/[postId]` | Update heading then Page / Team / owner-or-admin Settings tabs in one wrapping header; media and replies fit | Header wraps as needed; post body stays at most 65ch | Header and tabs share a row when they fit; single post column stays capped at 48rem |
| `/s/[slug]/settings` | Long slugs wrap; fields and member actions fit; invite controls fill available width | Page details and team stay stacked; invite forms have their own rows | Members sit beside the page form in a 72rem shell |
| `/join/[token]` | Startup names and closed-invite copy wrap; primary action fills the card | One capped invitation card | Invitation column stays capped at 36rem |
| `/feed` | Main nav, then The latest with Everyone / Following on the next line of one page header; post content fits | At 834px, heading and filter tabs share a row above one readable feed column | Heading and tabs share a row; feed stays capped at 48rem |
| `/leaderboard` | Plain Leaderboard header above ranking sections; cards and names fit | At 834px, rankings remain stacked | Two ranking columns below one page header in a 72rem shell |
| `/admin` and `/admin/waitlist` | Heading then Post reports / Waitlist in one wrapping page header; actions fit | At 834px, heading and tabs share a row | Report column caps at 56rem; waitlist at 72rem |
| `/s/[slug]/team`, `/fans`, `/following` | Team title includes the startup name; heading then Page / Team / owner-or-admin Settings tabs; cards fit | At 834px, titles and tabs share a row when they fit | One page header above each existing content column |
| `/u/[handle]` | Name and handle beside the avatar in one plain header | At 834px, identity stays in one row | Profile stays capped at 48rem |
| `/dev/emails` | Preview links wrap into rows with 44px targets | Preview index stays a single card | Index stays capped at 36rem; production 404 behavior is preserved |

Gutter verification: headless Chromium against `pnpm exec next dev -p 3041` passed 63 route/session/width cases at 390, 834 and 1440px, including settings, waitlist and individual posts. Visible logo and content left edges matched exactly in every case (20px, 32px and 176px respectively); the startup updates column matched too. All cases had zero page/nav overflow, one nav row, 44px minimum nav targets and 4px nav-row right padding. Account permanence text appeared once, directly under the handle in the header; team h1 read `startupfans team`; startup/fan-club wrappers remained plain. Final parallel membership queries were rechecked in 12 fan/following cases, with Settings present for the admin and absent when signed out. Temporary sessions were deleted; build, typecheck and lint passed.

Earlier page-header verification: headless Chromium against `pnpm exec next dev -p 3041` checked 51 route/session/width combinations at 390, 834 and 1440px, including the seven required screenshot routes at 390 and 1440px. Shared page headers measured 24px top/bottom margins and 24px to content, with 30px/36px titles, 44px tab targets and no horizontal overflow. Tabs sit below headings on phones and beside them where the column has room. The startup hero retains its existing layout. Temporary sessions were deleted. Follow-up verification checked nine account and post-page route/session/width combinations at the same three widths: both account section wrappers are plain, startup item cards remain framed, post tabs wrap below the heading on phones and sit inline on desktop, and Settings is absent when signed out. Build, typecheck and lint passed after the final changes.

Earlier navigation verification: headless Chromium against `pnpm exec next dev -p 3040` passed all 42 required combinations of `/me`, `/feed`, `/login`, `/start`, `/admin`, `/s/startupfans` and `/u/irakli` at 390, 768, 900, 1024, 1280 and 1440px. Including leaderboard, a closed invitation, startup team/fans/following/settings and signed-out public pages, all 96 measurements had 0px nav row-center difference, 0px page or nav overflow and at least 44px link targets. Top padding measured 40px/64px, the optional sub-nav gap 32px and the content gap 40px. The temporary admin session was deleted; build, typecheck and lint passed.

Earlier content verification: the page components and production styles were rendered in headless Chromium with synthetic long names, addresses, post text, image/video attachments, admin navigation and expanded report forms. All 65 renders (11 routes plus startup fan and closed-invite variants, each at five widths) had no horizontal overflow or measured controls below 44px. Build, typecheck and lint passed without application environment variables.

## Style

Playful "fan club / sticker" look: thick `border-ink` outlines, hard offset shadows, slight rotations, bright fills on cream. Keep new sections consistent with that.
