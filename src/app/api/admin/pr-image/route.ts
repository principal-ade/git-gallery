import { NextRequest, NextResponse } from "next/server";
import { S3PRImageStore } from "@/lib/s3-pr-image-store";

/**
 * Admin API for managing PR image allowlist
 * Similar to orbit waitlist management
 */

// Simple admin authentication - same as orbit admin
function isAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ORBIT_ADMIN_SECRET;
  if (!adminSecret) {
    return false;
  }

  const adminHeader = request.headers.get("x-admin-secret");
  return adminHeader === adminSecret;
}

/**
 * GET /api/admin/pr-image - Get all allowed repos
 */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = new S3PRImageStore();
    const data = await store.getAllowedRepos();

    return NextResponse.json({
      repos: data.repos,
      count: data.repos.length,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error("Failed to get allowed repos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/pr-image - Add a repo to allowlist
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { owner, repo, note } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: owner and repo" },
        { status: 400 },
      );
    }

    const store = new S3PRImageStore();
    await store.addRepo(owner, repo, "admin", note);

    return NextResponse.json({
      success: true,
      message: `Repository ${owner}/${repo} added to allowlist`,
    });
  } catch (error: any) {
    console.error("Failed to add repo:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/pr-image - Remove a repo from allowlist
 */
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required query params: owner and repo" },
        { status: 400 },
      );
    }

    const store = new S3PRImageStore();
    await store.removeRepo(owner, repo);

    return NextResponse.json({
      success: true,
      message: `Repository ${owner}/${repo} removed from allowlist`,
    });
  } catch (error: any) {
    console.error("Failed to remove repo:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
