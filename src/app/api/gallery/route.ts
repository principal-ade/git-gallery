import { NextRequest, NextResponse } from "next/server";
import { mosaicImageClient } from "../../../services/mosaicImageService";
import { simpleFileTreeCache } from "@/services/s3/simple-filetree-cache";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20); // Max 20, default 5

    console.log(`📊 Fetching gallery items (limit: ${limit})...`);

    // Try to fetch real gallery items from S3
    let items: any[] = [];

    try {
      items = await mosaicImageClient.listGalleryItems();
      console.log(`✅ Found ${items.length} gallery items`);
    } catch (err) {
      console.warn("Could not fetch gallery items from S3:", err);

      // Fallback: Try to get metadata for some known repositories
      const knownRepos = [
        "a24z-ai/a24z-memory",
        "facebook/react",
        "vercel/next.js",
        "microsoft/vscode",
        "vuejs/vue",
        "angular/angular",
        "tensorflow/tensorflow",
        "pytorch/pytorch",
        "rust-lang/rust",
        "golang/go",
      ];

      for (const repoPath of knownRepos) {
        const [owner, repo] = repoPath.split("/");
        const metadataKey = `shared-metadata/${owner}/${repo}.json`;

        try {
          const metadata = await mosaicImageClient.getObject(metadataKey);
          if (metadata) {
            items.push(metadata);
          }
        } catch {
          // Repository hasn't been visualized yet, skip it
          console.log(`No metadata found for ${repoPath}`);
        }
      }
    }

    // Limit items early to avoid fetching too many filetrees
    items = items.slice(0, limit);

    // Fetch filetree data for each item if available
    const itemsWithFiletrees = await Promise.all(
      items.map(async (item) => {
        try {
          const [owner, repo] = item.repoPath.split("/");
          const cached = await simpleFileTreeCache.get(owner, repo);
          if (cached) {
            return {
              ...item,
              fileTree: cached.fileTree,
              hasCachedData: true,
              cachedAt: cached.cachedAt,
            };
          }
        } catch {
          console.log(`Could not fetch filetree for ${item.repoPath}`);
        }
        return item;
      }),
    );

    // Only return items that have cached data
    const validItems = itemsWithFiletrees.filter((item) => item.hasCachedData);

    if (validItems.length === 0) {
      console.log("No repositories with cached filetree data found");
      return NextResponse.json({
        items: [],
        total: 0,
        message:
          "No cached repositories available. Generate some mosaics to populate the gallery!",
      });
    }

    return NextResponse.json({
      items: validItems,
      total: validItems.length,
    });
  } catch (error) {
    console.error("❌ Failed to fetch gallery items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch gallery items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
