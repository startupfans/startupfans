"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SpinnerIcon } from "./icons";

type SubmitButtonProps = ComponentPropsWithoutRef<"button"> & {
  children: ReactNode;
  pendingLabel: string;
  pending?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

const variantClasses = {
  primary: "bg-pink",
  secondary: "bg-white",
  danger: "bg-pink",
};

export function SubmitButton({ children, pendingLabel, pending: actionPending = false,
  className = "", variant, disabled, type = "submit", ...props }: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = formPending || actionPending;
  const button = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const form = button.current?.form;
    if (!form) return;
    form.setAttribute("aria-busy", String(pending));
    form.dataset.pending = String(pending);
    function preventDuplicate(event: SubmitEvent) {
      if (form?.dataset.pending === "true") event.preventDefault();
    }
    form.addEventListener("submit", preventDuplicate);
    return () => form.removeEventListener("submit", preventDuplicate);
  }, [pending]);

  return (
    <button {...props} ref={button} type={type} disabled={disabled || pending}
      aria-disabled={disabled || pending} data-pending={pending}
      aria-label={pending ? pendingLabel : props["aria-label"]}
      title={pending ? pendingLabel : props.title}
      className={`${variant ? variantClasses[variant] : ""} ${pending ? "disabled:cursor-wait disabled:opacity-60" : ""} ${className}`}>
      <span className="inline-grid max-w-full items-center justify-items-center align-middle">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">{children}</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 inline-flex items-center gap-2">
          <span className="h-5 w-5 shrink-0" />{pendingLabel}
        </span>
        <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2">
          {pending ? <><SpinnerIcon />{pendingLabel}</> : children}
        </span>
      </span>
    </button>
  );
}
