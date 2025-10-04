import { NextRequest, NextResponse } from "next/server";
import { generatePostcardImage } from "../../../../../../services/postcardImageGenerator";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`🎨 Generating postcard preview for ${owner}/${repo}`);

    // Create sample postcard data structure
    const postcardData = {
      repoPath: `${owner}/${repo}`,
      repoStats: {
        stars: Math.floor(Math.random() * 1000),
        forks: Math.floor(Math.random() * 100),
        watchers: Math.floor(Math.random() * 50),
        contributors: Math.floor(Math.random() * 20),
        language: "JavaScript",
        description: `Sample repository ${repo}`,
        lastUpdated: new Date().toISOString(),
        ageInDays: Math.floor(Math.random() * 365),
        isFork: false,
      },
      cityData: {
        buildings: [], // Placeholder - would normally contain actual file buildings
        districts: [], // Placeholder - would normally contain directory structure
        bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 }, // Placeholder bounds
        metadata: {
          totalFiles: 42,
          totalDirectories: 8,
          analyzedAt: new Date(),
          rootPath: `${owner}/${repo}`,
        },
      },
      highlightLayers: [
        {
          id: "javascript",
          name: "JavaScript",
          enabled: true,
          items: [],
          color: "#f1e05a",
          priority: 1,
        },
        {
          id: "typescript",
          name: "TypeScript",
          enabled: true,
          items: [],
          color: "#3178c6",
          priority: 2,
        },
        {
          id: "css",
          name: "CSS",
          enabled: true,
          items: [],
          color: "#563d7c",
          priority: 3,
        },
        {
          id: "html",
          name: "HTML",
          enabled: true,
          items: [],
          color: "#e34c26",
          priority: 4,
        },
      ],
    };

    // Generate postcard image
    const imageBuffer = await generatePostcardImage(postcardData, {
      width: 800,
      height: 400,
      backgroundColor: "#2d3446", // theme.colors.backgroundTertiary
    });

    console.log(`✅ Generated image: ${imageBuffer.length} bytes`);

    // Return the image directly
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "no-cache", // Disable cache for testing
      },
    });
  } catch (error) {
    console.error("❌ Failed to generate preview image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate preview image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
