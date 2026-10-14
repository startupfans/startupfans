"use client";

import {
  startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode,
} from "react";
import { IconField } from "@/app/components/icon-field";
import {
  GitHubIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon, YouTubeIcon,
} from "@/app/components/icons";
import { socialNetworks, type SocialNetwork } from "@/lib/socials";
import {
  updateProfileAction,
  type UpdateProfileField,
  type UpdateProfileState,
  type UpdateProfileValues,
} from "./actions";
import { AvatarUpload } from "./avatar-upload";

const SAVE_DEBOUNCE_MS = 700;

const initialUpdateProfileState: UpdateProfileState = { status: "idle" };

const socialIcons = {
  x: XIcon, linkedin: LinkedInIcon, github: GitHubIcon,
  instagram: InstagramIcon, youtube: YouTubeIcon, tiktok: TikTokIcon,
} satisfies Record<SocialNetwork, () => ReactNode>;

const fieldOrder = [
  "name", "avatarUrl",
  ...socialNetworks.map(({ field }) => field),
] as const satisfies readonly UpdateProfileField[];

const fieldSet = new Set<string>(fieldOrder);

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink aria-invalid:border-pink aria-invalid:bg-sun/40";
const errorClass = "mt-2 rounded-lg border-2 border-ink bg-sun px-3 py-2 text-sm font-semibold";

function fieldError(state: UpdateProfileState, field: UpdateProfileField) {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

function FieldHint({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className={errorClass}>{message}</p>;
}

function SaveMark({
  field, savingField, savedField,
}: {
  field: UpdateProfileField;
  savingField: UpdateProfileField | null;
  savedField: UpdateProfileField | null;
}) {
  if (savingField === field) {
    return (
      <span role="status" aria-live="polite" className="ml-2 text-sm font-semibold text-ink/70">
        Saving…
      </span>
    );
  }
  if (savedField === field) {
    return (
      <span role="status" aria-live="polite"
        className="ml-2 inline-block rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-sm font-semibold">
        Saved
      </span>
    );
  }
  return null;
}

function focusField(field: UpdateProfileField) {
  const target = document.getElementById(field)
    ?? document.getElementById(`${field}-error`);
  if (!target) return;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  if (target instanceof HTMLElement && "focus" in target) {
    try { target.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
}

function fieldFromTarget(target: EventTarget | null): UpdateProfileField | null {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement)) return null;
  return fieldSet.has(target.name) ? target.name as UpdateProfileField : null;
}

export function ProfileForm({
  userId, values, avatarInitial, uploadsEnabled,
}: {
  userId: string;
  values: UpdateProfileValues;
  avatarInitial: string;
  uploadsEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initialUpdateProfileState);
  // Freeze the first paint defaults; React 19 form actions reset to defaultValue.
  const [defaults] = useState(values);
  const [savingField, setSavingField] = useState<UpdateProfileField | null>(null);
  const [savedField, setSavedField] = useState<UpdateProfileField | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const actionRef = useRef(action);
  const pendingRef = useRef(pending);
  const activeFieldRef = useRef<UpdateProfileField | null>(null);
  const savingFieldRef = useRef<UpdateProfileField | null>(null);

  useEffect(() => {
    actionRef.current = action;
    pendingRef.current = pending;
  }, [action, pending]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (state.status !== "error") return;
    const first = fieldOrder.find((field) => state.fieldErrors[field]);
    if (first) focusField(first);
  }, [state]);

  useEffect(() => {
    if (pending) return;
    if (state.status === "saved" && savingFieldRef.current) {
      setSavedField(savingFieldRef.current);
    }
    if (state.status === "error") setSavedField(null);
    savingFieldRef.current = null;
    setSavingField(null);
  }, [pending, state]);

  const noteField = useCallback((field: UpdateProfileField) => {
    activeFieldRef.current = field;
    setSavedField(null);
  }, []);

  const saveNow = useCallback((immediate = false) => {
    const run = () => {
      const form = formRef.current;
      if (!form || pendingRef.current) {
        dirtyRef.current = true;
        return;
      }
      dirtyRef.current = false;
      savingFieldRef.current = activeFieldRef.current;
      setSavingField(activeFieldRef.current);
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

  const saveAvatar = useCallback(() => {
    noteField("avatarUrl");
    saveNow(true);
  }, [noteField, saveNow]);

  useEffect(() => {
    if (pending || !dirtyRef.current) return;
    dirtyRef.current = false;
    const form = formRef.current;
    if (!form) return;
    savingFieldRef.current = activeFieldRef.current;
    setSavingField(activeFieldRef.current);
    startTransition(() => actionRef.current(new FormData(form)));
  }, [pending]);

  const mark = (field: UpdateProfileField) => (
    <SaveMark field={field} savingField={savingField} savedField={savedField} />
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-8 space-y-5"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const field = fieldFromTarget(event.nativeEvent instanceof SubmitEvent
          ? event.nativeEvent.submitter
          : null) ?? activeFieldRef.current;
        if (field) noteField(field);
        saveNow(true);
      }}
      onInput={(event) => {
        const field = fieldFromTarget(event.target);
        if (field) noteField(field);
        saveNow();
      }}
      onChange={(event) => {
        const field = fieldFromTarget(event.target);
        if (field) noteField(field);
      }}
      onBlur={(event) => {
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
          || event.target instanceof HTMLSelectElement)) return;
        const field = fieldFromTarget(event.target);
        if (field) noteField(field);
        if (debounceRef.current) saveNow(true);
      }}
    >
      <label htmlFor="name" className="block font-bold">Your name <span className="font-normal">(optional)</span>{mark("name")}
        <input id="name" name="name" defaultValue={defaults.name} maxLength={60} autoComplete="name"
          aria-invalid={fieldError(state, "name") ? true : undefined}
          aria-describedby={fieldError(state, "name") ? "name-error" : undefined} className={inputClass} />
        <FieldHint id="name-error" message={fieldError(state, "name")} />
      </label>
      <div id="avatarUrl">
        <AvatarUpload userId={userId} initialUrl={defaults.avatarUrl} initial={avatarInitial}
          uploadsEnabled={uploadsEnabled} onUrlChange={saveAvatar} status={mark("avatarUrl")} />
        <FieldHint id="avatarUrl-error" message={fieldError(state, "avatarUrl")} />
      </div>
      <fieldset className="min-w-0 space-y-5">
        <legend className="mb-3 font-display text-xl font-extrabold">Social profiles</legend>
        {socialNetworks.map(({ network, field, label, personalPlaceholder }) => {
          const SocialIcon = socialIcons[network];
          const error = fieldError(state, field);
          const errorId = `${field}-error`;
          return (
            <label key={field} htmlFor={field} className="block font-bold">{label}{mark(field)}
              <IconField icon={<SocialIcon />} id={field} name={field} defaultValue={defaults[field]}
                maxLength={500} placeholder={personalPlaceholder} autoCapitalize="none" autoCorrect="off"
                spellCheck={false} aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined} />
              <FieldHint id={errorId} message={error} />
            </label>
          );
        })}
      </fieldset>
    </form>
  );
}
