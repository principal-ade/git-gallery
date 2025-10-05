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
    return galleries;
  }

  async getGallery(id: string): Promise<GalleryRecord> {
    const gallery = await this.getObject<GalleryRecord>(
      this.getGalleryKey(id),
    );

    if (!gallery) {
      throw new GalleryNotFoundError(id);
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
  if (!process.env.S3_GALLERIES_BUCKET) {
    throw new MissingGalleryBucketError();
  }

  if (!cachedStore) {
    cachedStore = new GalleryS3Store(process.env.S3_GALLERIES_BUCKET);
  }

  return cachedStore;
}
