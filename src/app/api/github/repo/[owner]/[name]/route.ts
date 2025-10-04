import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth-utils";
import { simpleFileTreeCache } from "@/services/s3/simple-filetree-cache";
function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
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

const GITHUB_API_BASE = "https://api.github.com";

async function makeGitHubRequest(endpoint: string, token: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CodeCity-App/1.0",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, { headers });

  if (!response.ok) {
    let errorMessage = `GitHub API Error: ${response.status} ${response.statusText}`;

    // Add token diagnostic information for 401 errors
    if (response.status === 401) {
      const tokenSource = token
        ? token === process.env.GITHUB_TOKEN
          ? "environment"
          : "user session"
        : "none";
      const tokenPrefix = token ? `${token.substring(0, 8)}...` : "null";

      errorMessage += `\nToken Status: ${tokenSource} (${tokenPrefix})`;

      if (!token) {
        errorMessage +=
          "\nSuggestion: No GitHub token available. Please set GITHUB_TOKEN environment variable or authenticate with GitHub.";
      } else {
        errorMessage +=
          "\nSuggestion: Token may be expired or invalid. Please check your GitHub token permissions and expiration.";
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  try {
    const { owner, name } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "info";

    // Get the auth token (user's token or fallback to env token)
    const token = await getAuthToken();

    let data;

    switch (action) {
      case "info":
        data = await makeGitHubRequest(`/repos/${owner}/${name}`, token);
        break;

      case "pulls":
        const state = searchParams.get("state") || "open";
        const pullsData = await makeGitHubRequest(
          `/repos/${owner}/${name}/pulls?state=${state}&per_page=50`,
          token,
        );

        // Fetch detailed information for each PR to get changed_files, additions, deletions
        const detailedPulls = await Promise.all(
          pullsData.map(async (pr: any) => {
            try {
              const detailData = await makeGitHubRequest(
                `/repos/${owner}/${name}/pulls/${pr.number}`,
                token,
              );
              return {
                ...pr,
                changed_files: detailData.changed_files,
                additions: detailData.additions,
                deletions: detailData.deletions,
              };
            } catch (error) {
              console.warn(
                `Failed to fetch details for PR #${pr.number}:`,
                error,
              );
              return pr; // Return original PR data if detail fetch fails
            }
          }),
        );

        data = detailedPulls;
        break;

      case "pull-files":
        const prNumber = searchParams.get("pr");
        if (!prNumber) {
          return NextResponse.json(
            { error: "PR number required" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/pulls/${prNumber}/files`,
          token,
        );
        break;

      case "pull-comments":
        const prNum = searchParams.get("pr");
        if (!prNum) {
          return NextResponse.json(
            { error: "PR number required" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/pulls/${prNum}/comments`,
          token,
        );
        break;

      case "tree":
        // Check if cache should be bypassed
        const noCache = searchParams.get("nocache") === "true";

        if (!noCache) {
          // Try to get from cache first (we only cache one version per repo)
          const cached = await simpleFileTreeCache.get(owner, name);
          if (cached) {
            // Add cache headers to response
            const response = NextResponse.json(cached.fileTree);
            response.headers.set("X-Cache", "HIT");
            response.headers.set("X-Cache-Type", "s3");
            return addCorsHeaders(response);
          }
        }

        // Fetch from GitHub if not cached
        const ref = searchParams.get("ref") || "HEAD";
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeCity-App/1.0",
        };

        if (token) {
          headers["Authorization"] = `token ${token}`;
        }

        const treeResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${name}/git/trees/${ref}?recursive=1`,
          { headers },
        );

        if (!treeResponse.ok) {
          throw new Error(
            `GitHub API Error: ${treeResponse.status} ${treeResponse.statusText}`,
          );
        }

        data = await treeResponse.json();

        // Only store in cache if not explicitly bypassing cache
        if (!noCache) {
          await simpleFileTreeCache.store(owner, name, data);
        }

        // Add cache headers to response
        const freshResponse = NextResponse.json(data);
        freshResponse.headers.set("X-Cache", noCache ? "BYPASS" : "MISS");
        return addCorsHeaders(freshResponse);

      case "readme":
        data = await makeGitHubRequest(`/repos/${owner}/${name}/readme`, token);
        break;

      case "city-config":
        // Try local first, then community
        try {
          data = await makeGitHubRequest(
            `/repos/${owner}/${name}/contents/.cosmic-landmark/city-config.json`,
            token,
          );
          data = { ...data, source: "local" };
        } catch {
          try {
            data = await makeGitHubRequest(
              `/repos/The-Code-Cosmos/Voyager-Guides/contents/${owner}/${name}/city-config.json`,
              token,
            );
            data = { ...data, source: "community" };
          } catch {
            return NextResponse.json({ config: null, source: null });
          }
        }
        break;

      case "file-count":
        // Try to get tree from cache first
        const cachedTree = await simpleFileTreeCache.get(owner, name);
        let treeData;

        if (cachedTree) {
          treeData = cachedTree.fileTree;
        } else {
          // Fetch from GitHub if not cached
          treeData = await makeGitHubRequest(
            `/repos/${owner}/${name}/git/trees/HEAD?recursive=1`,
            token,
          );
          // Store in cache
          await simpleFileTreeCache.store(owner, name, treeData);
        }

        const fileCount = treeData.tree.filter(
          (item: any) => item.type === "blob",
        ).length;
        data = { count: fileCount };
        break;

      case "contributors":
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/contributors?per_page=100`,
          token,
        );
        break;

      case "collaborators":
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/collaborators?per_page=100`,
          token,
        );
        break;

      case "license":
        try {
          data = await makeGitHubRequest(
            `/repos/${owner}/${name}/license`,
            token,
          );
        } catch {
          data = null;
        }
        break;

      case "file":
        const filePath = searchParams.get("path");
        if (!filePath) {
          return NextResponse.json(
            { error: "File path required" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/contents/${filePath}`,
          token,
        );
        break;

      case "issue-comments":
        const issueNumber = searchParams.get("issue");
        if (!issueNumber) {
          return NextResponse.json(
            { error: "Issue number required" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/issues/${issueNumber}/comments`,
          token,
        );
        break;

      case "maintainers":
        // Fetch both collaborators and top contributors to determine maintainers
        const [collabs, contribs] = await Promise.all([
          makeGitHubRequest(
            `/repos/${owner}/${name}/collaborators?per_page=100`,
            token,
          ).catch(() => []),
          makeGitHubRequest(
            `/repos/${owner}/${name}/contributors?per_page=30`,
            token,
          ).catch(() => []),
        ]);
        data = { collaborators: collabs, contributors: contribs };
        break;

      case "city-config-author":
        const source = searchParams.get("source") || "local";
        const configPath =
          source === "local"
            ? `.cosmic-landmark/city-config.json`
            : `${owner}/${name}/city-config.json`;
        const configRepo =
          source === "local"
            ? `${owner}/${name}`
            : "The-Code-Cosmos/Voyager-Guides";

        try {
          const [ownerPart, repoPart] = configRepo.split("/");
          const commits = await makeGitHubRequest(
            `/repos/${ownerPart}/${repoPart}/commits?path=${configPath}&per_page=1`,
            token,
          );
          data = commits.length > 0 ? commits[0] : null;
        } catch {
          data = null;
        }
        break;

      case "commits": {
        // Build query parameters for commits endpoint
        const commitParams = new URLSearchParams();
        if (searchParams.get("per_page"))
          commitParams.append("per_page", searchParams.get("per_page")!);
        if (searchParams.get("page"))
          commitParams.append("page", searchParams.get("page")!);
        if (searchParams.get("sha"))
          commitParams.append("sha", searchParams.get("sha")!);
        if (searchParams.get("path"))
          commitParams.append("path", searchParams.get("path")!);
        if (searchParams.get("since"))
          commitParams.append("since", searchParams.get("since")!);
        if (searchParams.get("until"))
          commitParams.append("until", searchParams.get("until")!);

        const queryString = commitParams.toString();
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/commits${queryString ? `?${queryString}` : ""}`,
          token,
        );
        break;
      }

      case "commit":
        const commitSha = searchParams.get("sha");
        if (!commitSha) {
          return NextResponse.json(
            { error: "SHA required for commit details" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/commits/${commitSha}`,
          token,
        );
        break;

      case "releases":
        const limit = searchParams.get("limit") || "10";
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/releases?per_page=${limit}`,
          token,
        );
        break;

      case "release":
        const tag = searchParams.get("tag");
        if (!tag) {
          return NextResponse.json(
            { error: "Tag required for release details" },
            { status: 400 },
          );
        }
        data = await makeGitHubRequest(
          `/repos/${owner}/${name}/releases/tags/${tag}`,
          token,
        );
        break;

      case "compare":
        const base = searchParams.get("base");
        const head = searchParams.get("head");
        if (!base || !head) {
          return NextResponse.json(
            { error: "Base and head refs required for comparison" },
            { status: 400 },
          );
        }

        // Get the comparison data
        const comparisonData = await makeGitHubRequest(
          `/repos/${owner}/${name}/compare/${base}...${head}`,
          token,
        );

        // Also fetch the base tree to show removed files in visualization
        let baseTree = null;
        try {
          baseTree = await makeGitHubRequest(
            `/repos/${owner}/${name}/git/trees/${base}?recursive=1`,
            token,
          );
        } catch (error) {
          console.warn(`Could not fetch base tree for ${base}:`, error);
        }

        data = {
          ...comparisonData,
          baseTree, // Include the base tree for visualization
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GitHub API proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
