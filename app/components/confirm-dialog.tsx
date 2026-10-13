"use client";

import { useEffect, useId, useRef, useState, useTransition, type ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "./submit-button";

type DialogCopy = {
  title?: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  pendingLabel: string;
  pending?: boolean;
};

type ConfirmDialogProps = DialogCopy & {
  open: boolean;
  onClose: () => void;
} & (
  | { formId: string; onConfirm?: never }
  | { formId?: never; onConfirm: () => void | Promise<void> }
);

const buttonClass = "min-h-11 max-w-full rounded-xl border-2 border-ink px-4 py-2 font-bold shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

export function ConfirmDialog({ open, onClose, title = "Are you sure?", description,
  confirmLabel, cancelLabel = "Cancel", danger = true, pendingLabel,
  pending: actionPending = false, formId, onConfirm }: ConfirmDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasPending = useRef(false);
  const { pending: formPending } = useFormStatus();
  const [callbackPending, startTransition] = useTransition();
  const pending = formPending || actionPending || callbackPending;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
      cancel.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  useEffect(() => {
    if (wasPending.current && !pending) onClose();
    wasPending.current = pending;
  }, [pending, onClose]);

  function close() {
    if (!pending) onClose();
  }

  return (
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      aria-busy={pending}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={() => { returnFocus.current?.focus(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}
      className="fixed m-auto max-h-[85dvh] w-[90vw] max-w-md -rotate-1 overflow-y-auto rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-sticker-lg backdrop:bg-ink/60 sm:p-8">
      <h2 id={`${id}-title`} className="font-display text-3xl font-extrabold">{title}</h2>
      <p id={`${id}-description`} className="mt-4 break-words">{description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button ref={cancel} type="button" disabled={pending} onClick={close}
          className={`${buttonClass} bg-white disabled:opacity-60`}>{cancelLabel}</button>
        <SubmitButton type={formId ? "submit" : "button"} form={formId} data-confirm-submit="true"
          pending={pending} pendingLabel={pendingLabel}
          onClick={onConfirm ? () => startTransition(async () => { await onConfirm(); onClose(); }) : undefined}
          className={`${buttonClass} ${danger ? "bg-red-300" : "bg-lime"}`}>
          {confirmLabel}
        </SubmitButton>
      </div>
    </dialog>
  );
}

type ConfirmSubmitProps = DialogCopy & Omit<ComponentPropsWithoutRef<"button">,
  "type" | "onClick" | "form" | "title"> & {
  title?: string;
  dialogTitle?: string;
  icon?: boolean;
  countField?: string;
};

export function ConfirmSubmit({ description, confirmLabel, cancelLabel, danger, pendingLabel,
  pending: actionPending = false, dialogTitle, icon = false, countField, children,
  disabled, ...buttonProps }: ConfirmSubmitProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [formId, setFormId] = useState(id);
  const [dialogDescription, setDialogDescription] = useState(description);
  const { pending: formPending } = useFormStatus();
  const pending = formPending || actionPending;

  useEffect(() => {
    const form = trigger.current?.form;
    if (!form) return;
    function guardSubmit(event: SubmitEvent) {
      if (event.submitter instanceof HTMLButtonElement && event.submitter.dataset.confirmSubmit === "true" &&
        event.submitter.closest("dialog")?.open) return;
      event.preventDefault();
      trigger.current?.click();
    }
    form.addEventListener("submit", guardSubmit);
    return () => form.removeEventListener("submit", guardSubmit);
  }, []);

  function show() {
    const form = trigger.current?.form;
    if (!form || pending || !form.reportValidity()) return;
    if (!form.id) form.setAttribute("id", id);
    setFormId(form.id);
    const count = countField ? new FormData(form).get(countField) : null;
    setDialogDescription(typeof count === "string" ? description.replace("{count}", count) : description);
    setOpen(true);
  }

  return <>
    <button {...buttonProps} ref={trigger} type="button" disabled={disabled || pending}
      aria-haspopup="dialog" onClick={show}>
      {children}
      {icon && <span className="sr-only">{buttonProps["aria-label"]}</span>}
    </button>
    <ConfirmDialog open={open} onClose={() => setOpen(false)} formId={formId}
      title={dialogTitle} description={dialogDescription} confirmLabel={confirmLabel}
      cancelLabel={cancelLabel} danger={danger} pendingLabel={pendingLabel} pending={pending} />
  </>;
}
