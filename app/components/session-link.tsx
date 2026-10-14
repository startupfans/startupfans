"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface LinkVariant {
  href: string;
  label: ReactNode;
  className?: string;
}

interface SessionLinkProps {
  signedOut: LinkVariant;
  signedIn: LinkVariant;
  signedOutContent?: ReactNode;
}

const signedOutSession = { signedIn: false };

export const LandingSessionContext = createContext<Awaited<ReturnType<typeof fetchSession>> | null>(null);

export async function fetchSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return signedOutSession;

    const session: unknown = await response.json();
    if (typeof session !== "object" || session === null || !("signedIn" in session)) {
      return signedOutSession;
    }
    const signedIn = session.signedIn === true;
    return { signedIn };
  } catch {
    return signedOutSession;
  }
}

export function SessionLink({ signedOut, signedIn, signedOutContent }: SessionLinkProps) {
  const landingSession = useContext(LandingSessionContext);
  const [session, setSession] = useState(signedOutSession);
  const sessionRequest = useRef<ReturnType<typeof fetchSession> | null>(null);

  useEffect(() => {
    if (landingSession !== null) return;
    let active = true;
    sessionRequest.current ??= fetchSession();
    sessionRequest.current.then((result) => {
      if (active) setSession(result);
    });
    return () => {
      active = false;
    };
  }, [landingSession]);

  const currentSession = landingSession ?? session;
  const isSignedIn = currentSession.signedIn;
  const variant = isSignedIn ? signedIn : signedOut;

  if (signedOutContent) {
    return (
      <div className="grid">
        <div aria-hidden={isSignedIn} inert={isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "invisible" : ""}`}>
          {signedOutContent}
        </div>
        <div aria-hidden={!isSignedIn} inert={!isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "" : "invisible"}`}>
          <Link href={signedIn.href} className={`inline-flex max-w-full items-center justify-center ${signedIn.className ?? ""}`}>
            {signedIn.label}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href={variant.href} className={`inline-grid max-w-full items-center ${variant.className ?? ""}`}>
        <span aria-hidden={isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "invisible" : ""}`}>
          {signedOut.label}
        </span>
        <span aria-hidden={!isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "" : "invisible"}`}>
          {signedIn.label}
        </span>
      </Link>
    </>
  );
}
