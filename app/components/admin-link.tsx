import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AdminLink({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-block shrink-0">
      <Link
        href="/admin"
        aria-label={compact ? "Admin" : undefined}
        className={`inline-flex min-h-11 -rotate-2 items-center rounded-full border-2 border-ink bg-sun font-bold uppercase no-underline shadow-sticker hover:-translate-y-0.5 hover:rotate-0 ${compact ? "min-w-11 justify-center gap-1 px-2 text-sm lg:text-base" : "gap-1.5 px-3 text-xs tracking-wider"}`}
      >
        <Sparkles size={14} aria-hidden className={compact ? "block" : "hidden sm:block"} />
        <span className={compact ? "hidden lg:inline" : undefined}>Admin</span>
      </Link>
    </span>
  );
}
