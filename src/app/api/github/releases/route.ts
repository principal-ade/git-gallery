import { NextResponse } from "next/server";
import { DESKTOP_APP_CONFIG, getGitHubApiUrl } from "@/config/desktop-app";

// This token should ONLY have read access to releases
// Create it with minimal permissions: public_repo (for public) or repo (for private)
// Name it something like: "code-city-landing-releases-readonly"
const RELEASES_ONLY_TOKEN = process.env.GITHUB_RELEASES_READONLY_TOKEN;

export async function GET() {
  try {
    // Ensure this token is only used for releases
    if (!RELEASES_ONLY_TOKEN) {
      const isDevelopment = process.env.NODE_ENV === "development";

      if (isDevelopment) {
        console.log("========================================");
        console.log("🔧 DEVELOPMENT MODE - Download Feature");
        console.log("========================================");
        console.log(
          "The download button requires GITHUB_RELEASES_READONLY_TOKEN to be set.",
        );
        console.log(
          `In production, this would fetch releases from: ${DESKTOP_APP_CONFIG.github.fullRepo}`,
        );
        console.log("");
        console.log("To enable downloads in development:");
        console.log("1. Create a GitHub token with read access to releases");
        console.log(
          "2. Add to .env.local: GITHUB_RELEASES_READONLY_TOKEN=your_token",
        );
        console.log("========================================");

        // Return mock data in development for testing UI
        return NextResponse.json([
          {
            id: 1,
            tag_name: "v1.0.0-dev",
            name: "Development Release (Mock)",
            body: "This is mock data shown in development mode",
            published_at: new Date().toISOString(),
            assets: [
              {
                id: 1,
                name: "Specktor-1.0.0-dev.dmg",
                browser_download_url: "#",
                size: 100000000,
              },
              {
                id: 2,
                name: "Specktor-1.0.0-dev.exe",
                browser_download_url: "#",
                size: 80000000,
              },
              {
                id: 3,
                name: "Specktor-1.0.0-dev.AppImage",
                browser_download_url: "#",
                size: 90000000,
              },
            ],
          },
        ]);
      }

      console.error("[SECURITY] Missing GITHUB_RELEASES_READONLY_TOKEN");
      return NextResponse.json(
        { error: "Releases access not configured" },
        { status: 500 },
      );
    }

    // SECURITY: This endpoint ONLY fetches releases, nothing else
    const ALLOWED_ENDPOINT = getGitHubApiUrl("releases");

    // Fetch releases from your private repository
    const response = await fetch(ALLOWED_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${RELEASES_ONLY_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        // Add rate limit info to help with debugging
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error:", response.status, errorText);

      if (response.status === 404) {
        return NextResponse.json(
          { error: "Repository not found or no releases available" },
          { status: 404 },
        );
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid GitHub token" },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch releases" },
        { status: response.status },
      );
    }

    const releases = await response.json();

    // Security: Only return necessary release data
    // Strip out any sensitive information that might be in the response
    const sanitizedReleases = releases.map((release: any) => ({
      id: release.id,
      tag_name: release.tag_name,
      name: release.name,
      body: release.body,
      published_at: release.published_at,
      assets: release.assets?.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        browser_download_url: asset.browser_download_url,
        size: asset.size,
      })),
    }));

    // Add cache headers to reduce API calls
    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return NextResponse.json(sanitizedReleases, { headers });
  } catch (error) {
    console.error("[SECURITY] Error in releases endpoint:", error);
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Unable to fetch releases" },
      { status: 500 },
    );
  }
}
