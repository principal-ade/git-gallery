# PR Visualization Image Generation Setup

This feature automatically posts visualization images to Pull Requests using GitHub Actions.

## How It Works

1. **GitHub Action** triggers on PR events (opened/synchronized)
2. **Action posts a comment** with an image URL pointing to your server
3. **Server checks S3 allowlist** to see if the repo is authorized
4. **If allowed**, server generates and returns the image
5. **If not allowed**, server returns 404 (as if endpoint doesn't exist)
6. **Image is cached** for subsequent requests

## Setup Instructions

### 1. Deploy Code-City-Landing

Deploy the code-city-landing app to a public URL (e.g., Vercel, Netlify, or your own server).

```bash
# For Vercel
vercel deploy

# For local testing
npm run dev
```

### 2. Environment Variables

Add these environment variables to your deployment:

```env
# Optional: Set your base URL (auto-detected on Vercel)
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# For production (Vercel/Netlify)
NODE_ENV=production
```

### 3. Add GitHub Action to Your Repository

Copy `.github/workflows/pr-visualization.yml` to any repository where you want PR visualizations.

Update the `CODE_CITY_LANDING_URL` in the workflow if not using the default:

```yaml
env:
  CODE_CITY_LANDING_URL: https://your-code-city-landing-url.com
```

### 4. Test Locally

```bash
# 1. Start the dev server
npm run dev

# 2. Test image generation (in another terminal)
node scripts/test-pr-image.js facebook react 27000

# 3. Check the generated images in scripts/
```

### 5. Test the API Endpoint

```bash
# Test with curl
curl http://localhost:3000/api/pr-image/facebook/react/27000 -o test.png

# Or visit in browser
open http://localhost:3000/api/pr-image/facebook/react/27000
```

## Production Considerations

### Caching

The current implementation uses in-memory caching. For production, consider:

1. **Redis** for distributed caching
2. **CDN** for image delivery (Cloudflare, Fastly)
3. **S3/R2** for persistent storage

### Puppeteer on Serverless

For Vercel/Netlify deployment:

```javascript
// Already configured in the code to use @sparticuz/chromium
// Max function duration may need adjustment in vercel.json:

{
  "functions": {
    "app/api/pr-image/[owner]/[repo]/[prNumber]/route.ts": {
      "maxDuration": 30
    }
  }
}
```

### Rate Limiting

Consider adding rate limiting to prevent abuse:

```javascript
// Example with upstash/ratelimit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});
```

## Customization

### Modify the Comment Template

Edit `.github/workflows/pr-visualization.yml` to customize the comment:

```javascript
const commentBody = `## 📊 PR Visualization

![PR Changes](${imageUrl})

[View Interactive Version](${interactiveUrl}) | [Download Image](${imageUrl})

---
*Visualization updates automatically when PR changes*`;
```

### Adjust Image Generation

Edit `app/api/pr-image/[owner]/[repo]/[prNumber]/route.ts` to:

- Change viewport size
- Adjust quality settings
- Modify timeout values
- Add watermarks or branding

## Troubleshooting

### Image Not Generating

1. Check server logs for errors
2. Verify the PR page loads correctly
3. Test with the test script
4. Check Puppeteer/Chromium installation

### GitHub Action Not Running

1. Ensure workflow file is in `.github/workflows/`
2. Check Actions tab in GitHub for errors
3. Verify repository has Actions enabled

### Cache Issues

- Images cache for 1 hour by default
- Clear cache by restarting the server
- Check `X-Cache` header in response

## Managing Allowed Repositories

The PR image endpoint uses an S3-based allowlist to control which repositories can generate images.

### Using the CLI

```bash
# Set admin secret for CLI access
export ORBIT_ADMIN_SECRET=your-admin-secret

# List all allowed repos
node scripts/manage-pr-images.js list

# Add a repo to allowlist
node scripts/manage-pr-images.js add facebook/react "Main React repository"

# Check if a repo is allowed
node scripts/manage-pr-images.js check vercel/next.js

# Remove a repo from allowlist
node scripts/manage-pr-images.js remove old/deprecated-repo
```

### Required Environment Variables

```env
# Admin secret for managing allowlist
ORBIT_ADMIN_SECRET=your-admin-secret

# AWS credentials for S3 access
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
ORBIT_S3_BUCKET=your-bucket-name
```

### How the Allowlist Works

1. **Repositories must be explicitly added** to generate PR images
2. **Unlisted repos get 404** - appears as if endpoint doesn't exist
3. **No secrets in URLs** - just simple repo checking
4. **Managed via CLI** - add/remove repos as needed
5. **Stored in S3** - same bucket as orbit waitlist data

## Monitoring

Add logging and monitoring:

```javascript
// Log image generation
console.log(`Generated image for ${owner}/${repo}#${prNumber}`);

// Track metrics
metrics.increment("pr_image.generated");
metrics.timing("pr_image.generation_time", duration);
```
