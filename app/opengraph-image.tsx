import { ImageResponse } from "next/og";

export const alt = "StartupFans: get your startup in front of fans";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#fff4e0",
          backgroundImage:
            "radial-gradient(rgba(22,18,15,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          color: "#16120f",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              border: "4px solid #16120f",
              backgroundColor: "#16120f",
              color: "#b6d3de",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            SF
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            startupfans
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "3px solid #16120f",
              borderRadius: 999,
              backgroundColor: "#ffffff",
              padding: "10px 18px",
              fontSize: 20,
              fontWeight: 700,
              textTransform: "uppercase",
              boxShadow: "5px 5px 0 0 #16120f",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: "#ff5fa8",
              }}
            />
            Launching today
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              maxWidth: 980,
            }}
          >
            Get your startup in front of fans.
          </div>
          <div
            style={{
              width: 140,
              height: 16,
              borderRadius: 999,
              border: "3px solid #16120f",
              backgroundColor: "#ff5fa8",
              transform: "rotate(-2deg)",
            }}
          />
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 900,
              color: "rgba(22,18,15,0.8)",
              fontWeight: 600,
            }}
          >
            A curated community of early startups. Free to join. Apply to get selected.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              border: "4px solid #16120f",
              borderRadius: 20,
              backgroundColor: "#ffd23f",
              padding: "16px 28px",
              fontSize: 26,
              fontWeight: 800,
              boxShadow: "6px 6px 0 0 #16120f",
            }}
          >
            startupfans.co
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Free for startups & fans
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
