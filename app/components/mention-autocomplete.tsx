"use client";

import { ProfileImage } from "@/app/components/profile-image";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type DOMAttributes, type FocusEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject, type SyntheticEvent, type TextareaHTMLAttributes } from "react";
import type { MentionSuggestion } from "@/lib/mentions";

type MentionValueProps = {
  value: string;
  onValueChange: (value: string) => void;
  startup: string;
};

type MentionTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "ref"> & MentionValueProps & {
  singleLine?: false;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

type MentionInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "ref" | "type"> & MentionValueProps & {
  singleLine: true;
  inputRef?: RefObject<HTMLInputElement | null>;
};

type MentionAutocompleteProps = MentionTextareaProps | MentionInputProps;

function isSuggestion(value: unknown): value is MentionSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const handle: unknown = Reflect.get(value, "handle");
  const name: unknown = Reflect.get(value, "name");
  const avatarUrl: unknown = Reflect.get(value, "avatarUrl");
  const reason: unknown = Reflect.get(value, "reason");
  return typeof handle === "string" && /^[a-z0-9_]{3,24}$/.test(handle)
    && (name === null || typeof name === "string") && (avatarUrl === null || typeof avatarUrl === "string")
    && (reason === null || reason === "On the team" || reason === "Fan" || reason === "In your circle");
}

function mentionQuery(value: string, caret: number) {
  return /(?:^|[^\w])@([a-z0-9_]{1,24})$/i.exec(value.slice(0, caret));
}

export function MentionAutocomplete({ value, onValueChange, startup, ...props }: MentionAutocompleteProps) {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = props.singleLine ? props.inputRef ?? ownInputRef : props.textareaRef ?? ownRef;
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [popoverTop, setPopoverTop] = useState<number | null>(null);
  const [result, setResult] = useState<MentionSuggestion[] | null>(null);
  const match = mentionQuery(value, caret);
  const query = match?.[1] ?? "";
  const start = caret - query.length - 1;
  const key = focused && query && !props.disabled ? `${startup}:${start}:${query}:${caret}` : "";
  const suggestions = key && dismissed !== key ? result ?? [] : [];
  const open = suggestions.length > 0;

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    function measure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const input = inputRef.current;
        const container = containerRef.current;
        if (!input || !container) return;
        const inputTop = input.getBoundingClientRect().top - container.getBoundingClientRect().top;
        if (props.singleLine || window.innerWidth < 640) { setPopoverTop(inputTop + input.offsetHeight); return; }
        const style = getComputedStyle(input);
        const mirror = document.createElement("div");
        for (const property of ["box-sizing", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "padding", "border-width"]) {
          mirror.style.setProperty(property, style.getPropertyValue(property));
        }
        Object.assign(mirror.style, { position: "fixed", visibility: "hidden", width: `${input.clientWidth}px`,
          whiteSpace: "pre-wrap", overflowWrap: "break-word", top: "0", left: "0" });
        mirror.textContent = value.slice(0, caret);
        const marker = document.createElement("span");
        marker.textContent = ".";
        mirror.append(marker);
        document.body.append(mirror);
        const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5;
        setPopoverTop(inputTop + Math.max(lineHeight, Math.min(input.clientHeight, marker.offsetTop + lineHeight - input.scrollTop)));
        mirror.remove();
      });
    }
    measure();
    const input = inputRef.current;
    input?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); input?.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [open, inputRef, value, caret, props.singleLine]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  useEffect(() => {
    if (!key || dismissed === key) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mentions?${new URLSearchParams({ q: query, startup })}`,
          { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!controller.signal.aborted && Array.isArray(data) && data.every(isSuggestion)) {
          setResult(data.slice(0, 8));
        }
      } catch {
        // Writing stays available when suggestions cannot be loaded.
      }
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, query, startup, dismissed, value]);

  function updateCaret(input: HTMLTextAreaElement | HTMLInputElement) {
    const position = input.selectionStart ?? 0;
    setCaret(position);
    if (!mentionQuery(input.value, position)) setResult(null);
  }

  function select(suggestion: MentionSuggestion) {
    const insertion = `@${suggestion.handle} `;
    const next = value.slice(0, start) + insertion + value.slice(caret);
    if (props.maxLength !== undefined && next.length > props.maxLength) return;
    onValueChange(next);
    setDismissed(key);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  }

  function handlers<Element extends HTMLInputElement | HTMLTextAreaElement>(events: Pick<DOMAttributes<Element>, "onKeyDown" | "onSelect" | "onFocus" | "onBlur">) {
    return {
      onChange: (event: ChangeEvent<Element>) => {
        onValueChange(event.target.value);
        updateCaret(event.target);
        setActive(0);
        setDismissed(null);
      },
      onSelect: (event: SyntheticEvent<Element>) => { updateCaret(event.currentTarget); events.onSelect?.(event); },
      onFocus: (event: FocusEvent<Element>) => { setFocused(true); updateCaret(event.currentTarget); events.onFocus?.(event); },
      onBlur: (event: FocusEvent<Element>) => { setFocused(false); events.onBlur?.(event); },
      onKeyDown: (event: KeyboardEvent<Element>) => {
        if (!event.nativeEvent.isComposing && !event.metaKey && !event.ctrlKey) {
          if (event.key === "Escape" && open) { event.preventDefault(); setDismissed(key); return; }
          if (open) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              const suggestion = suggestions[Math.min(active, suggestions.length - 1)];
              if (suggestion) { event.preventDefault(); select(suggestion); return; }
            }
          }
        }
        events.onKeyDown?.(event);
      },
    };
  }

  const autocompleteAttributes = {
    "aria-autocomplete": "list",
    "aria-haspopup": "listbox",
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open ? `${listId}-${Math.min(active, suggestions.length - 1)}` : undefined,
  } as const;
  let field: ReactNode;
  if (props.singleLine) {
    const { singleLine, inputRef: externalRef, ...nativeProps } = props;
    field = <input {...nativeProps} {...autocompleteAttributes} {...handlers(nativeProps)} type="text"
      ref={externalRef ?? ownInputRef} value={value} aria-multiline={!singleLine} />;
  } else {
    const { singleLine, textareaRef: externalRef, ...nativeProps } = props;
    field = <textarea {...nativeProps} {...autocompleteAttributes} {...handlers(nativeProps)}
      ref={externalRef ?? ownRef} value={value} aria-multiline={!singleLine} />;
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full flex-1">
      {field}
      {open && <ul id={listId} role="listbox" aria-label="People to mention"
        style={popoverTop === null ? undefined : { top: popoverTop }}
        className="absolute top-full left-0 z-30 mt-2 max-h-72 w-full min-w-0 overflow-y-auto rounded-2xl border-[3px] border-ink bg-white p-1 shadow-sticker-lg">
        {suggestions.map((suggestion, index) => {
          const name = suggestion.name?.trim() || suggestion.handle;
          return <li key={suggestion.handle} id={`${listId}-${index}`} role="option" aria-selected={active === index}
            onMouseDown={(event) => event.preventDefault()} onClick={() => select(suggestion)}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${active === index ? "bg-sun" : "hover:bg-cream"}`}>
            {suggestion.avatarUrl ? <ProfileImage src={suggestion.avatarUrl} alt="" width={32} height={32} sizes="32px" referrerPolicy="no-referrer"
              className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" />
              : <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sky font-bold">{name.charAt(0).toUpperCase()}</span>}
            <span className="min-w-0 flex-1 break-words text-sm"><span className="font-bold">{name}</span><span className="block text-ink/60">@{suggestion.handle}</span></span>
            {suggestion.reason && <span className="max-w-20 text-xs text-ink/60">{suggestion.reason}</span>}
          </li>;
        })}
      </ul>}
    </div>
  );
}
