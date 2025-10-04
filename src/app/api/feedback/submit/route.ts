import { NextRequest, NextResponse } from "next/server";
import { feedbackStore, FeedbackSubmission } from "@/lib/s3-feedback-store";
import { z } from "zod";

const feedbackSchema = z.object({
  email: z.string().email().optional(),
  type: z.enum(["feedback", "waitlist", "both"]),
  feedback: z.string().optional(),
  category: z.enum(["bug", "feature", "improvement", "other"]).optional(),
  appVersion: z.string(),
  platform: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (implement with Redis or similar in production)
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip");

    // Parse and validate request body
    const body = await request.json();
    const validation = feedbackSchema.safeParse(body);

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

    const submission = validation.data as FeedbackSubmission;

    // Validate that feedback is provided if type includes feedback
    if (
      (submission.type === "feedback" || submission.type === "both") &&
      !submission.feedback
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback content is required when submitting feedback",
        },
        { status: 400 },
      );
    }

    // Validate that email is provided for waitlist
    if (
      (submission.type === "waitlist" || submission.type === "both") &&
      !submission.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required for waitlist signup",
        },
        { status: 400 },
      );
    }

    // Submit feedback and get tracking ID
    const { trackingId, waitlistPosition } =
      await feedbackStore.submitFeedback(submission);

    // Log submission for analytics
    console.log(`Feedback submitted: ${trackingId} from ${ip}`);

    return NextResponse.json({
      success: true,
      trackingId,
      message: "Feedback submitted successfully",
      waitlistPosition,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit feedback",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
