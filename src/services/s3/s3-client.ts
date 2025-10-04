import {
  S3Client as AWSS3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  RepositoryBasicInfo,
  FileTreeNotFoundError,
  S3OperationError,
  GithubMetadataNotFoundError,
  CodeRepository,
} from "./types";

export enum Tables {
  FILE_TREE = "filetree",
}

export class S3ClientBase {
  protected client: AWSS3Client;
  protected bucketName: string;

  constructor(bucketName: string) {
    this.client = new AWSS3Client({});
    this.bucketName = bucketName;
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      const body = await response.Body!.transformToString();
      return JSON.parse(body);
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
        return null;
      }
      throw new S3OperationError("getObject", this.bucketName, error, key);
    }
  }

  async putObject(
    key: string,
    data: any,
    contentType: string = "application/json",
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: typeof data === "string" ? data : JSON.stringify(data, null, 2),
        ContentType: contentType,
      });

      await this.client.send(command);
    } catch (error: any) {
      throw new S3OperationError("putObject", this.bucketName, error, key);
    }
  }

  async putBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    cacheControl?: string,
    acl?: string,
  ): Promise<void> {
    try {
      const commandParams: any = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl,
      };

      // Only add ACL if provided (some buckets don't support ACLs)
      if (acl) {
        commandParams.ACL = acl;
      }

      const command = new PutObjectCommand(commandParams);

      await this.client.send(command);
    } catch (error: any) {
      throw new S3OperationError("putBuffer", this.bucketName, error, key);
    }
  }

  async checkObjectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async listRepositories(): Promise<RepositoryBasicInfo[]> {
    const repositories: RepositoryBasicInfo[] = [];
    let continuationToken: string | undefined;

    console.log("📂 Scanning S3 for repositories...");

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: "filetrees/",
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          const match = item.Key?.match(
            /filetrees\/([^\/]+)\/([^\/]+)\/default\.json$/,
          );
          if (match && item.Key) {
            const [, owner, name] = match;
            repositories.push({
              owner,
              name,
              key: item.Key,
              lastModified: item.LastModified!,
              size: item.Size!,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`   Found ${repositories.length} repositories`);
    return repositories;
  }

  async downloadArtifact(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  getObjectUrl(key: string): string {
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }
}

class RepoS3Client extends S3ClientBase {
  constructor() {
    super("code-cosmos-city-maps");
  }

  async getGithubMetadata(repo: CodeRepository): Promise<any> {
    const key = `filetrees/${repo.owner}/${repo.repo}/github-metadata.json`;
    const exists = await this.checkObjectExists(key);
    if (!exists) {
      throw new GithubMetadataNotFoundError(repo.owner, repo.repo, key);
    }
    return this.getObject(key);
  }

  async getFileTree(repo: CodeRepository): Promise<any> {
    const key = `filetrees/${repo.owner}/${repo.repo}/default.json`;
    const exists = await this.checkObjectExists(key);
    if (!exists) {
      throw new FileTreeNotFoundError(repo.owner, repo.repo, key);
    }
    return this.getObject(key);
  }

  async putFileTree(repo: CodeRepository, fileTree: any): Promise<void> {
    const key = `filetrees/${repo.owner}/${repo.repo}/default.json`;
    await this.putObject(key, fileTree);
  }
}

export const repoClient = new RepoS3Client();
