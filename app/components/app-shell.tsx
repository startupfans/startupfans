import type { ReactNode } from "react";
import { TopNav } from "./sticker";

const appBandClass = "mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-8";

export function AppShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${appBandClass} [&>main>*:first-child]:mt-0`}>
      <main className={`min-w-0 break-words pb-10 sm:pb-16 ${className}`}>{children}</main>
    </div>
  );
}

export function AppHeader({ signedIn, next, subNav }: {
  signedIn: boolean;
  next: string;
  subNav?: ReactNode;
}) {
  return (
    <header className={`${appBandClass} pt-10 pb-10 sm:pt-16 [&+main>*:first-child]:mt-0`}>
      <TopNav signedIn={signedIn} next={next} />
      {subNav && <div className="mt-8 [&>nav]:m-0">{subNav}</div>}
    </header>
  );
}
