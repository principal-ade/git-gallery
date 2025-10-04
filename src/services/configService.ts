import { FileSuffixColorConfig } from "@/utils/fileColorMapping";
import localConfig from "@/config/files.json";

const API_CONFIG_URL = "/api/config/color-palette";
const CACHE_KEY = "git-gallery-palette-config";
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes client cache (server handles longer cache)

interface CachedConfig {
  config: FileSuffixColorConfig;
  timestamp: number;
  source: "remote" | "local";
  lastUpdated?: string;
}

interface APIConfigResponse {
  config: FileSuffixColorConfig;
  source: "remote" | "local";
  lastUpdated?: string;
  cached?: boolean;
  error?: string;
  fallback?: boolean;
  cacheTime?: string;
  fetchTime?: string;
}

/**
 * Fetches the latest color palette configuration via API route (server-cached)
 * Much more efficient than direct GitHub fetching
 */
export async function fetchColorPaletteConfig(
  forceRefresh: boolean = false,
): Promise<{
  config: FileSuffixColorConfig;
  source: "remote" | "local";
  lastUpdated?: string;
  error?: string;
  cached?: boolean;
}> {
  try {
    // Check client cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedConfig();
      if (cached && isConfigCacheValid(cached)) {
        console.log("Using client-cached color palette config:", cached.source);
        return {
          config: cached.config,
          source: cached.source,
          lastUpdated: cached.lastUpdated,
          cached: true,
        };
      }
    }

    // Fetch from our API route (which handles server caching + GitHub fetching)
    console.log("Fetching color palette config from API...");
    const url = forceRefresh
      ? `${API_CONFIG_URL}?refresh=true`
      : API_CONFIG_URL;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const apiResponse = (await response.json()) as APIConfigResponse;
    const {
      config,
      source,
      lastUpdated,
      error: apiError,
      cached: serverCached,
    } = apiResponse;

    // Validate the config structure
    if (!config.suffixConfigs || typeof config.suffixConfigs !== "object") {
      throw new Error("Invalid config structure from API");
    }

    console.log(
      `Successfully loaded config from API (${source}, server-cached: ${serverCached}):`,
      config.version,
    );

    // Update client cache
    setCachedConfig({
      config,
      timestamp: Date.now(),
      source,
      lastUpdated,
    });

    return {
      config,
      source,
      lastUpdated,
      error: apiError,
      cached: serverCached,
    };
  } catch (error) {
    console.warn(
      "Failed to fetch config from API, falling back to local:",
      error,
    );

    // Fall back to local packaged config - this MUST work
    const config = localConfig as FileSuffixColorConfig;
    console.log("Using local packaged config:", config.version);

    // Cache the local config
    setCachedConfig({
      config,
      timestamp: Date.now(),
      source: "local",
      lastUpdated: config.lastUpdated,
    });

    return {
      config,
      source: "local",
      lastUpdated: config.lastUpdated,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Synchronous version that returns cached config or local config
 * Use this for situations where async loading isn't possible
 */
export function getColorPaletteConfigSync(): {
  config: FileSuffixColorConfig;
  source: "cached" | "local";
} {
  // Check cache first
  try {
    const cached = getCachedConfig();
    if (
      cached &&
      isConfigCacheValid(cached) &&
      cached.config &&
      cached.config.suffixConfigs
    ) {
      return {
        config: cached.config,
        source: "cached",
      };
    }
  } catch (cacheError) {
    console.warn("Cache read failed:", cacheError);
  }

  // Always use the local packaged config - it MUST work
  // The local config is imported at build time and is guaranteed to exist
  console.log("[ConfigService] Loading local config...", {
    hasLocalConfig: !!localConfig,
    localConfigType: typeof localConfig,
    localConfigKeys: localConfig ? Object.keys(localConfig) : "null",
  });

  const config = localConfig as FileSuffixColorConfig;

  // Validate the structure is correct (this should never fail with our packaged config)
  if (
    !config ||
    !config.suffixConfigs ||
    typeof config.suffixConfigs !== "object"
  ) {
    // This should NEVER happen - it means our build is broken
    console.error("[ConfigService] CRITICAL ERROR: Local config is invalid!", {
      config,
      hasConfig: !!config,
      configKeys: config ? Object.keys(config) : null,
      hasSuffixConfigs: config ? !!config.suffixConfigs : false,
      suffixConfigsType: config ? typeof config.suffixConfigs : "undefined",
    });
    throw new Error(
      "CRITICAL: Local packaged config is invalid. This indicates a build problem. " +
        "Config structure: " +
        JSON.stringify(config ? Object.keys(config) : "null"),
    );
  }

  console.log("[ConfigService] Local config loaded successfully:", {
    version: config.version,
    suffixConfigCount: Object.keys(config.suffixConfigs).length,
    hasDefaultConfig: !!config.defaultConfig,
  });

  return {
    config,
    source: "local",
  };
}

/**
 * Cache management functions
 */
function getCachedConfig(): CachedConfig | null {
  if (typeof window === "undefined") return null; // Server-side

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedConfig(cached: CachedConfig): void {
  if (typeof window === "undefined") return; // Server-side

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn("Failed to cache config:", error);
  }
}

function isConfigCacheValid(cached: CachedConfig): boolean {
  return Date.now() - cached.timestamp < CACHE_DURATION;
}
