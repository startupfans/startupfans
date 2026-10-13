import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS, SITE_NAME, SITE_TAGLINE } from "./site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const { cream, ink, pink, sun, lime, sky } = BRAND_COLORS;

const [displayFont, sansFont, monoFont, logoData] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/bricolage-grotesque-latin-800-normal.woff")),
  readFile(join(process.cwd(), "assets/fonts/geist-sans-latin-500-normal.woff")),
  readFile(join(process.cwd(), "assets/fonts/geist-mono-latin-700-normal.woff")),
  readFile(join(process.cwd(), "public/logo/startupfans-logo-on-light.png"), "base64"),
]);
const logoSrc = `data:image/png;base64,${logoData}`;

const LOGO_HEIGHT = 60;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 1820) / 300);
const BARCODE_BARS = [3, 5, 2, 4, 2, 6, 2, 3, 5, 2, 4, 2, 6, 3, 2, 4, 5, 2, 3, 4];
const PERKS = ["Get selected & promoted", "Show what you're shipping", "Free for startups & fans"];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: cream,
        color: ink,
        fontFamily: "Geist",
        padding: "60px 72px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
        <img src={logoSrc} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />

        <div
          style={{
            marginTop: 54,
            fontFamily: "Bricolage Grotesque",
            fontSize: 88,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div
          style={{
            marginTop: 30,
            width: 150,
            height: 16,
            borderRadius: 999,
            border: `3px solid ${ink}`,
            backgroundColor: pink,
            transform: "rotate(-2deg)",
          }}
        />

        <div style={{ marginTop: 30, fontSize: 29, lineHeight: 1.3, color: "rgba(22, 18, 15, 0.8)" }}>
          A curated community of early startups. Apply to get selected and promoted to fans.
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
        <SpotCard />
        <Sticker style={{ top: -22, left: 0, backgroundColor: lime, transform: "rotate(-9deg)" }}>
          free to join
        </Sticker>
        <Sticker style={{ bottom: -18, right: -22, backgroundColor: sky, transform: "rotate(7deg)" }}>
          apply now
        </Sticker>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: displayFont, weight: 800, style: "normal" },
        { name: "Geist", data: sansFont, weight: 500, style: "normal" },
        { name: "Geist Mono", data: monoFont, weight: 700, style: "normal" },
      ],
    },
  );
}

function SpotCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 384,
        padding: 26,
        borderRadius: 30,
        border: `4px solid ${ink}`,
        backgroundColor: sun,
        boxShadow: `12px 12px 0 0 ${ink}`,
        transform: "rotate(4deg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MonoLabel>Selected startup</MonoLabel>
        <Star size={40} />
      </div>

      <div style={{ display: "flex", marginTop: 20 }}>
        <MonoLabel color="rgba(22, 18, 15, 0.6)">Spot no.</MonoLabel>
      </div>
      <div style={{ fontFamily: "Bricolage Grotesque", fontSize: 84, lineHeight: 1 }}>#0001</div>
      <div style={{ marginTop: 6, fontFamily: "Bricolage Grotesque", fontSize: 24 }}>Could be you.</div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: 18,
          border: `3px solid ${ink}`,
          backgroundColor: "#ffffff",
          fontSize: 18,
        }}
      >
        {PERKS.map((perk, index) => (
          <div key={perk} style={{ display: "flex", alignItems: "center", marginTop: index === 0 ? 0 : 8 }}>
            <Star size={18} />
            <span style={{ marginLeft: 10 }}>{perk}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 20 }}>
        <div style={{ display: "flex", height: 40, alignItems: "flex-end" }}>
          {BARCODE_BARS.map((width, index) => (
            <div key={index} style={{ width, height: "100%", marginRight: 3, backgroundColor: ink }} />
          ))}
        </div>
        <MonoLabel size={12}>Apply today</MonoLabel>
      </div>
    </div>
  );
}

function Sticker({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        padding: "10px 18px",
        borderRadius: 14,
        border: `4px solid ${ink}`,
        boxShadow: `6px 6px 0 0 ${ink}`,
        fontFamily: "Bricolage Grotesque",
        fontSize: 20,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MonoLabel({ children, color = ink, size = 14 }: { children: string; color?: string; size?: number }) {
  return (
    <span
      style={{
        fontFamily: "Geist Mono",
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </span>
  );
}

function Star({ size: starSize }: { size: number }) {
  return (
    <svg width={starSize} height={starSize} viewBox="0 0 64 64">
      <path
        d="M32 6l7.6 16.6 18.1 2-13.5 12.2 3.8 17.9L32 45.6l-16 9.1 3.8-17.9L6.3 24.6l18.1-2z"
        fill={pink}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
