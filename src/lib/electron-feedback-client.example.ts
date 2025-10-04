/**
 * Example Electron app integration for feedback system
 * This would be implemented in your Electron app, not in the landing page
 */

interface FeedbackClient {
  submitFeedback(data: FeedbackData): Promise<FeedbackResponse>;
  checkStatus(trackingId: string): Promise<StatusResponse>;
  checkMultipleStatuses(trackingIds: string[]): Promise<MultipleStatusResponse>;
  getStoredFeedback(): StoredFeedback[];
  checkForUpdates(): Promise<FeedbackUpdate[]>;
}

interface FeedbackData {
  email?: string;
  type: "feedback" | "waitlist" | "both";
  feedback?: string;
  category?: "bug" | "feature" | "improvement" | "other";
  appVersion: string;
  platform: string;
  metadata?: Record<string, any>;
}

interface FeedbackResponse {
  success: boolean;
  trackingId?: string;
  message?: string;
  waitlistPosition?: number;
  error?: string;
}

interface StatusResponse {
  success: boolean;
  status?: {
    trackingId: string;
    status: "received" | "reviewing" | "planned" | "implemented" | "declined";
    updateNotes?: string;
    relatedReleaseVersion?: string;
    lastUpdated: string;
  };
  error?: string;
}

interface StoredFeedback {
  trackingId: string;
  submittedAt: string;
  type: string;
  summary: string;
  lastChecked?: string;
  lastStatus?: string;
}

interface FeedbackUpdate {
  trackingId: string;
  previousStatus: string;
  newStatus: string;
  updateNotes?: string;
  relatedReleaseVersion?: string;
}

/**
 * Example implementation for Electron app
 */
class ElectronFeedbackClient implements FeedbackClient {
  private apiBaseUrl = "https://your-landing-page.com/api";
  private store: any; // Electron store instance

  constructor(store: any) {
    this.store = store;
  }

  async submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/feedback/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.trackingId) {
        // Store the feedback locally
        this.storeFeedback({
          trackingId: result.trackingId,
          submittedAt: new Date().toISOString(),
          type: data.type,
          summary: data.feedback?.substring(0, 100) || "Waitlist signup",
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  async checkStatus(trackingId: string): Promise<StatusResponse> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/feedback/status?trackingId=${trackingId}`,
      );

      const result = await response.json();

      if (result.success && result.status) {
        // Update local storage with latest status
        this.updateStoredFeedbackStatus(trackingId, result.status);
      }

      return result;
    } catch (error) {
      console.error("Failed to check status:", error);
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  async checkMultipleStatuses(
    trackingIds: string[],
  ): Promise<MultipleStatusResponse> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/feedback/status?trackingIds=${trackingIds.join(",")}`,
      );

      return await response.json();
    } catch (error) {
      console.error("Failed to check statuses:", error);
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  getStoredFeedback(): StoredFeedback[] {
    return this.store.get("feedback", []);
  }

  async checkForUpdates(): Promise<FeedbackUpdate[]> {
    const storedFeedback = this.getStoredFeedback();
    const trackingIds = storedFeedback.map((f) => f.trackingId);

    if (trackingIds.length === 0) return [];

    const response = await this.checkMultipleStatuses(trackingIds);
    if (!response.success) return [];

    const updates: FeedbackUpdate[] = [];

    for (const feedback of storedFeedback) {
      const newStatus = response.statuses?.[feedback.trackingId];
      if (newStatus && newStatus.status !== feedback.lastStatus) {
        updates.push({
          trackingId: feedback.trackingId,
          previousStatus: feedback.lastStatus || "received",
          newStatus: newStatus.status,
          updateNotes: newStatus.updateNotes,
          relatedReleaseVersion: newStatus.relatedReleaseVersion,
        });
      }
    }

    // Update local storage with new statuses
    if (updates.length > 0) {
      for (const update of updates) {
        this.updateStoredFeedbackStatus(update.trackingId, {
          status: update.newStatus,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    return updates;
  }

  private storeFeedback(feedback: StoredFeedback): void {
    const existing = this.store.get("feedback", []);
    existing.push(feedback);
    this.store.set("feedback", existing);
  }

  private updateStoredFeedbackStatus(trackingId: string, status: any): void {
    const feedback = this.store.get("feedback", []);
    const index = feedback.findIndex(
      (f: StoredFeedback) => f.trackingId === trackingId,
    );

    if (index !== -1) {
      feedback[index].lastChecked = new Date().toISOString();
      feedback[index].lastStatus = status.status;
      this.store.set("feedback", feedback);
    }
  }
}

/**
 * Example usage in Electron app
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _exampleUsage() {
  // Initialize client with electron-store
  const Store = require("electron-store");
  const store = new Store();
  const feedbackClient = new ElectronFeedbackClient(store);

  // Submit feedback
  const result = await feedbackClient.submitFeedback({
    email: "user@example.com",
    type: "both",
    feedback: "Please add vim keybindings support",
    category: "feature",
    appVersion: "1.0.0",
    platform: "darwin",
  });

  if (result.success) {
    console.log(`Feedback submitted! Tracking ID: ${result.trackingId}`);
    if (result.waitlistPosition) {
      console.log(`You are #${result.waitlistPosition} on the waitlist`);
    }
  }

  // Periodically check for updates (e.g., on app startup or every hour)
  setInterval(async () => {
    const updates = await feedbackClient.checkForUpdates();

    for (const update of updates) {
      // Show notification to user
      new Notification("Feedback Update", {
        body: `Your feedback "${update.trackingId}" is now ${update.newStatus}!`,
      });

      // If implemented in a release, show release notes
      if (update.relatedReleaseVersion) {
        console.log(
          `See release ${update.relatedReleaseVersion} for your feature!`,
        );
      }
    }
  }, 3600000); // Check every hour
}

interface MultipleStatusResponse {
  success: boolean;
  statuses?: Record<string, StatusResponse["status"]>;
  error?: string;
}
