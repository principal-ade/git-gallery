import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export interface FeedbackSubmission {
  email?: string;
  type: "feedback" | "waitlist" | "both";
  feedback?: string;
  category?: "bug" | "feature" | "improvement" | "other";
  appVersion: string;
  platform: string;
  metadata?: Record<string, any>;
}

export interface FeedbackRecord extends FeedbackSubmission {
  id: string;
  trackingId: string;
  timestamp: string;
  status: "received" | "reviewing" | "planned" | "implemented" | "declined";
  updateNotes?: string;
  relatedReleaseVersion?: string;
  internalNotes?: string;
}

export interface FeedbackStatusUpdate {
  trackingId: string;
  status: FeedbackRecord["status"];
  updateNotes?: string;
  relatedReleaseVersion?: string;
  lastUpdated: string;
}

export class S3FeedbackStore {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.FEEDBACK_S3_BUCKET;
    const region = process.env.AWS_REGION;

    if (!bucket) {
      throw new Error("FEEDBACK_S3_BUCKET environment variable is required");
    }

    if (!region) {
      throw new Error("AWS_REGION environment variable is required");
    }

    this.s3 = new S3Client({
      region: region,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });
    this.bucket = bucket;
  }

  /**
   * Submit new feedback and generate tracking ID
   */
  async submitFeedback(
    submission: FeedbackSubmission,
  ): Promise<{ trackingId: string; waitlistPosition?: number }> {
    const id = uuidv4();
    const trackingId = `FB-${uuidv4().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const record: FeedbackRecord = {
      ...submission,
      id,
      trackingId,
      timestamp,
      status: "received",
    };

    // Store feedback by date for organization
    const date = timestamp.split("T")[0];
    const [year, month] = date.split("-");

    await this.putObject(
      `feedback/${year}/${month}/${id}.json`,
      JSON.stringify(record),
    );

    // Store tracking ID mapping for quick lookups
    await this.putObject(
      `feedback/by-tracking-id/${trackingId}.json`,
      JSON.stringify({ id, timestamp }),
    );

    // Handle waitlist if requested
    let waitlistPosition: number | undefined;
    if (submission.type === "waitlist" || submission.type === "both") {
      if (submission.email) {
        waitlistPosition = await this.addToWaitlist(submission.email);
      }
    }

    // Create initial status record
    await this.putObject(
      `updates/${trackingId}/status.json`,
      JSON.stringify({
        trackingId,
        status: "received",
        lastUpdated: timestamp,
      } as FeedbackStatusUpdate),
    );

    return { trackingId, waitlistPosition };
  }

  /**
   * Get feedback status by tracking ID
   */
  async getFeedbackStatus(
    trackingId: string,
  ): Promise<FeedbackStatusUpdate | null> {
    try {
      const data = await this.getObject(`updates/${trackingId}/status.json`);
      if (!data) return null;
      return JSON.parse(data) as FeedbackStatusUpdate;
    } catch {
      return null;
    }
  }

  /**
   * Get multiple feedback statuses
   */
  async getFeedbackStatuses(
    trackingIds: string[],
  ): Promise<Record<string, FeedbackStatusUpdate>> {
    const statuses: Record<string, FeedbackStatusUpdate> = {};

    await Promise.all(
      trackingIds.map(async (trackingId) => {
        const status = await this.getFeedbackStatus(trackingId);
        if (status) {
          statuses[trackingId] = status;
        }
      }),
    );

    return statuses;
  }

  /**
   * Update feedback status (admin use)
   */
  async updateFeedbackStatus(
    trackingId: string,
    status: FeedbackRecord["status"],
    updateNotes?: string,
    relatedReleaseVersion?: string,
  ): Promise<void> {
    const update: FeedbackStatusUpdate = {
      trackingId,
      status,
      updateNotes,
      relatedReleaseVersion,
      lastUpdated: new Date().toISOString(),
    };

    await this.putObject(
      `updates/${trackingId}/status.json`,
      JSON.stringify(update),
    );
  }

  /**
   * Add email to waitlist
   */
  private async addToWaitlist(email: string): Promise<number> {
    const normalizedEmail = email.toLowerCase();

    // Check if already on waitlist
    const existing = await this.getObject(`waitlist/${normalizedEmail}.json`);
    if (existing) {
      const data = JSON.parse(existing);
      return data.position;
    }

    // Get current count
    let count = 0;
    try {
      const countData = await this.getObject("waitlist/metadata/count.json");
      if (countData) {
        count = JSON.parse(countData).count || 0;
      }
    } catch {
      // First entry
    }

    const position = count + 1;

    // Add to waitlist
    await this.putObject(
      `waitlist/${normalizedEmail}.json`,
      JSON.stringify({
        email,
        position,
        joinedAt: new Date().toISOString(),
      }),
    );

    // Update count
    await this.putObject(
      "waitlist/metadata/count.json",
      JSON.stringify({
        count: position,
        lastUpdated: new Date().toISOString(),
      }),
    );

    return position;
  }

  /**
   * Helper to get S3 object
   */
  private async getObject(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3.send(command);
      const body = await response.Body?.transformToString();
      return body || null;
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Helper to put S3 object
   */
  private async putObject(key: string, body: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
    });

    await this.s3.send(command);
  }
}

// Export lazy-loaded singleton instance
let feedbackStoreInstance: S3FeedbackStore | null = null;

export function getFeedbackStore(): S3FeedbackStore {
  if (!feedbackStoreInstance) {
    feedbackStoreInstance = new S3FeedbackStore();
  }
  return feedbackStoreInstance;
}

// For backward compatibility - will be removed
export const feedbackStore = {
  submitFeedback: (...args: Parameters<S3FeedbackStore["submitFeedback"]>) =>
    getFeedbackStore().submitFeedback(...args),
  getStatusByTrackingId: (
    ...args: Parameters<S3FeedbackStore["getFeedbackStatus"]>
  ) => getFeedbackStore().getFeedbackStatus(...args),
  updateStatus: (
    ...args: Parameters<S3FeedbackStore["updateFeedbackStatus"]>
  ) => getFeedbackStore().updateFeedbackStatus(...args),
  getAllFeedback: (
    ...args: Parameters<S3FeedbackStore["getFeedbackStatuses"]>
  ) => getFeedbackStore().getFeedbackStatuses(...args),
};
