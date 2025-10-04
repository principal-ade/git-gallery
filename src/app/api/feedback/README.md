# Feedback & Waitlist System

This system allows Electron apps to submit feedback and join waitlists without requiring authentication.

## Architecture

### Key Features

- **No authentication required** - Users submit feedback anonymously
- **Tracking IDs** - Server generates unique IDs for each submission
- **S3 storage** - All data stored in S3 for scalability
- **Status updates** - Users can check if their feedback was implemented
- **Waitlist positions** - Users get their position when joining

### API Endpoints

#### 1. Submit Feedback

`POST /api/feedback/submit`

Request:

```json
{
  "email": "user@example.com", // Optional for feedback, required for waitlist
  "type": "feedback", // "feedback" | "waitlist" | "both"
  "feedback": "Please add X feature",
  "category": "feature", // "bug" | "feature" | "improvement" | "other"
  "appVersion": "1.0.0",
  "platform": "darwin"
}
```

Response:

```json
{
  "success": true,
  "trackingId": "FB-ABC12345",
  "message": "Feedback submitted successfully",
  "waitlistPosition": 42 // Only if waitlist signup
}
```

#### 2. Check Status

`GET /api/feedback/status?trackingId=FB-ABC12345`

Response:

```json
{
  "success": true,
  "status": {
    "trackingId": "FB-ABC12345",
    "status": "implemented",
    "updateNotes": "Added in version 2.0.0",
    "relatedReleaseVersion": "2.0.0",
    "lastUpdated": "2024-01-15T10:00:00Z"
  }
}
```

#### 3. Check Multiple Statuses

`GET /api/feedback/status?trackingIds=FB-ABC12345,FB-DEF67890`

### S3 Structure

```
codecity-feedback/
├── feedback/
│   ├── 2024/01/[feedback-id].json      # Organized by date
│   └── by-tracking-id/[tracking-id].json
├── waitlist/
│   ├── [email].json
│   └── metadata/count.json
└── updates/
    └── [tracking-id]/status.json
```

### Electron App Integration

The Electron app should:

1. Submit feedback via POST request
2. Store returned tracking ID locally
3. Periodically check for status updates
4. Show notifications when feedback is implemented

See `electron-feedback-client.example.ts` for implementation details.

### Environment Variables

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
FEEDBACK_S3_BUCKET=codecity-feedback
ADMIN_API_KEY=your-admin-key
```

### Security Considerations

- CORS enabled for Electron apps
- Rate limiting should be added in production
- Admin endpoints require API key authentication
- Consider adding CAPTCHA for web submissions
