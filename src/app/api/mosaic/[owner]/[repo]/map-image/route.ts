import { NextRequest, NextResponse } from "next/server";
import { mosaicImageClient } from "../../../../../../services/mosaicImageService";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`🗺️ Processing map image request for ${owner}/${repo}`);

    // First, check if we already have a cached map image
    const existingMapImageUrl = await mosaicImageClient.getExistingMapImageUrl(
      owner,
      repo,
    );
    if (existingMapImageUrl) {
      console.log(`✅ Found existing cached map image for ${owner}/${repo}`);

      return NextResponse.json({
        imageUrl: existingMapImageUrl,
        repoPath: `${owner}/${repo}`,
        cached: true,
      });
    }

    console.log(
      `🗺️ No cached map image found, generating new one for ${owner}/${repo}`,
    );

    // Parse the FormData for new image generation
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    // If no image provided, it means client was just checking for cache
    if (!imageFile) {
      return NextResponse.json({
        cached: false,
        message:
          "No cached map image found, please provide an image to generate",
      });
    }

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    console.log(`📦 Map image size: ${imageBuffer.length} bytes`);

    // Save map image to S3
    const s3Key = await mosaicImageClient.saveMapImage(
      owner,
      repo,
      imageBuffer,
    );
    const imageUrl = mosaicImageClient.getImageUrl(s3Key);

    console.log(`✅ Map image saved successfully: ${imageUrl}`);

    return NextResponse.json({
      imageUrl,
      repoPath: `${owner}/${repo}`,
      cached: false,
    });
  } catch (error) {
    console.error("❌ Failed to save map image:", error);
    return NextResponse.json(
      {
        error: "Failed to save map image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`🗺️ Checking for existing map image for ${owner}/${repo}`);

    // Check if we have a cached map image
    const existingMapImageUrl = await mosaicImageClient.getExistingMapImageUrl(
      owner,
      repo,
    );
    if (existingMapImageUrl) {
      return NextResponse.json({
        imageUrl: existingMapImageUrl,
        repoPath: `${owner}/${repo}`,
        cached: true,
      });
    }

    return NextResponse.json({
      cached: false,
      message: "No cached map image found",
    });
  } catch (error) {
    console.error("❌ Failed to check for map image:", error);
    return NextResponse.json(
      {
        error: "Failed to check for map image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
