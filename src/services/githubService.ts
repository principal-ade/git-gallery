import {
  RepoInfo,
  RepoMetadata,
  PullRequest,
  PRFile,
  PRComment,
  GitHubTree,
  GitHubRepoResponse,
  GitHubPRResponse,
  GitHubPRFileResponse,
  GitHubPRCommentResponse,
  License,
  Contributor,
  Collaborator,
  UserProfile,
  MaintainerInfo,
} from "../types/github";
import {
  FileTree,
  FileInfo,
  DirectoryInfo,
} from "@principal-ai/repository-abstraction";
import { getProxiedImageUrl } from "../utils/avatarUtils";

export class GitHubService {
  private baseUrl: string;
  private githubApiUrl = "https://api.github.com";
  private token?: string;
  private useProxy: boolean = true;

  constructor(token?: string) {
    this.token = token;

    // Server-side detection and URL setup
    if (typeof window === "undefined") {
      // Server-side: use absolute URL
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      this.baseUrl = `${baseUrl}/api/github`;
    } else {
      // Client-side: use relative URL
      this.baseUrl = "/api/github";
    }
  }

  /**
   * Set GitHub authentication token for higher rate limits
   */
  setAuthToken(token: string): void {
    this.token = token;
  }

  /**
   * Enable or disable proxy usage
   */
  setUseProxy(useProxy: boolean): void {
    this.useProxy = useProxy;
  }

  /**
   * Make authenticated request to GitHub API or proxy
   */
  async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (this.useProxy) {
      // Use internal proxy API
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          // Trigger auth error handling
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("auth-error", {
                detail: { status: response.status, endpoint },
              }),
            );
          }
        }

        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorData.error || "Unknown error"}`,
        );
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } else {
      // Direct GitHub API call (fallback)
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CodeCity-PR-Demo/1.0",
        ...((options?.headers as Record<string, string>) || {}),
      };

      if (this.token) {
        headers["Authorization"] = `token ${this.token}`;
      }

      const response = await fetch(`${this.githubApiUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          // Trigger auth error handling
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("auth-error", {
                detail: { status: response.status, endpoint },
              }),
            );
          }
        }

        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          `GitHub API Error: ${response.status} ${response.statusText} - ${errorData.message || "Unknown error"}`,
        );
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    }
  }

  /**
   * Parse GitHub repository URL and validate format
   * Now also extracts PR numbers from PR URLs
   */
  parseRepositoryUrl(url: string): (RepoInfo & { prNumber?: number }) | null {
    // Handle various GitHub URL formats including PR URLs
    const patterns = [
      // PR URL: https://github.com/owner/repo/pull/123
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)\/pull\/(\d+)(?:\/.*)?$/,
      // Regular repo URLs
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/, // owner/repo format
    ];

    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        const [, owner, name, prNumber] = match;
        const result: RepoInfo & { prNumber?: number } = {
          owner: owner.toLowerCase(),
          name: name.toLowerCase(),
          fullName: `${owner}/${name}`,
          isValid: true,
          isPublic: true, // We'll verify this in the API call
        };

        // Add PR number if it was captured (from PR URL)
        if (prNumber) {
          result.prNumber = parseInt(prNumber);
        }

        return result;
      }
    }

    return null;
  }

  /**
   * Validate repository exists and is public
   */
  async validateRepository(url: string): Promise<RepoInfo> {
    const parsed = this.parseRepositoryUrl(url);
    if (!parsed) {
      return {
        owner: "",
        name: "",
        fullName: url,
        isValid: false,
        isPublic: false,
      };
    }

    try {
      const repo = await this.makeRequest<GitHubRepoResponse>(
        `/repo/${parsed.owner}/${parsed.name}?action=info`,
      );
      return {
        ...parsed,
        isValid: true,
        isPublic: !repo.private,
      };
    } catch (error) {
      console.error("Repository validation failed:", error);
      return {
        ...parsed,
        isValid: false,
        isPublic: false,
      };
    }
  }

  /**
   * Calculate repository age and activity status
   */
  private calculateRepoStats(
    createdAt: string,
    pushedAt: string,
  ): {
    ageInDays: number;
    daysSinceLastPush: number;
    activityStatus: "active" | "moderate" | "slow" | "inactive";
  } {
    const now = new Date();
    const created = new Date(createdAt);
    const lastPush = new Date(pushedAt);

    const ageInDays = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceLastPush = Math.floor(
      (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24),
    );

    let activityStatus: "active" | "moderate" | "slow" | "inactive";
    if (daysSinceLastPush <= 7) {
      activityStatus = "active";
    } else if (daysSinceLastPush <= 30) {
      activityStatus = "moderate";
    } else if (daysSinceLastPush <= 180) {
      activityStatus = "slow";
    } else {
      activityStatus = "inactive";
    }

    return { ageInDays, daysSinceLastPush, activityStatus };
  }

  /**
   * Fetch repository metadata
   */
  async fetchRepositoryInfo(
    owner: string,
    repo: string,
  ): Promise<RepoMetadata> {
    const response = await this.makeRequest<GitHubRepoResponse>(
      `/repo/${owner}/${repo}?action=info`,
    );
    const stats = this.calculateRepoStats(
      response.created_at,
      response.pushed_at,
    );

    return {
      name: response.name,
      description: response.description || "No description available",
      stars: response.stargazers_count,
      forks: response.forks_count,
      watchers: response.watchers_count,
      language: response.language || "Unknown",
      updatedAt: response.updated_at,
      defaultBranch: response.default_branch,
      htmlUrl: response.html_url,
      size: response.size,
      openIssues: response.open_issues_count,
      license: response.license || null,
      createdAt: response.created_at,
      pushedAt: response.pushed_at,
      isFork: response.fork || false,
      ...stats,
      ownerAvatar: response.owner?.avatar_url,
    };
  }

  /**
   * Fetch open pull requests for a repository
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<PullRequest[]> {
    const response = await this.makeRequest<GitHubPRResponse[]>(
      `/repo/${owner}/${repo}?action=pulls&state=${state}`,
    );

    return response.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state as "open" | "closed" | "merged",
      author: pr.user.login,
      authorAvatar: getProxiedImageUrl(pr.user.avatar_url),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      changedFiles: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      htmlUrl: pr.html_url,
      body: pr.body,
    }));
  }

  /**
   * Fetch files changed in a pull request
   */
  async fetchPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PRFile[]> {
    const response = await this.makeRequest<GitHubPRFileResponse[]>(
      `/repo/${owner}/${repo}?action=pull-files&pr=${prNumber}`,
    );

    return response.map((file) => ({
      filename: file.filename,
      status: file.status as "added" | "modified" | "removed" | "renamed",
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previousFilename: file.previous_filename,
    }));
  }

  /**
   * Fetch comments for a pull request (both review comments and issue comments)
   */
  async fetchPullRequestComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PRComment[]> {
    try {
      // Fetch both types of comments in parallel
      const [reviewComments, issueComments] = await Promise.all([
        // Review comments (file-specific comments)
        this.makeRequest<GitHubPRCommentResponse[]>(
          `/repo/${owner}/${repo}?action=pull-comments&pr=${prNumber}`,
        ),
        // Issue comments (general PR comments)
        this.makeRequest<GitHubPRCommentResponse[]>(
          `/repo/${owner}/${repo}?action=issue-comments&issue=${prNumber}`,
        ),
      ]);

      // Combine and normalize both types of comments
      const allComments: PRComment[] = [
        ...reviewComments.map((comment) => ({
          id: comment.id,
          user: comment.user,
          body: comment.body,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          html_url: comment.html_url,
          path: comment.path,
          line: comment.line,
          commit_id: comment.commit_id,
          original_commit_id: comment.original_commit_id,
          diff_hunk: comment.diff_hunk,
          position: comment.position,
          original_position: comment.original_position,
          in_reply_to_id: comment.in_reply_to_id,
        })),
        ...issueComments.map((comment) => ({
          id: comment.id,
          user: comment.user,
          body: comment.body,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          html_url: comment.html_url,
          // Issue comments don't have file-specific fields
        })),
      ];

      // Sort by creation date
      return allComments.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } catch (error) {
      console.error("Error fetching PR comments:", error);
      return [];
    }
  }

  /**
   * Fetch releases for a repository
   */
  async fetchReleases(
    owner: string,
    repo: string,
    limit: number = 10,
  ): Promise<any[]> {
    const response = await this.makeRequest<any[]>(
      `/repo/${owner}/${repo}?action=releases&limit=${limit}`,
    );
    return response;
  }

  /**
   * Fetch a specific release by tag
   */
  async fetchReleaseByTag(
    owner: string,
    repo: string,
    tag: string,
  ): Promise<any> {
    const response = await this.makeRequest<any>(
      `/repo/${owner}/${repo}?action=release&tag=${tag}`,
    );
    return response;
  }

  /**
   * Compare two refs (branches, tags, or commits)
   */
  async compareRefs(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<{
    files: PRFile[];
    commits: number;
    additions: number;
    deletions: number;
    baseTree?: any;
    contributors?: Array<{
      login: string;
      avatar_url: string;
      contributions: number;
    }>;
  }> {
    const response = await this.makeRequest<any>(
      `/repo/${owner}/${repo}?action=compare&base=${base}&head=${head}`,
    );

    // Transform the response to match our PRFile interface
    const files: PRFile[] =
      response.files?.map((file: any) => ({
        sha: file.sha || "",
        filename: file.filename,
        status: file.status as
          | "added"
          | "removed"
          | "modified"
          | "renamed"
          | "copied"
          | "changed"
          | "unchanged",
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        changes: file.changes || 0,
        previousFilename: file.previous_filename,
      })) || [];

    // Extract unique contributors from commits
    const contributorMap = new Map<
      string,
      {
        login: string;
        avatar_url: string;
        contributions: number;
      }
    >();

    if (response.commits && Array.isArray(response.commits)) {
      response.commits.forEach((commit: any) => {
        const author = commit.author || commit.committer;
        if (author && author.login) {
          const existing = contributorMap.get(author.login);
          if (existing) {
            existing.contributions++;
          } else {
            contributorMap.set(author.login, {
              login: author.login,
              avatar_url: author.avatar_url || "",
              contributions: 1,
            });
          }
        }
      });
    }

    const contributors = Array.from(contributorMap.values()).sort(
      (a, b) => b.contributions - a.contributions,
    );

    return {
      files,
      commits: response.total_commits || 0,
      additions:
        response.files?.reduce(
          (sum: number, f: any) => sum + (f.additions || 0),
          0,
        ) || 0,
      deletions:
        response.files?.reduce(
          (sum: number, f: any) => sum + (f.deletions || 0),
          0,
        ) || 0,
      baseTree: response.baseTree, // Include the base tree if available
      contributors,
    };
  }

  /**
   * Fetch repository file tree
   */
  private async fetchRepositoryTree(
    owner: string,
    repo: string,
    ref: string = "HEAD",
  ): Promise<GitHubTree> {
    return this.makeRequest<GitHubTree>(
      `/repo/${owner}/${repo}?action=tree&ref=${ref}`,
    );
  }

  /**
   * Public method to fetch repository tree (for adapters)
   */
  async fetchTree(
    owner: string,
    repo: string,
    ref: string = "HEAD",
  ): Promise<GitHubTree> {
    return this.fetchRepositoryTree(owner, repo, ref);
  }
  async fetchFileSystemTree(
    owner: string,
    repo: string,
    ref: string = "HEAD",
    noCache: boolean = false,
  ): Promise<FileTree> {
    const cacheParam = noCache ? "&nocache=true" : "";
    const tree = await this.makeRequest<GitHubTree>(
      `/repo/${owner}/${repo}?action=tree&ref=${ref}${cacheParam}`,
    );
    const fileTree = this.buildFileSystemTree(tree);
    return fileTree;
  }

  /**
   * Fetch repository license information
   */
  async fetchRepositoryLicense(
    owner: string,
    repo: string,
  ): Promise<License | null> {
    try {
      const response = await this.makeRequest<{
        license: {
          key: string;
          name: string;
          spdx_id: string;
          url: string;
          node_id: string;
        };
        content: string;
        encoding: string;
      }>(`/repos/${owner}/${repo}/license`);

      return response.license;
    } catch (error) {
      console.error("Error fetching license:", error);
      return null;
    }
  }

  /**
   * Fetch repository README content
   */
  async fetchRepositoryReadme(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    try {
      const response = await this.makeRequest<{
        content: string;
        encoding: string;
        size: number;
      }>(`/repo/${owner}/${repo}?action=readme`);

      if (response.content && response.encoding === "base64") {
        // Properly decode base64 to UTF-8 to handle multi-byte characters
        const binaryString = atob(response.content.replace(/\n/g, ""));
        // Convert binary string to UTF-8
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(bytes);
      }

      return null;
    } catch (error) {
      console.error("Error fetching README:", error);
      return null;
    }
  }

  /**
   * Fetch city-config.json file content from repository
   */
  async fetchCityConfig(
    owner: string,
    repo: string,
  ): Promise<{
    config: string | null;
    source: "local" | "community" | null;
  }> {
    // First, try to fetch from the repository's own .cosmic-landmark folder
    try {
      const localResponse = await this.makeRequest<any>(
        `/repo/${owner}/${repo}?action=city-config`,
      );

      // If the response already has the expected format (from proxy)
      if ("config" in localResponse && "source" in localResponse) {
        return localResponse;
      }

      // Otherwise, handle the raw GitHub API response format
      if (localResponse.content && localResponse.encoding === "base64") {
        return {
          config: atob(localResponse.content.replace(/\n/g, "")),
          source: localResponse.source || "local",
        };
      }
    } catch {
      console.log(
        `No local city-config.json found in ${owner}/${repo}/.cosmic-landmark/`,
      );
    }

    // Community config is now handled by the proxy
    // The proxy will try both local and community sources

    return {
      config: null,
      source: null,
    };
  }

  async fetchCityConfigAuthor(
    owner: string,
    repo: string,
    source: "local" | "community",
  ): Promise<{
    author: {
      name: string;
      avatar_url: string;
      html_url: string;
    } | null;
    lastUpdated: string;
    source: "local" | "community";
  } | null> {
    try {
      const path =
        source === "local"
          ? `.cosmic-landmark/city-config.json`
          : `${owner}/${repo}/city-config.json`;

      const repoPath =
        source === "local"
          ? `${owner}/${repo}`
          : "The-Code-Cosmos/Voyager-Guides";

      // Use the correct endpoint for file commits
      const response = await this.makeRequest<any>(
        `/repo/${repoPath}?action=commits&path=${encodeURIComponent(path)}&per_page=1`,
      );
      console.log("response", response);

      if (response && response.length > 0) {
        const latestCommit = response[0];
        return {
          author: latestCommit.author
            ? {
                name: latestCommit.author.login,
                avatar_url: latestCommit.author.avatar_url,
                html_url: latestCommit.author.html_url,
              }
            : {
                name: latestCommit.commit.author.name,
                avatar_url: "",
                html_url: "",
              },
          lastUpdated: latestCommit.commit.author.date,
          source,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching city-config.json author:`, error);
      return null;
    }
  }
  /**
   * Fetch any file content from repository
   */
  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    try {
      const response = await this.makeRequest<{
        content: string;
        encoding: string;
        size: number;
      }>(`/repo/${owner}/${repo}?action=file&path=${encodeURIComponent(path)}`);

      console.log(`[GitHubService] fetchFileContent response for ${path}:`, {
        hasContent: !!response.content,
        encoding: response.encoding,
        size: response.size,
        contentType: typeof response.content,
        responseKeys: Object.keys(response),
      });

      if (response.content) {
        if (response.encoding === "base64") {
          // Properly decode base64 to UTF-8 to handle multi-byte characters
          const binaryString = atob(response.content.replace(/\n/g, ""));
          // Convert binary string to UTF-8
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decoder = new TextDecoder("utf-8");
          return decoder.decode(bytes);
        } else if (typeof response.content === "string") {
          // Content is already a string (plain text)
          return response.content;
        } else {
          console.warn(
            `[GitHubService] Unexpected content type for ${path}:`,
            typeof response.content,
          );
          return String(response.content);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching file content for ${path}:`, error);
      return null;
    }
  }

  /**
   * Fetch markdown files from a repository
   */
  async fetchMarkdownFiles(
    owner: string,
    repo: string,
    path: string = "",
  ): Promise<
    Array<{
      name: string;
      path: string;
      size: number;
      type: string;
    }>
  > {
    try {
      // For now, use the tree API to get directory contents
      const tree = await this.fetchRepositoryTree(owner, repo);

      // Filter items in the specified path
      const pathPrefix = path ? path + "/" : "";
      // const items = tree.tree
      //   .filter((item) => {
      //     // If path is empty, only show root level items
      //     if (!path) {
      //       return !item.path.includes("/");
      //     }
      //     // Otherwise, show items directly in the specified path
      //     if (!item.path.startsWith(pathPrefix)) return false;
      //     const relativePath = item.path.substring(pathPrefix.length);
      //     return !relativePath.includes("/");
      //   })
      //   .map((item) => ({
      //     name: path ? item.path.substring(pathPrefix.length) : item.path,
      //     path: item.path,
      //     size: item.size || 0,
      //     type: item.type === "tree" ? "dir" : "file",
      //   }));

      // Get unique directories and markdown files
      const dirs = new Map<string, any>();
      const files: any[] = [];

      tree.tree.forEach((item) => {
        if (!item.path.startsWith(pathPrefix)) return;

        const relativePath = item.path.substring(pathPrefix.length);
        const parts = relativePath.split("/");

        // If it's a direct child
        if (parts.length === 1) {
          if (
            item.type === "blob" &&
            (item.path.endsWith(".md") || item.path.endsWith(".mdx"))
          ) {
            files.push({
              name: parts[0],
              path: item.path,
              size: item.size || 0,
              type: "file",
            });
          }
        } else {
          // It's in a subdirectory
          const dirName = parts[0];
          if (!dirs.has(dirName)) {
            dirs.set(dirName, {
              name: dirName,
              path: pathPrefix + dirName,
              size: 0,
              type: "dir",
            });
          }
        }
      });

      return [...Array.from(dirs.values()), ...files];
    } catch (error) {
      console.error("Error fetching markdown files:", error);
      return [];
    }
  }

  /**
   * Count markdown files in a repository recursively
   */
  async countMarkdownFiles(owner: string, repo: string): Promise<number> {
    try {
      const tree = await this.fetchRepositoryTree(owner, repo);
      return tree.tree.filter(
        (item) =>
          item.type === "blob" &&
          (item.path.endsWith(".md") || item.path.endsWith(".mdx")),
      ).length;
    } catch (error) {
      console.error("Error counting markdown files:", error);
      return 0;
    }
  }

  /**
   * Transform GitHub tree to FileTree format for visualization
   */
  buildFileSystemTree(tree: GitHubTree): FileTree {
    // Create a map of changed files for quick lookup
    // const changedFilesMap = new Map(
    //   changedFiles.map((file) => [file.filename, file]),
    // );

    // Filter to only include files (blobs), not directories
    const files = tree.tree.filter((item) => item.type === "blob");

    // Build directory structure
    const root: DirectoryInfo = {
      name: "root",
      path: "",
      relativePath: "",
      children: [],
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      depth: 0,
    };

    // Group files by directory
    const directories = new Map<string, DirectoryInfo>();
    directories.set("", root);

    files.forEach((file) => {
      const pathParts = file.path.split("/");
      const fileName = pathParts.pop()!;

      // Create directory structure
      let currentPath = "";
      let currentDir = root;

      pathParts.forEach((dirName, index) => {
        // const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

        if (!directories.has(currentPath)) {
          const newDir: DirectoryInfo = {
            name: dirName,
            path: currentPath,
            relativePath: currentPath,
            children: [],
            fileCount: 0,
            totalSize: 0,
            depth: index + 1,
          };

          directories.set(currentPath, newDir);
          currentDir.children.push(newDir);
        }

        currentDir = directories.get(currentPath)!;
      });

      // Add file to its directory
      // const changedFile = changedFilesMap.get(file.path);
      const fileNode: FileInfo = {
        name: fileName,
        path: file.path,
        relativePath: file.path,
        size: file.size || 0,
        extension: fileName.includes(".")
          ? "." + fileName.split(".").pop()
          : "",
        lastModified: new Date(), // GitHub API doesn't provide this in tree
        isDirectory: false,
      };

      currentDir.children.push(fileNode);
    });

    // Calculate file counts and sizes for directories
    const calculateStats = (dir: DirectoryInfo): void => {
      let fileCount = 0;
      let totalSize = 0;

      dir.children.forEach((child: FileInfo | DirectoryInfo) => {
        if ("isDirectory" in child) {
          // It's a FileInfo
          fileCount++;
          totalSize += child.size;
        } else {
          // It's a DirectoryInfo
          calculateStats(child as DirectoryInfo);
          fileCount += (child as DirectoryInfo).fileCount;
          totalSize += (child as DirectoryInfo).totalSize;
        }
      });

      dir.fileCount = fileCount;
      dir.totalSize = totalSize;
    };

    calculateStats(root);

    // Generate legend data

    // Create allFiles array
    const allFiles: FileInfo[] = files.map((f) => ({
      name: f.path.split("/").pop()!,
      path: f.path,
      relativePath: f.path,
      size: f.size || 0,
      extension: f.path.includes(".") ? "." + f.path.split(".").pop() : "",
      lastModified: new Date(),
      isDirectory: false,
    }));

    // Create allDirectories array
    const allDirectories: DirectoryInfo[] = Array.from(
      directories.values(),
    ).filter((d) => d.path !== "");

    return {
      sha: tree.sha,
      root,
      allFiles,
      allDirectories,
      stats: {
        totalFiles: files.length,
        totalDirectories: directories.size - 1, // Exclude root
        totalSize: root.totalSize,
        maxDepth:
          files.length > 0
            ? Math.max(...files.map((f) => f.path.split("/").length))
            : 0,
        buildingTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
        directoryTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
        combinedTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
      },
    };
  }

  /**
   * Fetch repository contributors
   */
  async fetchRepositoryContributors(
    owner: string,
    repo: string,
  ): Promise<Contributor[]> {
    try {
      const response = await this.makeRequest<Contributor[]>(
        `/repo/${owner}/${repo}?action=contributors`,
      );
      return response;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

  /**
   * Fetch repository collaborators (requires authentication and appropriate permissions)
   */
  async fetchRepositoryCollaborators(
    owner: string,
    repo: string,
  ): Promise<Collaborator[]> {
    try {
      const response = await this.makeRequest<Collaborator[]>(
        `/repo/${owner}/${repo}?action=collaborators`,
      );
      return response;
    } catch (error) {
      console.error(
        "Error fetching collaborators (may require authentication):",
        error,
      );
      return [];
    }
  }

  /**
   * Fetch detailed user profile information
   */
  async fetchUserProfile(username: string): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>(
        `/users/${username}`,
      );
      return response;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  /**
   * Fetch user's Twitter handle if available
   */
  async fetchUserTwitterHandle(username: string): Promise<string | null> {
    try {
      const profile = await this.fetchUserProfile(username);
      return profile?.twitter_username || null;
    } catch (error) {
      console.error("Error fetching user Twitter handle:", error);
      return null;
    }
  }

  /**
   * Fetch aggregated maintainer information for a repository
   */
  async fetchRecentCommits(
    owner: string,
    repo: string,
    options?: {
      per_page?: number;
      page?: number;
      sha?: string;
      path?: string;
      since?: string;
      until?: string;
    },
  ): Promise<
    Array<{
      sha: string;
      commit: {
        message: string;
        author: {
          name: string;
          email: string;
          date: string;
        };
      };
      files?: Array<{
        filename: string;
        status:
          | "added"
          | "removed"
          | "modified"
          | "renamed"
          | "copied"
          | "changed"
          | "unchanged";
        additions: number;
        deletions: number;
        changes: number;
      }>;
    }>
  > {
    try {
      const params = new URLSearchParams();
      if (options?.per_page)
        params.append("per_page", options.per_page.toString());
      if (options?.page) params.append("page", options.page.toString());
      if (options?.sha) params.append("sha", options.sha);
      if (options?.path) params.append("path", options.path);
      if (options?.since) params.append("since", options.since);
      if (options?.until) params.append("until", options.until);

      const queryString = params.toString();
      const endpoint = `/repo/${owner}/${repo}?action=commits${queryString ? `&${queryString}` : ""}`;

      const commits = await this.makeRequest<any[]>(endpoint);

      // If we need file details, fetch them for each commit
      if (options?.per_page && options.per_page <= 10) {
        const commitsWithFiles = await Promise.all(
          commits.map(async (commit) => {
            try {
              const commitDetails = await this.makeRequest<any>(
                `/repo/${owner}/${repo}?action=commit&sha=${commit.sha}`,
              );
              return {
                ...commit,
                files: commitDetails.files,
              };
            } catch (error) {
              console.warn(
                `Failed to fetch files for commit ${commit.sha}:`,
                error,
              );
              return commit;
            }
          }),
        );
        return commitsWithFiles;
      }

      return commits;
    } catch (error) {
      console.error("Error fetching commits:", error);
      throw error;
    }
  }

  async fetchRepositoryMaintainers(
    owner: string,
    repo: string,
  ): Promise<MaintainerInfo[]> {
    try {
      // Fetch contributors
      const contributors = await this.fetchRepositoryContributors(owner, repo);

      // Create maintainer info list
      const maintainers: MaintainerInfo[] = [];

      // Analyze contribution patterns for role assignment (excluding owner)
      const nonOwnerContributors = contributors
        .filter((contrib) => contrib.login !== owner)
        // TODO: Consider showing GitHub Actions bots in the future for automation insights
        .filter((contrib) => {
          const isBot =
            contrib.type === "Bot" ||
            contrib.login.endsWith("[bot]") ||
            contrib.login.includes("bot") ||
            contrib.login === "actions-user" ||
            contrib.login === "dependabot";

          if (isBot) {
            console.log("Filtering out bot:", contrib.login, contrib.type);
          }

          return !isBot;
        })
        .slice(0, 10); // Top 10 contributors

      if (nonOwnerContributors.length === 0) {
        return maintainers;
      }

      // Analyze contribution cliff to determine architects vs builders
      const { architects, builders, hasSignificantCliff } =
        this.analyzeContributionCliff(nonOwnerContributors);

      // Determine how many to show based on contribution distribution
      let contributorsToShow: (typeof architects)[0][];
      if (hasSignificantCliff) {
        // Big drop-off detected: show only top 5
        if (architects.length == 1) {
          contributorsToShow = [...architects, ...builders].slice(0, 3);
        } else {
          contributorsToShow = [...architects, ...builders].slice(0, 5);
        }
      } else {
        // Similar contributions: show up to 10
        contributorsToShow = [...architects, ...builders];
      }

      // Add architects (council members)
      const architectMaintainers = contributorsToShow
        .filter((contrib) => architects.includes(contrib))
        .map((contrib) => ({
          login: contrib.login,
          avatar_url: contrib.avatar_url,
          html_url: contrib.html_url,
          type: contrib.type,
          contributions: contrib.contributions,
          role: "maintainer" as const,
        }));

      // Add builders
      const builderMaintainers = contributorsToShow
        .filter((contrib) => builders.includes(contrib))
        .map((contrib) => ({
          login: contrib.login,
          avatar_url: contrib.avatar_url,
          html_url: contrib.html_url,
          type: contrib.type,
          contributions: contrib.contributions,
          role: "contributor" as const,
        }));

      maintainers.push(...architectMaintainers, ...builderMaintainers);

      // Fetch profile information for top contributors (limit to avoid rate limiting)
      const profilePromises = maintainers
        .slice(0, 5) // Limit to top 5 contributors
        .map(async (maintainer) => {
          const profile = await this.fetchUserProfile(maintainer.login);
          if (profile) {
            maintainer.profile = {
              name: profile.name,
              company: profile.company,
              blog: profile.blog,
              location: profile.location,
              bio: profile.bio,
            };
          }
          return maintainer;
        });

      await Promise.all(profilePromises);

      return maintainers;
    } catch (error) {
      console.error("Error fetching repository maintainers:", error);
      return [];
    }
  }

  /**
   * Analyze contribution patterns to determine architects vs builders
   */
  private analyzeContributionCliff(contributors: Contributor[]): {
    architects: Contributor[];
    builders: Contributor[];
    hasSignificantCliff: boolean;
  } {
    if (contributors.length === 0) {
      return { architects: [], builders: [], hasSignificantCliff: false };
    }

    // Sort by contributions (should already be sorted, but ensure it)
    const sorted = [...contributors].sort(
      (a, b) => b.contributions - a.contributions,
    );

    // If only 1-2 contributors, make them architects
    if (sorted.length <= 2) {
      return { architects: sorted, builders: [], hasSignificantCliff: false };
    }

    // Find the biggest drop in contributions (the "cliff")
    let maxDropIndex = 0;
    let maxDropRatio = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i].contributions;
      const next = sorted[i + 1].contributions;

      // Calculate drop ratio (avoid division by zero)
      const dropRatio = next > 0 ? (current - next) / next : current;

      if (dropRatio > maxDropRatio) {
        maxDropRatio = dropRatio;
        maxDropIndex = i;
      }
    }

    // Determine if there's a significant cliff (drop ratio > 2x)
    // Also ensure we have at least 1 architect and don't make everyone architects
    const hasSignificantCliff = maxDropRatio > 2.0;
    const minArchitects = 1;
    const maxArchitects = Math.min(5, Math.floor(sorted.length * 0.6)); // At most 60% can be architects

    let architectCount: number;

    if (hasSignificantCliff) {
      // Use the cliff position, but respect min/max bounds
      architectCount = Math.max(
        minArchitects,
        Math.min(maxArchitects, maxDropIndex + 1),
      );
    } else {
      // No clear cliff, use top 30% or at least 1
      architectCount = Math.max(
        minArchitects,
        Math.min(maxArchitects, Math.ceil(sorted.length * 0.3)),
      );
    }

    const architects = sorted.slice(0, architectCount);
    const builders = sorted.slice(architectCount);

    return { architects, builders, hasSignificantCliff };
  }

  /**
   * Fetch repository file count for city classification
   */
  async fetchRepositoryFileCount(owner: string, repo: string): Promise<number> {
    try {
      const response = await this.makeRequest<{ count: number }>(
        `/repo/${owner}/${repo}?action=file-count`,
      );
      return response.count;
    } catch (error) {
      console.error("Error fetching repository file count:", error);
      // Return a reasonable default if we can't fetch the count
      return 50; // Default to "Town" classification
    }
  }

  /**
   * Fetch landing page stars configuration from the Voyager-Guides repository
   */
  async fetchLandingPageStars(): Promise<
    Array<{
      owner: string;
      name: string;
      description: string;
    }>
  > {
    try {
      const content = await this.fetchFileContent(
        "The-Code-Cosmos",
        "Voyager-Guides",
        "landing-page-stars.json",
      );

      if (!content) {
        console.warn(
          "Landing page stars configuration not found, using default",
        );
        return this.getDefaultStars();
      }

      const parsed = JSON.parse(content);

      // Validate the structure
      if (!Array.isArray(parsed)) {
        throw new Error("Landing page stars configuration must be an array");
      }

      // Validate each star entry
      const validStars = parsed.filter((star) => {
        if (typeof star !== "object" || star === null) return false;
        if (
          typeof star.owner !== "string" ||
          typeof star.name !== "string" ||
          typeof star.description !== "string"
        )
          return false;
        return star.owner.trim() && star.name.trim() && star.description.trim();
      });

      return validStars.length > 0 ? validStars : this.getDefaultStars();
    } catch (error) {
      console.error("Error fetching landing page stars:", error);
      return this.getDefaultStars();
    }
  }

  /**
   * Get default stars configuration as fallback
   */
  private getDefaultStars(): Array<{
    owner: string;
    name: string;
    description: string;
  }> {
    return [
      {
        owner: "the-pocket",
        name: "pocketflow",
        description: "LLM Framework in 100 Lines",
      },
    ];
  }

  /**
   * Fetch explore featured repositories configuration from the Voyager-Guides repository
   */
  async fetchExploreFeaturedRepos(): Promise<
    Array<{
      owner: string;
      name: string;
      description: string;
    }>
  > {
    try {
      const content = await this.fetchFileContent(
        "The-Code-Cosmos",
        "Voyager-Guides",
        "explore-featured-repos.json",
      );

      if (!content) {
        console.warn(
          "Explore featured repos configuration not found, using default",
        );
        return this.getDefaultFeaturedRepos();
      }

      const parsed = JSON.parse(content);

      // Validate the structure
      if (!Array.isArray(parsed)) {
        throw new Error(
          "Explore featured repos configuration must be an array",
        );
      }

      // Validate each repo entry
      const validRepos = parsed.filter((repo) => {
        if (typeof repo !== "object" || repo === null) return false;
        if (
          typeof repo.owner !== "string" ||
          typeof repo.name !== "string" ||
          typeof repo.description !== "string"
        )
          return false;
        return repo.owner.trim() && repo.name.trim() && repo.description.trim();
      });

      return validRepos.length > 0
        ? validRepos
        : this.getDefaultFeaturedRepos();
    } catch (error) {
      console.error("Error fetching explore featured repos:", error);
      return this.getDefaultFeaturedRepos();
    }
  }

  /**
   * Get default featured repositories configuration as fallback
   */
  private getDefaultFeaturedRepos(): Array<{
    owner: string;
    name: string;
    description: string;
  }> {
    return [
      {
        owner: "facebook",
        name: "react",
        description:
          "A declarative, efficient, and flexible JavaScript library",
      },
      { owner: "microsoft", name: "vscode", description: "Visual Studio Code" },
      { owner: "vercel", name: "next.js", description: "The React Framework" },
      {
        owner: "vuejs",
        name: "vue",
        description: "Progressive JavaScript Framework",
      },
      {
        owner: "angular",
        name: "angular",
        description:
          "Platform for building mobile and desktop web applications",
      },
      {
        owner: "sveltejs",
        name: "svelte",
        description: "Cybernetically enhanced web apps",
      },
    ];
  }

  /**
   * Search for code within a repository
   * Note: GitHub search API has limitations - it searches the default branch only
   * and has rate limits (10 requests per minute for authenticated users)
   */
  async searchCode(
    owner: string,
    repo: string,
    query: string,
    options?: {
      directory?: string;
      excludeDirectory?: boolean;
      language?: string;
      extension?: string;
      caseSensitive?: boolean;
      perPage?: number;
      page?: number;
    },
  ): Promise<{
    total_count: number;
    incomplete_results: boolean;
    items: Array<{
      name: string;
      path: string;
      sha: string;
      html_url: string;
      repository: {
        name: string;
        full_name: string;
      };
      text_matches?: Array<{
        object_url: string;
        object_type: string;
        property: string;
        fragment: string;
        matches: Array<{
          text: string;
          indices: [number, number];
        }>;
      }>;
    }>;
  }> {
    try {
      // Build the search query
      let searchQuery = `repo:${owner}/${repo} ${query}`;

      // Add language filter if specified
      if (options?.language) {
        searchQuery += ` language:${options.language}`;
      }

      // Add extension filter if specified
      if (options?.extension) {
        searchQuery += ` extension:${options.extension}`;
      }

      // Build query parameters
      const params = new URLSearchParams({
        q: searchQuery,
        per_page: String(options?.perPage || 30),
        page: String(options?.page || 1),
      });

      // Make the search request with text-match to get snippets
      const response = await this.makeRequest<any>(`/search/code?${params}`, {
        headers: {
          Accept: "application/vnd.github.v3.text-match+json",
        },
      });

      // Apply case-sensitive filtering if needed
      // GitHub's API doesn't truly support case-sensitive search, so we filter client-side
      if (options?.caseSensitive && response.items) {
        console.log("Applying case-sensitive filter for query:", query);
        const originalCount = response.items.length;

        // Use the original query for case-sensitive matching
        const searchTerm = query;

        response.items = response.items.filter((item: any) => {
          // Check if the content actually contains the case-sensitive match
          // We need to check the text_matches if available
          if (item.text_matches && item.text_matches.length > 0) {
            return item.text_matches.some((match: any) => {
              if (match.fragment) {
                // Check if the fragment contains the exact case-sensitive match
                return match.fragment.includes(searchTerm);
              }
              return false;
            });
          }

          // If no text_matches, check the filename at least
          // This helps filter out files that match in name but might not in content
          if (item.name && item.name.includes(searchTerm)) {
            return true;
          }

          // Without text_matches, we can't verify the content match
          // Exclude it to be safe in case-sensitive mode
          return false;
        });

        console.log(
          `Case-sensitive filter: ${originalCount} -> ${response.items.length} results`,
        );

        // Update the total count to reflect filtered results
        response.total_count = response.items.length;

        // Also mark that results might be incomplete due to filtering
        if (response.items.length < originalCount) {
          response.incomplete_results = true;
        }
      }

      // If directory is specified, filter results client-side
      if (options?.directory) {
        console.log(
          "Filtering search results for directory:",
          options.directory,
          "Exclude mode:",
          options.excludeDirectory,
        );
        console.log("Total results before filtering:", response.items.length);

        const filteredItems = response.items.filter((item: any) => {
          // Normalize paths for comparison
          const itemPath = item.path.startsWith("/")
            ? item.path.slice(1)
            : item.path;
          const directory = options.directory!.startsWith("/")
            ? options.directory!.slice(1)
            : options.directory!;

          // Check if the file is in the specified directory
          const isInDirectory = itemPath.startsWith(directory + "/");

          if (response.items.length <= 5) {
            // Log first few items for debugging
            console.log(
              `Item path: ${itemPath}, Directory: ${directory}, In directory: ${isInDirectory}`,
            );
          }

          // If excludeDirectory is true, return items NOT in the directory
          // Otherwise, return items IN the directory
          return options.excludeDirectory ? !isInDirectory : isInDirectory;
        });

        console.log("Results after filtering:", filteredItems.length);

        return {
          ...response,
          items: filteredItems,
          total_count: filteredItems.length, // Update count to reflect filtered results
        };
      }

      return response;
    } catch (error) {
      console.error("Error searching code:", error);
      throw error;
    }
  }

  /**
   * Search for files by name pattern within a specific directory
   * This uses the tree API and filters client-side (no rate limits)
   */
  async searchFilesInDirectory(
    owner: string,
    repo: string,
    directory: string,
    options?: {
      pattern?: string;
      extensions?: string[];
      includeContent?: boolean;
      excludeDirectory?: boolean;
      caseSensitive?: boolean;
    },
  ): Promise<
    Array<{
      name: string;
      path: string;
      type: string;
      size?: number;
      content?: string;
    }>
  > {
    try {
      // Fetch the repository tree
      const tree = await this.fetchRepositoryTree(owner, repo);

      // Normalize directory path
      const normalizedDir = directory.startsWith("/")
        ? directory.slice(1)
        : directory;

      console.log("Searching files in directory:", {
        directory,
        normalizedDir,
      });

      // Filter files based on directory and options
      const filteredFiles = tree.tree.filter((item) => {
        if (item.type !== "blob") return false;

        // Check if file is in the specified directory
        if (normalizedDir) {
          const isInDirectory = item.path.startsWith(normalizedDir + "/");
          // If excludeDirectory is true, return items NOT in the directory
          // Otherwise, return items IN the directory
          if (options?.excludeDirectory ? isInDirectory : !isInDirectory)
            return false;
        }

        // Apply pattern filter if specified
        if (options?.pattern) {
          const fileName = item.path.split("/").pop() || "";
          if (options?.caseSensitive) {
            // Case-sensitive search
            if (!fileName.includes(options.pattern)) return false;
          } else {
            // Case-insensitive search (default)
            if (!fileName.toLowerCase().includes(options.pattern.toLowerCase()))
              return false;
          }
        }

        // Apply extension filter if specified
        if (options?.extensions && options.extensions.length > 0) {
          const ext = item.path.split(".").pop()?.toLowerCase();
          if (!ext || !options.extensions.includes(ext)) return false;
        }

        return true;
      });

      const filterMode = options?.excludeDirectory ? "outside" : "inside";
      console.log(
        `Found ${filteredFiles.length} files matching pattern "${options?.pattern}" ${filterMode} directory "${normalizedDir}"`,
      );

      // Map to result format
      const results = filteredFiles.map((file) => ({
        name: file.path.split("/").pop() || "",
        path: file.path,
        type: "file" as const,
        size: file.size,
      }));

      // Optionally fetch content for each file
      if (options?.includeContent && results.length > 0) {
        // Limit content fetching to avoid rate limits
        const contentLimit = 10;
        const filesWithContent = results.slice(0, contentLimit);

        const contentPromises = filesWithContent.map(async (file) => {
          try {
            const content = await this.fetchFileContent(owner, repo, file.path);
            return { ...file, content: content || "" };
          } catch (error) {
            console.error(`Error fetching content for ${file.path}:`, error);
            return file;
          }
        });

        const resultsWithContent = await Promise.all(contentPromises);

        // Combine results
        return [...resultsWithContent, ...results.slice(contentLimit)];
      }

      return results;
    } catch (error) {
      console.error("Error searching files in directory:", error);
      throw error;
    }
  }

  /**
   * Fetch issues for a repository
   */
  async fetchIssues(
    owner: string,
    repo: string,
    options?: {
      state?: "open" | "closed" | "all";
      labels?: string;
      perPage?: number;
      page?: number;
    },
  ): Promise<
    Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      labels: Array<{ name: string; color: string }>;
      assignees: Array<{ login: string; avatar_url: string }>;
    }>
  > {
    const params = new URLSearchParams({
      state: options?.state || "open",
      per_page: String(options?.perPage || 30),
      page: String(options?.page || 1),
      ...(options?.labels && { labels: options.labels }),
    });

    return this.makeRequest(`/repo/${owner}/${repo}/issues?${params}`);
  }

  /**
   * Fetch a single issue with full details
   */
  async fetchIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<{
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    labels: Array<{ name: string; color: string }>;
    assignees: Array<{ login: string; avatar_url: string }>;
    body: string;
    user: {
      login: string;
      avatar_url: string;
    };
  }> {
    return this.makeRequest(`/repo/${owner}/${repo}/issues/${issueNumber}`);
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
    },
  ): Promise<{
    number: number;
    html_url: string;
    title: string;
    state: string;
    created_at: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  }> {
    return this.makeRequest(`/repo/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Generate a PR creation URL (for when direct API access isn't available)
   */
  generatePullRequestUrl(
    owner: string,
    repo: string,
    options: {
      base?: string;
      head: string;
      title: string;
      body?: string;
    },
  ): string {
    const baseRef = options.base || "main";
    const params = new URLSearchParams({
      quick_pull: "1",
      title: options.title,
      ...(options.body && { body: options.body }),
    });

    return `https://github.com/${owner}/${repo}/compare/${baseRef}...${options.head}?${params}`;
  }

  /**
   * Create a new issue in the repository
   */
  async createIssue(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
      milestone?: number;
    },
  ): Promise<{
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: string;
    created_at: string;
  }> {
    return this.makeRequest(`/repo/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Get pull requests associated with an issue
   */
  async getPullRequestsForIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<
    Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      head: { ref: string };
      base: { ref: string };
    }>
  > {
    // Search for PRs that mention this issue in title or body
    const searchQuery = `repo:${owner}/${repo} is:pr ${issueNumber}`;

    try {
      // First, try to get PRs that mention this issue
      const response = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(this.token && { Authorization: `token ${this.token}` }),
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const prs = data.items.filter(
          (item: any) =>
            item.pull_request &&
            (item.body?.includes(`#${issueNumber}`) ||
              item.body?.includes(`Resolves #${issueNumber}`) ||
              item.body?.includes(`Fixes #${issueNumber}`) ||
              item.body?.includes(`Closes #${issueNumber}`) ||
              item.title?.includes(`#${issueNumber}`)),
        );

        return prs.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          html_url: pr.html_url,
          head: { ref: pr.head?.ref || "unknown" },
          base: { ref: pr.base?.ref || "main" },
        }));
      }
    } catch (error) {
      console.error("Error searching for associated PRs:", error);
    }

    // Fallback: list all PRs and filter client-side
    const allPrs = await this.makeRequest<any[]>(
      `/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
    );

    return allPrs
      .filter(
        (pr) =>
          pr.body?.includes(`#${issueNumber}`) ||
          pr.title?.includes(`#${issueNumber}`),
      )
      .map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        html_url: pr.html_url,
        head: { ref: pr.head.ref },
        base: { ref: pr.base.ref },
      }));
  }
  /**
   * Fetch default layers configuration from the Voyager-Guides repository
   */
  async fetchDefaultLayersConfig(): Promise<any | null> {
    try {
      const content = await this.fetchFileContent(
        "The-Code-Cosmos",
        "Voyager-Guides",
        "default-layers.json",
      );

      if (!content) {
        console.warn("Default layers configuration not found");
        return null;
      }

      const parsed = JSON.parse(content);

      // Basic validation
      if (!parsed.version || !parsed.layers || !Array.isArray(parsed.layers)) {
        throw new Error("Invalid default layers configuration format");
      }

      return parsed;
    } catch (error) {
      console.error("Error fetching default layers configuration:", error);
      return null;
    }
  }
}
