import { createCanvas } from "canvas";
import GIFEncoder from "gifencoder";
import { CityData } from "@principal-ai/code-city-builder";
import { CityImageGenerator } from "./cityImageGenerator";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface HistoryFrame {
  cityData: CityData;
  timestamp: Date;
  commitHash?: string;
  message?: string;
}

interface GifGeneratorOptions {
  width?: number;
  height?: number;
  frameDelay?: number; // milliseconds between frames
  quality?: number; // 1-20, lower is better quality
  showLabels?: boolean;
  backgroundColor?: string;
}

export class HistoryGifGenerator {
  private options: GifGeneratorOptions;
  private cityImageGenerator: CityImageGenerator;

  constructor(options: GifGeneratorOptions = {}) {
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      frameDelay: options.frameDelay || 500, // 500ms between frames
      quality: options.quality || 10,
      showLabels: options.showLabels !== false,
      backgroundColor: options.backgroundColor || "#faf9f7",
    };

    this.cityImageGenerator = new CityImageGenerator({
      width: this.options.width,
      height: this.options.height,
      backgroundColor: this.options.backgroundColor,
      showFileNames: false,
      showGrid: false,
    });
  }

  /**
   * Generate an animated GIF from a series of CityData snapshots
   * @param frames Array of history frames with city data
   * @returns Buffer containing the animated GIF
   */
  async generateHistoryGif(frames: HistoryFrame[]): Promise<Buffer> {
    if (frames.length === 0) {
      throw new Error("No frames provided for GIF generation");
    }

    // Create GIF encoder
    const encoder = new GIFEncoder(this.options.width!, this.options.height!);

    // Configure encoder with streaming
    encoder.start();
    encoder.setRepeat(0); // 0 = loop forever
    encoder.setDelay(this.options.frameDelay!);
    encoder.setQuality(this.options.quality!);

    // Set up readable stream if available, otherwise use direct buffer access
    let gifData: Buffer;

    console.log("🔍 Checking encoder methods...");
    console.log("  Has createReadStream:", !!encoder.createReadStream);
    console.log(
      "  Has createWriteStream:",
      !!(encoder as any).createWriteStream,
    );
    console.log("  Has out:", !!encoder.out);
    console.log("  Encoder type:", encoder.constructor.name);

    if (encoder.createReadStream) {
      console.log("📝 Using createReadStream method");
      // Use stream if available
      const stream = encoder.createReadStream();
      const chunks: Buffer[] = [];

      // Set up promise to wait for stream to complete
      const streamPromise = new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => {
          console.log(`  Received chunk: ${chunk.length} bytes`);
          chunks.push(chunk);
        });

        stream.on("end", () => {
          console.log("  Stream ended");
          resolve();
        });

        stream.on("error", (err: Error) => {
          console.error("  Stream error:", err);
          reject(err);
        });
      });

      // Generate frames
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        console.log(`📸 Generating frame ${i + 1}/${frames.length}`);

        // Create canvas for this frame
        const canvas = createCanvas(this.options.width!, this.options.height!);
        const ctx = canvas.getContext("2d");

        // Generate city image for this snapshot
        const cityImageBuffer = await this.cityImageGenerator.generateImage(
          frame.cityData,
        );

        // Draw city image onto frame canvas
        const cityImage = await this.loadImageFromBuffer(cityImageBuffer);
        ctx.drawImage(
          cityImage,
          0,
          0,
          this.options.width!,
          this.options.height!,
        );

        // Add labels if enabled
        if (this.options.showLabels) {
          this.drawFrameLabel(ctx, frame, i);
        }

        // Add frame to GIF
        encoder.addFrame(ctx as any);
      }

      encoder.finish();

      // Wait for stream to complete
      await streamPromise;

      console.log(
        `📊 Total chunks collected: ${chunks.length}, Total size: ${chunks.reduce((a, b) => a + b.length, 0)} bytes`,
      );
      gifData = Buffer.concat(chunks);
    } else {
      console.log("📝 Using direct buffer access method");
      // Use direct buffer access for gifencoder
      // Generate each frame
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        console.log(`📸 Generating frame ${i + 1}/${frames.length}`);

        try {
          // Create canvas for this frame
          const canvas = createCanvas(
            this.options.width!,
            this.options.height!,
          );
          const ctx = canvas.getContext("2d");

          console.log(`  Creating city image...`);
          // Generate city image for this snapshot
          const cityImageBuffer = await this.cityImageGenerator.generateImage(
            frame.cityData,
          );
          console.log(`  City image created: ${cityImageBuffer.length} bytes`);

          console.log(`  Loading image from buffer...`);
          // Draw city image onto frame canvas
          const cityImage = await this.loadImageFromBuffer(cityImageBuffer);
          console.log(`  Drawing image to canvas...`);
          ctx.drawImage(
            cityImage,
            0,
            0,
            this.options.width!,
            this.options.height!,
          );

          // Add labels if enabled
          if (this.options.showLabels) {
            console.log(`  Adding frame label...`);
            this.drawFrameLabel(ctx, frame, i);
          }

          console.log(`  Adding frame to GIF encoder...`);
          // Add frame to GIF
          encoder.addFrame(ctx as any);
          console.log(`  Frame ${i + 1} added successfully`);
        } catch (error) {
          console.error(`❌ Error generating frame ${i + 1}:`, error);
          throw error;
        }
      }

      // Finish encoding
      encoder.finish();

      // Try different methods to get the GIF data
      let data: any;

      // Debug the encoder structure first
      console.log("🔍 Encoder structure after finish():");
      console.log("  encoder.out exists:", !!encoder.out);
      if (encoder.out) {
        console.log("  encoder.out type:", encoder.out.constructor.name);
        console.log(
          "  encoder.out methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(encoder.out)),
        );
        console.log("  encoder.out properties:", Object.keys(encoder.out));
      }

      // Method 1: Check for out.getData()
      if (encoder.out && encoder.out.getData) {
        data = encoder.out.getData();
        console.log(
          `📦 Got data from encoder.out.getData(): ${data ? data.length : 0} bytes`,
        );
      }
      // Method 2: Check for stream
      else if ((encoder as any).stream) {
        data = (encoder as any).stream.getData
          ? (encoder as any).stream.getData()
          : (encoder as any).stream.data;
        console.log(
          `📦 Got data from encoder.stream: ${data ? data.length : 0} bytes`,
        );
      }
      // Method 3: Check for direct read() method
      else if ((encoder as any).read) {
        data = (encoder as any).read();
        console.log(
          `📦 Got data from encoder.read(): ${data ? data.length : 0} bytes`,
        );
      }
      // Method 4: Check ByteCapacitor
      else if (
        (encoder as any).out &&
        (encoder as any).out.constructor.name === "ByteCapacitor"
      ) {
        // ByteCapacitor stores data in .data property
        data = (encoder as any).out.data;
        console.log(
          `📦 Got data from ByteCapacitor: ${data ? data.length : 0} bytes`,
        );
      }

      if (!data || data.length === 0) {
        console.error("Encoder structure:", encoder);
        console.error("Encoder.out:", encoder.out);
        console.error(
          "Available encoder methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(encoder)),
        );
        throw new Error("Unable to get GIF data from encoder - no data found");
      }

      gifData = Buffer.from(data);
    }

    console.log(
      `✅ GIF generated: ${gifData.length} bytes, ${frames.length} frames`,
    );

    return gifData;
  }

  /**
   * Generate a GIF from git history commits
   * @param owner Repository owner
   * @param repo Repository name
   * @param commits Array of commit data with CityData
   * @returns Buffer containing the animated GIF
   */
  async generateGitHistoryGif(
    owner: string,
    repo: string,
    commits: Array<{
      hash: string;
      message: string;
      date: Date;
      cityData: CityData;
    }>,
  ): Promise<Buffer> {
    const frames: HistoryFrame[] = commits.map((commit) => ({
      cityData: commit.cityData,
      timestamp: commit.date,
      commitHash: commit.hash,
      message: commit.message,
    }));

    return this.generateHistoryGif(frames);
  }

  /**
   * Alternative: Use ffmpeg for higher quality GIF generation
   * Requires ffmpeg to be installed on the system
   */
  async generateHighQualityGif(frames: HistoryFrame[]): Promise<Buffer> {
    const tempDir = path.join(
      __dirname,
      "..",
      "..",
      "temp",
      `gif-${Date.now()}`,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Generate PNG frames
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const imageBuffer = await this.cityImageGenerator.generateImage(
          frame.cityData,
        );
        const framePath = path.join(
          tempDir,
          `frame-${String(i).padStart(4, "0")}.png`,
        );
        fs.writeFileSync(framePath, imageBuffer);
      }

      // Use ffmpeg to create GIF with palette optimization
      const paletteFile = path.join(tempDir, "palette.png");
      const outputFile = path.join(tempDir, "output.gif");

      // Generate optimal palette
      execSync(
        `ffmpeg -i ${tempDir}/frame-%04d.png -vf "palettegen=stats_mode=diff" -y ${paletteFile}`,
        { stdio: "pipe" },
      );

      // Create GIF using palette
      const fps = Math.round(1000 / this.options.frameDelay!);
      execSync(
        `ffmpeg -framerate ${fps} -i ${tempDir}/frame-%04d.png -i ${paletteFile} ` +
          `-lavfi "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -y ${outputFile}`,
        { stdio: "pipe" },
      );

      const gifBuffer = fs.readFileSync(outputFile);
      console.log(`✅ High-quality GIF generated: ${gifBuffer.length} bytes`);

      return gifBuffer;
    } finally {
      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Helper: Load image from buffer
   */
  private async loadImageFromBuffer(buffer: Buffer): Promise<any> {
    const { Image } = require("canvas");
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        console.log(`    Image loaded: ${img.width}x${img.height}`);
        resolve(img);
      };
      img.onerror = (err: Event | string) => {
        console.error(`    Image load error:`, err);
        reject(err);
      };

      // Set source after event handlers are attached
      img.src = buffer;
    });
  }

  /**
   * Helper: Draw frame label with commit info
   */
  private drawFrameLabel(
    ctx: import("canvas").CanvasRenderingContext2D,
    frame: HistoryFrame,
    frameIndex: number,
  ): void {
    // Draw semi-transparent background for label
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, this.options.height! - 60, this.options.width!, 60);

    // Draw frame info
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";

    const dateStr = frame.timestamp.toLocaleDateString();
    const timeStr = frame.timestamp.toLocaleTimeString();

    ctx.fillText(`Frame ${frameIndex + 1}`, 10, this.options.height! - 40);
    ctx.fillText(`${dateStr} ${timeStr}`, 10, this.options.height! - 20);

    if (frame.commitHash) {
      ctx.fillText(
        `Commit: ${frame.commitHash.substring(0, 7)}`,
        200,
        this.options.height! - 40,
      );
    }

    if (frame.message) {
      const truncatedMsg =
        frame.message.length > 50
          ? frame.message.substring(0, 47) + "..."
          : frame.message;
      ctx.fillText(truncatedMsg, 200, this.options.height! - 20);
    }
  }
}
