import { NextRequest, NextResponse } from "next/server";
import { HistoryGifGenerator } from "@/services/historyGifGenerator";

export const maxDuration = 60; // Allow up to 60 seconds for GIF generation

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const body = await request.json();

    const { frames, settings } = body;

    if (!frames || frames.length === 0) {
      return NextResponse.json(
        { error: "No frames provided" },
        { status: 400 },
      );
    }

    console.log(
      `🎬 Exporting GIF for ${owner}/${repo} with ${frames.length} frames`,
    );

    // Generate GIF from provided frames
    const generator = new HistoryGifGenerator({
      width: settings?.width || 800,
      height: settings?.height || 600,
      frameDelay: settings?.delay || 1000,
      quality: 10, // Medium quality for interactive exports
      showLabels: settings?.showLabels !== false,
    });

    // Transform frames to expected format
    const historyFrames = frames.map((frame: any) => ({
      cityData: frame.cityData,
      timestamp: new Date(frame.date),
      commitHash: frame.sha,
      message: frame.message,
    }));

    // Generate the GIF
    const gifBuffer = await generator.generateHistoryGif(historyFrames);

    // Return GIF as response
    return new NextResponse(gifBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Disposition": `attachment; filename="${owner}-${repo}-history.gif"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to export GIF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export GIF" },
      { status: 500 },
    );
  }
}
