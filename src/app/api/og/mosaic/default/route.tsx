import { ImageResponse } from "next/og";

export const runtime = "edge";

// Default image generator for GitMosaic social media previews
export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #faf9f7 0%, #f5f4f1 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.08,
              backgroundImage:
                "radial-gradient(circle, #3b82f6 2px, transparent 2px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "80px",
              maxWidth: "800px",
            }}
          >
            {/* GitMosaic logo/title */}
            <div
              style={{
                fontSize: "64px",
                fontWeight: "bold",
                marginBottom: "24px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              🎨 GitMosaic
            </div>

            {/* Main tagline */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: 600,
                marginBottom: "20px",
                color: "#1e293b",
                lineHeight: "1.2",
              }}
            >
              Transform Your Repository Into Art
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: "24px",
                color: "#64748b",
                marginBottom: "60px",
                lineHeight: "1.4",
              }}
            >
              Beautiful, shareable code architecture visualizations for any
              GitHub repository
            </div>

            {/* Decorative mosaic pattern */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginBottom: "40px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {/* Simulated colorful code blocks */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#f1e05a",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#3178c6",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#3572A5",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#00ADD8",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#dea584",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#10b981",
                  borderRadius: "16px",
                  opacity: 0.9,
                }}
              />
            </div>

            {/* Call to action */}
            <div
              style={{
                fontSize: "20px",
                color: "#3b82f6",
                fontWeight: 600,
              }}
            >
              🚀 Create Your Mosaic Today
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("Failed to generate default OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
