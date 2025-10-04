"use client";

import React, { useState } from "react";
import { useToPng } from "@hugocxl/react-to-image";
import { GitPullRequest, Github, GitBranch } from "lucide-react";
import {
  ArchitectureMapHighlightLayers,
  HighlightLayer,
} from "@principal-ai/code-city-react";
import { useMosaicTheme } from "../../mosaic/components/MosaicTheme";
import { FileTypeBreakdownBar } from "../../../components/FileTypeBreakdownBar";
import { MapImageCapture } from "../../../components/MapImageCapture";

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

interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

interface ReleasePostcardProps {
  repoPath: string;
  releaseStats: ReleaseStats;
  cityData: any;
  highlightLayers: HighlightLayer[];
  changedFiles: PRFile[];
  loading?: boolean;
  onShare?: (imageBlob: Blob, imageUrl: string) => void;
  onGenerateImageRef?: React.MutableRefObject<(() => void) | null>;
  onMapShare?: (imageBlob: Blob, imageUrl: string) => void;
  onGenerateMapImageRef?: React.MutableRefObject<(() => void) | null>;
  onFileClick?: (
    path: string,
    type: "file" | "directory",
    extension: string,
    fileInfo?: PRFile,
  ) => void;
}

export const ReleasePostcard: React.FC<ReleasePostcardProps> = ({
  repoPath,
  releaseStats,
  cityData,
  highlightLayers,
  changedFiles,
  loading = false,
  onShare,
  onGenerateImageRef,
  onMapShare,
  onGenerateMapImageRef,
  onFileClick,
}) => {
  const theme = useMosaicTheme();
  const [showGradient, setShowGradient] = useState(true);

  // Determine release type based on semantic versioning
  const getReleaseType = () => {
    if (!releaseStats.previousTag || !releaseStats.tag) return null;

    // Extract version numbers from tags (handles v1.2.3, 1.2.3, v1.2.3-beta, etc.)
    const parseVersion = (tag: string) => {
      const match = tag.match(/v?(\d+)\.(\d+)\.(\d+)/);
      if (!match) return null;
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
      };
    };

    const currentVersion = parseVersion(releaseStats.tag);
    const previousVersion = parseVersion(releaseStats.previousTag);

    if (!currentVersion || !previousVersion) return null;

    if (currentVersion.major > previousVersion.major) {
      return "Major Release";
    } else if (currentVersion.minor > previousVersion.minor) {
      return "Minor Update";
    } else if (currentVersion.patch > previousVersion.patch) {
      return "Patch Update";
    }

    return null;
  };

  const releaseType = getReleaseType();

  // Hook to convert the postcard to PNG
  const [, convertToPng, postcardRef] = useToPng<HTMLDivElement>({
    onSuccess: (data) => {
      fetch(data)
        .then((res) => res.blob())
        .then((blob) => {
          if (onShare) {
            onShare(blob, data);
          }
        })
        .catch(console.error);
    },
    onError: (error) => {
      console.error("Failed to convert PR postcard to image:", error);
    },
  });

  // Expose the generateImage function to parent via ref
  React.useEffect(() => {
    if (onGenerateImageRef) {
      onGenerateImageRef.current = convertToPng;
    }
  }, [onGenerateImageRef, convertToPng]);

  // Handle file click to show change info
  const handleFileClick = async (path: string, type: "file" | "directory") => {
    if (type === "file" && onFileClick) {
      const lastDot = path.lastIndexOf(".");
      const extension =
        lastDot !== -1 && lastDot !== path.length - 1
          ? path.substring(lastDot)
          : "";

      // Find the corresponding changed file
      const fileInfo = changedFiles.find((f) => f.filename === path);

      onFileClick(path, type, extension, fileInfo);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* PR Postcard */}
      <div
        ref={postcardRef}
        style={{
          position: "relative",
          backgroundColor: "#212738",
          backgroundImage: showGradient
            ? `linear-gradient(180deg, 
            #0A0F1E 0%, 
            #1E2841 12%, 
            #232D46 28%, 
            #263049 40%, 
            #28324B 50%, 
            #263049 60%, 
            #232D46 72%, 
            #1E2841 88%,
            #0A0F1E 100%)`
            : `linear-gradient(180deg, #212738 0%, #212738 100%)`,
          borderRadius: 0,
          boxShadow: theme.colors.shadowXl,
          border: `2px solid ${theme.colors.border}`,
          overflow: "hidden",
          width: "100%",
          aspectRatio: "2 / 1",
        }}
      >
        {/* Main Content with Padding */}
        <div style={{ padding: "2rem", height: "100%" }}>
          {/* Responsive Grid Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              alignItems: "flex-start",
              height: "100%",
            }}
          >
            {/* Left Side: PR Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                justifyContent: "space-between",
                alignSelf: "stretch",
                height: "100%",
                position: "relative",
              }}
            >
              {/* Top Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                {/* PR Header */}
                <div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    {/* PR State Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                        padding: "0.5rem 1rem",
                        backgroundColor: "transparent",
                        border: `2px solid ${theme.colors.primary}`,
                        borderRadius: "0",
                        maxWidth: "fit-content",
                        margin: "0 auto 1rem auto",
                      }}
                    >
                      <span
                        style={{
                          fontSize: theme.fontSizes.sm,
                          fontWeight: theme.fontWeights.medium,
                          color: theme.colors.primary,
                        }}
                      >
                        {releaseStats.tag}
                      </span>
                    </div>

                    {/* PR Title */}
                    <div style={{ textAlign: "center" }}>
                      <h2
                        style={{
                          fontSize: theme.fontSizes["2xl"],
                          fontWeight: theme.fontWeights.bold,
                          lineHeight: "1.2",
                          marginBottom: "0.25rem",
                          wordBreak: "break-word",
                        }}
                      >
                        {repoPath}
                      </h2>
                    </div>
                  </div>

                  {/* Release Type Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem",
                      fontSize: theme.fontSizes.sm,
                      color: theme.colors.textMuted,
                    }}
                  >
                    <span>{releaseType || "Release"}</span>
                  </div>
                </div>
              </div>

              {/* File Type Breakdown Bar - Always Centered */}
              {highlightLayers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    right: 0,
                    transform: "translateY(-50%)",
                    width: "100%",
                    padding: "0 1rem",
                  }}
                >
                  <FileTypeBreakdownBar
                    highlightLayers={highlightLayers}
                    height={10}
                    showLabels={false}
                  />
                </div>
              )}

              {/* Bottom Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                {/* Author Info */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: theme.fontSizes.base,
                    color: theme.colors.textSecondary,
                    opacity: 0.8,
                    lineHeight: "1.5",
                  }}
                >
                  <div
                    style={{
                      fontWeight: theme.fontWeights.medium,
                      fontSize: theme.fontSizes.lg,
                    }}
                  >
                    by {releaseStats.author}
                  </div>
                  <div style={{ fontStyle: "italic", marginTop: "0.25rem" }}>
                    {releaseStats.previousReleaseDate ? (
                      <>
                        {new Date(
                          releaseStats.previousReleaseDate,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" → "}
                        {new Date(
                          releaseStats.publishedAt || releaseStats.createdAt,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      new Date(
                        releaseStats.publishedAt || releaseStats.createdAt,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    )}
                  </div>
                </div>

                {/* Release Stats - Compact Two Box Layout */}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "0.75rem",
                  }}
                >
                  {/* Contributors Box */}
                  <div
                    style={{
                      backgroundColor: theme.colors.backgroundSecondary,
                      border: `2px solid ${theme.colors.textSecondary}`,
                      borderRadius: "4px",
                      padding: "0.5rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xl,
                          fontWeight: theme.fontWeights.bold,
                          color: theme.colors.text,
                        }}
                      >
                        {releaseStats.contributorCount || 0}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        people
                      </div>
                    </div>
                    <div
                      style={{
                        width: "1px",
                        height: "30px",
                        backgroundColor: theme.colors.border,
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xl,
                          fontWeight: theme.fontWeights.bold,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {releaseStats.commits || 0}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        commits
                      </div>
                    </div>
                  </div>

                  {/* Code Changes Box */}
                  <div
                    style={{
                      backgroundColor: theme.colors.backgroundSecondary,
                      border: `2px solid ${theme.colors.primary}`,
                      borderRadius: "4px",
                      padding: "0.5rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      boxShadow: `0 2px 4px ${theme.colors.primaryLight}`,
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xl,
                          fontWeight: theme.fontWeights.bold,
                          color: theme.colors.primary,
                        }}
                      >
                        {changedFiles.length}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        files
                      </div>
                    </div>
                    <div
                      style={{
                        width: "1px",
                        height: "30px",
                        backgroundColor: theme.colors.border,
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xl,
                          fontWeight: theme.fontWeights.bold,
                          color:
                            (releaseStats.additions || 0) -
                              (releaseStats.deletions || 0) >=
                            0
                              ? "#22c55e"
                              : "#ef4444",
                        }}
                      >
                        {(releaseStats.additions || 0) -
                          (releaseStats.deletions || 0) >
                        0
                          ? "+"
                          : ""}
                        {(releaseStats.additions || 0) -
                          (releaseStats.deletions || 0)}
                      </div>
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                        }}
                      >
                        net lines
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Visualization */}
            <div
              style={{
                position: "relative",
                height: "100%",
              }}
            >
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    flexDirection: "column",
                    gap: "1rem",
                    color: theme.colors.textSecondary,
                  }}
                >
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      border: `3px solid ${theme.colors.borderLight}`,
                      borderTop: `3px solid ${theme.colors.primary}`,
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div style={{ textAlign: "center" }}>
                    <h3
                      style={{
                        fontSize: theme.fontSizes.lg,
                        marginBottom: "0.25rem",
                      }}
                    >
                      Analyzing changes...
                    </h3>
                    <p
                      style={{
                        fontSize: theme.fontSizes.base,
                        color: theme.colors.textMuted,
                      }}
                    >
                      Release {releaseStats.tag}
                    </p>
                  </div>
                </div>
              ) : cityData ? (
                <div
                  style={{
                    height: "380px",
                    borderRadius: 0,
                    overflow: "hidden",
                    backgroundColor: theme.colors.background,
                    border: `2px solid ${theme.colors.border}`,
                    position: "relative",
                  }}
                >
                  <ArchitectureMapHighlightLayers
                    cityData={cityData}
                    highlightLayers={highlightLayers}
                    canvasBackgroundColor={theme.colors.background}
                    className="w-full h-full"
                    onFileClick={handleFileClick}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "380px",
                    color: theme.colors.textMuted,
                    textAlign: "center",
                    backgroundColor: theme.colors.backgroundTertiary,
                    borderRadius: theme.radius.xl,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div>
                    <GitPullRequest
                      size={32}
                      style={{ marginBottom: "0.75rem", opacity: 0.5 }}
                    />
                    <p style={{ fontSize: theme.fontSizes.lg }}>
                      PR visualization will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Map Image Capture Component */}
        {cityData && (
          <div
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              width: "800px",
              height: "600px",
            }}
          >
            <MapImageCapture
              cityData={cityData}
              highlightLayers={highlightLayers}
              canvasBackgroundColor={theme.colors.background}
              onMapImageGenerated={onMapShare}
              onGenerateMapImageRef={onGenerateMapImageRef}
              onFileClick={
                onFileClick
                  ? (path, type, extension) => {
                      // Find the corresponding changed file
                      const fileInfo = changedFiles.find(
                        (f) => f.filename === path,
                      );
                      onFileClick(path, type, extension, fileInfo);
                    }
                  : undefined
              }
              className="w-full h-full"
            />
          </div>
        )}

        {/* Mobile-specific adjustments */}
        <style jsx>{`
          @media (max-width: 1024px) {
            .postcard-grid {
              grid-template-columns: 1fr !important;
              gap: 1.5rem !important;
            }

            .postcard-info {
              order: 2;
            }

            .postcard-map {
              order: 1;
              min-height: 300px;
            }
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>

      {/* Action Buttons - Outside the postcard */}
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
          <GitBranch size={14} />
          {showGradient ? "Hide Gradient" : "Show Gradient"}
        </button>

        <a
          href={releaseStats.htmlUrl}
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
      </div>
    </div>
  );
};
