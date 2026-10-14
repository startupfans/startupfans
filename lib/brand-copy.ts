import "server-only";

const TAGLINE_MAX = 120;
const BIO_MAX = 280;
const DESCRIPTION_MAX = 2000;
const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 10_000;

export type BrandCopy = {
  tagline: string | null;
  bio: string | null;
  description: string | null;
};

export type BrandCopySource = "meta" | "ai";

type BrandCopyInput = BrandCopy & {
  host: string;
  website: string;
  title: string | null;
  pageText: string | null;
};

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function clamp(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max).trimEnd();
}

function parseCopy(payload: unknown): BrandCopy | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const tagline = clamp(record.tagline, TAGLINE_MAX);
  const bio = clamp(record.bio, BIO_MAX);
  const description = clamp(record.description, DESCRIPTION_MAX);
  if (!tagline && !bio && !description) return null;
  return { tagline, bio, description };
}

/** Rewrites scraped marketing copy into StartupFans-shaped fields. Falls back silently without a key. */
export async function rewriteBrandCopy(input: BrandCopyInput): Promise<{ copy: BrandCopy; source: BrandCopySource }> {
  const fallback = {
    tagline: input.tagline,
    bio: input.bio,
    description: input.description,
  };
  if (!hasOpenAiKey()) return { copy: fallback, source: "meta" };
  if (!input.title && !input.tagline && !input.bio && !input.description && !input.pageText) {
    return { copy: fallback, source: "meta" };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You write short startup profile copy for StartupFans.",
              "Return JSON only with keys tagline, bio, description.",
              `tagline: max ${TAGLINE_MAX} chars. One plain line about what they do.`,
              `bio: max ${BIO_MAX} chars. Short profile blurb.`,
              `description: max ${DESCRIPTION_MAX} chars. A fuller about section.`,
              "Voice: mostly lowercase, conversational, no em dashes, no exclamation marks,",
              "no emoji, no marketing fluff, no AI words like pivotal/robust/landscape/foster/enhance,",
              "no \"it's not X, it's Y\" framing. Stick to facts from the source. Invent nothing.",
              "If the source is thin, keep the fields short rather than padding.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              website: input.website,
              host: input.host,
              title: input.title,
              metaTagline: input.tagline,
              metaBio: input.bio,
              metaDescription: input.description,
              pageText: input.pageText,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[startupfans] OpenAI brand copy failed.", response.status);
      return { copy: fallback, source: "meta" };
    }

    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return { copy: fallback, source: "meta" };
    const parsed = parseCopy(JSON.parse(content) as unknown);
    if (!parsed) return { copy: fallback, source: "meta" };
    return { copy: parsed, source: "ai" };
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      console.error("[startupfans] OpenAI brand copy error.", error);
    }
    return { copy: fallback, source: "meta" };
  } finally {
    clearTimeout(timer);
  }
}
