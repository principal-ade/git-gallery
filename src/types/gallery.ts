export interface GalleryRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdById: string;
  createdByLogin: string;
  allowPublicSubmissions: boolean;
}

export interface GalleryCreateInput {
  name: string;
  description?: string;
  allowPublicSubmissions: boolean;
  createdBy: string;
  createdById: string;
  createdByLogin: string;
}

export interface GalleryUpdateInput {
  name?: string;
  description?: string;
  allowPublicSubmissions?: boolean;
}

export class GalleryNotFoundError extends Error {
  constructor(public readonly galleryId: string) {
    super(`Gallery with id ${galleryId} was not found`);
    this.name = "GalleryNotFoundError";
  }
}

export class MissingGalleryBucketError extends Error {
  constructor() {
    super("S3_GALLERIES_BUCKET environment variable is not configured");
    this.name = "MissingGalleryBucketError";
  }
}
