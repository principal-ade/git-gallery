import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/githubService";
import { Octokit } from "@octokit/rest";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);

    const sha = searchParams.get("sha");
    if (!sha) {
      return NextResponse.json(
        { error: "SHA parameter is required" },
        { status: 400 },
      );
    }

    console.log(
      `🖼️ Loading frame for ${owner}/${repo} @ ${sha.substring(0, 7)}`,
    );

    // Initialize GitHub client and service
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    const githubService = new GitHubService(process.env.GITHUB_TOKEN);

    // Get repository tree at this commit
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: "1",
    });

    // Convert GitHub tree to file system tree format
    // Map Octokit's tree structure to our GitHubTree type
    const githubTree = {
      sha: tree.sha,
      url: tree.url || "",
      tree: tree.tree.map((item) => ({
        ...item,
        type: item.type as "blob" | "tree",
        url: item.url || "",
      })),
      truncated: tree.truncated,
    };
    const fileSystemTree = githubService.buildFileSystemTree(githubTree);

    // Return the file system tree directly (city data will be built on client)
    return NextResponse.json(fileSystemTree);
  } catch (error: any) {
    console.error("Failed to load frame:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load frame" },
      { status: 500 },
    );
  }
}
