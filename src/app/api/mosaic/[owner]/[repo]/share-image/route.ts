import { NextRequest, NextResponse } from "next/server";
import { mosaicImageClient } from "../../../../../../services/mosaicImageService";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`🎨 Checking for existing share image for ${owner}/${repo}`);

    // First, check if we already have a cached image
    const existingImageUrl = await mosaicImageClient.getExistingImageUrl(
      owner,
      repo,
    );
    if (existingImageUrl) {
      console.log(`✅ Found existing cached image for ${owner}/${repo}`);

      // Return existing shareable URL
      const shareUrl = `${process.env.BASE_URL || "http://localhost:3000"}/shared/${owner}/${repo}`;

      return NextResponse.json({
        shareUrl,
        imageUrl: existingImageUrl,
        repoPath: `${owner}/${repo}`,
        cached: true,
      });
    }

    console.log(
      `🎨 No cached image found, generating new image for ${owner}/${repo}`,
    );

    // Parse the FormData for new image generation
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    // If no image provided, it means client was just checking for cache
    // Return no cache found response instead of error
    if (!imageFile) {
      return NextResponse.json({
        cached: false,
        message: "No cached image found, please provide an image to generate",
      });
    }

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    console.log(`📦 Image size: ${imageBuffer.length} bytes`);

    // Fetch comprehensive repo info for metadata
    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { "User-Agent": "GitGallery" };
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    let repoInfo = null;
    let contributors = [];
    try {
      // Fetch repository info
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers,
        },
      );

      if (repoResponse.ok) {
        repoInfo = await repoResponse.json();
      }

      // Fetch contributors count
      const contributorsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1`,
        {
          headers,
        },
      );

      if (contributorsResponse.ok) {
        // Get total contributors from Link header
        const linkHeader = contributorsResponse.headers.get("Link");
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (match) {
            contributors = Array(parseInt(match[1])).fill(null);
          } else {
            // If no pagination, it means there's only 1 page
            const contributorsList = await contributorsResponse.json();
            contributors = contributorsList || [];
          }
        } else {
          // No Link header means all contributors fit in one page
          const contributorsList = await contributorsResponse.json();
          contributors = contributorsList || [];
        }
      }
    } catch (err) {
      console.warn("Failed to fetch repo info from GitHub API:", err);
    }

    // Save image to S3
    const s3Key = await mosaicImageClient.saveImage(owner, repo, imageBuffer);
    const imageUrl = mosaicImageClient.getImageUrl(s3Key);

    // Calculate age in days
    let ageInDays = undefined;
    if (repoInfo?.created_at) {
      const createdDate = new Date(repoInfo.created_at);
      const now = new Date();
      ageInDays = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Save metadata for the shared link
    const metadataKey = `shared-metadata/${owner}/${repo}.json`;
    await mosaicImageClient.putObject(metadataKey, {
      owner,
      repo,
      repoPath: `${owner}/${repo}`,
      imageKey: s3Key,
      imageUrl,
      createdAt: new Date().toISOString(),
      stats: repoInfo
        ? {
            name: repoInfo.name,
            fullName: repoInfo.full_name,
            description: repoInfo.description || "",
            stars: repoInfo.stargazers_count || 0,
            forks: repoInfo.forks_count || 0,
            watchers: repoInfo.watchers_count || 0,
            contributors: contributors.length || undefined,
            language: repoInfo.language || "Unknown",
            license: repoInfo.license || null,
            createdAt: repoInfo.created_at,
            updatedAt: repoInfo.updated_at,
            ageInDays: ageInDays,
            isFork: repoInfo.fork || false,
          }
        : null,
    });

    // Return shareable URL using owner/repo as the path
    const shareUrl = `${process.env.BASE_URL || "http://localhost:3000"}/shared/${owner}/${repo}`;

    console.log(`✅ Share image saved successfully: ${shareUrl}`);

    return NextResponse.json({
      shareUrl,
      imageUrl,
      repoPath: `${owner}/${repo}`,
      cached: false,
    });
  } catch (error) {
    console.error("❌ Failed to save share image:", error);
    return NextResponse.json(
      {
        error: "Failed to save image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
