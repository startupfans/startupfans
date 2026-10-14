"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { decideOauthConnection } from "@/lib/mcp/oauth";
import { publicOrigin } from "@/lib/mcp/policy";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function decideOauthConnectionAction(formData: FormData) {
  const next = `/oauth/authorize?${new URLSearchParams({
    client_id: field(formData, "client_id"),
    redirect_uri: field(formData, "redirect_uri"),
    state: field(formData, "state"),
    code_challenge: field(formData, "code_challenge"),
    code_challenge_method: field(formData, "code_challenge_method"),
    response_type: field(formData, "response_type"),
    scope: field(formData, "scope"),
    resource: field(formData, "resource"),
  })}`;
  const user = await requireUser(next);
  const requestHeaders = await headers();
  const origin = publicOrigin(new Request("https://startupfans.co/oauth/authorize", {
    headers: {
      "x-forwarded-host": requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "",
      "x-forwarded-proto": requestHeaders.get("x-forwarded-proto") ?? "",
    },
  }));
  const result = await decideOauthConnection(user.id, origin, {
    clientId: field(formData, "client_id"),
    redirectUri: field(formData, "redirect_uri"),
    state: field(formData, "state"),
    codeChallenge: field(formData, "code_challenge"),
    codeChallengeMethod: field(formData, "code_challenge_method"),
    responseType: field(formData, "response_type"),
    scope: field(formData, "scope"),
    resource: field(formData, "resource"),
    decision: field(formData, "decision"),
  });
  if (result.type === "reject") {
    const code = result.message.startsWith("Too many") ? "rate-limit" : "invalid";
    redirect(`/oauth/authorize?${new URLSearchParams({
      client_id: field(formData, "client_id"),
      redirect_uri: field(formData, "redirect_uri"),
      state: field(formData, "state"),
      code_challenge: field(formData, "code_challenge"),
      code_challenge_method: field(formData, "code_challenge_method"),
      response_type: field(formData, "response_type"),
      scope: field(formData, "scope"),
      resource: field(formData, "resource"),
      error: code,
    })}`);
  }
  redirect(result.url);
}
