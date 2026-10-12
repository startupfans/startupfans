<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# startupfans

Public site for a 3-day launchathon at a company offsite: the team ships real products and tries to get paid by day 3. Goals: launch, traction (revenue is the gold standard), attention. Idea shortlist lives outside this repo (Obsidian: `business/ideas/launchathon.md`).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19, TypeScript 6, Tailwind CSS v4 (CSS-first config, no `tailwind.config`).
- pnpm. `pnpm-workspace.yaml` only holds `allowBuilds` (pnpm 12 build-script approvals).
- TypeScript is pinned to 6.x because `typescript-eslint` does not support TS 7 yet.

## Commands

- `pnpm dev`: dev server. In a sandbox it may crash on `uv_interface_addresses`; run it unsandboxed.
- `pnpm build`, `pnpm typecheck`, `pnpm lint`: run all three before calling work done. No test suite yet.

## Layout

- `app/page.tsx`: the whole landing page (server components only). Copy and data are typed arrays at the top (`VALUE_PROPS`, `DAY_PLANS`, `SCOREBOARD`, `TICKER_WORDS`); edit those to change content. `SCOREBOARD` is hardcoded and needs manual updates.
- `app/globals.css`: design tokens in `@theme` (colors `cream/ink/pink/sun/lime/sky/tangerine`, `shadow-sticker`, marquee/wobble animations). Reduced motion disables animations.
- `app/layout.tsx`: fonts (Bricolage Grotesque display, Geist sans/mono via `next/font`) and metadata.
- `JoinSection` in `page.tsx` has a placeholder where the sign-up form goes (not built yet; needs a client component plus a backend/provider).
- `Untitled/`: stray empty git repo, unrelated; excluded from TS and ESLint.

## Style

Playful "fan club / sticker" look: thick `border-ink` outlines, hard offset shadows, slight rotations, bright fills on cream. Keep new sections consistent with that.
