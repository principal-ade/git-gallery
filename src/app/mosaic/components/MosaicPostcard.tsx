"use client";

import React, { useState } from "react";
import { useToPng } from "@hugocxl/react-to-image";
import {
  Star,
  Users,
  Scale,
  Github,
  File,
  Layers,
  GitFork,
  Palette,
} from "lucide-react";
import {
  ArchitectureMapHighlightLayers,
  HighlightLayer,
} from "@principal-ai/code-city-react";
import { useMosaicTheme } from "./MosaicTheme";
import { FileTypeBreakdownBar } from "../../../components/FileTypeBreakdownBar";
import { fetchColorPaletteConfig } from "@/services/configService";
import {
  FileSuffixConfig,
  FileSuffixColorConfig,
} from "@/utils/fileColorMapping";
import { MapImageCapture } from "../../../components/MapImageCapture";

interface RepoStats {
  stars: number;
  forks: number;
  watchers: number;
  contributors?: number;
  language: string;
  description: string;
  lastUpdated: string;
  license?: { name: string; spdx_id: string } | null;
  ageInDays?: number;
  isFork?: boolean;
}

interface MosaicPostcardProps {
  repoPath: string;
  repoStats?: RepoStats;
  cityData: any;
  highlightLayers: HighlightLayer[];
  loading?: boolean;
  onShare?: (imageBlob: Blob, imageUrl: string) => void;
  onGenerateImageRef?: React.MutableRefObject<(() => void) | null>;
  onMapShare?: (imageBlob: Blob, imageUrl: string) => void;
  onGenerateMapImageRef?: React.MutableRefObject<(() => void) | null>;
  colorConfig?: FileSuffixColorConfig;
  onFileClick?: (
    path: string,
    type: "file" | "directory",
    extension: string,
    config?: FileSuffixConfig,
  ) => void;
}

// Helper function to get establishment date
const getEstablishedDate = (days?: number): string => {
  if (!days)
    return `Est. ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const establishedDate = new Date();
  establishedDate.setDate(establishedDate.getDate() - days);
  return `Est. ${establishedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
};

export const MosaicPostcard: React.FC<MosaicPostcardProps> = ({
  repoPath,
  repoStats,
  cityData,
  highlightLayers,
  loading = false,
  onShare,
  onGenerateImageRef,
  onMapShare,
  onGenerateMapImageRef,
  colorConfig,
  onFileClick,
}) => {
  const theme = useMosaicTheme();
  const [owner, repoName] = repoPath.split("/");
  const [showGradient, setShowGradient] = useState(true);

  // Hook to convert the postcard to PNG
  const [, convertToPng, postcardRef] = useToPng<HTMLDivElement>({
    onSuccess: (data) => {
      // Convert base64 data URL to Blob for sharing
      fetch(data)
        .then((res) => res.blob())
        .then((blob) => {
          if (onShare) {
            onShare(blob, data); // Pass both blob and data URL
          }
        })
        .catch(console.error);
    },
    onError: (error) => {
      console.error("Failed to convert postcard to image:", error);
    },
  });

  // Expose the generateImage function to parent via ref
  React.useEffect(() => {
    if (onGenerateImageRef) {
      onGenerateImageRef.current = convertToPng;
    }
  }, [onGenerateImageRef, convertToPng]);

  // Handle file click to show color info
  const handleFileClick = async (path: string, type: "file" | "directory") => {
    if (type === "file" && onFileClick) {
      const lastDot = path.lastIndexOf(".");
      if (lastDot !== -1 && lastDot !== path.length - 1) {
        const extension = path.substring(lastDot);

        // Use the passed color config, or fetch if not provided
        let config: FileSuffixConfig | undefined;

        if (colorConfig && colorConfig.suffixConfigs) {
          config = colorConfig.suffixConfigs[extension];
        }

        // Fallback to fetching if no config was passed or extension not found
        if (!config) {
          const result = await fetchColorPaletteConfig();
          if (result.config && result.config.suffixConfigs) {
            config = result.config.suffixConfigs[extension];
          }
        }

        onFileClick(path, type, extension, config);
      }
    }
  };

  // Get file and directory counts from cityData metadata
  const files = cityData?.metadata?.totalFiles || 0;

  // Get number of file types from highlightLayers
  const fileTypes = highlightLayers
    ? highlightLayers.filter((layer) => layer.items.length > 0).length
    : 0;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Postcard */}
      <div
        ref={postcardRef}
        style={{
          position: "relative",
          backgroundColor: "#212738", // Keep the same solid background color
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
            {/* Left Side: Repository Info */}
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
                {/* Repository Header */}
                <div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    {/* Repo and Owner Info */}
                    <div style={{ textAlign: "center" }}>
                      <h2
                        style={{
                          fontSize: theme.fontSizes["4xl"],
                          fontWeight: theme.fontWeights.bold,
                          lineHeight: "1.2",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ wordBreak: "break-all" }}>
                          {repoName}
                        </span>
                      </h2>
                    </div>
                  </div>

                  {repoStats && (
                    <>
                      <p
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.fontSizes.lg,
                          fontWeight: 400,
                          margin: "0 0 1rem 0",
                          lineHeight: "1.5",
                          textAlign: "center",
                        }}
                      >
                        {repoStats.description}
                      </p>
                    </>
                  )}
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
                {/* Fork Badge */}
                {repoStats?.isFork && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      fontSize: theme.fontSizes.sm,
                      color: theme.colors.textMuted,
                      opacity: 0.7,
                    }}
                  >
                    <GitFork size={12} />
                    <span style={{ fontStyle: "italic" }}>Fork</span>
                  </div>
                )}

                {/* Establishment Date and Owner */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: theme.fontSizes.base,
                    color: theme.colors.textSecondary,
                    opacity: 0.8,
                    lineHeight: "1.5",
                  }}
                >
                  {repoStats?.ageInDays !== undefined && (
                    <div style={{ fontStyle: "italic" }}>
                      {getEstablishedDate(repoStats.ageInDays)}
                    </div>
                  )}
                  <div
                    style={{
                      fontWeight: theme.fontWeights.medium,
                      marginTop: "0.25rem",
                      fontSize: theme.fontSizes.lg,
                    }}
                  >
                    by {owner}
                  </div>
                </div>

                {/* Repository Stats */}
                {(repoStats || cityData) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "1rem",
                    }}
                  >
                    {repoStats && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          minWidth: "45px",
                        }}
                      >
                        <Star size={20} color={theme.colors.textSecondary} />
                        <span
                          style={{
                            fontSize: theme.fontSizes.base,
                            fontWeight: theme.fontWeights.medium,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {repoStats.stars.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {repoStats?.contributors && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          minWidth: "45px",
                        }}
                      >
                        <Users size={20} color={theme.colors.textSecondary} />
                        <span
                          style={{
                            fontSize: theme.fontSizes.base,
                            fontWeight: theme.fontWeights.medium,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {repoStats.contributors.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* License Badge */}
                    {repoStats &&
                      (() => {
                        const licenseText = repoStats.license
                          ? repoStats.license.spdx_id || repoStats.license.name
                          : "No License";

                        let badgeColor = theme.colors.textSecondary;

                        if (!repoStats.license) {
                          badgeColor = "#888";
                        } else if (
                          licenseText.includes("MIT") ||
                          licenseText.includes("Apache") ||
                          licenseText.includes("BSD")
                        ) {
                          badgeColor = "#22c55e";
                        } else if (licenseText.includes("GPL")) {
                          badgeColor = "#3b82f6";
                        } else if (
                          licenseText === "NOASSERTION" ||
                          licenseText === "Other"
                        ) {
                          badgeColor = "#f59e0b";
                        }

                        return (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.25rem",
                              minWidth: "45px",
                            }}
                          >
                            <Scale size={20} color={badgeColor} />
                            <span
                              style={{
                                fontSize: theme.fontSizes.base,
                                fontWeight: theme.fontWeights.medium,
                                color: badgeColor,
                              }}
                            >
                              {licenseText}
                            </span>
                          </div>
                        );
                      })()}
                    {fileTypes > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          minWidth: "45px",
                        }}
                      >
                        <Layers size={20} color={theme.colors.textSecondary} />
                        <span
                          style={{
                            fontSize: theme.fontSizes.base,
                            fontWeight: theme.fontWeights.medium,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {fileTypes.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {files > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          minWidth: "45px",
                        }}
                      >
                        <File size={20} color={theme.colors.textSecondary} />
                        <span
                          style={{
                            fontSize: theme.fontSizes.base,
                            fontWeight: theme.fontWeights.medium,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {files.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Mosaic Visualization */}
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
                      Crafting your mosaic...
                    </h3>
                    <p
                      style={{
                        fontSize: theme.fontSizes.base,
                        color: theme.colors.textMuted,
                      }}
                    >
                      Analyzing {repoPath}
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
                    <Github
                      size={32}
                      style={{ marginBottom: "0.75rem", opacity: 0.5 }}
                    />
                    <p style={{ fontSize: theme.fontSizes.lg }}>
                      Mosaic will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Map Image Capture Component - Only for generating map images */}
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
              onFileClick={onFileClick}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Mobile-specific adjustments using CSS-in-JS media queries */}
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
    </div>
  );
};
