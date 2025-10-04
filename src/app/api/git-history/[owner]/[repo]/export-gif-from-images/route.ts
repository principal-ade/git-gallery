import { NextRequest, NextResponse } from "next/server";
import GIFEncoder from "gifencoder";
import { createCanvas, loadImage } from "canvas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;

  try {
    console.log(
      `[export-gif-from-images] Processing request for ${owner}/${repo}`,
    );

    // Parse the multipart form data
    const formData = await request.formData();

    // Get frame infos and settings
    const frameInfosStr = formData.get("frameInfos") as string;
    const settingsStr = formData.get("settings") as string;

    if (!frameInfosStr || !settingsStr) {
      return NextResponse.json(
        { error: "Missing frameInfos or settings" },
        { status: 400 },
      );
    }

    const frameInfos = JSON.parse(frameInfosStr);
    const settings = JSON.parse(settingsStr);

    console.log(
      `[export-gif-from-images] Processing ${frameInfos.length} frames`,
    );
    console.log(`[export-gif-from-images] Settings:`, settings);

    // Create GIF encoder
    const encoder = new GIFEncoder(
      settings.width || 800,
      settings.height || 600,
    );

    // Collect the GIF data chunks
    const chunks: Buffer[] = [];
    const gifStream = encoder.createReadStream();

    gifStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Configure encoder AFTER setting up the stream
    encoder.start();
    encoder.setRepeat(0); // 0 = loop forever
    encoder.setDelay(settings.delay || 1000);
    encoder.setQuality(10); // Lower is better quality

    // Process each frame
    for (const frameInfo of frameInfos) {
      const frameKey = `frame_${frameInfo.index}`;
      const frameFile = formData.get(frameKey) as File;

      if (!frameFile) {
        console.warn(`[export-gif-from-images] Missing frame ${frameKey}`);
        continue;
      }

      console.log(
        `[export-gif-from-images] Processing frame ${frameInfo.index} for commit ${frameInfo.sha?.substring(0, 7)}`,
      );

      // Convert File to Buffer
      const arrayBuffer = await frameFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Load the image
      const img = await loadImage(buffer);

      // Create canvas for this frame
      const canvas = createCanvas(
        settings.width || 800,
        settings.height || 600,
      );
      const ctx = canvas.getContext("2d");

      // Draw the captured browser image
      ctx.drawImage(img, 0, 0, settings.width || 800, settings.height || 600);

      // Add labels if enabled - frame on top-right, description on bottom
      if (settings.showLabels && frameInfo) {
        const width = settings.width || 600;
        const height = settings.height || 600;

        // Frame indicator in TOP-RIGHT corner
        const totalFrames = frameInfos.length;
        const currentFrame = frameInfo.index;
        const frameText = `${currentFrame + 1}/${totalFrames}`;

        ctx.font =
          "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textAlign = "left";

        const frameMetrics = ctx.measureText(frameText);
        const framePadding = 8;
        const frameWidth = frameMetrics.width + framePadding * 2;
        const frameHeight = 22;
        const frameX = width - frameWidth - 12;

        // Semi-transparent rounded background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.roundRect(frameX, 12, frameWidth, frameHeight, 6);
        ctx.fill();

        // White text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(frameText, frameX + framePadding, 12 + 15);

        // Description bar along the bottom (full width)
        const bottomBarHeight = 32;
        const bottomBarY = height - bottomBarHeight;

        // Semi-transparent full-width background
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, bottomBarY, width, bottomBarHeight);

        // Description text setup
        ctx.font =
          "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillStyle = "#ffffff";

        // Format date nicely
        const dateStr = frameInfo.date
          ? new Date(frameInfo.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";

        // Combine date and commit message
        let descriptionText = "";
        if (dateStr && frameInfo.message) {
          const commitMsg = frameInfo.message.split("\n")[0]; // Get first line only
          descriptionText = `${dateStr} • ${commitMsg}`;
        } else if (dateStr) {
          descriptionText = dateStr;
        } else if (frameInfo.message) {
          descriptionText = frameInfo.message.split("\n")[0];
        }

        // Truncate if too long for the width
        const maxTextWidth = width - 32; // Leave padding on both sides
        let displayText = descriptionText;
        let textMetrics = ctx.measureText(displayText);

        while (textMetrics.width > maxTextWidth && displayText.length > 10) {
          displayText =
            displayText.substring(0, displayText.length - 4) + "...";
          textMetrics = ctx.measureText(displayText);
        }

        // Draw the text centered vertically in the bottom bar
        ctx.fillText(displayText, 16, bottomBarY + 21);
      }

      // Add frame to GIF
      encoder.addFrame(ctx as any);
      console.log(`[export-gif-from-images] Frame ${frameInfo.index} added`);
    }

    // Finish encoding
    encoder.finish();

    // Wait for the stream to complete
    await new Promise<void>((resolve, reject) => {
      gifStream.on("end", () => {
        console.log(
          `[export-gif-from-images] Stream ended, collected ${chunks.length} chunks`,
        );
        resolve();
      });
      gifStream.on("error", (err) => {
        console.error(`[export-gif-from-images] Stream error:`, err);
        reject(err);
      });
    });

    // Combine all chunks into a single buffer
    const gifData = Buffer.concat(chunks);

    if (gifData.length === 0) {
      throw new Error("No GIF data was generated");
    }

    console.log(
      `[export-gif-from-images] GIF generated: ${gifData.length} bytes`,
    );

    // Verify it's a valid GIF by checking the header
    const header = gifData.slice(0, 6).toString("ascii");
    if (!header.startsWith("GIF")) {
      console.error(`[export-gif-from-images] Invalid GIF header: ${header}`);
      console.error(
        `[export-gif-from-images] First 20 bytes:`,
        gifData.slice(0, 20),
      );
      throw new Error("Generated data is not a valid GIF");
    }

    console.log(
      `[export-gif-from-images] Valid GIF detected with header: ${header}`,
    );

    // Return the GIF as a response
    return new NextResponse(gifData, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Disposition": `attachment; filename="${owner}-${repo}-history.gif"`,
      },
    });
  } catch (error: any) {
    console.error("[export-gif-from-images] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate GIF from images" },
      { status: 500 },
    );
  }
}
