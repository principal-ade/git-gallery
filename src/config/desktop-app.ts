/**
 * Desktop Application Configuration
 *
 * Centralized configuration for the desktop Electron application (Specktor).
 * This includes GitHub repository information for releases and auto-updates.
 */

export const DESKTOP_APP_CONFIG = {
  // GitHub repository for desktop app releases
  github: {
    owner: "a24z-ai",
    repo: "electron-app",
    // Full repository path
    fullRepo: "a24z-ai/electron-app" as const,
  },

  // Application branding
  branding: {
    name: "Specktor",
    displayName: "Specktor Desktop",
  },

  // Auto-update configuration
  autoUpdate: {
    // Cache duration for version checks (5 minutes)
    versionCheckCacheDuration: 300,
    // Cache duration for binary downloads (1 hour)
    binaryCacheDuration: 3600,
  },
} as const;

// Helper to construct GitHub API URLs
export const getGitHubApiUrl = (
  endpoint: "releases" | "latest" = "releases",
) => {
  const { owner, repo } = DESKTOP_APP_CONFIG.github;
  const base = `https://api.github.com/repos/${owner}/${repo}/releases`;
  return endpoint === "latest" ? `${base}/latest` : base;
};

// Helper to construct download URL for a specific asset
export const getAssetDownloadUrl = (assetId: string | number) => {
  const { owner, repo } = DESKTOP_APP_CONFIG.github;
  return `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`;
};
