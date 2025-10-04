export interface GalleryRepo {
  owner: string;
  repo: string;
}

export interface Gallery {
  id: string;
  name: string;
  description?: string;
  repos: GalleryRepo[];
  createdAt: string;
  updatedAt: string;
}

export interface GalleriesState {
  galleries: Gallery[];
}
