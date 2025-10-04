import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export interface AllowedRepo {
  owner: string;
  repo: string;
  addedAt: string;
  addedBy?: string;
  note?: string;
}

export interface AllowedReposData {
  repos: AllowedRepo[];
  updatedAt: string;
}

/**
 * S3 Store for managing allowed repositories for PR image generation
 * Similar to orbit waitlist but for repo authorization
 */
export class S3PRImageStore {
  private s3Client: S3Client;
  private bucketName: string;
  private objectKey: string = "pr-image/allowed-repos.json";

  constructor() {
    // Use same bucket as orbit for simplicity, different key path
    this.bucketName = process.env.ORBIT_S3_BUCKET || "code-city-orbit";

    // Initialize S3 client
    // On AWS services (App Runner, ECS, Lambda), the SDK will automatically use IAM roles
    // No need to specify credentials explicitly
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      // Don't specify credentials at all - let AWS SDK use the default credential chain
      // This will use IAM roles on AWS services automatically
    });
  }

  /**
   * Check if a repo is allowed to generate PR images
   */
  async isRepoAllowed(owner: string, repo: string): Promise<boolean> {
    try {
      const data = await this.getAllowedRepos();
      return data.repos.some(
        (r) =>
          r.owner.toLowerCase() === owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.toLowerCase(),
      );
    } catch (error) {
      console.error("Error checking repo allowlist:", error);
      // Default to false if can't check
      return false;
    }
  }

  /**
   * Get all allowed repos
   */
  async getAllowedRepos(): Promise<AllowedReposData> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.objectKey,
      });

      const response = await this.s3Client.send(command);
      const data = await response.Body?.transformToString();

      if (!data) {
        return { repos: [], updatedAt: new Date().toISOString() };
      }

      return JSON.parse(data);
    } catch (error: any) {
      if (error.Code === "NoSuchKey" || error.name === "NoSuchKey") {
        // File doesn't exist yet
        return { repos: [], updatedAt: new Date().toISOString() };
      }
      throw error;
    }
  }

  /**
   * Add a repo to the allowlist
   */
  async addRepo(
    owner: string,
    repo: string,
    addedBy?: string,
    note?: string,
  ): Promise<void> {
    const data = await this.getAllowedRepos();

    // Check if already exists
    const exists = data.repos.some(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.repo.toLowerCase() === repo.toLowerCase(),
    );

    if (exists) {
      throw new Error(
        `Repository ${owner}/${repo} is already in the allowlist`,
      );
    }

    // Add new repo
    data.repos.push({
      owner,
      repo,
      addedAt: new Date().toISOString(),
      addedBy,
      note,
    });

    data.updatedAt = new Date().toISOString();

    // Save back to S3
    await this.saveAllowedRepos(data);
  }

  /**
   * Remove a repo from the allowlist
   */
  async removeRepo(owner: string, repo: string): Promise<void> {
    const data = await this.getAllowedRepos();

    const initialLength = data.repos.length;
    data.repos = data.repos.filter(
      (r) =>
        !(
          r.owner.toLowerCase() === owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.toLowerCase()
        ),
    );

    if (data.repos.length === initialLength) {
      throw new Error(`Repository ${owner}/${repo} not found in allowlist`);
    }

    data.updatedAt = new Date().toISOString();
    await this.saveAllowedRepos(data);
  }

  /**
   * Save allowed repos data to S3
   */
  private async saveAllowedRepos(data: AllowedReposData): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: this.objectKey,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    });

    await this.s3Client.send(command);
  }

  /**
   * Check if S3 bucket is accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: this.objectKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.Code === "NoSuchKey" || error.name === "NoSuchKey") {
        // File doesn't exist but bucket is accessible
        return true;
      }
      console.error("S3 connection check failed:", error);
      return false;
    }
  }
}
