import { Gallery, GalleryRepo } from "../types/gallery";

const STORAGE_KEY = "git-gallery-galleries";

export class GalleryStorage {
  // Get all galleries
  static getAll(): Gallery[] {
    if (typeof window === "undefined") return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to load galleries:", error);
      return [];
    }
  }

  // Get a single gallery by ID
  static getById(id: string): Gallery | null {
    const galleries = this.getAll();
    return galleries.find((g) => g.id === id) || null;
  }

  // Create a new gallery
  static create(
    name: string,
    description?: string,
    repos: GalleryRepo[] = [],
  ): Gallery {
    const gallery: Gallery = {
      id: this.generateId(),
      name,
      description,
      repos,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const galleries = this.getAll();
    galleries.push(gallery);
    this.saveAll(galleries);

    return gallery;
  }

  // Update an existing gallery
  static update(id: string, updates: Partial<Gallery>): Gallery | null {
    const galleries = this.getAll();
    const index = galleries.findIndex((g) => g.id === id);

    if (index === -1) return null;

    galleries[index] = {
      ...galleries[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    this.saveAll(galleries);
    return galleries[index];
  }

  // Delete a gallery
  static delete(id: string): boolean {
    const galleries = this.getAll();
    const filtered = galleries.filter((g) => g.id !== id);

    if (filtered.length === galleries.length) return false;

    this.saveAll(filtered);
    return true;
  }

  // Add a repo to a gallery
  static addRepo(
    galleryId: string,
    owner: string,
    repo: string,
  ): Gallery | null {
    const gallery = this.getById(galleryId);
    if (!gallery) return null;

    // Check if repo already exists
    const exists = gallery.repos.some(
      (r) => r.owner === owner && r.repo === repo,
    );
    if (exists) return gallery;

    gallery.repos.push({ owner, repo });
    return this.update(galleryId, { repos: gallery.repos });
  }

  // Remove a repo from a gallery
  static removeRepo(
    galleryId: string,
    owner: string,
    repo: string,
  ): Gallery | null {
    const gallery = this.getById(galleryId);
    if (!gallery) return null;

    gallery.repos = gallery.repos.filter(
      (r) => !(r.owner === owner && r.repo === repo),
    );
    return this.update(galleryId, { repos: gallery.repos });
  }

  // Save all galleries
  private static saveAll(galleries: Gallery[]): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(galleries));
    } catch (error) {
      console.error("Failed to save galleries:", error);
    }
  }

  // Generate a unique ID
  private static generateId(): string {
    return `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
