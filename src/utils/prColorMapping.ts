import { HighlightLayer, LayerItem } from "@principal-ai/code-city-react";
import { FileTree } from "@principal-ai/repository-abstraction";

export interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

// PR-specific color scheme for change types
export const PR_CHANGE_COLORS = {
  added: "#22c55e", // Green for added files
  modified: "#f59e0b", // Orange for modified files
  removed: "#ef4444", // Red for removed files
  renamed: "#3b82f6", // Blue for renamed files
} as const;

export const PR_CHANGE_LABELS = {
  added: "Added",
  modified: "Modified",
  removed: "Removed",
  renamed: "Renamed",
} as const;

/**
 * Create highlight layers for PR visualization based on file change types
 */
export function createPRHighlightLayers(
  changedFiles: PRFile[],
): HighlightLayer[] {
  if (!changedFiles.length) {
    return [];
  }

  const layers: HighlightLayer[] = [];

  // Group files by change type
  const filesByStatus = {
    added: [] as PRFile[],
    modified: [] as PRFile[],
    removed: [] as PRFile[],
    renamed: [] as PRFile[],
  };

  changedFiles.forEach((file) => {
    if (file.status in filesByStatus) {
      filesByStatus[file.status].push(file);
    }
  });

  // Create layers for each change type with decreasing priority
  let priority = 100; // Start with high priority
  Object.entries(filesByStatus).forEach(([status, files]) => {
    if (files.length > 0) {
      const changeType = status as keyof typeof PR_CHANGE_COLORS;

      const items: LayerItem[] = files.map((file) => ({
        path: file.filename,
        type: "file" as const,
        renderStrategy: "fill" as const,
      }));

      layers.push({
        id: `pr-${changeType}`,
        name: `${PR_CHANGE_LABELS[changeType]} Files`,
        color: PR_CHANGE_COLORS[changeType],
        enabled: true,
        priority: priority--,
        opacity: 0.8,
        borderWidth: 2,
        items: items,
        dynamic: false,
      });
    }
  });

  return layers;
}

/**
 * Calculate weight for a file based on the amount of changes
 * This will affect building height in the visualization
 */
// function calculateFileWeight(file: PRFile): number {
//   // Base weight of 1, plus additional weight based on changes
//   const baseWeight = 1;
//   const changeWeight = Math.log(file.changes + 1) * 0.5; // Logarithmic scale
//
//   return Math.max(baseWeight + changeWeight, 1);
// }

/**
 * Filter FileTree to only include changed files for PR visualization
 */
export function filterFileTreeForPR(
  originalFileTree: FileTree,
  changedFiles: PRFile[],
): FileTree {
  if (!changedFiles.length) {
    return {
      ...originalFileTree,
      allFiles: [],
      allDirectories: [],
      stats: {
        ...originalFileTree.stats,
        totalFiles: 0,
        totalDirectories: 0,
      },
    };
  }

  // Create a set of changed file paths for quick lookup
  const changedPaths = new Set(changedFiles.map((f) => f.filename));

  // Filter files to only include changed ones
  const filteredFiles = originalFileTree.allFiles.filter((file) =>
    changedPaths.has(file.path),
  );

  // Get directories that contain changed files
  const neededDirPaths = new Set<string>();
  changedFiles.forEach((file) => {
    const pathParts = file.filename.split("/");
    // Add all parent directories
    for (let i = 1; i < pathParts.length; i++) {
      const dirPath = pathParts.slice(0, i).join("/");
      neededDirPaths.add(dirPath);
    }
  });

  const filteredDirectories = originalFileTree.allDirectories.filter((dir) =>
    neededDirPaths.has(dir.path),
  );

  // Build filtered root structure
  const filteredRoot = buildFilteredRoot(changedFiles, originalFileTree);

  return {
    ...originalFileTree,
    root: filteredRoot,
    allFiles: filteredFiles,
    allDirectories: filteredDirectories,
    stats: {
      ...originalFileTree.stats,
      totalFiles: filteredFiles.length,
      totalDirectories: filteredDirectories.length,
    },
  };
}

/**
 * Build a filtered root directory structure containing only changed files
 */
function buildFilteredRoot(changedFiles: PRFile[], originalFileTree: FileTree) {
  // Define proper types for the directory structure
  interface FilteredDirectory {
    name: string;
    path: string;
    relativePath: string;
    children: (FilteredDirectory | any)[];
    fileCount: number;
    totalSize: number;
    depth: number;
  }

  // Create a simplified directory structure with only changed files
  const root: FilteredDirectory = {
    ...originalFileTree.root,
    children: [],
    fileCount: changedFiles.length,
    totalSize: changedFiles.reduce((sum, file) => sum + file.changes * 100, 0), // Estimate size based on changes
  };

  // Build directory structure for changed files
  const directories = new Map<string, FilteredDirectory>();
  directories.set("", root);

  changedFiles.forEach((file) => {
    const pathParts = file.filename.split("/");
    const fileName = pathParts.pop()!;

    // Create directory structure
    let currentPath = "";
    let currentDir = root;

    pathParts.forEach((dirName, index) => {
      // const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

      if (!directories.has(currentPath)) {
        const newDir: FilteredDirectory = {
          name: dirName,
          path: currentPath,
          relativePath: currentPath,
          children: [],
          fileCount: 0,
          totalSize: 0,
          depth: index + 1,
        };

        directories.set(currentPath, newDir);
        currentDir.children.push(newDir);
      }

      currentDir = directories.get(currentPath)!;
    });

    // Add file to its directory
    const fileNode = {
      name: fileName,
      path: file.filename,
      relativePath: file.filename,
      size: file.changes * 100, // Estimate size based on changes
      extension: fileName.includes(".") ? "." + fileName.split(".").pop() : "",
      lastModified: new Date(),
      isDirectory: false,
    };

    currentDir.children.push(fileNode);
  });

  return root;
}

/**
 * Get summary statistics for changed files
 */
export function getPRFileStats(changedFiles: PRFile[]) {
  const stats = {
    total: changedFiles.length,
    added: 0,
    modified: 0,
    removed: 0,
    renamed: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    totalChanges: 0,
  };

  changedFiles.forEach((file) => {
    stats[file.status]++;
    stats.totalAdditions += file.additions;
    stats.totalDeletions += file.deletions;
    stats.totalChanges += file.changes;
  });

  return stats;
}

/**
 * Get file extension distribution for changed files
 */
export function getPRFileExtensions(
  changedFiles: PRFile[],
): Record<string, number> {
  const extensions: Record<string, number> = {};

  changedFiles.forEach((file) => {
    const lastDot = file.filename.lastIndexOf(".");
    const ext =
      lastDot !== -1
        ? file.filename.substring(lastDot).toLowerCase()
        : "no extension";
    extensions[ext] = (extensions[ext] || 0) + 1;
  });

  return extensions;
}

/**
 * Create highlight layers for PR visualization based on lines of code changed
 * This weights the visualization by the amount of code changed rather than file count
 */
export function createPRHighlightLayersByLines(
  changedFiles: PRFile[],
): HighlightLayer[] {
  if (!changedFiles.length) {
    return [];
  }

  const layers: HighlightLayer[] = [];

  // Calculate total lines added and deleted
  let totalAdditions = 0;
  let totalDeletions = 0;
  const filesWithAdditions: PRFile[] = [];
  const filesWithDeletions: PRFile[] = [];

  changedFiles.forEach((file) => {
    if (file.additions > 0) {
      totalAdditions += file.additions;
      filesWithAdditions.push(file);
    }
    if (file.deletions > 0) {
      totalDeletions += file.deletions;
      filesWithDeletions.push(file);
    }
  });

  const totalLines = totalAdditions + totalDeletions;

  // Create layer for additions
  if (totalAdditions > 0) {
    const percentage =
      totalLines > 0 ? Math.round((totalAdditions / totalLines) * 100) : 0;

    const additionItems: LayerItem[] = filesWithAdditions.map((file) => ({
      path: file.filename,
      type: "file" as const,
      renderStrategy: "fill" as const,
    }));

    layers.push({
      id: "pr-additions",
      name: `Lines Added (${percentage}%)`,
      color: "#22c55e", // Green
      enabled: true,
      priority: 100,
      opacity: 0.8,
      borderWidth: 2,
      items: additionItems,
      dynamic: false,
      metadata: {
        linesChanged: totalAdditions,
        percentage: percentage,
      },
    } as HighlightLayer);
  }

  // Create layer for deletions
  if (totalDeletions > 0) {
    const percentage =
      totalLines > 0 ? Math.round((totalDeletions / totalLines) * 100) : 0;

    const deletionItems: LayerItem[] = filesWithDeletions.map((file) => ({
      path: file.filename,
      type: "file" as const,
      renderStrategy: "fill" as const,
    }));

    layers.push({
      id: "pr-deletions",
      name: `Lines Deleted (${percentage}%)`,
      color: "#ef4444", // Red
      enabled: true,
      priority: 99,
      opacity: 0.8,
      borderWidth: 2,
      items: deletionItems,
      dynamic: false,
      metadata: {
        linesChanged: totalDeletions,
        percentage: percentage,
      },
    } as HighlightLayer);
  }

  return layers;
}
