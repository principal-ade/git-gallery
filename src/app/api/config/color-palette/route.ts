import { NextRequest, NextResponse } from "next/server";
import { FileSuffixColorConfig } from "@/utils/fileColorMapping";
import localConfig from "@/config/files.json";

const GITHUB_CONFIG_URL =
  "https://raw.githubusercontent.com/a24z-ai/git-gallery-palette/main/files.json";

// In-memory cache for server-side caching
let cachedConfig: {
  config: FileSuffixColorConfig;
  source: "remote" | "local";
  timestamp: number;
  lastUpdated?: string;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes server cache

/**
 * GET /api/config/color-palette
 * Returns the color palette configuration with server-side caching
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    // Check server cache first (unless force refresh)
    if (!forceRefresh && cachedConfig && isServerCacheValid(cachedConfig)) {
      console.log("Serving cached color palette config:", cachedConfig.source);
      return NextResponse.json({
        config: cachedConfig.config,
        source: cachedConfig.source,
        lastUpdated: cachedConfig.lastUpdated,
        cached: true,
        cacheTime: new Date(cachedConfig.timestamp).toISOString(),
      });
    }

    console.log("Fetching fresh color palette config from GitHub...");

    // Try to fetch from GitHub with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch(GITHUB_CONFIG_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "git-gallery-color-palette-client/1.0",
        },
        signal: controller.signal,
        // Add cache control for CDN caching
        next: { revalidate: 900 }, // 15 minutes Next.js cache
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      const remoteConfig = (await response.json()) as FileSuffixColorConfig;

      // Validate the remote config structure
      if (!isValidConfig(remoteConfig)) {
        throw new Error("Invalid config structure from GitHub");
      }

      console.log(
        "Successfully fetched config from GitHub:",
        remoteConfig.version,
      );

      // Update server cache
      cachedConfig = {
        config: remoteConfig,
        source: "remote",
        timestamp: Date.now(),
        lastUpdated: remoteConfig.lastUpdated,
      };

      return NextResponse.json(
        {
          config: remoteConfig,
          source: "remote",
          lastUpdated: remoteConfig.lastUpdated,
          cached: false,
          fetchTime: new Date().toISOString(),
        },
        {
          // Add cache headers for client/CDN caching
          headers: {
            "Cache-Control":
              "public, s-maxage=900, stale-while-revalidate=1800", // 15min cache, 30min stale
            "X-Config-Source": "remote",
          },
        },
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.warn(
      "Failed to fetch from GitHub, falling back to local config:",
      error,
    );

    try {
      // Fall back to local packaged config
      const config = localConfig as FileSuffixColorConfig;

      if (!isValidConfig(config)) {
        throw new Error("Local config is invalid");
      }

      console.log("Using local config fallback:", config.version);

      // Cache the local config (shorter duration)
      cachedConfig = {
        config,
        source: "local",
        timestamp: Date.now(),
        lastUpdated: config.lastUpdated,
      };

      return NextResponse.json(
        {
          config,
          source: "local",
          lastUpdated: config.lastUpdated,
          cached: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fallback: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5min cache for fallback
            "X-Config-Source": "local-fallback",
          },
        },
      );
    } catch (localError) {
      // If local config fails, it's a critical error - the build is broken
      console.error("CRITICAL: Local config failed to load:", localError);

      return NextResponse.json(
        {
          error: `Critical error: Local config failed. Remote: ${error instanceof Error ? error.message : "Unknown"}. Local: ${localError instanceof Error ? localError.message : "Unknown"}`,
          message: "Configuration system failure - please check the build",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-cache", // Don't cache errors
            "X-Config-Source": "error",
          },
        },
      );
    }
  }
}

/**
 * Validates that the config has the required structure
 */
function isValidConfig(config: any): config is FileSuffixColorConfig {
  return (
    config &&
    typeof config === "object" &&
    config.suffixConfigs &&
    typeof config.suffixConfigs === "object" &&
    Object.keys(config.suffixConfigs).length > 0
  );
}

/**
 * Check if server cache is still valid
 */
function isServerCacheValid(cached: typeof cachedConfig): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION;
}
