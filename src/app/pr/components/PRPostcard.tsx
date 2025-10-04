"use client";

import React, { useState, useMemo } from "react";
import { useToPng } from "@hugocxl/react-to-image";
import {
  GitMerge,
  GitPullRequest,
  Github,
  GitBranch,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  ArchitectureMapHighlightLayers,
  HighlightLayer,
} from "@principal-ai/code-city-react";
import { useMosaicTheme } from "../../mosaic/components/MosaicTheme";
import { FileTypeBreakdownBar } from "../../../components/FileTypeBreakdownBar";
import { MapImageCapture } from "../../../components/MapImageCapture";

interface PRStats {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  headRef: string;
  baseRef: string;
  htmlUrl: string;
  body?: string;
  mergeable?: boolean;
  mergedAt?: string;
  reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
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

interface PRPostcardProps {
  repoPath: string;
  prStats: PRStats;
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

// Helper function to get PR state info
const getPRStateInfo = (
  state: string,
  mergedAt?: string,
  reviewDecision?: string | null,
) => {
  if (state === "merged" || mergedAt) {
    return {
      icon: GitMerge,
      color: "#8b5cf6", // Purple for merged
      text: "Merged",
      bgColor: "#f3f4f6",
    };
  }

  if (state === "closed") {
    return {
      icon: XCircle,
      color: "#ef4444", // Red for closed
      text: "Closed",
      bgColor: "#fef2f2",
    };
  }

  // Open state - check review status
  if (reviewDecision === "APPROVED") {
    return {
      icon: CheckCircle,
      color: "#22c55e", // Green for approved
      text: "Approved",
      bgColor: "#f0fdf4",
    };
  } else if (reviewDecision === "CHANGES_REQUESTED") {
    return {
      icon: AlertCircle,
      color: "#f59e0b", // Orange for changes requested
      text: "Changes Requested",
      bgColor: "#fffbeb",
    };
  } else {
    return {
      icon: GitPullRequest,
      color: "#3b82f6", // Blue for open/review required
      text: "Open",
      bgColor: "#eff6ff",
    };
  }
};

export const PRPostcard: React.FC<PRPostcardProps> = ({
  prStats,
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

  const stateInfo = getPRStateInfo(
    prStats.state,
    prStats.mergedAt,
    prStats.reviewDecision,
  );
  const StateIcon = stateInfo.icon;

  // Calculate file type counts and line changes from changed files
  const fileTypeStats = useMemo(() => {
    const stats = {
      added: 0,
      modified: 0,
      removed: 0,
      renamed: 0,
      addedLines: 0,
      modifiedAdditions: 0,
      modifiedDeletions: 0,
      removedLines: 0,
    };

    changedFiles.forEach((file) => {
      switch (file.status) {
        case "added":
          stats.added++;
          stats.addedLines += file.additions;
          break;
        case "modified":
          stats.modified++;
          stats.modifiedAdditions += file.additions;
          stats.modifiedDeletions += file.deletions;
          break;
        case "removed":
          stats.removed++;
          stats.removedLines += file.deletions;
          break;
        case "renamed":
          stats.renamed++;
          // Renamed files might also have modifications
          stats.modifiedAdditions += file.additions;
          stats.modifiedDeletions += file.deletions;
          break;
      }
    });

    return stats;
  }, [changedFiles]);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* PR Postcard */}
      <div
        ref={postcardRef}
        data-testid="pr-postcard"
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
                        backgroundColor: stateInfo.bgColor,
                        border: `1px solid ${stateInfo.color}40`,
                        borderRadius: "1rem",
                        maxWidth: "fit-content",
                        margin: "0 auto 1rem auto",
                      }}
                    >
                      <StateIcon size={16} color={stateInfo.color} />
                      <span
                        style={{
                          fontSize: theme.fontSizes.sm,
                          fontWeight: theme.fontWeights.medium,
                          color: stateInfo.color,
                        }}
                      >
                        {stateInfo.text} #{prStats.number}
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
                        {prStats.title}
                      </h2>
                    </div>
                  </div>

                  {/* Branch Info */}
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
                    <GitBranch size={14} />
                    <span>{prStats.headRef}</span>
                    <span>→</span>
                    <span>{prStats.baseRef}</span>
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
                    by {prStats.author}
                  </div>
                  <div style={{ fontStyle: "italic", marginTop: "0.25rem" }}>
                    {new Date(prStats.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* PR Stats - Sharp Horizontal Layout */}
                <div
                  style={{
                    display: "flex",
                    gap: "2rem",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    marginTop: "0.75rem",
                  }}
                >
                  {/* Files Added */}
                  {fileTypeStats.added > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: theme.fontWeights.medium,
                        }}
                      >
                        Files Added
                      </div>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: "#22c55e",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: "2px",
                          boxShadow: "0 2px 4px rgba(34, 197, 94, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: theme.fontSizes.xl,
                            fontWeight: theme.fontWeights.bold,
                            color: "white",
                          }}
                        >
                          {fileTypeStats.added}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "rgba(255, 255, 255, 0.9)",
                            fontWeight: theme.fontWeights.medium,
                          }}
                        >
                          +{fileTypeStats.addedLines} lines
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Files Modified */}
                  {fileTypeStats.modified > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: theme.fontWeights.medium,
                        }}
                      >
                        Files Modified
                      </div>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: theme.colors.backgroundSecondary,
                          border: `2px solid #f59e0b`,
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: "2px",
                          boxShadow: "0 2px 4px rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: theme.fontSizes.xl,
                            fontWeight: theme.fontWeights.bold,
                            color: "#f59e0b",
                          }}
                        >
                          {fileTypeStats.modified}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: theme.colors.textMuted,
                            fontWeight: theme.fontWeights.medium,
                            display: "flex",
                            gap: "0.25rem",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#22c55e" }}>
                            +{fileTypeStats.modifiedAdditions}
                          </span>
                          <span style={{ color: "#ef4444" }}>
                            -{fileTypeStats.modifiedDeletions}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Files Removed */}
                  {fileTypeStats.removed > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: theme.fontSizes.xs,
                          color: theme.colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: theme.fontWeights.medium,
                        }}
                      >
                        Files Removed
                      </div>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: "#ef4444",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: "2px",
                          boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: theme.fontSizes.xl,
                            fontWeight: theme.fontWeights.bold,
                            color: "white",
                          }}
                        >
                          {fileTypeStats.removed}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "rgba(255, 255, 255, 0.9)",
                            fontWeight: theme.fontWeights.medium,
                          }}
                        >
                          -{fileTypeStats.removedLines} lines
                        </div>
                      </div>
                    </div>
                  )}
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
                      PR #{prStats.number}
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
          href={prStats.htmlUrl}
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
