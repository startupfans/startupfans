"use client";

import {
  startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode,
} from "react";
import { IconField } from "@/app/components/icon-field";
import {
  GitHubIcon, GlobeIcon, InstagramIcon, LinkedInIcon, PinIcon, TikTokIcon, XIcon, YouTubeIcon,
} from "@/app/components/icons";
import { socialNetworks, type SocialNetwork } from "@/lib/socials";
import {
  updateStartupAction,
  type UpdateStartupField,
  type UpdateStartupState,
  type UpdateStartupValues,
} from "./actions";
import { BioField, ImageUpload } from "./image-upload";

const SAVE_DEBOUNCE_MS = 700;

const initialUpdateStartupState: UpdateStartupState = { status: "idle" };

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const errorClass = "mt-1 text-sm font-semibold";

function fieldError(state: UpdateStartupState, field: UpdateStartupField) {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

function FieldHint({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className={errorClass}>{message}</p>;
}

function SaveStatus({ pending, state }: { pending: boolean; state: UpdateStartupState }) {
  if (pending) {
    return (
      <p role="status" aria-live="polite"
        className="rounded-xl border-2 border-ink bg-sky px-4 py-3 font-semibold shadow-sticker">
        Saving…
      </p>
    );
  }
  if (state.status === "saved") {
    return (
      <p role="status" aria-live="polite"
        className="rounded-xl border-2 border-ink bg-lime px-4 py-3 font-semibold shadow-sticker">
        Saved
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="status" aria-live="polite"
        className="rounded-xl border-2 border-ink bg-sun px-4 py-3 font-semibold shadow-sticker">
        Couldn&apos;t save — check the highlighted fields.
      </p>
    );
  }
  return (
    <p role="status" className="rounded-xl border-2 border-ink bg-white px-4 py-3 text-ink/80 shadow-sticker">
      Changes save automatically.
    </p>
  );
}

export function PageDetailsForm({
  slug, creatorId, values,
}: {
  slug: string;
  creatorId: string;
  values: UpdateStartupValues;
}) {
  const [state, action, pending] = useActionState(
    updateStartupAction.bind(null, slug),
    initialUpdateStartupState,
  );
  // Freeze the first paint defaults; React 19 form actions reset to defaultValue.
  const [defaults] = useState(values);
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const actionRef = useRef(action);
  const pendingRef = useRef(pending);

  useEffect(() => {
    actionRef.current = action;
    pendingRef.current = pending;
  }, [action, pending]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const saveNow = useCallback((immediate = false) => {
    const run = () => {
      const form = formRef.current;
      if (!form || pendingRef.current) {
        dirtyRef.current = true;
        return;
      }
      dirtyRef.current = false;
      startTransition(() => actionRef.current(new FormData(form)));
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      debounceRef.current = null;
      run();
      return;
    }
    debounceRef.current = setTimeout(run, SAVE_DEBOUNCE_MS);
  }, []);

  const saveImage = useCallback(() => saveNow(true), [saveNow]);

  useEffect(() => {
    if (pending || !dirtyRef.current) return;
    dirtyRef.current = false;
    const form = formRef.current;
    if (!form) return;
    startTransition(() => actionRef.current(new FormData(form)));
  }, [pending]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-6 space-y-5"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        saveNow(true);
      }}
      onInput={() => saveNow()}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) saveNow(true);
      }}
      onBlur={(event) => {
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
          || event.target instanceof HTMLSelectElement)) return;
        if (debounceRef.current) saveNow(true);
      }}
    >
      <SaveStatus pending={pending} state={state} />
      <label htmlFor="name" className="block font-bold">Startup name
        <input id="name" name="name" defaultValue={defaults.name} required minLength={2} maxLength={60}
          autoComplete="organization" aria-invalid={fieldError(state, "name") ? true : undefined}
          aria-describedby={fieldError(state, "name") ? "name-error" : undefined} className={inputClass} />
        <FieldHint id="name-error" message={fieldError(state, "name")} />
      </label>
      <label htmlFor="tagline" className="block font-bold">Tagline
        <input id="tagline" name="tagline" defaultValue={defaults.tagline} maxLength={120}
          aria-invalid={fieldError(state, "tagline") ? true : undefined}
          aria-describedby={fieldError(state, "tagline") ? "tagline-error" : undefined} className={inputClass} />
        <FieldHint id="tagline-error" message={fieldError(state, "tagline")} />
      </label>
      <BioField initialBio={defaults.bio} error={fieldError(state, "bio")} />
      <label htmlFor="description" className="block font-bold">Description
        <textarea id="description" name="description" defaultValue={defaults.description} maxLength={2000} rows={5}
          aria-invalid={fieldError(state, "description") ? true : undefined}
          aria-describedby={fieldError(state, "description") ? "description-error" : undefined}
          className={`${inputClass} resize-y`} />
        <FieldHint id="description-error" message={fieldError(state, "description")} />
      </label>
      <div>
        <ImageUpload name="logoUrl" label="Logo" slug={slug} initialUrl={defaults.logoUrl}
          creatorId={creatorId} onUrlChange={saveImage} />
        <FieldHint id="logoUrl-error" message={fieldError(state, "logoUrl")} />
      </div>
      <div>
        <ImageUpload name="coverUrl" label="Cover image" slug={slug} initialUrl={defaults.coverUrl}
          creatorId={creatorId} onUrlChange={saveImage} />
        <FieldHint id="coverUrl-error" message={fieldError(state, "coverUrl")} />
      </div>
      <label htmlFor="location" className="block font-bold">Location
        <IconField icon={<PinIcon />} id="location" name="location" defaultValue={defaults.location} maxLength={120}
          placeholder="City, country or remote" aria-invalid={fieldError(state, "location") ? true : undefined}
          aria-describedby={fieldError(state, "location") ? "location-error" : undefined} />
        <FieldHint id="location-error" message={fieldError(state, "location")} />
      </label>
      <label htmlFor="website" className="block font-bold">Website
        <IconField icon={<GlobeIcon />} id="website" name="website" defaultValue={defaults.website} type="text"
          inputMode="url" maxLength={500} placeholder="yourstartup.com" autoComplete="url"
          aria-invalid={fieldError(state, "website") ? true : undefined}
          aria-describedby={fieldError(state, "website") ? "website-error" : undefined} />
        <FieldHint id="website-error" message={fieldError(state, "website")} />
      </label>
      <label htmlFor="stage" className="block min-w-0 font-bold">Stage
        <select id="stage" name="stage" defaultValue={defaults.stage} className={inputClass}
          aria-invalid={fieldError(state, "stage") ? true : undefined}
          aria-describedby={fieldError(state, "stage") ? "stage-error" : undefined}>
          <option value="">Choose a stage</option>
          <option value="idea">Idea</option><option value="pre-seed">Pre-seed</option>
          <option value="seed">Seed</option><option value="series-a">Series A</option>
          <option value="growth">Growth</option><option value="bootstrapped">Bootstrapped</option>
        </select>
        <FieldHint id="stage-error" message={fieldError(state, "stage")} />
      </label>
      <fieldset className="min-w-0 space-y-5">
        <legend className="mb-3 font-display text-xl font-extrabold">Social profiles</legend>
        {socialNetworks.map(({ network, field, label, placeholder }) => {
          const SocialIcon = socialIcons[network];
          const error = fieldError(state, field);
          const errorId = `${field}-error`;
          return (
            <label key={field} htmlFor={field} className="block font-bold">{label}
              <IconField icon={<SocialIcon />} id={field} name={field} defaultValue={defaults[field]}
                maxLength={500} placeholder={placeholder} autoCapitalize="none" autoCorrect="off"
                spellCheck={false} aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined} />
              <FieldHint id={errorId} message={error} />
            </label>
          );
        })}
      </fieldset>
      <SaveStatus pending={pending} state={state} />
    </form>
  );
}
