import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function getSlackTokenKey() {
  const value = process.env.SLACK_TOKEN_KEY;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 && key.toString("base64") === value ? key : null;
}

export function encryptSlackToken(token: string) {
  const key = getSlackTokenKey();
  if (!key) throw new Error("Slack token encryption isn't configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSlackToken(value: string) {
  const key = getSlackTokenKey();
  if (!key) throw new Error("Slack token encryption isn't configured.");
  const [version, iv, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra !== undefined) throw new Error("Invalid encrypted Slack token.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
