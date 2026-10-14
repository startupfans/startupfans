"use client";

import { useActionState, type ReactNode } from "react";
import { IconField } from "@/app/components/icon-field";
import {
  GitHubIcon, GlobeIcon, InstagramIcon, LinkedInIcon, PinIcon, TikTokIcon, XIcon, YouTubeIcon,
} from "@/app/components/icons";
import { SubmitButton } from "@/app/components/submit-button";
import { socialNetworks, type SocialNetwork } from "@/lib/socials";
import { updateStartupAction, type UpdateStartupField, type UpdateStartupState } from "./actions";
import { BioField, ImageUpload } from "./image-upload";

const initialUpdateStartupState: UpdateStartupState = { status: "idle" };

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 sm:w-auto";
const errorClass = "mt-1 text-sm font-semibold";

interface PageDetailsValues {
  name: string;
  tagline: string;
  bio: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  location: string;
  website: string;
  stage: string;
  xHandle: string;
  linkedinUrl: string;
  githubUrl: string;
  instagramHandle: string;
  youtubeUrl: string;
  tiktokHandle: string;
}

function fieldError(state: UpdateStartupState, field: UpdateStartupField) {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

function FieldHint({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className={errorClass}>{message}</p>;
}

export function PageDetailsForm({
  slug, creatorId, values,
}: {
  slug: string;
  creatorId: string;
  values: PageDetailsValues;
}) {
  const [state, action, pending] = useActionState(
    updateStartupAction.bind(null, slug),
    initialUpdateStartupState,
  );

  return (
    <form action={action} className="mt-6 space-y-5" aria-busy={pending}>
      <label htmlFor="name" className="block font-bold">Startup name
        <input id="name" name="name" defaultValue={values.name} required minLength={2} maxLength={60}
          autoComplete="organization" aria-invalid={fieldError(state, "name") ? true : undefined}
          aria-describedby={fieldError(state, "name") ? "name-error" : undefined} className={inputClass} />
        <FieldHint id="name-error" message={fieldError(state, "name")} />
      </label>
      <label htmlFor="tagline" className="block font-bold">Tagline
        <input id="tagline" name="tagline" defaultValue={values.tagline} maxLength={120}
          aria-invalid={fieldError(state, "tagline") ? true : undefined}
          aria-describedby={fieldError(state, "tagline") ? "tagline-error" : undefined} className={inputClass} />
        <FieldHint id="tagline-error" message={fieldError(state, "tagline")} />
      </label>
      <BioField initialBio={values.bio} error={fieldError(state, "bio")} />
      <label htmlFor="description" className="block font-bold">Description
        <textarea id="description" name="description" defaultValue={values.description} maxLength={2000} rows={5}
          aria-invalid={fieldError(state, "description") ? true : undefined}
          aria-describedby={fieldError(state, "description") ? "description-error" : undefined}
          className={`${inputClass} resize-y`} />
        <FieldHint id="description-error" message={fieldError(state, "description")} />
      </label>
      <div>
        <ImageUpload name="logoUrl" label="Logo" slug={slug} initialUrl={values.logoUrl} creatorId={creatorId} />
        <FieldHint id="logoUrl-error" message={fieldError(state, "logoUrl")} />
      </div>
      <div>
        <ImageUpload name="coverUrl" label="Cover image" slug={slug} initialUrl={values.coverUrl} creatorId={creatorId} />
        <FieldHint id="coverUrl-error" message={fieldError(state, "coverUrl")} />
      </div>
      <label htmlFor="location" className="block font-bold">Location
        <IconField icon={<PinIcon />} id="location" name="location" defaultValue={values.location} maxLength={120}
          placeholder="City, country or remote" aria-invalid={fieldError(state, "location") ? true : undefined}
          aria-describedby={fieldError(state, "location") ? "location-error" : undefined} />
        <FieldHint id="location-error" message={fieldError(state, "location")} />
      </label>
      <label htmlFor="website" className="block font-bold">Website
        <IconField icon={<GlobeIcon />} id="website" name="website" defaultValue={values.website} type="text"
          inputMode="url" maxLength={500} placeholder="yourstartup.com" autoComplete="url"
          aria-invalid={fieldError(state, "website") ? true : undefined}
          aria-describedby={fieldError(state, "website") ? "website-error" : undefined} />
        <FieldHint id="website-error" message={fieldError(state, "website")} />
      </label>
      <label htmlFor="stage" className="block min-w-0 font-bold">Stage
        <select id="stage" name="stage" defaultValue={values.stage} className={inputClass}
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
              <IconField icon={<SocialIcon />} id={field} name={field} defaultValue={values[field]}
                maxLength={500} placeholder={placeholder} autoCapitalize="none" autoCorrect="off"
                spellCheck={false} aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined} />
              <FieldHint id={errorId} message={error} />
            </label>
          );
        })}
      </fieldset>
      <SubmitButton pending={pending} pendingLabel="Saving…" className={`${buttonClass} bg-lime`}>
        Save page
      </SubmitButton>
    </form>
  );
}
