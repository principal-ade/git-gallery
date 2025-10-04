import { NextRequest, NextResponse } from "next/server";
import { feedbackStore } from "@/lib/s3-feedback-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get("trackingId");
    const trackingIds = searchParams.get("trackingIds");

    // Single tracking ID lookup
    if (trackingId) {
      const status = await feedbackStore.getStatusByTrackingId(trackingId);

      if (!status) {
        return NextResponse.json(
          {
            success: false,
            error: "Tracking ID not found",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        status,
      });
    }

    // Multiple tracking IDs lookup
    if (trackingIds) {
      const idsArray = trackingIds.split(",").filter((id) => id.trim());

      if (idsArray.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No tracking IDs provided",
          },
          { status: 400 },
        );
      }

      if (idsArray.length > 50) {
        return NextResponse.json(
          {
            success: false,
            error: "Maximum 50 tracking IDs per request",
          },
          { status: 400 },
        );
      }

      const statuses = await feedbackStore.getAllFeedback(idsArray);

      return NextResponse.json({
        success: true,
        statuses,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "trackingId or trackingIds parameter required",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error fetching feedback status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch feedback status",
      },
      { status: 500 },
    );
  }
}

// Enable CORS for Electron apps
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
