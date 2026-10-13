import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AdminLink() {
  return (
    <span className="inline-block shrink-0">
      <Link
        href="/admin"
        className="inline-flex min-h-11 -rotate-2 items-center gap-1.5 rounded-full border-2 border-ink bg-sun px-3 text-xs font-bold uppercase tracking-wider no-underline shadow-sticker hover:-translate-y-0.5 hover:rotate-0"
      >
        <Sparkles size={14} aria-hidden className="hidden sm:block" />
        Admin
      </Link>
    </span>
  );
}
