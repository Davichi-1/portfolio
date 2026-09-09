import { ImageResponse } from "next/og";
import { disciplines } from "@/lib/disciplines";
import { profile } from "@/lib/profile";

export const alt = `${profile.fullName} — ${profile.roleLong}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share card. Carries the same colour-bar signature as the footer so a link
 * preview is recognisably from this site.
 */
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b1114",
          color: "#e7e2d7",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#e8b33c",
            }}
          />
          <div
            style={{
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#a8b0ae",
            }}
          >
            {profile.locationLong}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3,
              textTransform: "uppercase",
            }}
          >
            {profile.fullName}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 28,
              marginTop: 36,
            }}
          >
            {disciplines.map((d) => (
              <div
                key={d.id}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: d.hex,
                  }}
                />
                <div style={{ fontSize: 22, color: "#a8b0ae" }}>{d.name}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 44,
              height: 8,
              width: "100%",
            }}
          >
            {disciplines.map((d) => (
              <div key={d.id} style={{ flex: 1, background: d.hex }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
