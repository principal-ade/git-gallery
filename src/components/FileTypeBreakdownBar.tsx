import React, { useMemo } from "react";
import { HighlightLayer } from "@principal-ai/code-city-react";

interface FileTypeBreakdownBarProps {
  highlightLayers: HighlightLayer[];
  height?: number;
  showLabels?: boolean;
  minPercentageForLabel?: number;
}

export const FileTypeBreakdownBar: React.FC<FileTypeBreakdownBarProps> = ({
  highlightLayers,
  height = 24,
  showLabels = true,
  minPercentageForLabel = 5,
}) => {
  // Calculate percentages and prepare segments
  const segments = useMemo(() => {
    // Filter out secondary layers to avoid duplicate counting
    // Secondary layers have "-secondary" in their ID
    const primaryLayers = highlightLayers.filter(
      (layer) => !layer.id.includes("-secondary"),
    );

    const totalFiles = primaryLayers.reduce(
      (sum, layer) => sum + layer.items.length,
      0,
    );
    if (totalFiles === 0) return [];

    return primaryLayers
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        color: layer.color,
        count: layer.items.length,
        percentage: (layer.items.length / totalFiles) * 100,
      }))
      .filter((segment) => segment.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending (largest to smallest)
  }, [highlightLayers]);

  if (segments.length === 0) return null;

  return (
    <div style={{ width: "100%" }}>
      {/* The stacked bar */}
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          display: "flex",
          borderRadius: "0",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {segments.map((segment) => (
          <div
            key={segment.id}
            style={{
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
              position: "relative",
              transition: "opacity 0.2s",
              cursor: "pointer",
            }}
            title={`${segment.name}: ${segment.count} files (${segment.percentage.toFixed(1)}%)`}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {/* Show label if percentage is large enough */}
            {showLabels && segment.percentage >= minPercentageForLabel && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: getContrastColor(segment.color),
                  fontSize: "11px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {segment.name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to determine contrasting text color
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
