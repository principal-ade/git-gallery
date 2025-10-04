import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

interface CachedFileTree {
  owner: string;
  repo: string;
  fileTree: any;
  cachedAt: string;
  stats?: any; // GitHub repo stats
}

export class SimpleFileTreeCache {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName =
      process.env.FILETREE_CACHE_BUCKET || "code-cosmos-filetree-cache";

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  /**
   * Get the S3 key for a repository's filetree
   */
  private getS3Key(owner: string, repo: string): string {
    return `filetrees/${owner}/${repo}.json`;
  }

  /**
   * Get cached filetree for a repository
   */
  async get(owner: string, repo: string): Promise<CachedFileTree | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.getS3Key(owner, repo),
      });

      const response = await this.s3Client.send(command);
      const body = await response.Body?.transformToString();

      if (!body) {
        return null;
      }

      const data = JSON.parse(body);
      console.log(`✅ Cache hit: ${owner}/${repo}`);
      return data;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
        console.log(`❌ Cache miss: ${owner}/${repo}`);
        return null;
      }
      console.error(
        `Error fetching ${owner}/${repo} from cache:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Store filetree in cache
   */
  async store(
    owner: string,
    repo: string,
    fileTree: any,
    stats?: any,
  ): Promise<void> {
    try {
      const data: CachedFileTree = {
        owner,
        repo,
        fileTree,
        stats,
        cachedAt: new Date().toISOString(),
      };

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.getS3Key(owner, repo),
        Body: JSON.stringify(data, null, 2),
        ContentType: "application/json",
      });

      await this.s3Client.send(command);
      console.log(`💾 Cached: ${owner}/${repo}`);
    } catch (error) {
      console.error(`Failed to cache ${owner}/${repo}:`, error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * List all cached repositories
   */
  async listCached(): Promise<{ owner: string; repo: string }[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: "filetrees/",
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      const repos = response.Contents.map((obj) => {
        const key = obj.Key || "";
        // Extract owner/repo from filetrees/owner/repo.json
        const match = key.match(/filetrees\/([^\/]+)\/([^\/]+)\.json$/);
        if (match) {
          return {
            owner: match[1],
            repo: match[2],
          };
        }
        return null;
      }).filter(
        (item): item is { owner: string; repo: string } => item !== null,
      );

      return repos;
    } catch (error) {
      console.error("Failed to list cached repos:", error);
      return [];
    }
  }

  /**
   * Get multiple cached repositories at once
   */
  async getMultiple(
    repos: { owner: string; repo: string }[],
  ): Promise<CachedFileTree[]> {
    const results = await Promise.all(
      repos.map(({ owner, repo }) => this.get(owner, repo)),
    );

    return results.filter((item): item is CachedFileTree => item !== null);
  }
}

// Export singleton instance
export const simpleFileTreeCache = new SimpleFileTreeCache();
