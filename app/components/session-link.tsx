"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface LinkVariant {
  href: string;
  label: ReactNode;
  className?: string;
}

interface SessionLinkProps {
  signedOut: LinkVariant;
  signedIn: LinkVariant;
}

async function fetchSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return false;

    const session: unknown = await response.json();
    return typeof session === "object" && session !== null && "signedIn" in session && session.signedIn === true;
  } catch {
    return false;
  }
}

export function SessionLink({ signedOut, signedIn }: SessionLinkProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const sessionRequest = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let active = true;
    sessionRequest.current ??= fetchSession();
    sessionRequest.current.then((signedIn) => {
      if (active) setIsSignedIn(signedIn);
    });
    return () => {
      active = false;
    };
  }, []);

  const variant = isSignedIn ? signedIn : signedOut;

  return (
    <Link href={variant.href} className={`inline-grid max-w-full items-center ${variant.className ?? ""}`}>
      <span aria-hidden={isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "invisible" : ""}`}>
        {signedOut.label}
      </span>
      <span aria-hidden={!isSignedIn} className={`col-start-1 row-start-1 ${isSignedIn ? "" : "invisible"}`}>
        {signedIn.label}
      </span>
    </Link>
  );
}
