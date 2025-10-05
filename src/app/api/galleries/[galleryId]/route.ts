import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getGalleryStore } from "@/services/s3/gallery-store";
import {
  GalleryNotFoundError,
  MissingGalleryBucketError,
} from "@/types/gallery";

const updateGallerySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(2000).optional(),
  allowPublicSubmissions: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { galleryId: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = updateGallerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 },
    );
  }

  try {
    const store = getGalleryStore();
    const gallery = await store.updateGallery(params.galleryId, parsed.data);
    return NextResponse.json({ gallery });
  } catch (error) {
    if (error instanceof GalleryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof MissingGalleryBucketError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    console.error("Error updating gallery", error);
    return NextResponse.json(
      { error: "Failed to update gallery" },
      { status: 500 },
    );
  }
}
