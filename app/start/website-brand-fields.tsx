"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { SpinnerIcon } from "@/app/components/icons";
import { BioField, ImageUpload } from "@/app/s/[slug]/settings/image-upload";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const chipClass = "min-h-11 rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

type LogoCandidate = {
  url: string;
  source: "apple-touch-icon" | "og-image" | "icon" | "favicon" | "favicon-proxy";
};

type CoverCandidate = {
  url: string;
  source: "og-image" | "twitter-image";
};

type LookupResult = {
  website: string;
  host: string;
  logos: LogoCandidate[];
  covers: CoverCandidate[];
  tagline: string | null;
  bio: string | null;
  description: string | null;
  copySource: "meta" | "ai";
};

type ImageSeed = { key: number; url: string };

function displayHost(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function snippet(value: string, max = 140) {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const boundary = slice.lastIndexOf(" ");
  return `${(boundary > 80 ? slice.slice(0, boundary) : slice).trimEnd()}…`;
}

async function importImage(imageUrl: string, slug: string) {
  const response = await fetch("/api/brand-lookup/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, slug }),
  });
  if (!response.ok) return imageUrl;
  const payload = await response.json() as { url?: string };
  return payload.url || imageUrl;
}

export function WebsiteBrandFields({ creatorId }: { creatorId: string }) {
  const websiteId = useId();
  const { pending } = useFormStatus();
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [dismissedFor, setDismissedFor] = useState("");
  const [appliedHost, setAppliedHost] = useState("");
  const [logoSeed, setLogoSeed] = useState<ImageSeed>({ key: 0, url: "" });
  const [coverSeed, setCoverSeed] = useState<ImageSeed>({ key: 0, url: "" });
  const [bioSeed, setBioSeed] = useState({ key: 0, value: "" });
  const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set());
  const [brokenCovers, setBrokenCovers] = useState<Set<string>>(() => new Set());
  const lastQueried = useRef("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const visibleLogos = lookup?.logos.filter((logo) => !brokenLogos.has(logo.url)) ?? [];
  const visibleCovers = lookup?.covers.filter((cover) => !brokenCovers.has(cover.url)) ?? [];
  const activeLogo = selectedLogo && !brokenLogos.has(selectedLogo)
    ? selectedLogo
    : visibleLogos[0]?.url ?? null;
  const activeCover = visibleCovers[0]?.url ?? null;
  const hasCopy = Boolean(lookup?.tagline || lookup?.bio || lookup?.description);
  const showSuggestion = Boolean(lookup && (activeLogo || activeCover || hasCopy));

  async function lookupWebsite(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastQueried.current || trimmed === dismissedFor) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    // Paint before the click that blurred this field can open the file picker.
    flushSync(() => {
      setLookingUp(true);
      setError("");
      setLookup(null);
      setSelectedLogo(null);
    });
    try {
      const response = await fetch(`/api/brand-lookup?website=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: active.signal,
      });
      if (active.signal.aborted) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        setLookup(null);
        setSelectedLogo(null);
        if (response.status !== 400) setError(payload?.message ?? "We couldn't look that website up.");
        return;
      }
      const result = await response.json() as LookupResult;
      if (active.signal.aborted) return;
      lastQueried.current = trimmed;
      setBrokenLogos(new Set());
      setBrokenCovers(new Set());
      setLookup(result);
      setSelectedLogo(result.logos[0]?.url ?? null);
    } catch (cause) {
      if (!active.signal.aborted && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("We couldn't look that website up.");
        setLookup(null);
        setSelectedLogo(null);
      }
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setLookingUp(false);
      }
    }
  }

  async function applyPrefill() {
    if (!lookup || (!activeLogo && !activeCover && !hasCopy)) return;
    setImporting(true);
    setError("");
    setWebsite(lookup.website);
    const form = document.getElementById(websiteId)?.closest("form");
    const slugInput = form?.elements.namedItem("slug");
    const slug = slugInput instanceof HTMLInputElement ? slugInput.value.trim() : "";

    let logoUrl = activeLogo;
    let coverUrl = activeCover;
    if (slug) {
      try {
        const imports = await Promise.all([
          logoUrl ? importImage(logoUrl, slug) : Promise.resolve(null),
          coverUrl ? importImage(coverUrl, slug) : Promise.resolve(null),
        ]);
        if (imports[0]) logoUrl = imports[0];
        if (imports[1]) coverUrl = imports[1];
      } catch {
        // Keep the remote image URLs if Blob copy fails.
      }
    }

    if (logoUrl) setLogoSeed((current) => ({ key: current.key + 1, url: logoUrl }));
    if (coverUrl) setCoverSeed((current) => ({ key: current.key + 1, url: coverUrl }));
    if (lookup.tagline) setTagline(lookup.tagline);
    if (lookup.description) setDescription(lookup.description);
    if (lookup.bio) setBioSeed((current) => ({ key: current.key + 1, value: lookup.bio ?? "" }));

    setAppliedHost(displayHost(lookup.website));
    setDismissedFor(lookup.website);
    lastQueried.current = lookup.website;
    setLookup(null);
    setSelectedLogo(null);
    setImporting(false);
  }

  return (
    <>
      <div>
        <label htmlFor={websiteId} className="block font-bold">Website <span className="font-normal">(optional)</span>
          <input id={websiteId} name="website" type="text" inputMode="url" maxLength={500}
            placeholder="yourstartup.com" autoComplete="url" value={website} disabled={pending}
            className={inputClass}
            onChange={(event) => {
              const value = event.target.value;
              setWebsite(value);
              setError("");
              if (value.trim() !== dismissedFor) setDismissedFor("");
              if (appliedHost) setAppliedHost("");
            }}
            onBlur={() => void lookupWebsite(website)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookupWebsite(website);
              }
            }} />
        </label>
        {lookingUp ? (
          <p role="status" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-sky px-4 py-2 font-bold shadow-sticker">
            <SpinnerIcon />
            Fetching image…
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink/70">
            {appliedHost
              ? `Filled from ${appliedHost}. Edit anything before you create.`
              : "Add your domain and we'll offer your logo, cover image and about text."}
          </p>
        )}
        {error && <p role="alert" className="mt-2 text-sm font-semibold">{error}</p>}
      </div>

      {showSuggestion && lookup && (
        <div className="rounded-3xl border-[3px] border-ink bg-sky/40 p-4 shadow-sticker sm:p-5">
          <p className="font-display text-lg font-extrabold">Pre-fill from {displayHost(lookup.website)}?</p>
          <p className="mt-1 text-sm text-ink/80">
            {lookup.copySource === "ai"
              ? "We pulled their logo and cover, then drafted tagline, bio and description from the homepage. Accept to drop them into the form below."
              : "We scraped their homepage. Accept to drop the logo, cover and about text into the form below."}
          </p>
          {(activeLogo || activeCover) && (
            <div className="mt-4 flex flex-wrap items-start gap-4">
              {activeLogo && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/70">Logo</p>
                  <div className="mt-2 flex flex-wrap gap-3" role="listbox" aria-label="Logo options">
                    {visibleLogos.map((logo) => {
                      const selected = activeLogo === logo.url;
                      return (
                        <button key={logo.url} type="button" role="option" aria-selected={selected}
                          disabled={pending || importing}
                          onClick={() => setSelectedLogo(logo.url)}
                          className={`relative h-20 w-20 overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${selected ? "ring-4 ring-pink" : ""}`}>
                          {/* External scrape/proxy URLs are not in next/image remotePatterns. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logo.url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2"
                            onError={() => {
                              setBrokenLogos((current) => new Set(current).add(logo.url));
                              setSelectedLogo((current) => current === logo.url ? null : current);
                            }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {activeCover && (
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/70">Cover</p>
                  <div className="relative mt-2 aspect-[3/1] max-w-sm overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-sticker">
                    {/* External scrape/proxy URLs are not in next/image remotePatterns. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeCover} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover"
                      onError={() => {
                        setBrokenCovers((current) => new Set(current).add(activeCover));
                      }} />
                  </div>
                </div>
              )}
            </div>
          )}
          {hasCopy && (
            <div className="mt-4 space-y-2 rounded-2xl border-2 border-ink/20 bg-cream/70 p-3 text-sm">
              {lookup.tagline && (
                <p><span className="font-bold">Tagline:</span> {lookup.tagline}</p>
              )}
              {(lookup.bio || lookup.description) && (
                <p><span className="font-bold">About:</span> {snippet(lookup.bio || lookup.description || "")}</p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={pending || importing} className={`${chipClass} bg-pink`}
              onClick={() => void applyPrefill()}>
              {importing ? "Filling in…" : "Use these"}
            </button>
            <button type="button" disabled={pending || importing} className={chipClass}
              onClick={() => {
                setDismissedFor(website.trim() || lookup.website);
                setLookup(null);
                setSelectedLogo(null);
              }}>
              Not now
            </button>
          </div>
        </div>
      )}

      <ImageUpload key={`logo-${logoSeed.key}`} name="logoUrl" label="Logo" creatorId={creatorId} initialUrl={logoSeed.url}
        busyMessage={lookingUp ? "Fetching image…" : undefined} />
      <ImageUpload key={`cover-${coverSeed.key}`} name="coverUrl" label="Cover image" creatorId={creatorId} initialUrl={coverSeed.url}
        busyMessage={lookingUp ? "Fetching image…" : undefined} />

      <label htmlFor="tagline" className="block font-bold">Tagline <span className="font-normal">(optional)</span>
        <input id="tagline" name="tagline" maxLength={120} value={tagline} disabled={pending}
          onChange={(event) => setTagline(event.target.value)} className={inputClass} />
      </label>
      <label htmlFor="description" className="block font-bold">Description <span className="font-normal">(optional)</span>
        <textarea id="description" name="description" maxLength={2000} rows={5} value={description} disabled={pending}
          onChange={(event) => setDescription(event.target.value)} className={`${inputClass} resize-y`} />
      </label>
      <BioField key={bioSeed.key} initialBio={bioSeed.value} />
    </>
  );
}
