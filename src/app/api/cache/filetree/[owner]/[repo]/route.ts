import { NextRequest, NextResponse } from "next/server";
import { simpleFileTreeCache } from "@/services/s3/simple-filetree-cache";

// GET cached filetree for a specific repository
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;

    console.log(`📂 Fetching cached filetree for ${owner}/${repo}`);

    // Try to get from cache
    const cached = await simpleFileTreeCache.get(owner, repo);

    if (cached) {
      console.log(`✅ Found cached filetree for ${owner}/${repo}`);
      return NextResponse.json({
        success: true,
        fileTree: cached.fileTree,
        cachedAt: cached.cachedAt,
        owner,
        repo,
      });
    }

    console.log(`❌ No cached filetree found for ${owner}/${repo}`);
    return NextResponse.json(
      {
        error: "No cached filetree found",
        owner,
        repo,
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching cached filetree:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
