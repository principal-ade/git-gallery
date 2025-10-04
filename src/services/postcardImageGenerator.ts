import { createCanvas } from "canvas";
import { CityData } from "@principal-ai/code-city-builder";
import { HighlightLayer } from "@principal-ai/code-city-react";

interface PostcardImageOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

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

interface PostcardData {
  repoPath: string;
  repoStats?: RepoStats;
  cityData: CityData;
  highlightLayers: HighlightLayer[];
}

export async function generatePostcardImage(
  data: PostcardData,
  options: PostcardImageOptions = {},
): Promise<Buffer> {
  const {
    width = 900,
    height = 400, // Roughly matching the ~2.4:1 aspect ratio
    backgroundColor = "#2d3446", // theme.colors.backgroundTertiary - solid color instead of transparent
  } = options;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as any;

  // Fill background with the postcard's distinctive color
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Add border (matching the 2px border from the component)
  ctx.strokeStyle = "rgba(212, 165, 116, 0.2)"; // theme.colors.border
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Add padding (matching the 2rem padding)
  const padding = 32; // 2rem = 32px
  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;

  // Split into two columns (matching the 1fr 1fr grid)
  const leftWidth = contentWidth / 2 - 16; // Gap of 2rem = 32px, so 16px each side
  const rightWidth = leftWidth;
  const leftX = padding;
  const rightX = padding + leftWidth + 32; // 32px gap

  const [owner, repoName] = data.repoPath.split("/");

  // LEFT SIDE: Repository Info
  drawLeftSide(ctx, {
    x: leftX,
    y: padding,
    width: leftWidth,
    height: contentHeight,
    repoName,
    owner,
    repoStats: data.repoStats,
    cityData: data.cityData,
    highlightLayers: data.highlightLayers,
  });

  // RIGHT SIDE: Mosaic Visualization Placeholder
  drawRightSide(ctx, {
    x: rightX,
    y: padding,
    width: rightWidth,
    height: contentHeight,
    cityData: data.cityData,
    highlightLayers: data.highlightLayers,
  });

  return canvas.toBuffer("image/png");
}

function drawLeftSide(
  ctx: any,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    repoName: string;
    owner: string;
    repoStats?: RepoStats;
    cityData: CityData;
    highlightLayers: HighlightLayer[];
  },
) {
  const { x, y, width, repoName, owner, repoStats, cityData, highlightLayers } =
    params;

  let currentY = y + 40; // Start with some top margin

  // Repository Name (large, bold, centered)
  ctx.font = "bold 28px system-ui";
  ctx.fillStyle = "#f1e8dc"; // theme.colors.text
  ctx.textAlign = "center";
  ctx.fillText(repoName, x + width / 2, currentY);
  currentY += 50;

  // Description (if available)
  if (repoStats?.description) {
    ctx.font = "16px system-ui";
    ctx.fillStyle = "#c9b8a3"; // theme.colors.textSecondary
    ctx.textAlign = "center";

    // Word wrap description
    const words = repoStats.description.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 20) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    lines.forEach((line, index) => {
      ctx.fillText(line, x + width / 2, currentY + index * 20);
    });
    currentY += lines.length * 20 + 30;
  }

  // File Type Breakdown Bar (simplified colored bar)
  if (highlightLayers.length > 0) {
    const barHeight = 8;
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

    // Draw segments for different file types
    const segmentWidth = width / Math.min(highlightLayers.length, 5);
    for (let i = 0; i < Math.min(highlightLayers.length, 5); i++) {
      ctx.fillStyle = colors[i] || "#6b7280";
      ctx.fillRect(x + i * segmentWidth, currentY, segmentWidth - 2, barHeight);
    }
    currentY += barHeight + 30;
  }

  // Establishment date and owner
  if (repoStats?.ageInDays) {
    const establishedDate = new Date();
    establishedDate.setDate(establishedDate.getDate() - repoStats.ageInDays);
    const dateStr = establishedDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    ctx.font = "italic 14px system-ui";
    ctx.fillStyle = "#8b7968"; // theme.colors.textMuted
    ctx.textAlign = "center";
    ctx.fillText(`Est. ${dateStr}`, x + width / 2, currentY);
    currentY += 25;
  }

  ctx.font = "14px system-ui";
  ctx.fillStyle = "#8b7968"; // theme.colors.textMuted
  ctx.fillText(`by ${owner}`, x + width / 2, currentY);
  currentY += 40;

  // Stats row (stars, files, etc.)
  if (repoStats || cityData) {
    const stats = [];

    if (repoStats) {
      stats.push({ label: "★", value: repoStats.stars.toLocaleString() }); // Star icon
    }
    if (repoStats?.contributors) {
      stats.push({ label: "👥", value: repoStats.contributors.toString() }); // Users icon
    }
    if (cityData?.metadata?.totalFiles) {
      stats.push({
        label: "📄",
        value: cityData.metadata.totalFiles.toLocaleString(),
      }); // File icon
    }

    // Draw stats in a row
    const statSpacing = width / (stats.length + 1);
    stats.forEach((stat, index) => {
      const statX = x + statSpacing * (index + 1);

      // Icon
      ctx.font = "18px system-ui";
      ctx.fillStyle = "#c9b8a3"; // theme.colors.textSecondary
      ctx.textAlign = "center";
      ctx.fillText(stat.label, statX, currentY);

      // Value
      ctx.font = "14px system-ui";
      ctx.fillStyle = "#c9b8a3"; // theme.colors.textSecondary
      ctx.fillText(stat.value, statX, currentY + 25);
    });
  }
}

function drawRightSide(
  ctx: any,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    cityData: CityData;
    highlightLayers: HighlightLayer[];
  },
) {
  const { x, y, width, height } = params;

  // Draw placeholder for mosaic visualization
  // For now, just draw a simple grid pattern to represent the mosaic

  // Background
  ctx.fillStyle = "#1a1f2e"; // theme.colors.background
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = "rgba(212, 165, 116, 0.2)"; // theme.colors.border
  ctx.lineWidth = 2; // Match the component border
  ctx.strokeRect(x, y, width, height);

  // Grid pattern to represent the mosaic
  const gridSize = 20;
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  for (let gx = 0; gx < width; gx += gridSize) {
    for (let gy = 0; gy < height; gy += gridSize) {
      if (Math.random() > 0.3) {
        // Don't fill every square
        const colorIndex = Math.floor(Math.random() * colors.length);
        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(x + gx + 1, y + gy + 1, gridSize - 2, gridSize - 2);
      }
    }
  }

  // Add "Code Architecture" label in center
  ctx.font = "bold 16px system-ui";
  ctx.fillStyle = "#f1e8dc"; // theme.colors.text
  ctx.textAlign = "center";
  ctx.fillText("Code Architecture", x + width / 2, y + height / 2);
}
