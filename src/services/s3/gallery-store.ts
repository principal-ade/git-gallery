import { v4 as uuidv4 } from "uuid";

import { S3ClientBase } from "./s3-client";
import {
  GalleryCreateInput,
  GalleryNotFoundError,
  GalleryRecord,
  GalleryUpdateInput,
  MissingGalleryBucketError,
} from "@/types/gallery";

const GALLERY_INDEX_KEY = "galleries/index.json";

class GalleryS3Store extends S3ClientBase {
  constructor(bucketName: string) {
    super(bucketName);
  }

  private getGalleryKey(id: string) {
    return `galleries/${id}.json`;
  }

  async listGalleries(): Promise<GalleryRecord[]> {
    const galleries = await this.getObject<GalleryRecord[]>(GALLERY_INDEX_KEY);
    if (!galleries) {
      return [];
    }
    // Ensure repos field exists for all galleries (migration for old galleries)
    return galleries.map((gallery) => ({
      ...gallery,
      repos: gallery.repos || [],
    }));
  }

  async getGallery(id: string): Promise<GalleryRecord> {
    const gallery = await this.getObject<GalleryRecord>(this.getGalleryKey(id));

    if (!gallery) {
      throw new GalleryNotFoundError(id);
    }

    // Ensure repos field exists (migration for old galleries)
    if (!gallery.repos) {
      gallery.repos = [];
    }

    return gallery;
  }

  async createGallery(input: GalleryCreateInput): Promise<GalleryRecord> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const gallery: GalleryRecord = {
      id,
      name: input.name,
      description: input.description,
      repos: [],
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      createdById: input.createdById,
      createdByLogin: input.createdByLogin,
      allowPublicSubmissions: input.allowPublicSubmissions,
    };

    await this.putObject(this.getGalleryKey(id), gallery);

    const galleries = await this.listGalleries();
    galleries.push(gallery);
    await this.putObject(GALLERY_INDEX_KEY, galleries);

    return gallery;
  }

  async updateGallery(
    id: string,
    updates: GalleryUpdateInput,
  ): Promise<GalleryRecord> {
    const gallery = await this.getGallery(id);
    const updatedGallery: GalleryRecord = {
      ...gallery,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.putObject(this.getGalleryKey(id), updatedGallery);

    const galleries = await this.listGalleries();
    const updatedGalleries = galleries.map((existing) =>
      existing.id === id ? updatedGallery : existing,
    );
    await this.putObject(GALLERY_INDEX_KEY, updatedGalleries);

    return updatedGallery;
  }
}

let cachedStore: GalleryS3Store | null = null;

export function getGalleryStore(): GalleryS3Store {
  const bucketName =
    process.env.S3_GALLERIES_BUCKET || process.env.S3_GIT_MOSAICS;

  if (!bucketName) {
    throw new MissingGalleryBucketError();
  }

  if (!cachedStore) {
    cachedStore = new GalleryS3Store(bucketName);
  }

  return cachedStore;
}
