import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const mode = searchParams.get("mode") || "recent"; // "recent" for last N days, "lifetime" for whole repo
    const days = parseInt(searchParams.get("days") || "14"); // Default to 14 days
    const steps = parseInt(searchParams.get("steps") || String(days)); // Default steps to number of days

    console.log(
      `📅 Getting timeline for ${owner}/${repo} - Mode: ${mode}, Days: ${days}`,
    );

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Get repository info directly from GitHub API to get the default branch
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    });

    // Use the actual default branch from the repository
    const branch = searchParams.get("branch") || repoData.default_branch;
    console.log(
      `Using branch: ${branch} (default: ${repoData.default_branch})`,
    );

    // Calculate date range for last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(
      `📊 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get commits at each time step
    const selectedCommits: Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
    }> = [];

    if (mode === "recent") {
      // For recent mode: Get one commit per day for the last N days
      const commitsMap = new Map<string, any>(); // Map to store one commit per day

      // First, fetch all commits in the date range
      const { data: allCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        since: startDate.toISOString(),
        until: endDate.toISOString(),
        per_page: 100, // Get enough commits to cover the period
      });

      console.log(`📝 Found ${allCommits.length} commits in date range`);

      // Group commits by day and keep the most recent one for each day
      for (const commit of allCommits) {
        const commitDate = new Date(
          commit.commit.author?.date || commit.commit.committer?.date || "",
        );
        const dayKey = commitDate.toISOString().split("T")[0]; // YYYY-MM-DD format

        // Keep the first (most recent) commit for each day
        if (!commitsMap.has(dayKey)) {
          commitsMap.set(dayKey, commit);
        }
      }

      // Now iterate through each day and get the commit for that day
      for (let i = 0; i < days; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + i);
        const dayKey = targetDate.toISOString().split("T")[0];

        const commit = commitsMap.get(dayKey);

        if (commit) {
          selectedCommits.push({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name || "Unknown",
            date: commit.commit.author?.date || targetDate.toISOString(),
          });
        } else {
          // For days with no commits, try to find the most recent commit before this day
          console.log(
            `⚠️ No commit found for ${dayKey}, looking for previous commit`,
          );

          try {
            const { data: previousCommits } = await octokit.repos.listCommits({
              owner,
              repo,
              sha: branch,
              until: targetDate.toISOString(),
              per_page: 1,
            });

            if (previousCommits.length > 0) {
              const prevCommit = previousCommits[0];
              // Only add if we don't already have this commit
              if (!selectedCommits.find((c) => c.sha === prevCommit.sha)) {
                selectedCommits.push({
                  sha: prevCommit.sha,
                  message: prevCommit.commit.message,
                  author: prevCommit.commit.author?.name || "Unknown",
                  date:
                    prevCommit.commit.author?.date || targetDate.toISOString(),
                });
              }
            }
          } catch {
            console.warn(`Could not find any commit before ${dayKey}`);
          }
        }
      }
    } else {
      // Lifetime mode: Sample commits across the entire repository history
      // Get the first commit to determine the repository age
      const { data: firstCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: 1,
        direction: "asc", // Oldest first
      });

      if (firstCommits.length === 0) {
        throw new Error("No commits found in repository");
      }

      const oldestDate = new Date(
        firstCommits[0].commit.author?.date ||
          firstCommits[0].commit.committer?.date ||
          "",
      );
      const newestDate = new Date();
      const timeSpan = newestDate.getTime() - oldestDate.getTime();
      const stepSize = timeSpan / steps;

      console.log(
        `📈 Repository lifetime: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`,
      );
      console.log(
        `📊 Sampling ${steps} commits across ${Math.floor(timeSpan / (1000 * 60 * 60 * 24))} days`,
      );

      for (let i = 0; i < steps; i++) {
        const targetDate = new Date(oldestDate.getTime() + stepSize * i);

        try {
          // Get the commit closest to this date
          const { data: commits } = await octokit.repos.listCommits({
            owner,
            repo,
            sha: branch,
            until: targetDate.toISOString(),
            per_page: 1,
          });

          if (commits.length > 0) {
            const commit = commits[0];

            // Avoid duplicates
            if (!selectedCommits.find((c) => c.sha === commit.sha)) {
              selectedCommits.push({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.commit.author?.name || "Unknown",
                date: commit.commit.author?.date || targetDate.toISOString(),
              });
            }
          }
        } catch {
          console.warn(`No commit found for date ${targetDate.toISOString()}`);
        }
      }
    }

    // If we didn't get enough commits, fill in with more recent ones
    if (selectedCommits.length < steps) {
      const { data: recentCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: steps,
      });

      for (const commit of recentCommits) {
        if (selectedCommits.length >= steps) break;
        if (!selectedCommits.find((c) => c.sha === commit.sha)) {
          selectedCommits.push({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name || "Unknown",
            date: commit.commit.author?.date || new Date().toISOString(),
          });
        }
      }
    }

    // Sort by date (oldest first)
    selectedCommits.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json({
      repoInfo: {
        name: repo,
        owner: owner,
        description: repoData.description || "",
        stars: repoData.stargazers_count || 0,
        language: repoData.language || "Unknown",
        defaultBranch: repoData.default_branch || "main",
      },
      commits: selectedCommits,
      timeline: {
        oldest:
          selectedCommits.length > 0
            ? selectedCommits[0].date
            : startDate.toISOString(),
        newest:
          selectedCommits.length > 0
            ? selectedCommits[selectedCommits.length - 1].date
            : endDate.toISOString(),
        steps: selectedCommits.length,
        mode: mode,
        days: mode === "recent" ? days : undefined,
      },
    });
  } catch (error: any) {
    console.error("Failed to get timeline:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get timeline" },
      { status: 500 },
    );
  }
}
