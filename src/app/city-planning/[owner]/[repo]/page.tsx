"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Grid3x3,
  Layers,
  Download,
  ArrowLeft,
  RefreshCw,
  Package,
  Edit2,
  Trash2,
  Move,
} from "lucide-react";
import { getUIMetadata } from "@/utils/ui-metadata";
import { HighlightLayer } from "@principal-ai/code-city-react";
import { CodebaseView, CodebaseViewFileCell } from "@a24z/core-library";
import {
  FileTree,
  FileInfo,
  DirectoryInfo,
} from "@principal-ai/repository-abstraction";
import { useGridCodeCityData } from "../../../../hooks/useGridCodeCityData";
import { GitHubService } from "../../../../services/githubService";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../../../mosaic/components/MosaicTheme";
import { MapImageCapture } from "@/components/MapImageCapture";
import {
  createFileColorHighlightLayers,
  DEFAULT_FILE_CONFIGS,
} from "../../../../utils/fileColorMapping";

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

function CityPlanningContent() {
  const theme = useMosaicTheme();
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const repoPath = `${owner}/${repo}`;

  const [fileSystemTree, setFileSystemTree] = useState<FileTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setRepoStats] = useState<RepoStats | null>(null);
  // Grid and group state
  const [gridSize, setGridSize] = useState({ rows: 1, cols: 1 });
  const [groups, setGroups] = useState<
    Array<{
      id: string;
      name: string;
      directories: string[];
      position: { row: number; col: number } | null;
      color: string;
    }>
  >([]);
  const [currentGroup, setCurrentGroup] = useState<{
    name: string;
    directories: string[];
  } | null>(null);
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(
    new Set(),
  );
  const [workflowStep, setWorkflowStep] = useState<
    "idle" | "selecting" | "naming" | "positioning" | "editing"
  >("idle");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [showGridLines, setShowGridLines] = useState(true);
  const [hoveredPosition, setHoveredPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const generateMapImageRef = useRef<(() => void) | null>(null);

  // Build grid configuration from groups
  const gridConfig = useMemo((): CodebaseView | null => {
    // Enable grid layout if we have a multi-cell grid OR groups
    const isMultiCell = gridSize.rows > 1 || gridSize.cols > 1;
    if (groups.length === 0 && !isMultiCell) return null;

    const config: CodebaseView = {
      id: "city-planning",
      version: "1.0",
      name: "City Planning Grid",
      description: "Interactive city planning grid layout",
      overviewPath: "README.md",
      category: "reference",
      displayOrder: 0,
      cells: {},
      metadata: {
        ui: {
          enabled: true,
          rows: gridSize.rows,
          cols: gridSize.cols,
          cellPadding: 10,
          // Enable cell labels with responsive sizing
          showCellLabels: true,
          cellLabelPosition: "top",
          cellLabelHeightPercent: 0.1, // 10% of cell height (with bounds: 20-60px)
        },
      },
    };

    // Convert our groups to the grid config format
    groups.forEach((group, index) => {
      if (group.position) {
        const fileCell: CodebaseViewFileCell = {
          files: [], // TODO: Convert directories to explicit file paths
          coordinates: [group.position.row - 1, group.position.col - 1], // Convert to 0-indexed
          priority: groups.length - index, // Higher priority for earlier groups
          metadata: {
            ui: {
              color: group.color,
            },
          },
        };
        config.cells[group.name] = fileCell;
      }
    });

    // Add default labels for empty cells in multi-cell grids
    if (isMultiCell) {
      for (let row = 0; row < gridSize.rows; row++) {
        for (let col = 0; col < gridSize.cols; col++) {
          const hasGroup = groups.some(
            (g) => g.position?.row === row + 1 && g.position?.col === col + 1,
          );

          if (!hasGroup) {
            const cellName = `Cell ${row + 1},${col + 1}`;
            config.cells[cellName] = {
              files: [], // TODO: Handle unassigned files without glob patterns
              coordinates: [row, col],
              priority: 0, // Lower priority than user groups
            };
          }
        }
      }
    }

    return config;
  }, [groups, gridSize]);

  // Get city data with grid layout
  const { cityData } = useGridCodeCityData({
    fileSystemTree,
    gridConfig,
    rootPath: "",
  });

  // Create highlight layers based on file types and selections
  const highlightLayers = useMemo((): HighlightLayer[] => {
    const layers = createFileColorHighlightLayers(
      DEFAULT_FILE_CONFIGS,
      fileSystemTree,
    );

    // Add selection layer for currently selected items
    if (selectedDirectories.size > 0) {
      layers.push({
        id: "selection",
        name: "Selected Items",
        color: "#FF00FF", // Bright magenta/fuchsia for high visibility
        items: Array.from(selectedDirectories).map((path) => ({
          path,
          type: "directory" as const, // We'll handle both files and directories as directories for highlighting
        })),
        enabled: true,
        priority: 10,
        opacity: 0.9, // Higher opacity for better visibility
      });
    }

    // Add group layers for placed groups
    groups.forEach((group) => {
      if (group.position) {
        layers.push({
          id: group.id,
          name: group.name,
          color: group.color,
          items: group.directories.map((path) => ({
            path,
            type: "directory" as const,
          })),
          enabled: true,
          priority: 5,
        });
      }
    });

    return layers;
  }, [fileSystemTree, selectedDirectories, groups]);

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

        // Load file tree - force fresh data for city planning
        const tree = await githubService.fetchFileSystemTree(
          owner,
          repo,
          repoInfo.defaultBranch,
          true, // noCache: true
        );

        setFileSystemTree(tree);

        // Load repository stats
        setRepoStats({
          stars: repoInfo.stars,
          forks: repoInfo.forks,
          watchers: repoInfo.watchers,
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

  // Generate configuration JSON
  const generateConfig = () => {
    if (!gridConfig) {
      return {
        version: "1.0",
        enabled: false,
        rows: 1,
        cols: 1,
        groups: {},
        timestamp: new Date().toISOString(),
        repository: `${owner}/${repo}`,
      };
    }

    const ui = getUIMetadata(gridConfig.metadata);
    return {
      version: "1.0",
      enabled: ui?.enabled || false,
      rows: ui?.rows || 1,
      cols: ui?.cols || 1,
      groups: gridConfig.cells,
      cellPadding: ui?.cellPadding,
      unassignedStrategy: undefined,
      showCellLabels: ui?.showCellLabels,
      cellLabelPosition: ui?.cellLabelPosition,
      cellLabelHeightPercent: ui?.cellLabelHeightPercent,
      timestamp: new Date().toISOString(),
      repository: `${owner}/${repo}`,
    };
  };

  // Download configuration as JSON
  const downloadConfig = () => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `city-planning-${owner}-${repo}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Start creating a new group
  const startNewGroup = () => {
    console.log("Starting new group, changing workflow to selecting");
    setWorkflowStep("selecting");
    setCurrentGroup({ name: "", directories: [] });
    setSelectedDirectories(new Set());
  };

  // Place group at position and expand grid if needed
  const placeGroupAtPosition = (row: number, col: number) => {
    if (!currentGroup || currentGroup.directories.length === 0) return;

    // Expand grid if necessary
    const newRows = Math.max(gridSize.rows, row);
    const newCols = Math.max(gridSize.cols, col);
    setGridSize({ rows: newRows, cols: newCols });

    // Add the group
    const newGroup = {
      id: `group-${Date.now()}`,
      name: currentGroup.name || `Group ${groups.length + 1}`,
      directories: currentGroup.directories,
      position: { row, col },
      color: getGroupColor(groups.length),
    };
    setGroups([...groups, newGroup]);

    // Reset workflow
    setCurrentGroup(null);
    setSelectedDirectories(new Set());
    setWorkflowStep("idle");
  };

  // Get a color for the group
  const getGroupColor = (index: number) => {
    const colors = [
      "#667eea",
      "#f56565",
      "#48bb78",
      "#ed8936",
      "#9f7aea",
      "#38b2ac",
    ];
    return colors[index % colors.length];
  };

  // Reset configuration
  const resetConfig = () => {
    setGroups([]);
    setGridSize({ rows: 1, cols: 1 });
    setCurrentGroup(null);
    setSelectedDirectories(new Set());
    setWorkflowStep("idle");
    setShowGridLines(true);
    setEditingGroup(null);
  };

  // Start editing a group
  const startEditingGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setEditingGroup(groupId);
      setWorkflowStep("editing");
      setCurrentGroup({ name: group.name, directories: group.directories });
      setSelectedDirectories(new Set(group.directories));
    }
  };

  // Delete a group
  const deleteGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
    if (editingGroup === groupId) {
      setEditingGroup(null);
      setWorkflowStep("idle");
      setCurrentGroup(null);
      setSelectedDirectories(new Set());
    }
  };

  // Update an existing group
  const updateGroup = (row: number, col: number) => {
    if (!editingGroup || !currentGroup) return;

    // Expand grid if necessary
    const newRows = Math.max(gridSize.rows, row);
    const newCols = Math.max(gridSize.cols, col);
    setGridSize({ rows: newRows, cols: newCols });

    // Update the group
    setGroups(
      groups.map((g) =>
        g.id === editingGroup
          ? {
              ...g,
              name: currentGroup.name || g.name,
              directories: currentGroup.directories,
              position: { row, col },
            }
          : g,
      ),
    );

    // Reset workflow
    setEditingGroup(null);
    setCurrentGroup(null);
    setSelectedDirectories(new Set());
    setWorkflowStep("idle");
  };

  // Get all items that are already in groups
  const getGroupedItems = () => {
    const grouped = new Set<string>();
    groups.forEach((group) => {
      group.directories.forEach((dir) => grouped.add(dir));
    });
    return grouped;
  };

  // Get root level items (directories and files) for selection
  const getRootItems = () => {
    if (!fileSystemTree?.root?.children) return [];

    const groupedItems = getGroupedItems();

    const items = fileSystemTree.root.children.map(
      (child: FileInfo | DirectoryInfo) => ({
        name: child.name,
        path: child.relativePath || child.name,
        type: "children" in child ? ("directory" as const) : ("file" as const),
        size:
          "size" in child
            ? child.size
            : "fileCount" in child
              ? child.fileCount
              : 0,
        isGrouped: groupedItems.has(child.relativePath || child.name),
      }),
    );

    // Sort by grouped status first, then type (directories first), then by size (descending)
    return items.sort((a: (typeof items)[0], b: (typeof items)[0]) => {
      // Ungrouped items first
      if (!a.isGrouped && b.isGrouped) return -1;
      if (a.isGrouped && !b.isGrouped) return 1;

      // Directories first
      if (a.type === "directory" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "directory") return 1;

      // Within same type, sort by size (descending)
      return (b.size as number) - (a.size as number);
    });
  };

  // Handle item selection from the list
  const toggleItemSelection = (path: string) => {
    const newSelected = new Set(selectedDirectories);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedDirectories(newSelected);
    if (currentGroup) {
      setCurrentGroup({
        ...currentGroup,
        directories: Array.from(newSelected),
      });
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
          {/* Left section - City Planning */}
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
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              City Planning
            </h1>
          </div>

          {/* Right section - Back button */}
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

        {/* Main Split Layout */}
        {!error && (
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
              {/* Status Cards */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "8px" }}
              >
                {/* Grid Status */}
                <div
                  style={{
                    flex: 1,
                    padding: "1rem",
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: theme.colors.textSecondary,
                      marginBottom: "4px",
                    }}
                  >
                    Grid Size
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: theme.colors.primary,
                    }}
                  >
                    {gridSize.rows} × {gridSize.cols}
                  </div>
                  {gridSize.rows === 1 && gridSize.cols === 1 && (
                    <button
                      onClick={() => setGridSize({ rows: 2, cols: 2 })}
                      style={{
                        marginTop: "8px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        backgroundColor: theme.colors.primary,
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Demo 2×2 Grid
                    </button>
                  )}
                </div>

                {/* Ungrouped Items */}
                <div
                  style={{
                    flex: 1,
                    padding: "1rem",
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: theme.colors.textSecondary,
                      marginBottom: "4px",
                    }}
                  >
                    Ungrouped
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: theme.colors.text,
                    }}
                  >
                    {getRootItems().filter((item) => !item.isGrouped).length}
                  </div>
                </div>
              </div>

              {/* Workflow Panel */}
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                {(() => {
                  console.log("Current workflow step:", workflowStep);
                  return null;
                })()}
                {workflowStep === "idle" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <Package
                        size={20}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        Create Groups
                      </h3>
                    </div>

                    <p
                      style={{
                        fontSize: "14px",
                        color: theme.colors.textSecondary,
                        marginBottom: "16px",
                      }}
                    >
                      Organize your codebase by creating groups of related
                      directories.
                    </p>

                    <button
                      onClick={() => {
                        console.log("Button clicked!");
                        startNewGroup();
                      }}
                      style={{
                        backgroundColor: theme.colors.primary || "#667eea",
                        color: theme.colors.background || "#fff",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      <Package size={16} />
                      Create New Group
                    </button>
                  </>
                )}

                {(workflowStep === "selecting" ||
                  workflowStep === "editing") && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <Layers
                        size={20}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        {workflowStep === "editing"
                          ? "Edit Group Items"
                          : "Select Items"}
                      </h3>
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: theme.colors.textSecondary,
                        marginBottom: "16px",
                      }}
                    >
                      {workflowStep === "editing"
                        ? "Add or remove items from this group."
                        : "Choose directories and files to group together. Items already in groups are shown at the bottom."}
                    </p>

                    {/* Items List */}
                    <div
                      style={{
                        marginBottom: "16px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.md,
                      }}
                    >
                      {getRootItems().map((item) => {
                        // Skip items that are in other groups when editing
                        if (
                          workflowStep === "editing" &&
                          item.isGrouped &&
                          !selectedDirectories.has(item.path)
                        ) {
                          return null;
                        }

                        return (
                          <div
                            key={item.path}
                            onClick={() =>
                              !item.isGrouped || workflowStep === "editing"
                                ? toggleItemSelection(item.path)
                                : null
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              cursor:
                                !item.isGrouped || workflowStep === "editing"
                                  ? "pointer"
                                  : "not-allowed",
                              backgroundColor: selectedDirectories.has(
                                item.path,
                              )
                                ? "#FF00FF30"
                                : item.isGrouped
                                  ? theme.colors.backgroundSecondary
                                  : "transparent",
                              borderLeft: selectedDirectories.has(item.path)
                                ? "3px solid #FF00FF"
                                : "3px solid transparent",
                              transition: "all 0.2s",
                              borderBottom: `1px solid ${theme.colors.border}`,
                              opacity:
                                item.isGrouped &&
                                !selectedDirectories.has(item.path) &&
                                workflowStep !== "editing"
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                border: `2px solid ${
                                  selectedDirectories.has(item.path)
                                    ? "#FF00FF"
                                    : theme.colors.border
                                }`,
                                borderRadius: "3px",
                                backgroundColor: selectedDirectories.has(
                                  item.path,
                                )
                                  ? "#FF00FF"
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {selectedDirectories.has(item.path) && (
                                <div
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    backgroundColor: theme.colors.background,
                                    borderRadius: "1px",
                                  }}
                                />
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "500",
                                color:
                                  item.type === "directory"
                                    ? theme.colors.primary
                                    : theme.colors.text,
                              }}
                            >
                              {item.type === "directory" ? "📁" : "📄"}{" "}
                              {item.name}
                            </div>

                            {item.isGrouped &&
                              !selectedDirectories.has(item.path) &&
                              workflowStep !== "editing" && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    backgroundColor: theme.colors.primary,
                                    color: theme.colors.background,
                                    borderRadius: theme.radius.sm,
                                    marginLeft: "8px",
                                  }}
                                >
                                  GROUPED
                                </span>
                              )}

                            <div
                              style={{
                                marginLeft: "auto",
                                fontSize: "11px",
                                color: theme.colors.textSecondary,
                              }}
                            >
                              {item.type === "directory"
                                ? `${item.size} items`
                                : `${Math.round((item.size as number) / 1024)}KB`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedDirectories.size > 0 && (
                      <div
                        style={{
                          marginBottom: "16px",
                          padding: "8px",
                          backgroundColor: theme.colors.backgroundSecondary,
                          borderRadius: theme.radius.md,
                          fontSize: "12px",
                          color: theme.colors.textSecondary,
                        }}
                      >
                        Selected {selectedDirectories.size} items
                      </div>
                    )}

                    <button
                      onClick={() => setWorkflowStep("naming")}
                      disabled={selectedDirectories.size === 0}
                      style={{
                        ...theme.components.button.primary,
                        width: "100%",
                        opacity: selectedDirectories.size === 0 ? 0.5 : 1,
                        cursor:
                          selectedDirectories.size === 0
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {workflowStep === "editing"
                        ? "Next: Reposition Group"
                        : "Next: Name Group"}
                    </button>

                    <button
                      onClick={() => {
                        setWorkflowStep("idle");
                        setCurrentGroup(null);
                        setSelectedDirectories(new Set());
                        setEditingGroup(null);
                      }}
                      style={{
                        ...theme.components.button.secondary,
                        width: "100%",
                        marginTop: "8px",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {workflowStep === "naming" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <Package
                        size={20}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        Name Your Group
                      </h3>
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: theme.colors.textSecondary,
                        marginBottom: "16px",
                      }}
                    >
                      Give this group of {selectedDirectories.size} items a
                      descriptive name.
                    </p>

                    <input
                      type="text"
                      placeholder="e.g., Core Components, Utils, Tests"
                      value={currentGroup?.name || ""}
                      onChange={(e) =>
                        setCurrentGroup((prev) => ({
                          ...prev!,
                          name: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.sm,
                        fontSize: "14px",
                        marginBottom: "16px",
                        color: theme.colors.text,
                      }}
                      autoFocus
                    />

                    <button
                      onClick={() => {
                        if (currentGroup?.name) {
                          setWorkflowStep("positioning");
                        }
                      }}
                      disabled={!currentGroup?.name}
                      style={{
                        ...theme.components.button.primary,
                        width: "100%",
                        opacity: currentGroup?.name ? 1 : 0.5,
                        cursor: currentGroup?.name ? "pointer" : "not-allowed",
                      }}
                    >
                      Next: Choose Position
                    </button>

                    <button
                      onClick={() => {
                        setWorkflowStep("selecting");
                      }}
                      style={{
                        ...theme.components.button.secondary,
                        width: "100%",
                        marginTop: "8px",
                      }}
                    >
                      Back to Selection
                    </button>
                  </>
                )}

                {workflowStep === "positioning" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <Grid3x3
                        size={20}
                        style={{ color: theme.colors.primary }}
                      />
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        {editingGroup ? "Reposition Group" : "Place on Grid"}
                      </h3>
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: theme.colors.textSecondary,
                        marginBottom: "16px",
                      }}
                    >
                      Click where you want to {editingGroup ? "move" : "place"}{" "}
                      &quot;{currentGroup?.name}&quot; on the grid.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${Math.max(3, gridSize.cols + 1)}, 1fr)`,
                        gridTemplateRows: `repeat(${Math.max(3, gridSize.rows + 1)}, 1fr)`,
                        gap: "4px",
                        aspectRatio: "1",
                        marginBottom: "16px",
                      }}
                    >
                      {Array.from({
                        length:
                          Math.max(3, gridSize.rows + 1) *
                          Math.max(3, gridSize.cols + 1),
                      }).map((_, i) => {
                        const row =
                          Math.floor(i / Math.max(3, gridSize.cols + 1)) + 1;
                        const col = (i % Math.max(3, gridSize.cols + 1)) + 1;
                        const isOccupied = groups.some(
                          (g) =>
                            g.position?.row === row && g.position?.col === col,
                        );
                        const occupyingGroup = groups.find(
                          (g) =>
                            g.position?.row === row && g.position?.col === col,
                        );

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (
                                !isOccupied ||
                                (editingGroup &&
                                  occupyingGroup?.id === editingGroup)
                              ) {
                                if (editingGroup) {
                                  updateGroup(row, col);
                                } else {
                                  placeGroupAtPosition(row, col);
                                }
                              }
                            }}
                            disabled={
                              isOccupied &&
                              (!editingGroup ||
                                occupyingGroup?.id !== editingGroup)
                            }
                            style={{
                              aspectRatio: "1",
                              border: `2px ${isOccupied ? "solid" : "dashed"} ${isOccupied ? occupyingGroup?.color : theme.colors.border}`,
                              backgroundColor: isOccupied
                                ? `${occupyingGroup?.color}20`
                                : theme.colors.background,
                              borderRadius: theme.radius.sm,
                              cursor: isOccupied ? "not-allowed" : "pointer",
                              position: "relative",
                              transition: "all 0.2s",
                              opacity: isOccupied ? 0.7 : 1,
                            }}
                            onMouseEnter={() =>
                              !isOccupied && setHoveredPosition({ row, col })
                            }
                            onMouseLeave={() => setHoveredPosition(null)}
                          >
                            {isOccupied && (
                              <span
                                style={{ fontSize: "10px", fontWeight: "600" }}
                              >
                                {occupyingGroup?.name}
                              </span>
                            )}
                            {!isOccupied &&
                              hoveredPosition?.row === row &&
                              hoveredPosition?.col === col && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: theme.colors.primary,
                                  }}
                                >
                                  +
                                </span>
                              )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setWorkflowStep("naming");
                      }}
                      style={{
                        ...theme.components.button.secondary,
                        width: "100%",
                      }}
                    >
                      Back to Naming
                    </button>
                  </>
                )}
              </div>

              {/* Existing Groups */}
              {groups.length > 0 && (
                <div
                  style={{
                    padding: "1.5rem",
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>
                    Groups ({groups.length})
                  </h4>
                  <div style={{ fontSize: "13px" }}>
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.radius.sm,
                          borderLeft: `3px solid ${group.color}`,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                          }}
                        >
                          <div>
                            <div
                              style={{ fontWeight: "600", marginBottom: "4px" }}
                            >
                              {group.name}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: theme.colors.textSecondary,
                                marginBottom: "4px",
                              }}
                            >
                              Position: ({group.position?.row},{" "}
                              {group.position?.col})
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: theme.colors.textSecondary,
                              }}
                            >
                              {group.directories.length} items
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                            }}
                          >
                            <button
                              onClick={() => startEditingGroup(group.id)}
                              title="Edit group items"
                              style={{
                                padding: "4px",
                                backgroundColor: "transparent",
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radius.sm,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  theme.colors.backgroundSecondary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingGroup(group.id);
                                setCurrentGroup({
                                  name: group.name,
                                  directories: group.directories,
                                });
                                setWorkflowStep("positioning");
                              }}
                              title="Move group position"
                              style={{
                                padding: "4px",
                                backgroundColor: "transparent",
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radius.sm,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  theme.colors.backgroundSecondary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              <Move size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete group "${group.name}"?`)) {
                                  deleteGroup(group.id);
                                }
                              }}
                              title="Delete group"
                              style={{
                                padding: "4px",
                                backgroundColor: "transparent",
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radius.sm,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                                color: theme.colors.text,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#fef2f2";
                                e.currentTarget.style.borderColor = "#fecaca";
                                e.currentTarget.style.color = "#dc2626";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.borderColor =
                                  theme.colors.border;
                                e.currentTarget.style.color = theme.colors.text;
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={downloadConfig}
                  style={{
                    ...theme.components.button.primary,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px",
                  }}
                >
                  <Download size={16} />
                  Export Config
                </button>
                <button
                  onClick={resetConfig}
                  style={{
                    ...theme.components.button.secondary,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px",
                  }}
                >
                  <RefreshCw size={16} />
                  Reset
                </button>
              </div>
            </div>

            {/* Right Panel - Map Visualization */}
            <div
              style={{
                flex: "1",
                position: "relative",
              }}
            >
              {loading ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        border: `3px solid ${theme.colors.border}`,
                        borderTopColor: theme.colors.primary,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px",
                      }}
                    />
                    <p>Loading repository...</p>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: theme.radius.lg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <MapImageCapture
                      cityData={cityData}
                      highlightLayers={highlightLayers}
                      canvasBackgroundColor={theme.colors.background}
                      onGenerateMapImageRef={generateMapImageRef}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Grid Overlay */}
              {showGridLines && !loading && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                    display: "grid",
                    gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                  }}
                >
                  {Array.from({ length: gridSize.rows * gridSize.cols }).map(
                    (_, i) => {
                      const row = Math.floor(i / gridSize.cols) + 1;
                      const col = (i % gridSize.cols) + 1;
                      const group = groups.find(
                        (g) =>
                          g.position?.row === row && g.position?.col === col,
                      );

                      return (
                        <div
                          key={i}
                          style={{
                            border: `2px ${group ? "solid" : "dashed"} ${group ? group.color : theme.colors.border}`,
                            backgroundColor: group
                              ? `${group.color}15`
                              : "transparent",
                            opacity: group ? 0.6 : 0.3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {group && (
                            <div
                              style={{
                                backgroundColor: group.color,
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: theme.radius.sm,
                                fontSize: "11px",
                                fontWeight: "600",
                              }}
                            >
                              {group.name}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CityPlanningPage() {
  return (
    <>
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
      <MosaicThemeProvider>
        <CityPlanningContent />
      </MosaicThemeProvider>
    </>
  );
}
