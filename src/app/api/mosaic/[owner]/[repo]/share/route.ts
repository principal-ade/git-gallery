import { NextRequest, NextResponse } from "next/server";
import { mosaicImageClient } from "../../../../../../services/mosaicImageService";
import { generatePostcardImage } from "../../../../../../services/postcardImageGenerator";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    // Generate unique ID for this share
    const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      `🎨 Generating share image for ${owner}/${repo} with ID: ${shareId}`,
    );

    // Fetch repo data directly from GitHub API (more efficient for server-side)
    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { "User-Agent": "GitMosaic" };
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    // Get repository info
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers,
      },
    );

    if (!repoResponse.ok) {
      throw new Error(
        `GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`,
      );
    }

    const repoInfo = await repoResponse.json();

    // Calculate repository age in days
    const createdDate = new Date(repoInfo.created_at);
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Create postcard data structure with real repository info
    const postcardData = {
      repoPath: `${owner}/${repo}`,
      repoStats: {
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
        watchers: repoInfo.watchers_count || 0,
        contributors: undefined, // Could fetch from /contributors API if needed
        language: repoInfo.language || "Unknown",
        description: repoInfo.description || `Repository ${repo}`,
        lastUpdated: repoInfo.updated_at,
        license: repoInfo.license,
        ageInDays: ageInDays,
        isFork: repoInfo.fork || false,
      },
      cityData: {
        buildings: [], // Placeholder - would normally contain actual file buildings
        districts: [], // Placeholder - would normally contain directory structure
        bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 }, // Placeholder bounds
        metadata: {
          totalFiles: Math.floor(Math.random() * 100) + 20, // Placeholder
          totalDirectories: Math.floor(Math.random() * 20) + 5, // Placeholder
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
        {
          id: "python",
          name: "Python",
          enabled: true,
          items: [],
          color: "#3572A5",
          priority: 5,
        },
      ],
    };

    // Generate postcard image with real repository info
    const imageBuffer = await generatePostcardImage(postcardData, {
      width: 1200,
      height: 630,
      backgroundColor: "#2d3446", // theme.colors.backgroundTertiary
    });

    // Save to S3
    const s3Key = await mosaicImageClient.saveImage(owner, repo, imageBuffer);
    const imageUrl = mosaicImageClient.getImageUrl(s3Key);

    // Also save metadata for the shared link
    const metadataKey = `shared-metadata/${shareId}.json`;
    await mosaicImageClient.putObject(metadataKey, {
      shareId,
      owner,
      repo,
      repoPath: `${owner}/${repo}`,
      imageKey: s3Key,
      imageUrl,
      createdAt: new Date().toISOString(),
      stats: postcardData.repoStats,
    });

    // Return shareable URL
    const shareUrl = `${process.env.BASE_URL || "http://localhost:3000"}/shared/${shareId}`;

    console.log(`✅ Share image generated successfully: ${shareUrl}`);

    return NextResponse.json({
      shareUrl,
      imageUrl,
      shareId,
      repoPath: `${owner}/${repo}`,
    });
  } catch (error) {
    console.error("❌ Failed to generate share image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
