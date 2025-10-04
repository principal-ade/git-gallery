"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Github,
  ArrowLeft,
  ImageOff,
  Loader2,
} from "lucide-react";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../../mosaic/components/MosaicTheme";
import Link from "next/link";
import { GalleryStorage } from "../../../lib/galleryStorage";
import { Gallery } from "../../../types/gallery";
import { HighlightLayer, useCodeCityData } from "@principal-ai/code-city-react";
import {
  createFileColorHighlightLayers,
  DEFAULT_FILE_CONFIGS,
} from "../../../utils/fileColorMapping";
import { GitHubService } from "../../../services/githubService";
import { MosaicPostcardClean } from "../../mosaic/components/MosaicPostcardClean";

interface GalleryPageProps {
  params: Promise<{
    galleryId: string;
  }>;
}

function GalleryViewContent({ params }: GalleryPageProps) {
  const theme = useMosaicTheme();
  const unwrappedParams = React.use(params);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState("");
  const [addRepoError, setAddRepoError] = useState<string | null>(null);
  const [validatingRepo, setValidatingRepo] = useState(false);

  useEffect(() => {
    loadGallery();
  }, [unwrappedParams.galleryId]);

  const loadGallery = () => {
    const loaded = GalleryStorage.getById(unwrappedParams.galleryId);
    setGallery(loaded);
    setLoading(false);
  };

  const handleAddRepo = async () => {
    if (!gallery || !newRepoInput.trim()) return;

    setAddRepoError(null);
    setValidatingRepo(true);

    // Parse the input
    let owner = "";
    let repo = "";

    const trimmedInput = newRepoInput.trim();

    // Handle full GitHub URLs
    if (trimmedInput.includes("github.com")) {
      const match = trimmedInput.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
      if (match) {
        owner = match[1];
        repo = match[2];
      } else {
        setAddRepoError("Invalid GitHub URL");
        return;
      }
    } else {
      // Handle owner/repo format
      const parts = trimmedInput.split("/");
      if (parts.length !== 2) {
        setAddRepoError("Please use format: owner/repository");
        return;
      }
      owner = parts[0];
      repo = parts[1];
    }

    // Remove .git suffix if present
    repo = repo.replace(/\.git$/, "");

    // Check if already exists
    const exists = gallery.repos.some(
      (r) => r.owner === owner && r.repo === repo,
    );
    if (exists) {
      setAddRepoError("This repository is already in the gallery");
      setValidatingRepo(false);
      return;
    }

    // Validate that the repository exists and is public
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setAddRepoError(
            "Repository not found. Please check the repository name.",
          );
        } else if (response.status === 403) {
          setAddRepoError(
            "GitHub API rate limit exceeded. Please try again later.",
          );
        } else {
          setAddRepoError("Failed to validate repository. Please try again.");
        }
        setValidatingRepo(false);
        return;
      }

      const repoData = await response.json();

      // Check if repository is private
      if (repoData.private) {
        setAddRepoError(
          "This is a private repository. Only public repositories are supported.",
        );
        setValidatingRepo(false);
        return;
      }

      // Validation successful - add the repository
      GalleryStorage.addRepo(gallery.id, owner, repo);
      loadGallery();
      setShowAddRepoModal(false);
      setNewRepoInput("");
      setValidatingRepo(false);
    } catch (error) {
      console.error("Failed to validate repository:", error);
      setAddRepoError(
        "Failed to validate repository. Please check your connection and try again.",
      );
      setValidatingRepo(false);
    }
  };

  const handleRemoveRepo = (owner: string, repo: string) => {
    if (!gallery) return;

    if (confirm(`Remove ${owner}/${repo} from this gallery?`)) {
      GalleryStorage.removeRepo(gallery.id, owner, repo);
      loadGallery();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.colors.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.colors.textSecondary,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            size={32}
            style={{
              animation: "spin 1s linear infinite",
              marginBottom: "1rem",
            }}
          />
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
            padding: "4rem 2rem",
          }}
        >
          <h1
            style={{
              fontSize: theme.fontSizes["3xl"],
              marginBottom: "1rem",
              color: theme.colors.error,
            }}
          >
            Gallery Not Found
          </h1>
          <p
            style={{
              fontSize: theme.fontSizes.base,
              color: theme.colors.textSecondary,
              marginBottom: "2rem",
            }}
          >
            The gallery you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Link
            href="/my-galleries"
            style={{
              ...theme.components.button.primary,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ArrowLeft size={20} />
            Back to Galleries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Header Section */}
      <section
        style={{
          padding: "2rem 1.5rem",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/my-galleries"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: theme.colors.textSecondary,
            fontSize: theme.fontSizes.sm,
            marginBottom: "1rem",
          }}
        >
          <ArrowLeft size={16} />
          Back to My Galleries
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: theme.fontSizes["4xl"],
                fontWeight: theme.fontWeights.bold,
                fontFamily: theme.fonts.heading,
                lineHeight: "1.1",
                marginBottom: "0.5rem",
                background:
                  "linear-gradient(135deg, #d4a574 0%, #e0b584 50%, #c9b8a3 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {gallery.name}
            </h1>
            {gallery.description && (
              <p
                style={{
                  fontSize: theme.fontSizes.base,
                  color: theme.colors.textSecondary,
                }}
              >
                {gallery.description}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowAddRepoModal(true)}
            style={{
              ...theme.components.button.primary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <Plus size={20} />
            Add Repository
          </button>
        </div>

        <p
          style={{
            fontSize: theme.fontSizes.sm,
            color: theme.colors.textMuted,
          }}
        >
          {gallery.repos.length}{" "}
          {gallery.repos.length === 1 ? "repository" : "repositories"}
        </p>
      </section>

      {/* Repositories Grid */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 1.5rem 4rem",
        }}
      >
        {gallery.repos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.radius.xl,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <Github
              size={64}
              style={{
                marginBottom: "1rem",
                opacity: 0.5,
                color: theme.colors.textMuted,
              }}
            />
            <h3
              style={{
                fontSize: theme.fontSizes.xl,
                marginBottom: "0.5rem",
                color: theme.colors.text,
              }}
            >
              No repositories yet
            </h3>
            <p
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.textSecondary,
                marginBottom: "1.5rem",
              }}
            >
              Add your first repository to start building your gallery
            </p>
            <button
              onClick={() => setShowAddRepoModal(true)}
              style={{
                ...theme.components.button.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <Plus size={20} />
              Add Repository
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(900px, 1fr))",
              gap: "2rem",
            }}
          >
            {gallery.repos.map((repoItem) => (
              <RepositoryCard
                key={`${repoItem.owner}/${repoItem.repo}`}
                owner={repoItem.owner}
                repo={repoItem.repo}
                theme={theme}
                onRemove={() => handleRemoveRepo(repoItem.owner, repoItem.repo)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add Repository Modal */}
      {showAddRepoModal && (
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
          onClick={() => {
            if (!validatingRepo) {
              setShowAddRepoModal(false);
              setNewRepoInput("");
              setAddRepoError(null);
            }
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
                Add Repository
              </h3>
              <button
                onClick={() => {
                  if (!validatingRepo) {
                    setShowAddRepoModal(false);
                    setNewRepoInput("");
                    setAddRepoError(null);
                  }
                }}
                disabled={validatingRepo}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: validatingRepo ? "not-allowed" : "pointer",
                  color: theme.colors.textMuted,
                  padding: "0.25rem",
                  opacity: validatingRepo ? 0.5 : 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Repository
              </label>
              <input
                type="text"
                value={newRepoInput}
                onChange={(e) => {
                  setNewRepoInput(e.target.value);
                  setAddRepoError(null);
                }}
                placeholder="owner/repository or GitHub URL"
                style={{
                  ...theme.components.input,
                  width: "100%",
                }}
                autoFocus
                disabled={validatingRepo}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !validatingRepo) {
                    handleAddRepo();
                  }
                }}
              />
              <p
                style={{
                  fontSize: theme.fontSizes.xs,
                  color: theme.colors.textMuted,
                  marginTop: "0.5rem",
                }}
              >
                Only public GitHub repositories are supported. Private
                repositories cannot be added.
              </p>
              {addRepoError && (
                <p
                  style={{
                    fontSize: theme.fontSizes.sm,
                    color: theme.colors.error,
                    marginTop: "0.5rem",
                  }}
                >
                  {addRepoError}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowAddRepoModal(false);
                  setNewRepoInput("");
                  setAddRepoError(null);
                }}
                disabled={validatingRepo}
                style={{
                  ...theme.components.button.secondary,
                  flex: 1,
                  cursor: validatingRepo ? "not-allowed" : "pointer",
                  opacity: validatingRepo ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRepo}
                disabled={validatingRepo}
                style={{
                  ...theme.components.button.primary,
                  flex: 1,
                  cursor: validatingRepo ? "not-allowed" : "pointer",
                  opacity: validatingRepo ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                {validatingRepo && (
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {validatingRepo ? "Validating..." : "Add Repository"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinning animation */}
      <style jsx>{`
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
  );
}

function RepositoryCard({
  owner,
  repo,
  theme,
  onRemove,
}: {
  owner: string;
  repo: string;
  theme: any;
  onRemove: () => void;
}) {
  const repoPath = `${owner}/${repo}`;
  const [fileSystemTree, setFileSystemTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [repoStats, setRepoStats] = useState<any>(null);

  // Get city data from file system tree
  const { cityData } = useCodeCityData({
    fileSystemTree,
    autoUpdate: true,
  });

  // Create highlight layers based on file types
  const highlightLayers = useMemo((): HighlightLayer[] => {
    if (!fileSystemTree) return [];
    return createFileColorHighlightLayers(DEFAULT_FILE_CONFIGS, fileSystemTree);
  }, [fileSystemTree]);

  // Load repository data
  useEffect(() => {
    const loadRepo = async () => {
      setLoading(true);
      setError(false);

      try {
        const githubService = new GitHubService();
        const repoInfo = await githubService.fetchRepositoryInfo(owner, repo);
        const tree = await githubService.fetchFileSystemTree(
          owner,
          repo,
          repoInfo.defaultBranch,
        );
        setFileSystemTree(tree);

        // Set repo stats
        setRepoStats({
          stars: repoInfo.stars,
          forks: repoInfo.forks,
          watchers: repoInfo.watchers,
          language: repoInfo.language || "Unknown",
          description: repoInfo.description || `Repository ${repo}`,
          lastUpdated: new Date(repoInfo.updatedAt).toLocaleDateString(),
          license: repoInfo.license,
          ageInDays: repoInfo.ageInDays,
          isFork: repoInfo.isFork,
        });
      } catch (err) {
        console.error(`Failed to load ${repoPath}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadRepo();
  }, [owner, repo, repoPath]);

  return (
    <div
      style={{
        position: "relative",
        cursor: "pointer",
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {loading ? (
        <div
          style={{
            width: "100%",
            aspectRatio: "2 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.backgroundTertiary,
            border: `2px solid ${theme.colors.border}`,
          }}
        >
          <Loader2
            size={32}
            style={{
              animation: "spin 1s linear infinite",
              color: theme.colors.textMuted,
            }}
          />
        </div>
      ) : error ? (
        <div
          style={{
            width: "100%",
            aspectRatio: "2 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.backgroundTertiary,
            border: `2px solid ${theme.colors.border}`,
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: theme.colors.textMuted,
            }}
          >
            <ImageOff size={32} style={{ marginBottom: "0.5rem" }} />
            <p style={{ fontSize: theme.fontSizes.sm }}>Click to visualize</p>
          </div>
        </div>
      ) : (
        <>
          <Link
            href={`/mosaic/${repoPath}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            }}
            aria-label={`View ${repoPath} mosaic`}
          />
          <MosaicPostcardClean
            repoPath={repoPath}
            repoStats={repoStats || undefined}
            cityData={cityData}
            highlightLayers={highlightLayers}
            loading={false}
            colorConfig={DEFAULT_FILE_CONFIGS}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(0, 0, 0, 0.5)",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              color: "white",
              padding: "0.5rem",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Remove from gallery"
          >
            <Trash2 size={18} />
          </button>
        </>
      )}
    </div>
  );
}

export default function GalleryViewPage({ params }: GalleryPageProps) {
  return (
    <MosaicThemeProvider>
      <GalleryViewContent params={params} />
    </MosaicThemeProvider>
  );
}
