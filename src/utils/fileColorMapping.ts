import { HighlightLayer } from "@principal-ai/code-city-react";
import {
  getColorPaletteConfigSync,
  fetchColorPaletteConfig,
} from "@/services/configService";

export type LayerRenderStrategy =
  | "border"
  | "fill"
  | "glow"
  | "pattern"
  | "cover"
  | "icon"
  | "custom";

export interface CoverOptions {
  opacity?: number;
  image?: string;
  text?: string;
  textSize?: number;
  backgroundColor?: string;
  borderRadius?: number;
  icon?: string;
  iconSize?: number;
}

export interface ColorLayerConfig {
  color: string;
  renderStrategy: LayerRenderStrategy;
  opacity?: number;
  borderWidth?: number;
  priority?: number;
  coverOptions?: CoverOptions;
  customRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number },
    scale: number,
  ) => void;
}

export interface FileSuffixConfig {
  // Primary layer (always required)
  primary: ColorLayerConfig;
  // Optional secondary layer for dual-color effects
  secondary?: ColorLayerConfig;
  // Display metadata
  displayName?: string;
  description?: string;
  category?: string;
}

export interface FileSuffixColorConfig {
  // Version of the configuration
  version: string;
  // Description of the configuration
  description: string;
  // Last updated date
  lastUpdated: string;
  // Map of file extensions to their full configuration
  suffixConfigs: Record<string, FileSuffixConfig>;
  // Default config for unmatched files
  defaultConfig?: FileSuffixConfig;
  // Whether to include files without matches
  includeUnmatched?: boolean;
}

export interface FileSystemTree {
  allFiles?: Array<{ path: string }>;
}

/**
 * Creates highlight layers for files based on file extension configurations
 * @param config - Configuration object with suffix mappings
 * @param fileSystemTree - The file tree structure
 * @returns Array of HighlightLayer objects for the map visualization
 */
export function createFileColorHighlightLayers(
  config: FileSuffixColorConfig,
  fileSystemTree: FileSystemTree | null,
): HighlightLayer[] {
  if (!fileSystemTree?.allFiles) return [];

  // Add detailed logging to debug the config issue
  console.log("[FileColorMapping] Config received:", {
    hasConfig: !!config,
    configKeys: config ? Object.keys(config) : "config is null/undefined",
    hasSuffixConfigs: config ? !!config.suffixConfigs : false,
    suffixConfigsType: config?.suffixConfigs
      ? typeof config.suffixConfigs
      : "undefined",
    suffixConfigsKeys: config?.suffixConfigs
      ? Object.keys(config.suffixConfigs).slice(0, 5)
      : "undefined",
  });

  const { suffixConfigs, defaultConfig, includeUnmatched = true } = config;

  // Additional validation with logging
  if (!suffixConfigs || typeof suffixConfigs !== "object") {
    console.error("[FileColorMapping] CRITICAL: suffixConfigs is invalid!", {
      suffixConfigs,
      configStructure: config,
    });
    // Return empty array instead of continuing with invalid config
    return [];
  }

  // Group files by their extension
  const filesBySuffix = new Map<string, string[]>();
  const unmatchedFiles: string[] = [];

  fileSystemTree.allFiles.forEach((file) => {
    const filePath = file.path;
    const lastDot = filePath.lastIndexOf(".");

    if (lastDot === -1 || lastDot === filePath.length - 1) {
      // No extension or ends with dot
      if (includeUnmatched) {
        unmatchedFiles.push(filePath);
      }
      return;
    }

    const extension = filePath.substring(lastDot).toLowerCase();

    if (suffixConfigs[extension]) {
      if (!filesBySuffix.has(extension)) {
        filesBySuffix.set(extension, []);
      }
      filesBySuffix.get(extension)!.push(filePath);
    } else if (includeUnmatched) {
      unmatchedFiles.push(filePath);
    }
  });

  // Create highlight layers
  const layers: HighlightLayer[] = [];

  // Sort by file count (more files first) for consistent ordering
  const sortedSuffixes = Array.from(filesBySuffix.entries()).sort(
    ([, filesA], [, filesB]) => filesB.length - filesA.length,
  );

  // Create layers for matched files
  let basePriority = 1;
  sortedSuffixes.forEach(([suffix, files]) => {
    const suffixConfig = suffixConfigs[suffix];
    const extensionName = suffix.substring(1); // Remove leading dot

    // Create primary layer
    const primaryLayer: HighlightLayer = {
      id: `ext-${extensionName}-primary`,
      name: suffixConfig.displayName || extensionName.toUpperCase(),
      color: suffixConfig.primary.color,
      enabled: true,
      opacity: suffixConfig.primary.opacity ?? 1.0,
      priority: suffixConfig.primary.priority ?? basePriority,
      items: files.map((path) => ({
        path,
        type: "file" as const,
        renderStrategy: suffixConfig.primary.renderStrategy,
        ...(suffixConfig.primary.coverOptions && {
          coverOptions: suffixConfig.primary.coverOptions,
        }),
        ...(suffixConfig.primary.customRender && {
          customRender: suffixConfig.primary.customRender,
        }),
      })),
    };

    if (suffixConfig.primary.borderWidth) {
      primaryLayer.borderWidth = suffixConfig.primary.borderWidth;
    }

    layers.push(primaryLayer);

    // Create secondary layer if configured
    if (suffixConfig.secondary) {
      const secondary = suffixConfig.secondary;
      const secondaryLayer: HighlightLayer = {
        id: `ext-${extensionName}-secondary`,
        name: `${suffixConfig.displayName || extensionName.toUpperCase()} Secondary`,
        color: secondary.color,
        enabled: true,
        opacity: secondary.opacity ?? 1.0,
        priority: secondary.priority ?? basePriority + 100, // Higher priority by default
        items: files.map((path) => ({
          path,
          type: "file" as const,
          renderStrategy: secondary.renderStrategy,
          ...(secondary.coverOptions && {
            coverOptions: secondary.coverOptions,
          }),
          ...(secondary.customRender && {
            customRender: secondary.customRender,
          }),
        })),
      };

      if (secondary.borderWidth) {
        secondaryLayer.borderWidth = secondary.borderWidth;
      }

      layers.push(secondaryLayer);
    }

    basePriority += 2; // Leave room for primary + secondary layers
  });

  // Add unmatched files layer if configured
  if (includeUnmatched && unmatchedFiles.length > 0 && defaultConfig) {
    const defaultLayer: HighlightLayer = {
      id: "other-files-primary",
      name: "OTHER",
      color: defaultConfig.primary.color,
      enabled: true,
      opacity: defaultConfig.primary.opacity ?? 1.0,
      priority: defaultConfig.primary.priority ?? basePriority,
      items: unmatchedFiles.map((path) => ({
        path,
        type: "file" as const,
        renderStrategy: defaultConfig.primary.renderStrategy,
        ...(defaultConfig.primary.coverOptions && {
          coverOptions: defaultConfig.primary.coverOptions,
        }),
        ...(defaultConfig.primary.customRender && {
          customRender: defaultConfig.primary.customRender,
        }),
      })),
    };

    if (defaultConfig.primary.borderWidth) {
      defaultLayer.borderWidth = defaultConfig.primary.borderWidth;
    }

    layers.push(defaultLayer);

    // Add default secondary layer if configured
    if (defaultConfig.secondary) {
      const secondary = defaultConfig.secondary;
      const defaultSecondaryLayer: HighlightLayer = {
        id: "other-files-secondary",
        name: "OTHER Secondary",
        color: secondary.color,
        enabled: true,
        opacity: secondary.opacity ?? 1.0,
        priority: secondary.priority ?? basePriority + 100,
        items: unmatchedFiles.map((path) => ({
          path,
          type: "file" as const,
          renderStrategy: secondary.renderStrategy,
          ...(secondary.coverOptions && {
            coverOptions: secondary.coverOptions,
          }),
          ...(secondary.customRender && {
            customRender: secondary.customRender,
          }),
        })),
      };

      if (secondary.borderWidth) {
        defaultSecondaryLayer.borderWidth = secondary.borderWidth;
      }

      layers.push(defaultSecondaryLayer);
    }
  }

  return layers;
}

/**
 * Loads the file color configuration from GitHub with fallback to local
 * @returns Promise resolving to the configuration object with metadata
 */
export async function loadFileColorConfig(): Promise<{
  config: FileSuffixColorConfig;
  source: "remote" | "local" | "fallback";
  lastUpdated?: string;
  error?: string;
}> {
  return fetchColorPaletteConfig();
}

/**
 * Synchronous version for situations where async loading isn't possible
 * Uses cached config if available, falls back to local
 */
export function getFileColorConfig(): FileSuffixColorConfig {
  console.log("[FileColorMapping] Getting file color config...");
  const result = getColorPaletteConfigSync();

  console.log("[FileColorMapping] Config loaded:", {
    source: result.source,
    hasConfig: !!result.config,
    hasSuffixConfigs: !!result.config?.suffixConfigs,
    suffixConfigCount: result.config?.suffixConfigs
      ? Object.keys(result.config.suffixConfigs).length
      : 0,
    version: result.config?.version,
  });

  // getColorPaletteConfigSync now guarantees a valid config or throws
  // The local packaged config MUST always work
  return result.config;
}

// Configuration object that loads from the service
export const DEFAULT_FILE_CONFIGS: FileSuffixColorConfig = getFileColorConfig();

// Backwards compatibility: Simple color mapping extracted from configs
// Since DEFAULT_FILE_CONFIGS is guaranteed to be valid, we can safely access it
export const DEFAULT_FILE_COLORS: Record<string, string> = Object.entries(
  DEFAULT_FILE_CONFIGS.suffixConfigs,
).reduce(
  (acc, [extension, config]) => {
    acc[extension] = config.primary.color;
    return acc;
  },
  {} as Record<string, string>,
);
