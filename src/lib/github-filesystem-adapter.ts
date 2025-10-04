import { Octokit } from "@octokit/rest";

/**
 * GitHub FileSystem Adapter for a24z-Memory
 *
 * This adapter implements the FileSystemAdapter interface from a24z-Memory
 * to work with GitHub repositories via the GitHub API.
 *
 * It's read-only and designed for fetching codebase views from public repositories.
 * This can be contributed back to a24z-Memory for broader use.
 */
export class GitHubFileSystemAdapter {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;
  private cache: Map<string, any> = new Map();

  constructor(
    owner: string,
    repo: string,
    branch: string = "main",
    token?: string,
  ) {
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  // File operations
  async exists(path: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.normalizePath(path),
        ref: this.branch,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    const cacheKey = `file:${normalizedPath}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: normalizedPath,
        ref: this.branch,
      });

      if ("content" in data && data.type === "file") {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        this.cache.set(cacheKey, content);
        return content;
      }

      throw new Error(`Path ${path} is not a file`);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  writeFile(): void {
    throw new Error("GitHubFileSystemAdapter is read-only");
  }

  deleteFile(): void {
    throw new Error("GitHubFileSystemAdapter is read-only");
  }

  // Directory operations
  createDir(): void {
    throw new Error("GitHubFileSystemAdapter is read-only");
  }

  async readDir(path: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(path);
    const cacheKey = `dir:${normalizedPath}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: normalizedPath,
        ref: this.branch,
      });

      if (!Array.isArray(data)) {
        throw new Error(`Path ${path} is not a directory`);
      }

      const files = data.map((item) => item.name);
      this.cache.set(cacheKey, files);
      return files;
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  deleteDir(): void {
    throw new Error("GitHubFileSystemAdapter is read-only");
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.normalizePath(path),
        ref: this.branch,
      });

      return Array.isArray(data);
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // Path operations
  join(...paths: string[]): string {
    return paths
      .filter((p) => p)
      .join("/")
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");
  }

  relative(from: string, to: string): string {
    const fromParts = from.split("/").filter((p) => p);
    const toParts = to.split("/").filter((p) => p);

    let common = 0;
    while (
      common < fromParts.length &&
      common < toParts.length &&
      fromParts[common] === toParts[common]
    ) {
      common++;
    }

    const upCount = fromParts.length - common;
    const upParts = new Array(upCount).fill("..");
    const remainingParts = toParts.slice(common);

    return [...upParts, ...remainingParts].join("/") || ".";
  }

  dirname(path: string): string {
    const parts = path.split("/").filter((p) => p);
    parts.pop();
    return parts.join("/") || "/";
  }

  isAbsolute(path: string): boolean {
    return path.startsWith("/");
  }

  // Repository operations
  normalizeRepositoryPath(): string {
    // For GitHub, the repository root is always '/'
    return "/";
  }

  findProjectRoot(): string {
    // For GitHub, the project root is always '/'
    return "/";
  }

  getRepositoryName(): string {
    return this.repo;
  }

  // Helper method to normalize paths for GitHub API
  private normalizePath(path: string): string {
    // Remove leading slash for GitHub API
    return path.replace(/^\/+/, "");
  }

  // Clear cache if needed
  clearCache(): void {
    this.cache.clear();
  }
}
