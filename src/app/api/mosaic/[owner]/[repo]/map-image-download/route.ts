import { NextRequest, NextResponse } from "next/server";
import { mosaicImageClient } from "../../../../../../services/mosaicImageService";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`📥 Downloading map image for ${owner}/${repo}`);

    // Check if we have a cached map image URL
    const existingMapImageUrl = await mosaicImageClient.getExistingMapImageUrl(
      owner,
      repo,
    );

    if (!existingMapImageUrl) {
      return NextResponse.json(
        {
          error: "No cached map image found",
          message: "Please generate the map image first",
        },
        { status: 404 },
      );
    }

    // Fetch the image from S3
    const imageResponse = await fetch(existingMapImageUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from S3: ${imageResponse.status}`);
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image with proper headers for download
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${owner}-${repo}-map.png"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("❌ Failed to download map image:", error);
    return NextResponse.json(
      {
        error: "Failed to download map image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
