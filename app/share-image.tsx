import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

const ink = "#16120f";
const cream = "#fff4e0";
let fontPromise: Promise<ArrayBuffer | null> | undefined;

function getFont() {
  fontPromise ??= fetch(
    "https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbJMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvZvlyM0.ttf",
    { signal: AbortSignal.timeout(5000) },
  ).then((response) => {
    if (!response.ok) throw new Error("Unable to load preview font");
    return response.arrayBuffer();
  }).catch(() => null);
  return fontPromise;
}

type StartupPreview = { name: string; tagline: string | null; fanCount: number };

export async function createShareImage(startup?: StartupPreview) {
  const font = await getFont();
  const title = startup?.name ?? "Be a fan before they're famous.";

  return new ImageResponse(
    (
      <div style={{
        display: "flex", flexDirection: "column", width: "100%", height: "100%",
        padding: "48px 64px", color: ink, backgroundColor: cream,
        fontFamily: font ? "Bricolage Grotesque" : "sans-serif",
        fontWeight: 800,
      }}>
        <svg width="1200" height="630" style={{ position: "absolute", top: 0, left: 0 }}>
          <defs>
            <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill={ink} opacity="0.12" />
            </pattern>
          </defs>
          <rect width="1200" height="630" fill="url(#dots)" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 42, letterSpacing: -2 }}>
          <svg width="58" height="58" viewBox="0 0 64 64">
            <path d="M32 6l7.6 16.6 18.1 2-13.5 12.2 3.8 17.9L32 45.6l-16 9.1 3.8-17.9L6.3 24.6l18.1-2z"
              fill="#ffd23f" stroke={ink} strokeWidth="4" strokeLinejoin="round" />
          </svg>
          startupfans
        </div>
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          height: 344, marginTop: 30, padding: "30px 42px", backgroundColor: "white",
          border: `4px solid ${ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${ink}`,
          transform: "rotate(-1deg)",
        }}>
          <div style={{
            display: "flex", fontSize: startup ? (title.length > 24 ? 48 : 64) : 88,
            lineHeight: 1.02, letterSpacing: -3, wordBreak: "break-word",
          }}>
            {title}
          </div>
          {startup?.tagline && (
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, lineHeight: 1.2, wordBreak: "break-word" }}>
              {startup.tagline}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28 }}>
          <div style={{ display: "flex", fontSize: 24 }}>startupfans.co</div>
          <div style={{
            display: "flex", padding: "12px 24px", backgroundColor: "#ff5fa8",
            border: `3px solid ${ink}`, borderRadius: 12, boxShadow: `5px 5px 0 ${ink}`,
            transform: "rotate(4deg)", fontSize: 30,
          }}>
            {startup ? `${startup.fanCount.toLocaleString("en-GB")} fans` : "be an early fan"}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(font ? { fonts: [{ name: "Bricolage Grotesque", data: font, weight: 800, style: "normal" }] } : {}),
    },
  );
}
