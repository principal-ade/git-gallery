"use client";

import React, { useState, useEffect } from "react";
import {
  Github,
  Copy,
  Twitter,
  Linkedin,
  Shield,
  ArrowRight,
  Grid3x3,
} from "lucide-react";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "./mosaic/components/MosaicTheme";
import { GitHubService } from "../services/githubService";

interface GalleryItem {
  owner: string;
  repo: string;
  repoPath: string;
  imageUrl: string;
  createdAt: string;
  stats?: any;
  fileTree?: any;
}

function GitGalleryContent() {
  const theme = useMosaicTheme();
  const githubService = new GitHubService();
  const [repoInput, setRepoInput] = useState("");
  const [currentRepo, setCurrentRepo] = useState("a24z-ai/a24z-memory");
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentRepoIndex, setCurrentRepoIndex] = useState(0);
  const [preloadedTrees, setPreloadedTrees] = useState<Map<string, any>>(
    new Map(),
  );
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [featuredRepos, setFeaturedRepos] = useState<GalleryItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);

  // Load repository from gallery item
  const loadRepositoryFromGallery = async (item: GalleryItem) => {
    setError(null);
    setCurrentRepo(item.repoPath);
    // Simply set the current repo - actual display is handled elsewhere
  };

  // Preload next repository's file tree from gallery item
  const preloadRepository = async (item: GalleryItem) => {
    if (!item || preloadedTrees.has(item.repoPath)) return;

    try {
      // Simply store the gallery item for quick access
      // No API calls needed - we'll generate mock data on demand
      setPreloadedTrees((prev) => new Map(prev).set(item.repoPath, item));
    } catch (err) {
      console.error(`Failed to preload ${item.repoPath}:`, err);
    }
  };

  // Load repository with preloaded data if available
  const loadRepositoryWithCache = async (
    item: GalleryItem,
    withTransition: boolean = true,
  ) => {
    if (withTransition) {
      setIsTransitioning(true);
    }

    const preloadedItem = preloadedTrees.get(item.repoPath) || item;
    await loadRepositoryFromGallery(preloadedItem);

    if (withTransition) {
      // Let the CSS transition handle the animation
      setTimeout(() => setIsTransitioning(false), 100);
    }
  };

  // Automatic carousel rotation
  useEffect(() => {
    if (!isAutoPlaying || featuredRepos.length === 0 || isLoadingRepos) return;

    const timer = setInterval(() => {
      setCurrentRepoIndex((prev) => {
        const nextIndex = (prev + 1) % featuredRepos.length;
        const nextItem = featuredRepos[nextIndex];

        // Preload the repository after this one
        const preloadIndex = (nextIndex + 1) % featuredRepos.length;
        preloadRepository(featuredRepos[preloadIndex]);

        // Load the next repository with transition
        loadRepositoryWithCache(nextItem, true);

        return nextIndex;
      });
    }, 5000); // 5 seconds per repository

    return () => clearInterval(timer);
  }, [isAutoPlaying, featuredRepos, isLoadingRepos]);

  // Fetch available repositories from gallery/cache
  useEffect(() => {
    const fetchFeaturedRepos = async () => {
      try {
        setIsLoadingRepos(true);
        const response = await fetch("/api/gallery?limit=5");
        const data = await response.json();

        let items: GalleryItem[] = [];

        if (data.items && data.items.length > 0) {
          items = data.items;

          // Ensure a24z-memory is first if it exists
          const a24zIndex = items.findIndex((item) =>
            item.repoPath.toLowerCase().includes("a24z-memory"),
          );
          if (a24zIndex > 0) {
            const a24zItem = items.splice(a24zIndex, 1)[0];
            items.unshift(a24zItem);
          }
        }

        // Items are already limited by the API to 5

        setFeaturedRepos(items);

        // Load first repository once we have the list
        if (items.length > 0) {
          await loadRepositoryFromGallery(items[0]);
          setIsTransitioning(false);
          // Preload the second repository
          if (items.length > 1) {
            preloadRepository(items[1]);
          }
        } else {
          setError(
            "No cached repositories available. Please generate some mosaics first.",
          );
        }
      } catch (error) {
        console.error("Failed to fetch featured repos:", error);
        setError(
          "No cached repositories available. Please generate some mosaics first.",
        );
      } finally {
        setIsLoadingRepos(false);
      }
    };

    fetchFeaturedRepos();
  }, []);

  // Handle form submission - validate git repo before redirect
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = repoInput.trim();
    if (trimmedInput) {
      // Parse the input using GitHubService to handle PR URLs
      const parsedRepo = githubService.parseRepositoryUrl(trimmedInput);

      if (parsedRepo && parsedRepo.isValid) {
        const repoPath = `${parsedRepo.owner}/${parsedRepo.name}`;

        // Check if this is a PR URL
        if (parsedRepo.prNumber) {
          // Direct redirect to PR visualization (no validation needed for PR URLs)
          window.location.href = `/pr/${parsedRepo.owner}/${parsedRepo.name}/${parsedRepo.prNumber}`;
          return;
        }

        // Regular repository - proceed with validation
        setPendingRepo(repoPath);
        setShowValidationModal(true);
        validateRepository(repoPath);
      } else {
        // Fallback to original parsing for backward compatibility
        let repoPath = trimmedInput;

        // Handle full GitHub URLs
        if (trimmedInput.includes("github.com")) {
          const match = trimmedInput.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
          if (match) {
            repoPath = `${match[1]}/${match[2]}`;
          }
        }

        // Remove .git suffix if present
        repoPath = repoPath.replace(/\.git$/, "");

        // Store the pending repo and show validation modal
        setPendingRepo(repoPath);
        setShowValidationModal(true);
        validateRepository(repoPath);
      }
    }
  };

  // Validate git repository
  const validateRepository = async (repoPath: string) => {
    setValidationLoading(true);
    setValidationError(null);

    try {
      // Check if the repository exists on GitHub
      const response = await fetch(`https://api.github.com/repos/${repoPath}`);

      if (!response.ok) {
        if (response.status === 404) {
          setValidationError(
            "Repository not found. Please check the repository name.",
          );
        } else if (response.status === 403) {
          setValidationError(
            "GitHub API rate limit exceeded. Please try again later.",
          );
        } else {
          setValidationError(
            "Failed to validate repository. Please try again.",
          );
        }
        setValidationLoading(false);
        return;
      }

      const repoData = await response.json();

      // Check if repository is private
      if (repoData.private) {
        setValidationError(
          "This is a private repository. Only public repositories are supported.",
        );
        setValidationLoading(false);
        return;
      }

      // Validation successful - proceed with redirect
      setValidationLoading(false);
      window.location.href = `/mosaic/${repoPath}`;
    } catch (error) {
      console.error("Failed to validate repository:", error);
      setValidationError(
        "Failed to validate repository. Please check your connection and try again.",
      );
      setValidationLoading(false);
    }
  };

  // Generate shareable URL
  const getShareableUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/mosaic/${currentRepo}`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Social sharing URLs
  const getTwitterShareUrl = () => {
    const url = getShareableUrl();
    const text = `This is ${currentRepo}! Created with Git Gallery`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  };

  const getLinkedInShareUrl = () => {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareableUrl())}`;
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
      {/* Top Navigation */}
      <section
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          maxWidth: "1400px",
          margin: "0 auto",
          zIndex: 10,
        }}
      >
        {/* View Gallery Button - Top Left */}
        <a
          href="/gallery"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.textSecondary,
            padding: "0.5rem 1rem",
            borderRadius: theme.radius.lg,
            fontSize: theme.fontSizes.sm,
            fontWeight: theme.fontWeights.medium,
            textDecoration: "none",
            border: `1px solid ${theme.colors.border}`,
            transition: "all 0.2s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              theme.colors.backgroundTertiary;
            e.currentTarget.style.color = theme.colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              theme.colors.backgroundSecondary;
            e.currentTarget.style.color = theme.colors.textSecondary;
          }}
        >
          <Grid3x3 size={14} />
          View Gallery
        </a>

        {/* Create Mosaic Button - Top Right */}
        <button
          onClick={() => setShowValidationModal(true)}
          aria-label="Create Mosaic"
          style={{
            ...theme.components.button.primary,
            fontSize: theme.fontSizes.sm,
            padding: "0.5rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            cursor: "pointer",
          }}
        >
          Create Mosaic
        </button>
      </section>

      {/* Hero Section */}
      <section
        style={{
          padding: "2rem 1.5rem 1rem",
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: theme.fontSizes["5xl"],
            fontWeight: theme.fontWeights.bold,
            fontFamily: theme.fonts.heading,
            lineHeight: "1.1",
            marginBottom: "1.5rem",
            background:
              "linear-gradient(135deg, #d4a574 0%, #e0b584 50%, #c9b8a3 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "0.02em",
            textShadow: "0 2px 4px rgba(212, 165, 116, 0.1)",
          }}
        >
          Git Gallery
        </h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: theme.colors.primaryLight,
            color: theme.colors.primary,
            padding: "0.5rem 1rem",
            borderRadius: theme.radius.full,
            fontSize: theme.fontSizes.sm,
            fontWeight: theme.fontWeights.medium,
            marginBottom: "0.5rem",
          }}
        >
          Programming is Changing, Change the way you see it
        </div>
      </section>

      {/* Loading State */}
      {isLoadingRepos && (
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1.5rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: theme.fontSizes.lg,
              color: theme.colors.textSecondary,
              padding: "3rem",
            }}
          >
            Loading repositories...
          </div>
        </section>
      )}

      {/* Error State */}
      {error && !isLoadingRepos && (
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1.5rem 2rem",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(168, 87, 81, 0.1)", // Translucent burgundy
              border: `1px solid ${theme.colors.error}`,
              borderRadius: theme.radius.xl,
              padding: "1.5rem",
              textAlign: "center",
              color: theme.colors.error,
            }}
          >
            <h3
              style={{
                fontSize: theme.fontSizes.lg,
                marginBottom: "0.5rem",
                fontFamily: theme.fonts.heading,
              }}
            >
              Repository Not Found
            </h3>
            <p style={{ fontFamily: theme.fonts.body }}>{error}</p>
          </div>
        </section>
      )}

      {/* Main Mosaic Display */}
      {!error && !isLoadingRepos && featuredRepos.length > 0 && (
        <section
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "1rem 1.5rem 3rem",
          }}
        >
          {/* Carousel Container with Image Display */}
          <div
            style={{
              position: "relative",
              width: "100%",
              overflow: "hidden",
            }}
          >
            {/* Image Carousel */}
            <div
              style={{
                display: "flex",
                transform: `translateX(-${currentRepoIndex * 100}%)`,
                transition: isTransitioning
                  ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                  : "none",
              }}
            >
              {featuredRepos.map((item, index) => (
                <div
                  key={item.repoPath}
                  style={{
                    minWidth: "100%",
                    width: "100%",
                    flexShrink: 0,
                    aspectRatio: "2 / 1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.repoPath} mosaic`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors.backgroundTertiary,
                        color: theme.colors.textMuted,
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div style={{ marginBottom: "0.5rem" }}>🎨</div>
                        <div style={{ fontSize: theme.fontSizes.sm }}>
                          Generating mosaic...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Controls - Below the postcard */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {/* Carousel Dots */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
              }}
            >
              {featuredRepos.map((item, index) => (
                <button
                  key={item.repoPath}
                  onClick={() => {
                    if (index !== currentRepoIndex) {
                      setCurrentRepoIndex(index);
                      setIsAutoPlaying(false);
                      loadRepositoryWithCache(item, true);
                    }
                  }}
                  style={{
                    width: index === currentRepoIndex ? "2rem" : "0.5rem",
                    height: "0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    backgroundColor:
                      index === currentRepoIndex
                        ? theme.colors.primary
                        : theme.colors.border,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  aria-label={`Go to ${item.repoPath}`}
                />
              ))}
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              style={{
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.lg,
                padding: "0.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.text,
              }}
              aria-label={isAutoPlaying ? "Pause carousel" : "Play carousel"}
            >
              {isAutoPlaying ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <rect x="4" y="4" width="3" height="8" />
                  <rect x="9" y="4" width="3" height="8" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M5 4v8l6-4z" />
                </svg>
              )}
            </button>
          </div>
        </section>
      )}
      <section
        style={{
          padding: "0 1.5rem 3rem",
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Privacy Notice */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: "0.75rem 1rem",
            fontSize: theme.fontSizes.sm,
            color: theme.colors.textSecondary,
            marginBottom: "1rem",
          }}
        >
          <Shield size={16} style={{ color: theme.colors.success }} />
          <span style={{ fontFamily: theme.fonts.body }}>
            Privacy-first: We only analyze file structure, never code content
          </span>
        </div>
      </section>

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
                Share Your Mosaic
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
                  value={getShareableUrl()}
                  readOnly
                  style={{
                    ...theme.components.input,
                    flex: 1,
                    fontSize: theme.fontSizes.sm,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                />
                <button
                  onClick={() => copyToClipboard(getShareableUrl())}
                  style={{
                    ...theme.components.button.secondary,
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Copy size={16} />
                  Copy
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
                <a
                  href={getTwitterShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#1da1f2",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: theme.fontWeights.medium,
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Twitter size={16} />
                  Twitter
                </a>
                <a
                  href={getLinkedInShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#0077b5",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: theme.fontWeights.medium,
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Linkedin size={16} />
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
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
              maxWidth: "450px",
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
                Create Mosaic
              </h3>
              {!validationLoading && (
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationError(null);
                    setPendingRepo(null);
                  }}
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
              )}
            </div>

            {/* Repository Input */}
            {!pendingRepo && (
              <div>
                <label
                  style={{
                    fontSize: theme.fontSizes.sm,
                    fontWeight: theme.fontWeights.medium,
                    marginBottom: "0.5rem",
                    display: "block",
                    color: theme.colors.textSecondary,
                  }}
                >
                  Enter Repository
                </label>
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ flex: 1, position: "relative" }}>
                    <Github
                      size={20}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: theme.colors.textMuted,
                      }}
                    />
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="owner/repository or PR URL"
                      style={{
                        ...theme.components.input,
                        width: "100%",
                        paddingLeft: "3rem",
                        fontSize: theme.fontSizes.base,
                        border: `1px solid ${theme.colors.textMuted}`,
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      ...theme.components.button.primary,
                      padding: "0.75rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    Validate
                    <ArrowRight size={16} />
                  </button>
                </form>
                <p
                  style={{
                    fontSize: theme.fontSizes.xs,
                    color: theme.colors.textMuted,
                    marginTop: "0.5rem",
                  }}
                >
                  Enter a public GitHub repository (owner/repository) or pull
                  request URL
                </p>
              </div>
            )}

            {/* Validation Status */}
            {pendingRepo && (
              <div>
                {validationLoading && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 0",
                    }}
                  >
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        border: `3px solid ${theme.colors.border}`,
                        borderTop: `3px solid ${theme.colors.primary}`,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 1rem",
                      }}
                    />
                    <p
                      style={{
                        fontSize: theme.fontSizes.base,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      Validating repository: <strong>{pendingRepo}</strong>
                    </p>
                  </div>
                )}

                {validationError && !validationLoading && (
                  <div>
                    <div
                      style={{
                        backgroundColor: "rgba(168, 87, 81, 0.1)",
                        border: `1px solid ${theme.colors.error}`,
                        borderRadius: theme.radius.lg,
                        padding: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <p
                        style={{
                          fontSize: theme.fontSizes.sm,
                          color: theme.colors.error,
                          margin: 0,
                        }}
                      >
                        {validationError}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPendingRepo(null);
                        setValidationError(null);
                        setRepoInput("");
                      }}
                      style={{
                        ...theme.components.button.secondary,
                        width: "100%",
                        padding: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Try Another Repository
                    </button>
                  </div>
                )}
              </div>
            )}
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

export default function GitGalleryPage() {
  return (
    <MosaicThemeProvider>
      <GitGalleryContent />
    </MosaicThemeProvider>
  );
}
