import { NextRequest, NextResponse } from "next/server";
import { simpleFileTreeCache } from "@/services/s3/simple-filetree-cache";

function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

// GET list of cached repositories
export async function GET() {
  try {
    const cachedRepos = await simpleFileTreeCache.listCached();

    const response = NextResponse.json({
      success: true,
      cachedRepos,
      total: cachedRepos.length,
      bucketName:
        process.env.FILETREE_CACHE_BUCKET || "code-cosmos-filetree-cache",
    });

    return addCorsHeaders(response);
  } catch (error) {
    console.error("Error fetching cached repos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// DELETE is not needed with simplified cache
export async function DELETE() {
  const response = NextResponse.json({
    success: false,
    message: "Cache invalidation not supported in simplified cache",
  });
  return addCorsHeaders(response);
}

// POST to manually cache a filetree
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, fileTree, stats } = body;

    if (!owner || !repo || !fileTree) {
      return NextResponse.json(
        { error: "Owner, repo, and fileTree are required" },
        { status: 400 },
      );
    }

    // Store the filetree in cache
    await simpleFileTreeCache.store(owner, repo, fileTree, stats);

    const response = NextResponse.json({
      success: true,
      message: `Filetree cached for ${owner}/${repo}`,
    });

    return addCorsHeaders(response);
  } catch (error) {
    console.error("Error storing in cache:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
