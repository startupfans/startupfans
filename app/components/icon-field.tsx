import type { ComponentProps, ReactNode } from "react";

export function IconField({ icon, ...props }: Omit<ComponentProps<"input">, "className"> & { icon: ReactNode }) {
  return (
    <span className="relative mt-2 block">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink/70">{icon}</span>
      <input {...props} className="min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white py-3 pr-4 pl-11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink" />
    </span>
  );
}
