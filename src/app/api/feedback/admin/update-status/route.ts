import { NextRequest, NextResponse } from "next/server";
import { feedbackStore } from "@/lib/s3-feedback-store";
import { z } from "zod";

// This endpoint should be protected with authentication in production
// Example: Use NextAuth, API keys, or other auth mechanisms

const updateSchema = z.object({
  trackingId: z.string(),
  status: z.enum([
    "received",
    "reviewing",
    "planned",
    "implemented",
    "declined",
  ]),
  updateNotes: z.string().optional(),
  relatedReleaseVersion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here
    // Example:
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // For now, check for admin API key in headers
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { trackingId, status, updateNotes, relatedReleaseVersion } =
      validation.data;

    // Update the feedback status
    await feedbackStore.updateStatus(
      trackingId,
      status,
      updateNotes,
      relatedReleaseVersion,
    );

    return NextResponse.json({
      success: true,
      message: "Feedback status updated successfully",
    });
  } catch (error) {
    console.error("Error updating feedback status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update feedback status",
      },
      { status: 500 },
    );
  }
}

// Example usage from an admin dashboard:
/*
fetch('/api/feedback/admin/update-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-api-key': 'your-secret-admin-key'
  },
  body: JSON.stringify({
    trackingId: 'FB-ABC12345',
    status: 'implemented',
    updateNotes: 'Vim keybindings have been added in v2.0.0',
    relatedReleaseVersion: '2.0.0'
  })
});
*/
