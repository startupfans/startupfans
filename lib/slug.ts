const RESERVED_SLUGS = new Set([
  "start", "login", "me", "feed", "join", "auth", "s", "api",
  "settings", "admin", "startupfans",
]);

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : slug ? `${slug}-hq` : "startup-hq";
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)
    && !RESERVED_SLUGS.has(slug);
}
