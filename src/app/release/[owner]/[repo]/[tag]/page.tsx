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
  GitPullRequest,
} from "lucide-react";
import {
  HighlightLayer,
  MultiVersionCityBuilder,
  useCodeCityData,
} from "@principal-ai/code-city-react";
import { GitHubService } from "../../../../../services/githubService";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../../../../mosaic/components/MosaicTheme";
import { ReleasePostcard } from "../../../components/ReleasePostcard";
import {
  createPRHighlightLayersByLines,
  // getPRFileStats,
  PRFile,
} from "../../../../../utils/prColorMapping";

interface ReleaseStats {
  tag: string;
  name: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  publishedAt?: string;
  body?: string;
  htmlUrl: string;
  tarballUrl?: string;
  zipballUrl?: string;
  prerelease?: boolean;
  previousTag?: string;
  previousReleaseDate?: string;
  changedFiles?: number;
  additions?: number;
  deletions?: number;
  commits?: number;
  contributorCount?: number;
}

function ReleaseVisualizationContent() {
  const theme = useMosaicTheme();
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const tag = params.tag as string;
  const repoPath = `${owner}/${repo}`;

  const [fileSystemTree, setFileSystemTree] = useState<any>(null);
  const [canonicalCityData, setCanonicalCityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releaseStats, setReleaseStats] = useState<ReleaseStats | null>(null);
  const [changedFiles, setChangedFiles] = useState<PRFile[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const generateImageRef = useRef<(() => void) | null>(null);
  const generateMapImageRef = useRef<(() => void) | null>(null);
  const [selectedFileInfo, setSelectedFileInfo] = useState<{
    extension: string;
    fileInfo: PRFile;
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

  // Use the canonical city data if available, otherwise fall back to regular city data
  const { cityData: regularCityData } = useCodeCityData({
    fileSystemTree: fileSystemTree,
    autoUpdate: !canonicalCityData, // Don't auto-update if we have canonical data
  });

  const cityData = canonicalCityData || regularCityData;

  // Create highlight layers based on PR change types (weighted by lines of code)
  const highlightLayers = useMemo((): HighlightLayer[] => {
    if (!changedFiles.length) return [];

    // Use the lines-based function for more accurate representation
    const layers = createPRHighlightLayersByLines(changedFiles);
    return layers;
  }, [changedFiles, fileSystemTree]);

  // Load release data
  useEffect(() => {
    const loadReleaseData = async () => {
      if (!owner || !repo || !tag) return;

      setLoading(true);
      setError(null);

      try {
        const githubService = new GitHubService();

        // First fetch repository info to get the default branch
        const repoInfo = await githubService.fetchRepositoryInfo(owner, repo);

        // Load releases, current release, and owner's Twitter handle in parallel
        const [releases, currentRelease, twitterHandle] = await Promise.all([
          githubService.fetchReleases(owner, repo, 20),
          githubService.fetchReleaseByTag(owner, repo, tag),
          githubService.fetchUserTwitterHandle(owner).catch(() => null),
        ]);

        setOwnerTwitterHandle(twitterHandle);

        // Find the previous release tag
        const currentIndex = releases.findIndex((r: any) => r.tag_name === tag);
        const previousRelease =
          currentIndex >= 0 && currentIndex < releases.length - 1
            ? releases[currentIndex + 1]
            : null;
        const previousTag = previousRelease?.tag_name || repoInfo.defaultBranch;
        const previousReleaseDate =
          previousRelease?.published_at || previousRelease?.created_at;

        // Compare with previous release or default branch
        const comparison = await githubService.compareRefs(
          owner,
          repo,
          previousTag,
          tag,
        );

        // Fetch both trees for the canonical layout
        const [baseTree, headTree] = await Promise.all([
          githubService.fetchFileSystemTree(owner, repo, previousTag),
          githubService.fetchFileSystemTree(owner, repo, tag),
        ]);

        // Create a map of version trees for MultiVersionCityBuilder
        const versionTrees = new Map([
          ["base", baseTree],
          ["head", headTree],
        ]);

        // Build the multi-version city that includes both versions
        const { unionCity, presenceByVersion } = MultiVersionCityBuilder.build(
          versionTrees,
          {},
        );

        // Get the city data for the head version (current release)
        const headCityData = MultiVersionCityBuilder.getVersionView(
          unionCity,
          presenceByVersion.get("head")!,
        );

        // Set both the regular tree (for fallback) and the canonical city data
        setFileSystemTree(baseTree);
        setCanonicalCityData(headCityData);
        setChangedFiles(comparison.files);

        // Set release stats
        setReleaseStats({
          tag: currentRelease.tag_name,
          name: currentRelease.name || currentRelease.tag_name,
          author: currentRelease.author?.login || "Unknown",
          authorAvatar: currentRelease.author?.avatar_url,
          createdAt: currentRelease.created_at,
          publishedAt: currentRelease.published_at,
          body: currentRelease.body,
          htmlUrl: currentRelease.html_url,
          tarballUrl: currentRelease.tarball_url,
          zipballUrl: currentRelease.zipball_url,
          prerelease: currentRelease.prerelease,
          previousTag,
          previousReleaseDate,
          changedFiles: comparison.files.length,
          additions: comparison.additions,
          deletions: comparison.deletions,
          commits: comparison.commits,
          contributorCount: comparison.contributors?.length || 0,
        });
      } catch (err) {
        console.error("Failed to load release data:", err);
        setError(
          `Failed to load release ${tag} from ${repoPath}. Please check that the repository and release exist and are public.`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadReleaseData();
  }, [owner, repo, tag, repoPath]);

  // Helper function to fetch cached image as blob
  // TODO: Implement caching for generated images
  // const fetchCachedImageAsBlob = async (imageUrl: string): Promise<Blob | null> => {
  //   try {
  //     const response = await fetch(imageUrl);
  //     if (response.ok) {
  //       return await response.blob();
  //     }
  //   } catch (error) {
  //     console.error('Failed to fetch cached image as blob:', error);
  //   }
  //   return null;
  // };

  // Generate and download map image
  const generateMapImage = async () => {
    // For now, trigger generation - we can add caching later
    if (generateMapImageRef.current) {
      generateMapImageRef.current();
    }
  };

  // Handle map image generation
  const handleMapImageGenerated = async (imageBlob: Blob) => {
    setCurrentMapImageBlob(imageBlob);

    // Create object URL and download
    const url = URL.createObjectURL(imageBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repoPath.replace("/", "-")}-release-${tag}-map.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate share URL (simplified for now)
  const generateShareUrl = async (): Promise<string | null> => {
    setIsGeneratingShare(true);
    try {
      // For now, just return the current URL
      // In the future, we can implement PR-specific image caching
      const fallbackUrl = window.location.href;
      setShareUrl(fallbackUrl);
      return fallbackUrl;
    } catch (error) {
      console.error("Failed to create share link:", error);
      const fallbackUrl = window.location.href;
      setShareUrl(fallbackUrl);
      return fallbackUrl;
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Handle image share from postcard component
  const handlePostcardShare = async (imageBlob: Blob) => {
    setCurrentImageBlob(imageBlob);
    await generateShareUrl();
    setShowShareModal(true);
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
      setTimeout(() => setImageCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
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
      setTimeout(() => setMapImageCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy map image:", err);
    }
  };

  // Social sharing URLs
  const getTwitterShareUrl = () => {
    if (!shareUrl) return null;

    let text = `Check out the changes in ${repoPath} release ${tag}!`;
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

  // Handle file click from postcard to show change info
  const handleFileClick = (
    path: string,
    type: "file" | "directory",
    extension: string,
    fileInfo?: PRFile,
  ) => {
    if (fileInfo) {
      setSelectedFileInfo({ extension, fileInfo });
    }
  };

  // const fileStats = useMemo(() => {
  //   return getPRFileStats(changedFiles);
  // }, [changedFiles]);

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
          padding: "20px 40px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Left section - Git Gallery */}
          <div>
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

          {/* Right section - Navigation buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => router.push(`/mosaic/${owner}/${repo}`)}
              style={{
                ...theme.components.button.secondary,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                padding: "8px 14px",
              }}
              title="View repository mosaic"
            >
              <GitPullRequest size={14} />
              Repo Mosaic
            </button>

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
              onClick={() => {
                if (isGeneratingShare) return;

                if (generateImageRef.current) {
                  generateImageRef.current();
                } else {
                  // Fallback: just open the share modal with current URL
                  setShowShareModal(true);
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
              {isGeneratingShare ? "Generating..." : "Share Release"}
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
              Release Not Found
            </h3>
            <p>{error}</p>
          </div>
        )}

        {/* Main Release Postcard */}
        {!error && releaseStats && (
          <ReleasePostcard
            repoPath={repoPath}
            releaseStats={releaseStats}
            cityData={cityData}
            highlightLayers={highlightLayers}
            changedFiles={changedFiles}
            loading={loading}
            onShare={handlePostcardShare}
            onGenerateImageRef={generateImageRef}
            onMapShare={handleMapImageGenerated}
            onGenerateMapImageRef={generateMapImageRef}
            onFileClick={handleFileClick}
          />
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
                Share Release {tag}
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
                    const url = getTwitterShareUrl();
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
                    const url = getLinkedInShareUrl();
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

      {/* File Info Modal */}
      {selectedFileInfo && (
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
          onClick={() => setSelectedFileInfo(null)}
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
            onClick={(e) => e.stopPropagation()}
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
                File Changes
              </h3>
              <button
                onClick={() => setSelectedFileInfo(null)}
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

            <div style={{ marginBottom: "1rem" }}>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: theme.fontSizes.sm,
                  wordBreak: "break-all",
                  color: theme.colors.text,
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                {selectedFileInfo.fileInfo.filename}
              </p>

              {/* File Status Badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: theme.radius.full,
                    backgroundColor:
                      selectedFileInfo.fileInfo.status === "added"
                        ? "#22c55e20"
                        : selectedFileInfo.fileInfo.status === "modified"
                          ? "#f59e0b20"
                          : selectedFileInfo.fileInfo.status === "removed"
                            ? "#ef444420"
                            : "#3b82f620",
                    border: `1px solid ${
                      selectedFileInfo.fileInfo.status === "added"
                        ? "#22c55e"
                        : selectedFileInfo.fileInfo.status === "modified"
                          ? "#f59e0b"
                          : selectedFileInfo.fileInfo.status === "removed"
                            ? "#ef4444"
                            : "#3b82f6"
                    }`,
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor:
                        selectedFileInfo.fileInfo.status === "added"
                          ? "#22c55e"
                          : selectedFileInfo.fileInfo.status === "modified"
                            ? "#f59e0b"
                            : selectedFileInfo.fileInfo.status === "removed"
                              ? "#ef4444"
                              : "#3b82f6",
                    }}
                  />
                  <span
                    style={{
                      fontSize: theme.fontSizes.sm,
                      fontWeight: theme.fontWeights.semibold,
                      textTransform: "capitalize",
                      color:
                        selectedFileInfo.fileInfo.status === "added"
                          ? "#22c55e"
                          : selectedFileInfo.fileInfo.status === "modified"
                            ? "#f59e0b"
                            : selectedFileInfo.fileInfo.status === "removed"
                              ? "#ef4444"
                              : "#3b82f6",
                    }}
                  >
                    File {selectedFileInfo.fileInfo.status}
                  </span>
                </div>
              </div>

              {/* Line Changes - Only show for modified files */}
              {selectedFileInfo.fileInfo.status === "modified" && (
                <div>
                  <div
                    style={{
                      fontSize: theme.fontSizes.xs,
                      color: theme.colors.textMuted,
                      textAlign: "center",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Line Changes
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes["2xl"],
                          fontWeight: "bold",
                          color: "#22c55e",
                        }}
                      >
                        +{selectedFileInfo.fileInfo.additions}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        lines added
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes["2xl"],
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}
                      >
                        -{selectedFileInfo.fileInfo.deletions}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        lines removed
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes["2xl"],
                          fontWeight: "bold",
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {selectedFileInfo.fileInfo.changes}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        total changes
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New file message */}
              {selectedFileInfo.fileInfo.status === "added" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    backgroundColor: "#22c55e10",
                    borderRadius: theme.radius.lg,
                    border: `1px solid #22c55e30`,
                  }}
                >
                  <div
                    style={{
                      fontSize: theme.fontSizes.lg,
                      color: "#22c55e",
                      marginBottom: "0.25rem",
                    }}
                  >
                    New File
                  </div>
                  <div
                    style={{
                      fontSize: theme.fontSizes.sm,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {selectedFileInfo.fileInfo.additions} lines added
                  </div>
                </div>
              )}

              {/* Removed file message */}
              {selectedFileInfo.fileInfo.status === "removed" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "1rem",
                    backgroundColor: "#ef444410",
                    borderRadius: theme.radius.lg,
                    border: `1px solid #ef444430`,
                  }}
                >
                  <div
                    style={{
                      fontSize: theme.fontSizes.lg,
                      color: "#ef4444",
                      marginBottom: "0.25rem",
                    }}
                  >
                    File Removed
                  </div>
                  <div
                    style={{
                      fontSize: theme.fontSizes.sm,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {selectedFileInfo.fileInfo.deletions} lines removed
                  </div>
                </div>
              )}

              {/* Renamed file info */}
              {selectedFileInfo.fileInfo.status === "renamed" &&
                selectedFileInfo.fileInfo.previousFilename && (
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#3b82f610",
                      borderRadius: theme.radius.lg,
                      border: `1px solid #3b82f630`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: theme.fontSizes.sm,
                        color: theme.colors.textMuted,
                        marginBottom: "0.5rem",
                      }}
                    >
                      Previous name:
                    </div>
                    <div
                      style={{
                        fontSize: theme.fontSizes.sm,
                        fontFamily: "monospace",
                        color: "#3b82f6",
                        wordBreak: "break-all",
                      }}
                    >
                      {selectedFileInfo.fileInfo.previousFilename}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReleaseVisualizationPage() {
  return (
    <MosaicThemeProvider>
      <ReleaseVisualizationContent />
    </MosaicThemeProvider>
  );
}
