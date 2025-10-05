import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import GalleryManager from "@/components/gallery/GalleryManager";
import GallerySignInPrompt from "@/components/gallery/GallerySignInPrompt";
import { getGalleryStore } from "@/services/s3/gallery-store";
import {
  MissingGalleryBucketError,
  type GalleryRecord,
} from "@/types/gallery";

export const dynamic = "force-dynamic";

export default async function ManageGalleriesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-6">
        <GallerySignInPrompt />
      </main>
    );
  }

  let initialGalleries: GalleryRecord[] = [];
  let initialError: string | null = null;

  try {
    const store = getGalleryStore();
    initialGalleries = await store.listGalleries();
  } catch (error) {
    if (error instanceof MissingGalleryBucketError) {
      initialError = error.message;
    } else {
      console.error("Failed to load galleries", error);
      initialError = "We couldn't load galleries. Please try again.";
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white p-6 pb-20">
      <GalleryManager
        initialGalleries={initialGalleries}
        initialError={initialError}
        currentUserLogin={session.user?.login || session.user?.email || "you"}
      />
    </main>
  );
}
