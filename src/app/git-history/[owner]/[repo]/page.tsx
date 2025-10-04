"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  History,
  Clock,
  Rewind,
  Play,
  Pause,
  Square,
  Film,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { MapImageCapture } from "@/components/MapImageCapture";
import {
  HighlightLayer,
  MultiVersionCityBuilder,
  useCodeCityData,
} from "@principal-ai/code-city-react";
import {
  createFileColorHighlightLayers,
  DEFAULT_FILE_CONFIGS,
} from "@/utils/fileColorMapping";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../../../mosaic/components/MosaicTheme";
import { GitHubService } from "@/services/githubService";

function GitHistoryContent() {
  const theme = useMosaicTheme();
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [fileSystemTree, setFileSystemTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShowingHistory, setIsShowingHistory] = useState(false);
  const [historyStep, setHistoryStep] = useState(0);
  const [maxSteps] = useState(20); // Number of frames to capture for the GIF
  const [timeline, setTimeline] = useState<Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }> | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotCache, setSnapshotCache] = useState<Map<string, any>>(
    new Map(),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const [showGifPreview, setShowGifPreview] = useState(false);
  const [generatingGif, setGeneratingGif] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<
    Map<string, { blob: Blob; url: string; commit: any }>
  >(new Map());
  const [canonicalLayout, setCanonicalLayout] = useState<any>(null);
  const [presenceByVersion, setPresenceByVersion] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [canonicalReady, setCanonicalReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [isLoadingPhase, setIsLoadingPhase] = useState(false);
  const [gifGenerationProgress, setGifGenerationProgress] = useState<{
    step: string;
    current: number;
    total: number;
  } | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>("main");
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureMapRef = useRef<(() => void) | null>(null);
  const pendingCaptureRef = useRef<string | null>(null);
  const capturedFramesRef = useRef<
    Map<string, { blob: Blob; url: string; commit: any }>
  >(new Map());
  const captureResolveRef = useRef<(() => void) | null>(null);

  // Get city data from file system tree or use pre-built canonical data
  const { cityData } = useCodeCityData({
    fileSystemTree: fileSystemTree?.cityData ? null : fileSystemTree, // Skip if we have pre-built city data
    autoUpdate: true,
  });

  // Use pre-built city data if available
  const actualCityData = fileSystemTree?.cityData || cityData;

  // Create highlight layers based on file types
  const highlightLayers: HighlightLayer[] = React.useMemo(() => {
    if (!fileSystemTree) return [];
    return createFileColorHighlightLayers(DEFAULT_FILE_CONFIGS, fileSystemTree);
  }, [fileSystemTree]);

  // Load repository data (current state first)
  useEffect(() => {
    const loadRepository = async () => {
      if (!owner || !repo) return;

      setLoading(true);
      setError(null);

      try {
        const githubService = new GitHubService();

        // First fetch repository info to get the default branch
        const repoInfo = await githubService.fetchRepositoryInfo(owner, repo);
        const branch = repoInfo.defaultBranch || "main";
        setDefaultBranch(branch);

        // Then fetch the file tree for current state
        const tree = await githubService.fetchFileSystemTree(
          owner,
          repo,
          branch,
        );
        setFileSystemTree(tree);
      } catch (err: any) {
        console.error("Error loading repository:", err);
        setError(err.message || "Failed to load repository");
      } finally {
        setLoading(false);
      }
    };

    loadRepository();
  }, [owner, repo]);

  // Start history animation with canonical layout
  const startHistoryAnimation = async () => {
    setLoadingTimeline(true);
    setIsLoadingPhase(true);
    setHistoryStep(0);
    setIsShowingHistory(true);

    // Clear any previously captured frames
    setCapturedFrames(new Map());
    setCanonicalReady(false);

    try {
      // Load the timeline of commits
      setLoadingProgress("Loading timeline...");
      console.log("Loading timeline for", owner, repo);
      const response = await fetch(
        `/api/git-history/${owner}/${repo}/timeline?branch=${defaultBranch}&steps=${maxSteps}&mode=recent&days=14`,
      );

      if (!response.ok) {
        throw new Error("Failed to load timeline");
      }

      const data = await response.json();
      console.log("Timeline loaded:", data);

      // Timeline comes in chronological order (oldest to newest)
      // We'll keep it that way for playback
      const commits = data.commits;
      setTimeline(commits);

      // Load all snapshots to build canonical layout
      console.log("Loading all snapshots for canonical layout...");
      const versionTrees = new Map();

      // Show snapshots loading one by one with visual feedback
      for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        setLoadingProgress(
          `Loading snapshot ${i + 1}/${commits.length} - ${commit.message.split("\n")[0].substring(0, 50)}...`,
        );
        setHistoryStep(i);

        const response = await fetch(
          `/api/git-history/${owner}/${repo}/snapshot?sha=${commit.sha}`,
        );
        if (!response.ok) {
          console.warn(`Failed to load snapshot for ${commit.sha}`);
          continue;
        }

        const snapshotData = await response.json();
        versionTrees.set(commit.sha, snapshotData);

        // Cache the snapshot
        setSnapshotCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(commit.sha, snapshotData);
          return newCache;
        });

        // Show the snapshot visually as we load (non-canonical for now)
        setFileSystemTree(snapshotData);

        // Small delay to make the loading visible
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setLoadingProgress("Building multi-version city layout...");
      console.log(
        `Building multi-version city from ${versionTrees.size} snapshots...`,
      );

      // Build multi-version city from all versions
      const { unionCity, presenceByVersion } = MultiVersionCityBuilder.build(
        versionTrees,
        {
          // Options can be added here if needed (gridLayout, buffer, etc.)
        },
      );

      setLoadingProgress("Creating master city visualization...");
      console.log("Creating master city data with all files...");

      // The unionCity already contains all files across all versions
      // Store it as our canonical layout for compatibility
      console.log(
        `Master city created with ${unionCity.buildings.length} buildings`,
      );

      // Store the union city as our canonical layout
      // We'll use it with getVersionView for filtering
      setCanonicalLayout(unionCity);
      setPresenceByVersion(presenceByVersion);

      console.log("Multi-version city built successfully");

      // Load the first snapshot using canonical layout (oldest commit)
      setLoadingProgress("Applying canonical layout...");
      if (commits && commits.length > 0) {
        setHistoryStep(0);
        await loadSnapshotWithCanonical(0);

        // Give time for canonical layout to render
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Mark as ready and enable controls
      setCanonicalReady(true);
      setIsLoadingPhase(false);
      setLoadingProgress("");
    } catch (err) {
      console.error("Error loading timeline:", err);
      setError("Failed to load repository history");
      setIsLoadingPhase(false);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Load snapshot with canonical layout
  const loadSnapshotWithCanonical = async (commitIndex: number) => {
    if (
      !timeline ||
      commitIndex >= timeline.length ||
      !canonicalLayout ||
      !presenceByVersion
    )
      return;

    const commit = timeline[commitIndex];
    const presentFiles = presenceByVersion.get(commit.sha);

    if (!presentFiles) {
      console.warn(`No presence data for commit ${commit.sha}`);
      return;
    }

    console.log(
      `Loading snapshot for ${commit.sha.substring(0, 7)} with ${presentFiles.size} files`,
    );
    console.log("Present files sample:", Array.from(presentFiles).slice(0, 3));

    // Use MultiVersionCityBuilder.getVersionView to get the filtered city
    const cityDataForVersion = MultiVersionCityBuilder.getVersionView(
      canonicalLayout, // This is now the unionCity
      presentFiles,
    );

    console.log(
      `Filtered city has ${cityDataForVersion.buildings.length} buildings`,
    );

    // Get the original snapshot for file information
    const originalSnapshot = snapshotCache.get(commit.sha);

    // Create the pseudo tree for compatibility
    const pseudoTree = {
      sha: commit.sha,
      root: originalSnapshot?.root || { path: ".", name: "root", children: [] },
      allFiles: originalSnapshot?.allFiles || [],
      allDirectories: originalSnapshot?.allDirectories || [],
      stats: {
        totalFiles: cityDataForVersion.buildings.length,
        totalDirectories: cityDataForVersion.districts.length,
        totalSize: 0,
        maxDepth: 0,
      },
      cityData: cityDataForVersion,
    };

    setFileSystemTree(pseudoTree);
  };

  // Load snapshot for a specific commit (original method)
  const loadSnapshot = async (
    commitIndex: number,
    useCache: boolean = true,
  ) => {
    if (!timeline || commitIndex >= timeline.length) return;

    const commit = timeline[commitIndex];

    // Check cache first
    if (useCache && snapshotCache.has(commit.sha)) {
      console.log(`Using cached snapshot for ${commit.sha.substring(0, 7)}`);
      const cachedSnapshot = snapshotCache.get(commit.sha);
      setFileSystemTree(cachedSnapshot);
      return cachedSnapshot;
    }

    setLoadingSnapshot(true);

    try {
      console.log(`Loading snapshot for commit ${commit.sha.substring(0, 7)}`);
      const response = await fetch(
        `/api/git-history/${owner}/${repo}/snapshot?sha=${commit.sha}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load snapshot");
      }

      const snapshotData = await response.json();
      console.log("Snapshot loaded:", snapshotData);

      // Cache the snapshot
      setSnapshotCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(commit.sha, snapshotData);
        return newCache;
      });

      // Update the file system tree with the historical snapshot
      setFileSystemTree(snapshotData);

      return snapshotData;
    } catch (err) {
      console.error("Error loading snapshot:", err);
      // Don't stop the timeline, just log the error
      return null;
    } finally {
      setLoadingSnapshot(false);
    }
  };

  // Navigate to next commit
  const goToNextCommit = async () => {
    if (!timeline || historyStep >= timeline.length - 1) return;

    const nextStep = historyStep + 1;
    setHistoryStep(nextStep);

    // Use canonical layout if available
    if (canonicalLayout && presenceByVersion) {
      await loadSnapshotWithCanonical(nextStep);
    } else {
      await loadSnapshot(nextStep);
    }
  };

  // Navigate to previous commit
  const goToPreviousCommit = async () => {
    if (!timeline || historyStep <= 0) return;

    const prevStep = historyStep - 1;
    setHistoryStep(prevStep);

    // Use canonical layout if available
    if (canonicalLayout && presenceByVersion) {
      await loadSnapshotWithCanonical(prevStep);
    } else {
      await loadSnapshot(prevStep);
    }
  };

  // Start automatic playback
  const startPlayback = () => {
    if (!timeline || isPlaying) return;

    setIsPlaying(true);

    // Start interval for automatic advancement
    animationIntervalRef.current = setInterval(async () => {
      setHistoryStep((prev) => {
        if (prev >= timeline.length - 1) {
          // Stop at the end
          stopPlayback();
          return prev;
        }

        const nextStep = prev + 1;
        // Load next snapshot
        const loadFn =
          canonicalLayout && presenceByVersion
            ? loadSnapshotWithCanonical
            : loadSnapshot;

        loadFn(nextStep);
        return nextStep;
      });
    }, 1000); // 1 second interval
  };

  // Pause playback
  const pausePlayback = () => {
    setIsPlaying(false);
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  };

  // Stop playback and reset
  const stopPlayback = () => {
    pausePlayback();
    setHistoryStep(0);
    if (timeline && timeline.length > 0) {
      if (canonicalLayout && presenceByVersion) {
        loadSnapshotWithCanonical(0);
      } else {
        loadSnapshot(0);
      }
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  // Capture all frames for GIF generation
  const captureAllFrames = async () => {
    if (
      !timeline ||
      !canonicalLayout ||
      !presenceByVersion ||
      !canonicalReady
    ) {
      alert("Please wait for the timeline to finish loading!");
      return;
    }

    console.log(
      "Starting to capture all frames with established canonical layout...",
    );
    setGeneratingGif(true);
    setCapturedFrames(new Map());
    capturedFramesRef.current = new Map(); // Clear the ref too
    setGifGenerationProgress({
      step: "Preparing...",
      current: 0,
      total: timeline.length,
    });

    try {
      // Store current position to restore later
      const originalStep = historyStep;

      // Clear any existing captures first
      pendingCaptureRef.current = null;

      // Iterate through all commits and capture frames
      for (let i = 0; i < timeline.length; i++) {
        const commit = timeline[i];
        console.log(
          `Capturing frame ${i + 1}/${timeline.length} for commit ${commit.sha.substring(0, 7)}`,
        );

        // Update progress
        setGifGenerationProgress({
          step: `Capturing frame ${i + 1} of ${timeline.length}`,
          current: i,
          total: timeline.length,
        });

        // Load the snapshot with canonical layout
        await loadSnapshotWithCanonical(i);
        setHistoryStep(i);

        // Wait for render to complete
        // First frame needs extra time, others are faster since canonical is established
        const renderDelay = i === 0 ? 1500 : 800;
        await new Promise((resolve) => setTimeout(resolve, renderDelay));

        // Verify capture function is available
        if (!captureMapRef.current) {
          console.error(
            `[captureAllFrames] captureMapRef.current is not available for commit ${commit.sha.substring(0, 7)}!`,
          );
          continue;
        }

        // Set the pending capture BEFORE creating the promise
        pendingCaptureRef.current = commit.sha;
        console.log(
          `[captureAllFrames] Set pendingCaptureRef to ${commit.sha.substring(0, 7)}`,
        );

        // Create a promise that will resolve when the capture completes
        const capturePromise = new Promise<void>((resolve, reject) => {
          // Store the resolve function
          captureResolveRef.current = resolve;
          console.log(
            `[captureAllFrames] Promise created for ${commit.sha.substring(0, 7)}, resolver stored`,
          );

          // Set a timeout in case capture fails
          setTimeout(() => {
            if (captureResolveRef.current === resolve) {
              console.warn(
                `[captureAllFrames] Capture timeout for ${commit.sha.substring(0, 7)}`,
              );
              captureResolveRef.current = null;
              reject(
                new Error(`Capture timeout for ${commit.sha.substring(0, 7)}`),
              );
            }
          }, 5000); // Increase timeout to 5 seconds
        });

        try {
          // Trigger the capture
          console.log(
            `[captureAllFrames] Triggering capture for ${commit.sha.substring(0, 7)}`,
          );
          captureMapRef.current();

          // Wait for the actual capture to complete
          console.log(
            `[captureAllFrames] Waiting for capture promise to resolve for ${commit.sha.substring(0, 7)}`,
          );
          await capturePromise;

          // Check if capture was successful using the ref
          const currentSize = capturedFramesRef.current.size;
          console.log(
            `[captureAllFrames] Capture succeeded for ${commit.sha.substring(0, 7)}, total frames: ${currentSize}`,
          );
        } catch (err) {
          console.error(
            `[captureAllFrames] Failed to capture frame for ${commit.sha.substring(0, 7)}:`,
            err,
          );
          // Continue to next frame even if this one failed
        }
      }

      // Get the final captured frames from the ref
      const finalFrames = capturedFramesRef.current;
      console.log(`Final captured frames count: ${finalFrames.size}`);

      if (finalFrames.size === 0) {
        alert("No frames were captured. Please try again.");
        setGeneratingGif(false);
        return;
      }

      // Update state with all captured frames
      setCapturedFrames(new Map(finalFrames));

      // Restore original position
      setGifGenerationProgress({
        step: "Restoring view...",
        current: timeline.length,
        total: timeline.length,
      });
      await loadSnapshotWithCanonical(originalStep);
      setHistoryStep(originalStep);

      // Now generate the GIF with the frames we just captured
      setGifGenerationProgress({
        step: "Creating GIF...",
        current: timeline.length,
        total: timeline.length,
      });
      await generateGifFromFrames(finalFrames);
    } catch (error) {
      console.error("Error capturing frames:", error);
      alert("Failed to capture frames: " + error);
    } finally {
      setGeneratingGif(false);
      setGifGenerationProgress(null);
    }
  };

  // Generate GIF from captured browser frames
  const generateGifFromFrames = async (
    frames?: Map<string, { blob: Blob; url: string; commit: any }>,
  ) => {
    // Use provided frames or fall back to state
    const framesToUse = frames || capturedFrames;

    if (!timeline || framesToUse.size === 0) {
      console.error("No frames to generate GIF from");
      return;
    }

    console.log(`Generating GIF with ${framesToUse.size} captured frames`);
    setGeneratingGif(true);

    try {
      // Convert captured frames to FormData for upload
      const formData = new FormData();

      const frameInfos = [];
      let frameIndex = 0;

      // Sort frames by timeline order
      const sortedFrames = Array.from(framesToUse.entries()).sort((a, b) => {
        const indexA = timeline.findIndex((c) => c.sha === a[0]);
        const indexB = timeline.findIndex((c) => c.sha === b[0]);
        return indexA - indexB;
      });

      for (const [sha, frameData] of sortedFrames) {
        console.log(`Adding frame for commit ${sha.substring(0, 7)}`);

        // Add the image blob to FormData
        formData.append(
          `frame_${frameIndex}`,
          frameData.blob,
          `frame_${frameIndex}.png`,
        );

        // Add frame metadata
        frameInfos.push({
          index: frameIndex,
          sha: frameData.commit.sha,
          message: frameData.commit.message,
          author: frameData.commit.author,
          date: frameData.commit.date,
        });

        frameIndex++;
      }

      // Add metadata as JSON
      formData.append("frameInfos", JSON.stringify(frameInfos));
      formData.append(
        "settings",
        JSON.stringify({
          width: 600,
          height: 600, // Make it square
          delay: 1000,
          showLabels: true,
        }),
      );

      console.log(`Prepared ${frameInfos.length} frames for GIF generation`);
      console.log(
        `Calling API: /api/git-history/${owner}/${repo}/export-gif-from-images`,
      );

      // Call the new export-gif-from-images API that will handle browser-captured images
      const response = await fetch(
        `/api/git-history/${owner}/${repo}/export-gif-from-images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate GIF: ${errorText}`);
      }

      // Create blob URL for the GIF
      const blob = await response.blob();
      console.log(`GIF blob created: ${blob.size} bytes, type: ${blob.type}`);

      // Ensure the blob has the correct MIME type
      const gifBlob =
        blob.type === "image/gif"
          ? blob
          : new Blob([blob], { type: "image/gif" });
      const url = URL.createObjectURL(gifBlob);

      // Show the GIF in the browser
      setGeneratedGifUrl(url);
      setShowGifPreview(true);

      console.log("GIF generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate GIF:", error);
      console.error("Error details:", error.message, error.stack);
      alert(`Failed to generate GIF: ${error.message}`);
    } finally {
      setGeneratingGif(false);
    }
  };

  // Handle map image capture
  const handleMapImageGenerated = (imageBlob: Blob, imageUrl: string) => {
    console.log(
      "[handleMapImageGenerated] Called with blob size:",
      imageBlob?.size,
      "pendingCaptureRef:",
      pendingCaptureRef.current?.substring(0, 7),
    );

    // Only capture if we have a pending capture request
    if (!pendingCaptureRef.current) {
      console.log("[handleMapImageGenerated] No pending capture, skipping");
      return;
    }

    // During GIF generation, we need timeline
    if (!timeline) {
      console.log("[handleMapImageGenerated] Skipping capture - no timeline");
      return;
    }

    const sha = pendingCaptureRef.current;
    const commit = timeline.find((c) => c.sha === sha);

    if (commit) {
      console.log(
        `[handleMapImageGenerated] Found commit for ${sha.substring(0, 7)}, storing frame`,
      );

      // Update both the ref and the state
      capturedFramesRef.current.set(sha, {
        blob: imageBlob,
        url: imageUrl,
        commit,
      });
      console.log(
        `[handleMapImageGenerated] Total frames in ref: ${capturedFramesRef.current.size}`,
      );

      setCapturedFrames((prev) => {
        const newFrames = new Map(prev);
        newFrames.set(sha, { blob: imageBlob, url: imageUrl, commit });
        console.log(
          `[handleMapImageGenerated] Total frames in state: ${newFrames.size}`,
        );
        return newFrames;
      });

      // Resolve the capture promise if one is waiting
      if (captureResolveRef.current) {
        console.log(
          `[handleMapImageGenerated] Resolving capture promise for ${sha.substring(0, 7)}`,
        );
        captureResolveRef.current();
        captureResolveRef.current = null;
      } else {
        console.warn(
          `[handleMapImageGenerated] No capture promise to resolve for ${sha.substring(0, 7)}`,
        );
      }
    } else {
      console.warn(
        `[handleMapImageGenerated] Could not find commit for SHA ${sha}`,
      );
    }

    // Clear pending ref AFTER checking for promise resolution
    pendingCaptureRef.current = null;
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

          {/* Center section - Repo info */}
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
              {owner}/{repo}
            </h2>
            {loadingTimeline ? (
              <div
                style={{
                  fontSize: "12px",
                  color: theme.colors.primary,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <Loader2 size={12} className="animate-spin" />
                Loading timeline...
              </div>
            ) : isShowingHistory ? (
              <div
                style={{
                  fontSize: "12px",
                  color: theme.colors.primary,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <Clock size={12} />
                Going back in time... {historyStep}/
                {timeline?.length || maxSteps}
              </div>
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  color: theme.colors.textSecondary,
                  margin: 0,
                }}
              >
                Current State • Ready for time travel
              </p>
            )}
          </div>

          {/* Right section - Back button only */}
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
            >
              <ArrowLeft size={14} />
              Back to Mosaic
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
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

        {/* Main Postcard */}
        {!error && (
          <>
            {/* Main Layout - 50/50 Split */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                minHeight: "70vh",
              }}
            >
              {/* Left Panel - Controls */}
              <div
                style={{
                  flex: "1",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {!isShowingHistory && !loading && (
                  <div
                    style={{
                      padding: "2rem",
                      backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: theme.radius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      textAlign: "center",
                      height: "fit-content",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <History
                        size={24}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "20px", margin: 0 }}>
                        Git History Visualization
                      </h3>
                    </div>

                    <p
                      style={{
                        color: theme.colors.textSecondary,
                        marginBottom: "24px",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      Explore how this repository has evolved over the last 14
                      days. We&apos;ll generate a timeline of commits and create
                      an animated visualization showing how the code city
                      changes over time.
                    </p>

                    <button
                      onClick={startHistoryAnimation}
                      disabled={loadingTimeline}
                      style={{
                        ...theme.components.button.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "14px",
                        padding: "12px 24px",
                        width: "100%",
                        opacity: loadingTimeline ? 0.6 : 1,
                        cursor: loadingTimeline ? "not-allowed" : "pointer",
                      }}
                    >
                      {loadingTimeline ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Loading Timeline...
                        </>
                      ) : (
                        <>
                          <Rewind size={16} />
                          Show Repository History
                        </>
                      )}
                    </button>
                  </div>
                )}

                {isShowingHistory && timeline && (
                  <div
                    style={{
                      padding: "1.5rem",
                      backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: theme.radius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      height: "fit-content",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <History
                        size={20}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        Repository Timeline
                      </h3>
                    </div>

                    {/* Timeline visualization */}
                    <div style={{ marginBottom: "20px" }}>
                      <p
                        style={{
                          color: theme.colors.textSecondary,
                          marginBottom: "12px",
                          textAlign: "center",
                        }}
                      >
                        Breaking up {timeline.length} commits from repository
                        history
                      </p>

                      {/* Timeline dots */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          position: "relative",
                          padding: "0 10px",
                          marginBottom: "8px",
                        }}
                      >
                        {/* Progress line */}
                        <div
                          style={{
                            position: "absolute",
                            left: "10px",
                            right: "10px",
                            height: "2px",
                            backgroundColor: theme.colors.border,
                            zIndex: 0,
                          }}
                        />

                        {/* Timeline dots */}
                        {timeline
                          .slice(0, Math.min(10, timeline.length))
                          .map((commit, index) => (
                            <div
                              key={commit.sha}
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor:
                                  index <= historyStep
                                    ? theme.colors.primary
                                    : theme.colors.border,
                                border: `2px solid ${theme.colors.background}`,
                                zIndex: 1,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                              }}
                              title={`${new Date(commit.date).toLocaleDateString()}: ${commit.message.split("\n")[0]}`}
                            />
                          ))}
                        {timeline.length > 10 && (
                          <span
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: "12px",
                              marginLeft: "8px",
                            }}
                          >
                            +{timeline.length - 10} more
                          </span>
                        )}
                      </div>

                      {/* Date range - showing oldest to newest */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: theme.colors.textSecondary,
                        }}
                      >
                        <span>
                          {timeline[0] && (
                            <>
                              {new Date(timeline[0].date).toLocaleDateString()}
                              <span
                                style={{ fontSize: "10px", marginLeft: "4px" }}
                              >
                                (oldest)
                              </span>
                            </>
                          )}
                        </span>
                        <span>
                          {timeline[timeline.length - 1] && (
                            <>
                              {new Date(
                                timeline[timeline.length - 1].date,
                              ).toLocaleDateString()}
                              <span
                                style={{ fontSize: "10px", marginLeft: "4px" }}
                              >
                                (newest)
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Current commit info or loading progress */}
                    {isLoadingPhase && loadingProgress ? (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border}`,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: theme.colors.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <Loader2 size={16} className="animate-spin" />
                          {loadingProgress}
                        </div>
                      </div>
                    ) : (
                      historyStep < timeline.length && (
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: theme.colors.background,
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.colors.border}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              color: theme.colors.textSecondary,
                              marginBottom: "4px",
                            }}
                          >
                            Step {historyStep + 1} of {timeline.length}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              marginBottom: "4px",
                            }}
                          >
                            {timeline[historyStep].message.split("\n")[0]}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: theme.colors.textSecondary,
                            }}
                          >
                            by {timeline[historyStep].author} •{" "}
                            {new Date(
                              timeline[historyStep].date,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      )
                    )}

                    {/* Navigation controls */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginTop: "16px",
                      }}
                    >
                      {/* Playback controls */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {!isPlaying ? (
                          <button
                            onClick={startPlayback}
                            disabled={
                              isLoadingPhase ||
                              loadingSnapshot ||
                              historyStep >= timeline.length - 1
                            }
                            style={{
                              ...theme.components.button.primary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              fontSize: "13px",
                              padding: "10px 16px",
                              width: "100%",
                              opacity:
                                isLoadingPhase ||
                                loadingSnapshot ||
                                historyStep >= timeline.length - 1
                                  ? 0.5
                                  : 1,
                              cursor:
                                isLoadingPhase ||
                                loadingSnapshot ||
                                historyStep >= timeline.length - 1
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            <Play size={14} />
                            Play
                          </button>
                        ) : (
                          <button
                            onClick={pausePlayback}
                            disabled={isLoadingPhase}
                            style={{
                              ...theme.components.button.primary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              fontSize: "13px",
                              padding: "10px 16px",
                              width: "100%",
                              opacity: isLoadingPhase ? 0.5 : 1,
                              cursor: isLoadingPhase
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            <Pause size={14} />
                            Pause
                          </button>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={stopPlayback}
                            disabled={
                              isLoadingPhase ||
                              (historyStep === 0 && !isPlaying)
                            }
                            style={{
                              ...theme.components.button.secondary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              fontSize: "13px",
                              padding: "8px 12px",
                              flex: 1,
                              opacity:
                                isLoadingPhase ||
                                (historyStep === 0 && !isPlaying)
                                  ? 0.5
                                  : 1,
                              cursor:
                                isLoadingPhase ||
                                (historyStep === 0 && !isPlaying)
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            <Square size={14} />
                            Reset
                          </button>

                          <button
                            onClick={captureAllFrames}
                            disabled={
                              !canonicalReady || generatingGif || isLoadingPhase
                            }
                            style={{
                              ...theme.components.button.secondary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              fontSize: "13px",
                              padding: "8px 12px",
                              flex: 1,
                              opacity:
                                !canonicalReady ||
                                generatingGif ||
                                isLoadingPhase
                                  ? 0.5
                                  : 1,
                              cursor:
                                !canonicalReady ||
                                generatingGif ||
                                isLoadingPhase
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {generatingGif ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                GIF
                              </>
                            ) : (
                              <>
                                <Film size={14} />
                                GIF
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Manual navigation */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={goToPreviousCommit}
                          disabled={
                            isLoadingPhase ||
                            historyStep === 0 ||
                            loadingSnapshot ||
                            isPlaying
                          }
                          style={{
                            ...theme.components.button.secondary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            fontSize: "13px",
                            padding: "8px 12px",
                            flex: 1,
                            opacity:
                              isLoadingPhase ||
                              historyStep === 0 ||
                              loadingSnapshot ||
                              isPlaying
                                ? 0.5
                                : 1,
                            cursor:
                              isLoadingPhase ||
                              historyStep === 0 ||
                              loadingSnapshot ||
                              isPlaying
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          <ChevronLeft size={14} />
                          Previous
                        </button>

                        <button
                          onClick={goToNextCommit}
                          disabled={
                            isLoadingPhase ||
                            historyStep >= timeline.length - 1 ||
                            loadingSnapshot ||
                            isPlaying
                          }
                          style={{
                            ...theme.components.button.secondary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            fontSize: "13px",
                            padding: "8px 12px",
                            flex: 1,
                            opacity:
                              isLoadingPhase ||
                              historyStep >= timeline.length - 1 ||
                              loadingSnapshot ||
                              isPlaying
                                ? 0.5
                                : 1,
                            cursor:
                              isLoadingPhase ||
                              historyStep >= timeline.length - 1 ||
                              loadingSnapshot ||
                              isPlaying
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Next
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Status indicator */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px",
                          fontSize: "13px",
                          color: theme.colors.textSecondary,
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border}`,
                        }}
                      >
                        {isLoadingPhase ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                              style={{ marginRight: "6px" }}
                            />
                            Building canonical layout...
                          </>
                        ) : loadingSnapshot ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                              style={{ marginRight: "6px" }}
                            />
                            Loading snapshot...
                          </>
                        ) : isPlaying ? (
                          <>
                            <Play size={14} style={{ marginRight: "6px" }} />
                            Playing... {historyStep + 1} / {timeline.length}
                          </>
                        ) : (
                          `${historyStep + 1} / ${timeline.length}`
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        width: "100%",
                        backgroundColor: theme.colors.border,
                        borderRadius: "4px",
                        height: "8px",
                        marginTop: "16px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(historyStep / (timeline.length - 1)) * 100}%`,
                          height: "100%",
                          backgroundColor: theme.colors.primary,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel - Map (Square) */}
              <div
                style={{
                  flex: "1",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.radius.xl,
                    padding: "24px",
                    border: `1px solid ${theme.colors.border}`,
                    width: "100%",
                    maxWidth: "600px", // Constrain max width
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1", // Force square aspect ratio
                      position: "relative",
                      minHeight: "400px",
                    }}
                  >
                    <MapImageCapture
                      cityData={actualCityData}
                      highlightLayers={highlightLayers}
                      canvasBackgroundColor={theme.colors.background}
                      onMapImageGenerated={handleMapImageGenerated}
                      onGenerateMapImageRef={captureMapRef}
                      onFileClick={(path, type, extension) => {
                        console.log(
                          `File clicked: ${path} (${type}) - ${extension}`,
                        );
                      }}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* GIF Preview Modal */}
        {showGifPreview && generatedGifUrl && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.radius.xl,
                padding: "20px",
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowGifPreview(false);
                  if (generatedGifUrl) {
                    URL.revokeObjectURL(generatedGifUrl);
                    setGeneratedGifUrl(null);
                  }
                }}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.backgroundSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color={theme.colors.text} />
              </button>

              {/* Title */}
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  marginBottom: "20px",
                  color: theme.colors.text,
                }}
              >
                Repository History Animation
              </h2>

              {/* GIF Display */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <img
                    src={generatedGifUrl}
                    alt="Repository history animation"
                    draggable={true}
                    onDragStart={(e) => {
                      // Allow dragging the image
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "60vh",
                      borderRadius: theme.radius.lg,
                      cursor: "pointer",
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  />
                </div>

                {/* Sharing tip */}
                <p
                  style={{
                    fontSize: "13px",
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                    margin: "8px 0",
                    fontStyle: "italic",
                  }}
                >
                  💡 Tip: Download the GIF to share it on Discord, Slack,
                  GitHub, or social media
                </p>

                {/* Action buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={async () => {
                      try {
                        // Fetch the blob from the URL
                        const response = await fetch(generatedGifUrl);
                        await response.blob();

                        // Most browsers don't support GIF in clipboard, so just inform the user
                        alert(
                          "⚠️ Browsers don't support copying GIFs to clipboard.\n\nPlease use 'Download GIF' to save it, then you can:\n• Drag it into Discord/Slack\n• Upload to GitHub comments\n• Share via email\n• Post on social media",
                        );

                        // Offer to download instead
                        const download = confirm(
                          "Would you like to download the GIF instead?",
                        );
                        if (download) {
                          // Trigger download
                          const a = document.createElement("a");
                          a.href = generatedGifUrl;
                          a.download = `${owner}-${repo}-history.gif`;
                          a.style.display = "none";
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => {
                            document.body.removeChild(a);
                          }, 100);
                        }
                      } catch (error) {
                        console.error("Failed to copy GIF:", error);
                        alert("Failed to copy GIF. Try opening in a new tab.");
                      }
                    }}
                    style={{
                      ...theme.components.button.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "14px",
                      padding: "10px 20px",
                    }}
                  >
                    <Copy size={16} />
                    Copy GIF
                  </button>

                  <button
                    onClick={() => {
                      // Open in new tab for easy copying
                      window.open(generatedGifUrl, "_blank");
                    }}
                    style={{
                      ...theme.components.button.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "14px",
                      padding: "10px 20px",
                    }}
                  >
                    <ExternalLink size={16} />
                    Open in New Tab
                  </button>

                  <button
                    onClick={async () => {
                      // Download the GIF
                      try {
                        // Fetch the blob from the URL to ensure proper download
                        const response = await fetch(generatedGifUrl);
                        const blob = await response.blob();

                        // Create a new blob with explicit GIF type
                        const gifBlob = new Blob([blob], { type: "image/gif" });
                        const downloadUrl = URL.createObjectURL(gifBlob);

                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = `${owner}-${repo}-history.gif`;
                        a.style.display = "none";
                        document.body.appendChild(a);
                        a.click();

                        // Cleanup
                        setTimeout(() => {
                          document.body.removeChild(a);
                          URL.revokeObjectURL(downloadUrl);
                        }, 100);
                      } catch (error) {
                        console.error("Failed to download GIF:", error);
                        alert("Failed to download GIF. Please try again.");
                      }
                    }}
                    style={{
                      ...theme.components.button.primary,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "14px",
                      padding: "10px 20px",
                    }}
                  >
                    <Download size={16} />
                    Download GIF
                  </button>

                  <button
                    onClick={() => {
                      setShowGifPreview(false);
                      if (generatedGifUrl) {
                        URL.revokeObjectURL(generatedGifUrl);
                        setGeneratedGifUrl(null);
                      }
                    }}
                    style={{
                      ...theme.components.button.secondary,
                      fontSize: "14px",
                      padding: "10px 20px",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GIF Generation Loading Overlay */}
        {gifGenerationProgress && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.radius.xl,
                padding: "40px",
                minWidth: "400px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                border: `1px solid ${theme.colors.border}`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Animated background gradient */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  right: "-100%",
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)`,
                  animation: "slide 2s linear infinite",
                }}
              />

              {/* Content */}
              <div
                style={{
                  textAlign: "center",
                  position: "relative",
                }}
              >
                {/* Animated icon */}
                <div
                  style={{
                    marginBottom: "24px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.primary}40)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  >
                    <Film
                      size={30}
                      style={{
                        color: theme.colors.primary,
                        animation: "spin 3s linear infinite",
                      }}
                    />
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    marginBottom: "12px",
                    color: theme.colors.text,
                  }}
                >
                  Generating Repository History GIF
                </h3>

                {/* Status text */}
                <p
                  style={{
                    fontSize: "14px",
                    color: theme.colors.textSecondary,
                    marginBottom: "24px",
                  }}
                >
                  {gifGenerationProgress.step}
                </p>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: theme.colors.border,
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: `${(gifGenerationProgress.current / gifGenerationProgress.total) * 100}%`,
                      height: "100%",
                      backgroundColor: theme.colors.primary,
                      transition: "width 0.3s ease",
                      borderRadius: "4px",
                    }}
                  />
                </div>

                {/* Progress numbers */}
                <p
                  style={{
                    fontSize: "12px",
                    color: theme.colors.textSecondary,
                  }}
                >
                  {gifGenerationProgress.current} /{" "}
                  {gifGenerationProgress.total}
                </p>
              </div>

              {/* Add CSS animation keyframes */}
              <style jsx>{`
                @keyframes slide {
                  0% {
                    transform: translateX(-100%);
                  }
                  100% {
                    transform: translateX(200%);
                  }
                }

                @keyframes pulse {
                  0%,
                  100% {
                    transform: scale(1);
                    opacity: 1;
                  }
                  50% {
                    transform: scale(1.1);
                    opacity: 0.8;
                  }
                }

                @keyframes spin {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}</style>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GitHistoryPage() {
  return (
    <MosaicThemeProvider>
      <GitHistoryContent />
    </MosaicThemeProvider>
  );
}
