"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Share2,
  Copy,
  Twitter,
  Linkedin,
  Download,
  History,
  Palette,
  Github,
} from "lucide-react";
import {
  HighlightLayer,
  type FileSuffixConfig,
  useCodeCityData,
} from "@principal-ai/code-city-react";
import {
  createFileColorHighlightLayers,
  DEFAULT_FILE_CONFIGS,
} from "../../../../utils/fileColorMapping";
import { GitHubService } from "../../../../services/githubService";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../../components/MosaicTheme";
import { MosaicPostcard } from "../../components/MosaicPostcard";
import { ColorInfoModal } from "@/components/ColorInfoModal";

interface RepoStats {
  stars: number;
  forks: number;
  watchers: number;
  contributors?: number;
  language: string;
  description: string;
  lastUpdated: string;
  size: number;
  license?: { name: string; spdx_id: string } | null;
  ageInDays?: number;
  isFork?: boolean;
}

function RepoMosaicContent() {
  const theme = useMosaicTheme();
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const repoPath = `${owner}/${repo}`;

  const [fileSystemTree, setFileSystemTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const generateImageRef = useRef<(() => void) | null>(null);
  const generateMapImageRef = useRef<(() => void) | null>(null);
  const [selectedColorInfo, setSelectedColorInfo] = useState<{
    extension: string;
    config: FileSuffixConfig;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [imageCopySuccess, setImageCopySuccess] = useState(false);
  const [mapImageCopySuccess, setMapImageCopySuccess] = useState(false);
  const [currentImageBlob, setCurrentImageBlob] = useState<Blob | null>(null);
  const [currentMapImageBlob, setCurrentMapImageBlob] = useState<Blob | null>(
    null,
  );
  const [ownerTwitterHandle, setOwnerTwitterHandle] = useState<string | null>(
    null,
  );
  const [showGradient, setShowGradient] = useState(true);

  // Get city data from file system tree
  const { cityData } = useCodeCityData({
    fileSystemTree,
    autoUpdate: true,
  });

  // Create highlight layers based on file types
  const highlightLayers = useMemo((): HighlightLayer[] => {
    // The function takes config first, fileSystemTree second
    const layers = createFileColorHighlightLayers(
      DEFAULT_FILE_CONFIGS,
      fileSystemTree,
    );
    console.log("Created highlight layers:", layers);
    console.log("Number of layers:", layers.length);
    if (layers.length > 0) {
      console.log("First layer:", layers[0]);
      console.log("First layer items count:", layers[0].items.length);
    }
    return layers;
  }, [fileSystemTree]);

  // Load repository data
  useEffect(() => {
    const loadRepository = async () => {
      if (!owner || !repo) return;

      setLoading(true);
      setError(null);

      try {
        const githubService = new GitHubService();

        // First fetch repository info to get the default branch
        const repoInfo = await githubService.fetchRepositoryInfo(owner, repo);

        // Then load file tree, contributors, and owner's Twitter handle in parallel
        const [tree, contributors, twitterHandle] = await Promise.all([
          githubService.fetchFileSystemTree(
            owner,
            repo,
            repoInfo.defaultBranch,
          ),
          githubService
            .fetchRepositoryContributors(owner, repo)
            .catch(() => []),
          githubService.fetchUserTwitterHandle(owner).catch(() => null),
        ]);

        setFileSystemTree(tree);
        setOwnerTwitterHandle(twitterHandle);

        // Load real repository stats from GitHub
        setRepoStats({
          stars: repoInfo.stars,
          forks: repoInfo.forks,
          watchers: repoInfo.watchers,
          contributors: contributors.length || undefined,
          language: repoInfo.language || "Unknown",
          description: repoInfo.description || `Repository ${repo}`,
          lastUpdated: new Date(repoInfo.updatedAt).toLocaleDateString(),
          size: repoInfo.size,
          license: repoInfo.license,
          ageInDays: repoInfo.ageInDays,
          isFork: repoInfo.isFork,
        });
      } catch (err) {
        console.error("Failed to load repository:", err);
        setError(
          `Failed to load repository ${repoPath}. Please check that the repository exists and is public.`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadRepository();
  }, [owner, repo, repoPath]);

  // Helper function to fetch cached image as blob
  const fetchCachedImageAsBlob = async (
    imageUrl: string,
  ): Promise<Blob | null> => {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        return await response.blob();
      }
    } catch (error) {
      console.error("Failed to fetch cached image as blob:", error);
    }
    return null;
  };

  // Check for cached images on component load
  useEffect(() => {
    const checkCachedImages = async () => {
      if (!owner || !repo) return;

      try {
        // Check for cached share image
        if (!currentImageBlob) {
          const shareResponse = await fetch(
            `/api/mosaic/${owner}/${repo}/share-image`,
            {
              method: "POST",
              body: new FormData(), // Empty FormData to trigger cache check
            },
          );

          if (shareResponse.ok) {
            const shareData = await shareResponse.json();
            if (shareData.cached && shareData.imageUrl) {
              console.log("Found cached share image, fetching as blob");
              const cachedBlob = await fetchCachedImageAsBlob(
                shareData.imageUrl,
              );
              if (cachedBlob) {
                setCurrentImageBlob(cachedBlob);
              }
            }
          }
        }

        // Check for cached map image
        if (!currentMapImageBlob) {
          const mapResponse = await fetch(
            `/api/mosaic/${owner}/${repo}/map-image`,
          );
          if (mapResponse.ok) {
            const mapData = await mapResponse.json();
            if (mapData.cached && mapData.imageUrl) {
              console.log("Found cached map image, fetching as blob");
              // Use proxy endpoint to avoid CORS
              const downloadResponse = await fetch(
                `/api/mosaic/${owner}/${repo}/map-image-download`,
              );
              if (downloadResponse.ok) {
                const blob = await downloadResponse.blob();
                setCurrentMapImageBlob(blob);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check cached images:", error);
      }
    };

    checkCachedImages();
  }, [owner, repo, currentImageBlob, currentMapImageBlob]);

  // Check for cached image first, then generate if needed
  const generateShareUrl = async (imageBlob?: Blob): Promise<string | null> => {
    setIsGeneratingShare(true);
    try {
      // First try to get cached version without sending image
      let response = await fetch(`/api/mosaic/${owner}/${repo}/share-image`, {
        method: "POST",
        body: new FormData(), // Empty FormData to trigger cache check
      });

      let data = await response.json();

      // If we have a cached version, use it
      if (data.cached && data.shareUrl) {
        console.log("Using cached image");
        setShareUrl(data.shareUrl);

        // Fetch the cached image as a blob for copy functionality
        if (data.imageUrl && !currentImageBlob) {
          console.log("Fetching cached image as blob for copy functionality");
          const cachedBlob = await fetchCachedImageAsBlob(data.imageUrl);
          if (cachedBlob) {
            setCurrentImageBlob(cachedBlob);
          }
        }

        setIsGeneratingShare(false);
        return data.shareUrl;
      }

      // No cached version, need to generate new one
      if (!imageBlob) {
        // Don't throw error, just return null to indicate no cache and no blob
        console.log("No cached image found and no image blob provided");
        setIsGeneratingShare(false);
        return null;
      }

      console.log("No cached image found, generating new one...");

      // Create FormData with the image blob
      const formData = new FormData();
      formData.append("image", imageBlob, "postcard.png");
      formData.append("repoPath", repoPath);

      response = await fetch(`/api/mosaic/${owner}/${repo}/share-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate share image");
      }

      data = await response.json();
      setShareUrl(data.shareUrl);
      return data.shareUrl;
    } catch (error) {
      console.error("Failed to create share link:", error);
      // Fallback to current URL
      const fallbackUrl = window.location.href;
      setShareUrl(fallbackUrl);
      return fallbackUrl;
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Handle image share from postcard component
  const handlePostcardShare = async (imageBlob: Blob) => {
    // Store the image blob for copying
    setCurrentImageBlob(imageBlob);
    // Generate the share URL and open share modal
    await generateShareUrl(imageBlob);
    setShowShareModal(true);
  };

  // Handle map image generation and caching
  const handleMapImageGenerated = async (imageBlob: Blob) => {
    // Store the map image blob for copying
    setCurrentMapImageBlob(imageBlob);

    // Save to cache
    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "map.png");

      const response = await fetch(`/api/mosaic/${owner}/${repo}/map-image`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Map image cached successfully:", data.imageUrl);

        // If this was triggered by download button, download it
        // Create object URL and download
        const url = URL.createObjectURL(imageBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${repoPath.replace("/", "-")}-map.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to cache map image:", error);
    }
  };

  // Generate and download map image
  const generateMapImage = async () => {
    // First check if we have a cached version
    try {
      const response = await fetch(`/api/mosaic/${owner}/${repo}/map-image`);
      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.imageUrl) {
          // Use our proxy endpoint to download the image (avoids CORS)
          const downloadResponse = await fetch(
            `/api/mosaic/${owner}/${repo}/map-image-download`,
          );

          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();

            // Store blob for copy functionality if not already set
            if (!currentMapImageBlob) {
              setCurrentMapImageBlob(blob);
            }

            // Create object URL and download
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${repoPath.replace("/", "-")}-map.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Failed to download cached map image:", error);
    }

    // No cached version, generate new one
    if (generateMapImageRef.current) {
      generateMapImageRef.current();
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Handle copy button click
  const handleCopyShare = async () => {
    if (shareUrl) {
      await copyToClipboard(shareUrl);
      setCopySuccess(true);
      // Reset the success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Handle copy image to clipboard
  const handleCopyImage = async () => {
    if (!currentImageBlob) return;

    try {
      const clipboardItem = new ClipboardItem({
        "image/png": currentImageBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
      setImageCopySuccess(true);
      // Reset the success state after 2 seconds
      setTimeout(() => setImageCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
      // Fallback: show error or provide alternative
    }
  };

  // Handle copy map image to clipboard
  const handleCopyMapImage = async () => {
    if (!currentMapImageBlob) return;

    try {
      const clipboardItem = new ClipboardItem({
        "image/png": currentMapImageBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
      setMapImageCopySuccess(true);
      // Reset the success state after 2 seconds
      setTimeout(() => setMapImageCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy map image:", err);
    }
  };

  // Social sharing URLs
  const getTwitterShareUrl = () => {
    if (!shareUrl) return null;

    // Build the tweet text with optional mention
    let text = `Check out this code visualization of ${repoPath}!`;
    if (ownerTwitterHandle) {
      text += ` (by @${ownerTwitterHandle})`;
    }
    text += ` Created with git-gallery.com`;

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  };

  const getLinkedInShareUrl = () => {
    if (!shareUrl) return null;
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  };

  // Handle file click from postcard to show color info
  const handleFileClick = (
    path: string,
    type: "file" | "directory",
    extension: string,
    config?: FileSuffixConfig,
  ) => {
    if (config) {
      setSelectedColorInfo({ extension, config });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.backgroundSecondary,
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Top section - Git Gallery Title */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <h1
              onClick={() => router.push("/")}
              style={{
                fontSize: "24px",
                fontWeight: 600,
                fontFamily: theme.fonts.heading,
                margin: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, #d4a574 0%, #e0b584 50%, #c9b8a3 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Git Gallery
            </h1>
          </div>

          {/* Bottom section - History and Share buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => router.push(`/git-history/${owner}/${repo}`)}
              style={{
                ...theme.components.button.secondary,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                padding: "8px 14px",
              }}
              title="View repository history as animated GIF"
            >
              <History size={14} />
              Git History
            </button>

            <button
              onClick={async () => {
                if (isGeneratingShare) return;

                // First try to use cached version
                const cachedUrl = await generateShareUrl();
                if (cachedUrl) {
                  setShowShareModal(true);
                  return;
                }

                // No cached version, trigger image generation from postcard
                console.log("No cached image, will generate new one");
                if (generateImageRef.current) {
                  generateImageRef.current();
                }
              }}
              disabled={isGeneratingShare}
              style={{
                ...theme.components.button.primary,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                padding: "8px 14px",
                opacity: isGeneratingShare ? 0.7 : 1,
                cursor: isGeneratingShare ? "not-allowed" : "pointer",
              }}
            >
              <Share2 size={14} />
              {isGeneratingShare ? "Generating..." : "Share This Project"}
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px",
        }}
      >
        {/* Error State */}
        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: theme.radius.xl,
              padding: "2rem",
              textAlign: "center",
              color: "#dc2626",
              marginBottom: "2rem",
            }}
          >
            <h3
              style={{ fontSize: theme.fontSizes.lg, marginBottom: "0.5rem" }}
            >
              Repository Not Found
            </h3>
            <p>{error}</p>
          </div>
        )}

        {/* Main Mosaic Postcard */}
        {!error && (
          <>
            <MosaicPostcard
              repoPath={repoPath}
              repoStats={repoStats || undefined}
              cityData={cityData}
              highlightLayers={highlightLayers}
              loading={loading}
              onShare={handlePostcardShare}
              onGenerateImageRef={generateImageRef}
              onMapShare={handleMapImageGenerated}
              onGenerateMapImageRef={generateMapImageRef}
              colorConfig={DEFAULT_FILE_CONFIGS}
              onFileClick={handleFileClick}
              onGradientToggle={setShowGradient}
              externalShowGradient={showGradient}
            />

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "2.5rem",
              }}
            >
              <button
                onClick={() => setShowGradient(!showGradient)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "0.375rem",
                  color: theme.colors.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: theme.fontSizes.sm,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    theme.colors.backgroundTertiary;
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    theme.colors.backgroundSecondary;
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
              >
                <Palette size={14} />
                {showGradient ? "Hide Gradient" : "Show Gradient"}
              </button>

              {repoPath && (
                <a
                  href={`https://github.com/${repoPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: theme.colors.backgroundSecondary,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: "0.375rem",
                    color: theme.colors.text,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: theme.fontSizes.sm,
                    transition: "all 0.2s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.backgroundTertiary;
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.backgroundSecondary;
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                >
                  <Github size={14} />
                  View on GitHub
                </a>
              )}
            </div>
          </>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radius["2xl"],
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: theme.colors.shadowXl,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3
                style={{
                  fontSize: theme.fontSizes.xl,
                  fontWeight: theme.fontWeights.bold,
                  margin: 0,
                }}
              >
                Share Mosaic
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: theme.colors.textMuted,
                  padding: "0.25rem",
                }}
              >
                ×
              </button>
            </div>

            {/* Shareable URL */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Shareable Link
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <input
                  type="text"
                  value={
                    shareUrl ||
                    (isGeneratingShare
                      ? "Generating share link..."
                      : "Click Copy to generate")
                  }
                  readOnly
                  style={{
                    ...theme.components.input,
                    flex: 1,
                    fontSize: theme.fontSizes.sm,
                    backgroundColor: theme.colors.backgroundSecondary,
                    opacity: isGeneratingShare ? 0.7 : 1,
                  }}
                />
                <button
                  onClick={handleCopyShare}
                  disabled={isGeneratingShare || !shareUrl}
                  style={{
                    ...theme.components.button.secondary,
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    opacity: isGeneratingShare || !shareUrl ? 0.7 : 1,
                    cursor:
                      isGeneratingShare || !shareUrl
                        ? "not-allowed"
                        : "pointer",
                    backgroundColor: copySuccess
                      ? "#22c55e"
                      : theme.components.button.secondary.backgroundColor,
                    color: copySuccess
                      ? "white"
                      : theme.components.button.secondary.color,
                  }}
                >
                  <Copy size={16} />
                  {copySuccess
                    ? "Copied!"
                    : isGeneratingShare
                      ? "Generating..."
                      : "Copy"}
                </button>
              </div>
            </div>

            {/* Copy Full Image */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Copy Full Image
              </label>
              <button
                onClick={handleCopyImage}
                disabled={!currentImageBlob}
                style={{
                  ...theme.components.button.secondary,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  justifyContent: "center",
                  opacity: !currentImageBlob ? 0.7 : 1,
                  cursor: !currentImageBlob ? "not-allowed" : "pointer",
                  backgroundColor: imageCopySuccess
                    ? "#22c55e"
                    : theme.components.button.secondary.backgroundColor,
                  color: imageCopySuccess
                    ? "white"
                    : theme.components.button.secondary.color,
                }}
              >
                <Copy size={16} />
                {imageCopySuccess ? "Copied!" : "Copy Full Image"}
              </button>
            </div>

            {/* Map Image Actions */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Map Only
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleCopyMapImage}
                  disabled={!currentMapImageBlob}
                  style={{
                    ...theme.components.button.secondary,
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flex: 1,
                    justifyContent: "center",
                    opacity: !currentMapImageBlob ? 0.7 : 1,
                    cursor: !currentMapImageBlob ? "not-allowed" : "pointer",
                    backgroundColor: mapImageCopySuccess
                      ? "#22c55e"
                      : theme.components.button.secondary.backgroundColor,
                    color: mapImageCopySuccess
                      ? "white"
                      : theme.components.button.secondary.color,
                  }}
                >
                  <Copy size={16} />
                  {mapImageCopySuccess ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={generateMapImage}
                  style={{
                    ...theme.components.button.secondary,
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>

            {/* Social Sharing */}
            <div>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.75rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Share on Social Media
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                }}
              >
                <button
                  onClick={async () => {
                    const url = await getTwitterShareUrl();
                    if (url) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  disabled={isGeneratingShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#1da1f2",
                    color: "white",
                    border: "none",
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: theme.fontWeights.medium,
                    flex: 1,
                    justifyContent: "center",
                    cursor: isGeneratingShare ? "not-allowed" : "pointer",
                    opacity: isGeneratingShare ? 0.7 : 1,
                  }}
                >
                  <Twitter size={16} />
                  {ownerTwitterHandle ? `@${ownerTwitterHandle}` : "Twitter"}
                </button>
                <button
                  onClick={async () => {
                    const url = await getLinkedInShareUrl();
                    if (url) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  disabled={isGeneratingShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#0077b5",
                    color: "white",
                    border: "none",
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: theme.fontWeights.medium,
                    flex: 1,
                    justifyContent: "center",
                    cursor: isGeneratingShare ? "not-allowed" : "pointer",
                    opacity: isGeneratingShare ? 0.7 : 1,
                  }}
                >
                  <Linkedin size={16} />
                  LinkedIn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Info Modal - Outside the postcard for image generation */}
      <ColorInfoModal
        selectedConfig={selectedColorInfo}
        onClose={() => setSelectedColorInfo(null)}
      />
    </div>
  );
}

export default function RepoMosaicPage() {
  return (
    <MosaicThemeProvider>
      <RepoMosaicContent />
    </MosaicThemeProvider>
  );
}
