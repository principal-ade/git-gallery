import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Simple fallback image generator for social media previews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const repoPath = `${owner}/${repo}`;

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
              opacity: 0.1,
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
              padding: "60px",
              maxWidth: "900px",
            }}
          >
            {/* GitMosaic logo/title */}
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                marginBottom: "20px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              🎨 GitMosaic
            </div>

            {/* Repository name */}
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                marginBottom: "16px",
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#1e293b">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              {repoPath}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: "24px",
                color: "#64748b",
                marginBottom: "40px",
              }}
            >
              Repository Architecture Visualization
            </div>

            {/* Decorative elements representing code files */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "40px",
              }}
            >
              {/* Simulated file type indicators */}
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#f1e05a",
                  borderRadius: "12px",
                  opacity: 0.8,
                }}
              />
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#3178c6",
                  borderRadius: "12px",
                  opacity: 0.8,
                }}
              />
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#3572A5",
                  borderRadius: "12px",
                  opacity: 0.8,
                }}
              />
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#00ADD8",
                  borderRadius: "12px",
                  opacity: 0.8,
                }}
              />
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#dea584",
                  borderRadius: "12px",
                  opacity: 0.8,
                }}
              />
            </div>

            {/* Call to action */}
            <div
              style={{
                fontSize: "18px",
                color: "#64748b",
              }}
            >
              ✨ Transform your repository into beautiful architecture art
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
    console.error("Failed to generate OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
