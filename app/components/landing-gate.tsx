"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SpinnerIcon } from "./icons";
import { fetchSession, LandingSessionContext } from "./session-link";

export function LandingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState({ signedIn: false });
  const sessionRequest = useRef<ReturnType<typeof fetchSession> | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => setReady(true), 1500);
    sessionRequest.current ??= fetchSession();
    sessionRequest.current.then((result) => {
      if (!active) return;
      window.clearTimeout(timeout);
      setSession(result);
      if (result.signedIn) {
        router.replace("/feed");
      } else {
        setReady(true);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [router]);

  return (
    <LandingSessionContext value={session}>
      <div className="landing-gate" data-state={ready ? "ready" : "pending"}>
        <div className="landing-content">{children}</div>
        {!ready && (
          <div className="landing-overlay fixed inset-0 z-50 flex items-center justify-center bg-cream" role="status">
            <div className="rounded-xl border-[3px] border-ink bg-cream p-5 text-ink shadow-sticker">
              <SpinnerIcon />
              <span className="sr-only">Loading</span>
            </div>
          </div>
        )}
      </div>
      <noscript>
        <style>{`.landing-gate[data-state="pending"] > .landing-content { opacity: 1; pointer-events: auto; visibility: visible; } .landing-overlay { display: none; }`}</style>
      </noscript>
    </LandingSessionContext>
  );
}
