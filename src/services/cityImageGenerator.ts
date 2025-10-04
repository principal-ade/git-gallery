import { createCanvas } from "canvas";
import type { CityData } from "@principal-ai/code-city-builder";
import {
  clearCanvas,
  drawDistricts,
  drawBuildings,
  RenderMode,
  drawGrid,
  drawLegend,
} from "@principal-ai/code-city-server";
import * as fs from "fs";
import * as path from "path";

interface ImageGeneratorOptions {
  width?: number;
  height?: number;
  showFileNames?: boolean;
  defaultDirectoryColor?: string;
  showGrid?: boolean;
  backgroundColor?: string;
  relativeBorder?: number; // Border as percentage of image size (e.g., 0.1 for 10%)
}

/**
 * Write PNG buffer to a temporary file for testing purposes
 */
function writePngToTempFile(pngBuffer: Buffer, suffix: string = ""): string {
  const tempDir = path.join(__dirname, "..", "..", "temp");

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `city-image-${timestamp}${suffix}.png`;
  const filepath = path.join(tempDir, filename);

  fs.writeFileSync(filepath, pngBuffer);

  console.log(`🗂️  PNG written to: ${filepath}`);
  return filepath;
}

export class CityImageGenerator {
  constructor(private options: ImageGeneratorOptions = {}) {}

  async generateImage(cityData: CityData): Promise<Buffer> {
    // Validate cityData first
    if (!cityData || !cityData.bounds) {
      throw new Error("Invalid city data: missing bounds");
    }

    const { bounds } = cityData;
    if (
      typeof bounds.minX !== "number" ||
      typeof bounds.maxX !== "number" ||
      typeof bounds.minZ !== "number" ||
      typeof bounds.maxZ !== "number"
    ) {
      throw new Error("Invalid city data: invalid bounds values");
    }

    // Calculate optimal dimensions if not provided
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxZ - bounds.minZ;

    // Create content canvas first
    const contentCanvas = createCanvas(contentWidth, contentHeight);
    const contentCtx = contentCanvas.getContext(
      "2d",
    ) as unknown as CanvasRenderingContext2D;

    // Clear content canvas with a proper background color
    const backgroundColor = this.options.backgroundColor || "#faf9f7"; // Light beige background like the mosaic page
    clearCanvas(contentCtx, contentWidth, contentHeight, backgroundColor);

    // Create worldToCanvas function that matches the interactive map behavior
    const worldToCanvas = (x: number, z: number) => {
      return {
        x: x,
        y: z,
      };
    };

    // Draw grid if enabled
    if (this.options.showGrid) {
      drawGrid(contentCtx, contentWidth, contentHeight, 10);
    }

    // Draw districts (directories)
    drawDistricts(
      RenderMode.HIGHLIGHT,
      contentCtx,
      cityData.districts,
      worldToCanvas,
      1,
      new Set<string>(), // highlightedDirectories
      new Set<string>(), // hoveredDirectories
      undefined, // hoveredDistrict
      false, // fullSize
      new Set<string>(), // emphasizedDirectories
      new Set<string>(), // selectedPaths
      undefined, // changedFiles
      undefined, // theme
      undefined, // customColorFn
      this.options.defaultDirectoryColor,
    );

    // Draw buildings (files)
    drawBuildings(
      RenderMode.HIGHLIGHT,
      contentCtx,
      cityData.buildings,
      worldToCanvas,
      1,
      undefined, // highlightedPaths
      undefined, // selectedPaths
      undefined, // focusDirectory
      undefined, // hoveredBuilding
      undefined, // theme
      undefined, // customColorFn
      undefined, // emphasizedDirectories
      this.options.showFileNames,
      false, // fullSize
      undefined, // changedFiles
      undefined, // hoverBorderColor
      undefined, // selectedBorderColor
      true, // disableOpacityDimming
      undefined, // importanceConfig
    );

    // Draw legend
    drawLegend(contentCtx, contentWidth, contentHeight, 0, null, false);

    // Return as PNG buffer
    const png = contentCanvas.toBuffer("image/png");
    console.log(`🖼️  Final canvas: ${png.length} bytes`);

    // Write PNG to temporary file for testing
    writePngToTempFile(png);

    return png;
  }
}
