/**
 * UI metadata configuration for CodebaseView
 * Local implementation to replace core/code-city dependency
 */

/**
 * UI configuration stored in CodebaseView metadata.ui field
 */
export interface UIMetadata {
  /**
   * Whether grid layout is enabled
   */
  enabled: boolean;
  /**
   * Number of rows in the grid
   */
  rows?: number;
  /**
   * Number of columns in the grid
   */
  cols?: number;
  /**
   * Padding between cells in pixels
   */
  cellPadding?: number;
  /**
   * Whether to show labels for grid cells
   */
  showCellLabels?: boolean;
  /**
   * Position of cell labels relative to the cell
   */
  cellLabelPosition?: "none" | "top" | "bottom";
  /**
   * Height of cell labels as a percentage of cell height (0-1)
   */
  cellLabelHeightPercent?: number;
}

/**
 * Get UI metadata from a CodebaseView's metadata field
 * Returns undefined if no UI metadata is present
 */
export function getUIMetadata(
  metadata?: Record<string, unknown>,
): UIMetadata | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const ui = metadata.ui;
  if (!ui || typeof ui !== "object") {
    return undefined;
  }

  return ui as UIMetadata;
}
