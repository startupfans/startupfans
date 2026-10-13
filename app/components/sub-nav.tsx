import Link from "next/link";

export type SubNavItem = { href: string; label: string; current?: boolean };

export function SubNav({ items, "aria-label": ariaLabel }: {
  items: readonly SubNavItem[];
  "aria-label": string;
}) {
  return (
    <nav aria-label={ariaLabel} className="mt-8 mb-10 flex flex-wrap gap-4 [&+*]:mt-0">
      {items.map(({ href, label, current }, index) => (
        <Link key={href} href={href} aria-current={current ? "page" : undefined}
          className={`inline-flex min-h-11 max-w-full items-center justify-center rounded-xl border-2 border-ink px-4 py-2 font-bold shadow-sticker transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${current ? "-rotate-2 bg-sun" : `bg-white ${index % 2 === 0 ? "-rotate-1" : "rotate-1"}`}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
