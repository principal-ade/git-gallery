import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getGalleryStore } from "@/services/s3/gallery-store";
import { MissingGalleryBucketError } from "@/types/gallery";

const createGallerySchema = z.object({
  name: z.string().min(1, "Gallery name is required"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional(),
  allowPublicSubmissions: z.boolean().default(false),
});

export async function GET() {
  try {
    const store = getGalleryStore();
    const galleries = await store.listGalleries();
    return NextResponse.json({ galleries });
  } catch (error) {
    if (error instanceof MissingGalleryBucketError) {
      return NextResponse.json(
        { error: error.message, galleries: [] },
        { status: 200 },
      );
    }

    console.error("Error fetching galleries", error);
    return NextResponse.json(
      { error: "Failed to load galleries" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const parsed = createGallerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 },
    );
  }

  try {
    const store = getGalleryStore();
    const gallery = await store.createGallery({
      ...parsed.data,
      allowPublicSubmissions:
        parsed.data.allowPublicSubmissions ?? false,
      createdBy: session.user?.name || session.user?.login || "Unknown",
      createdById: session.user?.id || "",
      createdByLogin: session.user?.login || "",
    });

    return NextResponse.json({ gallery }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingGalleryBucketError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    console.error("Error creating gallery", error);
    return NextResponse.json(
      { error: "Failed to create gallery" },
      { status: 500 },
    );
  }
}
