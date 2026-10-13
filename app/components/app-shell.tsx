import type { ReactNode } from "react";
import { TopNav } from "./sticker";

export function AppHeader({ signedIn, next, subNav }: {
  signedIn: boolean;
  next: string;
  subNav?: ReactNode;
}) {
  return (
    <header className="mx-auto w-full min-w-0 max-w-6xl px-5 pt-10 pb-10 sm:px-8 sm:pt-16 [&+main>*:first-child]:mt-0">
      <TopNav signedIn={signedIn} next={next} />
      {subNav && <div className="mt-8 [&>nav]:m-0">{subNav}</div>}
    </header>
  );
}
