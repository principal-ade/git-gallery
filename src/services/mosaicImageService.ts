import { S3ClientBase } from "./s3/s3-client";
import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";

interface GalleryItem {
  owner: string;
  repo: string;
  repoPath: string;
  imageUrl: string;
  createdAt: string;
  stats?: any;
}

class MosaicImageS3Client extends S3ClientBase {
  constructor() {
    super(process.env.S3_GIT_MOSAICS!);
  }

  async saveImage(
    owner: string,
    repo: string,
    imageBuffer: Buffer,
  ): Promise<string> {
    const key = `mosaics/${owner}/${repo}.png`;

    try {
      // Try with ACL first
      await this.putBuffer(
        key,
        imageBuffer,
        "image/png",
        "public, max-age=31536000", // 1 year cache
        "public-read", // Make the image publicly accessible
      );
    } catch (error: any) {
      if (error?.originalError?.Code === "AccessControlListNotSupported") {
        console.warn(
          "⚠️ S3 bucket does not support ACLs. Uploading without ACL.",
        );
        console.warn("💡 To enable public access, either:");
        console.warn(
          "   1. Enable ACLs in S3 bucket settings (Object Ownership → ACLs enabled)",
        );
        console.warn(
          "   2. Add a bucket policy for public read access to mosaics/*",
        );

        // Retry without ACL
        await this.putBuffer(
          key,
          imageBuffer,
          "image/png",
          "public, max-age=31536000", // 1 year cache
        );
      } else {
        throw error;
      }
    }

    return key;
  }

  async saveMapImage(
    owner: string,
    repo: string,
    imageBuffer: Buffer,
  ): Promise<string> {
    const key = `maps/${owner}/${repo}.png`;

    try {
      // Try with ACL first
      await this.putBuffer(
        key,
        imageBuffer,
        "image/png",
        "public, max-age=31536000", // 1 year cache
        "public-read", // Make the image publicly accessible
      );
    } catch (error: any) {
      if (error?.originalError?.Code === "AccessControlListNotSupported") {
        console.warn(
          "⚠️ S3 bucket does not support ACLs. Uploading without ACL.",
        );

        // Retry without ACL
        await this.putBuffer(
          key,
          imageBuffer,
          "image/png",
          "public, max-age=31536000", // 1 year cache
        );
      } else {
        throw error;
      }
    }

    return key;
  }

  async putObject(key: string, data: any): Promise<void> {
    return super.putObject(key, data);
  }

  async getObject<T>(key: string): Promise<T | null> {
    return super.getObject<T>(key);
  }

  getImageUrl(key: string): string {
    return this.getObjectUrl(key);
  }

  async imageExists(owner: string, repo: string): Promise<boolean> {
    const key = `mosaics/${owner}/${repo}.png`;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await (this as any).client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async mapImageExists(owner: string, repo: string): Promise<boolean> {
    const key = `maps/${owner}/${repo}.png`;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await (this as any).client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async getExistingImageUrl(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    const exists = await this.imageExists(owner, repo);
    if (exists) {
      const key = `mosaics/${owner}/${repo}.png`;
      return this.getImageUrl(key);
    }
    return null;
  }

  async getExistingMapImageUrl(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    const exists = await this.mapImageExists(owner, repo);
    if (exists) {
      const key = `maps/${owner}/${repo}.png`;
      return this.getImageUrl(key);
    }
    return null;
  }

  async listGalleryItems(): Promise<GalleryItem[]> {
    const items: GalleryItem[] = [];
    let continuationToken: string | undefined;

    try {
      // List all metadata objects
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: "shared-metadata/",
          ContinuationToken: continuationToken,
          MaxKeys: 100,
        });

        const response = await (this as any).client.send(command);

        if (response.Contents) {
          // Fetch metadata for each item
          for (const object of response.Contents) {
            if (object.Key && object.Key.endsWith(".json")) {
              try {
                const metadata = await this.getObject<GalleryItem>(object.Key);
                if (metadata) {
                  items.push(metadata);
                }
              } catch (err) {
                console.warn(
                  `Failed to fetch metadata for ${object.Key}:`,
                  err,
                );
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Sort by creation date (newest first)
      items.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error("Failed to list gallery items:", error);
    }

    return items;
  }
}

export const mosaicImageClient = new MosaicImageS3Client();
