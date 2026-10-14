import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import {
  formatScopes,
  isMcpResource,
  parseScopes,
  pkceMatches,
  protectedResourceMetadata,
  publicOrigin,
  redirectUriError,
} from "./policy";

const previousAppUrl = process.env.APP_URL;

afterEach(() => {
  if (previousAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previousAppUrl;
});

function request(host: string, proto = "https") {
  return new Request("https://startupfans.co/api/mcp", {
    headers: { "x-forwarded-host": host, "x-forwarded-proto": proto },
  });
}

describe("mcp oauth policy", () => {
  it("keeps the public origin on known hosts and drops the rest", () => {
    process.env.APP_URL = "https://www.startupfans.co";
    assert.equal(publicOrigin(request("www.startupfans.co")), "https://www.startupfans.co");
    assert.equal(publicOrigin(request("startupfans.co")), "https://startupfans.co");
    assert.equal(publicOrigin(request("localhost:3000", "http")), "http://localhost:3000");
    assert.equal(publicOrigin(request("evil.example")), "https://www.startupfans.co");
  });

  it("accepts a public https redirect and rejects local, private and our own hosts", () => {
    process.env.APP_URL = "https://www.startupfans.co";
    assert.equal(redirectUriError("https://cursor.com/api/mcp/callback"), null);
    assert.equal(redirectUriError("https://www.cursor.com/agents/mcp/oauth/callback"), null);
    assert.equal(redirectUriError("http://localhost:8787/callback"), null);
    assert.equal(redirectUriError("http://127.0.0.1:8787/callback"), null);
    assert.equal(redirectUriError("cursor://anysphere.cursor-mcp/oauth/callback"), null);
    assert.ok(redirectUriError("cursor://evil.example/oauth/callback"));
    assert.ok(redirectUriError("https://127.0.0.1/callback"));
    assert.ok(redirectUriError("https://10.1.2.3/callback"));
    assert.ok(redirectUriError("http://10.1.2.3/callback"));
    assert.ok(redirectUriError("https://www.startupfans.co/callback"));
    assert.ok(redirectUriError("https://user:pass@cursor.com/callback"));
    assert.ok(redirectUriError("https://cursor.com/callback#code"));
    assert.ok(redirectUriError("javascript:alert(1)"));
  });

  it("checks S256 PKCE and scope lists", () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    assert.equal(pkceMatches(verifier, challenge), true);
    assert.equal(pkceMatches(`${verifier}x`, challenge), false);
    assert.equal(pkceMatches("short", challenge), false);
    assert.deepEqual(parseScopes(""), ["read", "write"]);
    assert.deepEqual(parseScopes("write read read"), ["read", "write"]);
    assert.deepEqual(parseScopes("read"), ["read"]);
    assert.equal(parseScopes("admin"), null);
    assert.equal(formatScopes(["write", "read"]), "read write");
  });

  it("publishes the mcp resource and protected metadata", () => {
    const origin = "https://www.startupfans.co";
    assert.equal(isMcpResource(`${origin}/api/mcp`, origin), true);
    assert.equal(isMcpResource(`${origin}/api/mcp?x=1`, origin), false);
    assert.equal(protectedResourceMetadata(origin).resource, `${origin}/api/mcp`);
    assert.deepEqual(protectedResourceMetadata(origin).authorization_servers, [origin]);
  });
});
