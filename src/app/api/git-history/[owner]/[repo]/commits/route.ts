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

    const branch = searchParams.get("branch") || "main";
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log(`📜 Loading commit history for ${owner}/${repo}`);

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    const githubService = new GitHubService(process.env.GITHUB_TOKEN);
    // Disable proxy for server-side usage to avoid ECONNREFUSED
    githubService.setUseProxy(false);

    // Get repository info
    const repoInfo = await githubService.fetchRepositoryInfo(owner, repo);

    // Get commit history
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit,
    });

    // Transform commits to our format
    const transformedCommits = commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || "Unknown",
      date: commit.commit.author?.date || new Date().toISOString(),
    }));

    return NextResponse.json({
      repoInfo: {
        name: repo,
        owner: owner,
        description: repoInfo.description || "",
        stars: repoInfo.stars || 0,
        language: repoInfo.language || "Unknown",
        defaultBranch: repoInfo.defaultBranch || "main",
      },
      commits: transformedCommits,
    });
  } catch (error: any) {
    console.error("Failed to load commits:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load commits" },
      { status: 500 },
    );
  }
}
