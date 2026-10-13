"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminLink } from "./admin-link";

interface LinkVariant {
  href: string;
  label: ReactNode;
  className?: string;
}

interface SessionLinkProps {
  signedOut: LinkVariant;
  signedIn: LinkVariant;
  showAdmin?: boolean;
}

const signedOutSession = { signedIn: false, admin: false };

async function fetchSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return signedOutSession;

    const session: unknown = await response.json();
    if (typeof session !== "object" || session === null || !("signedIn" in session) || !("admin" in session)) {
      return signedOutSession;
    }
    const signedIn = session.signedIn === true;
    return { signedIn, admin: signedIn && session.admin === true };
  } catch {
    return signedOutSession;
  }
}

export function SessionLink({ signedOut, signedIn, showAdmin = false }: SessionLinkProps) {
  const [session, setSession] = useState(signedOutSession);
  const sessionRequest = useRef<ReturnType<typeof fetchSession> | null>(null);

  useEffect(() => {
    let active = true;
    sessionRequest.current ??= fetchSession();
    sessionRequest.current.then((result) => {
      if (active) setSession(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const isSignedIn = session.signedIn;
  const variant = isSignedIn ? signedIn : signedOut;

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
      {showAdmin && session.admin && <AdminLink />}
    </>
  );
}
