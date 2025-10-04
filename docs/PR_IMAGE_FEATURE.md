# PR Image Generation Feature Documentation

## Overview

This feature automatically generates and posts visualization images to Pull Requests, showing a visual representation of the files changed in the PR using the code-city visualization.

## Architecture

### Components

1. **GitHub Action** (`.github/workflows/pr-visualization.yml`)
   - Triggers on PR open/sync events
   - Posts a comment with image URL to the PR
   - Updates existing comments instead of creating duplicates

2. **API Endpoint** (`/api/pr-image/[owner]/[repo]/[prNumber]`)
   - Generates PR visualization images on-demand
   - Uses Puppeteer to screenshot the PR postcard component
   - Implements S3-based allowlist for security
   - Caches generated images in memory (1 hour)

3. **S3 Allowlist Store** (`src/lib/s3-pr-image-store.ts`)
   - Manages which repositories can generate PR images
   - Stores allowlist in S3 (same bucket as orbit data)
   - Returns 404 for unauthorized repos (security through obscurity)

4. **Admin CLI** (`scripts/manage-pr-images.js`)
   - Add/remove repos from allowlist
   - List all allowed repos
   - Check if a repo is authorized

## Deployment Requirements

### Required Environment Variables

```env
# AWS Configuration (REQUIRED)
# These are needed for S3 allowlist storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# S3 Bucket for storing allowlist (REQUIRED)
# Uses same bucket as orbit waitlist for simplicity
ORBIT_S3_BUCKET=your-s3-bucket-name

# Admin Secret (REQUIRED for CLI management)
# Used to authenticate admin operations
ORBIT_ADMIN_SECRET=your-admin-secret-here

# GitHub API (REQUIRED)
# Needed for fetching repository data
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Base URL (Optional - auto-detected on Vercel)
# Override if needed for custom domains
CODE_CITY_LANDING_URL=https://your-domain.com

# Node Environment
NODE_ENV=production
```

### Vercel Deployment

1. **Add environment variables in Vercel dashboard**:

   ```
   Project Settings → Environment Variables
   ```

2. **Required variables for production**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `ORBIT_S3_BUCKET`
   - `ORBIT_ADMIN_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

3. **Function configuration** (vercel.json):
   ```json
   {
     "functions": {
       "app/api/pr-image/[owner]/[repo]/[prNumber]/route.ts": {
         "maxDuration": 30
       }
     }
   }
   ```

### Docker Deployment

```dockerfile
# Set environment variables in docker-compose.yml or docker run
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_REGION=${AWS_REGION}
  - ORBIT_S3_BUCKET=${ORBIT_S3_BUCKET}
  - ORBIT_ADMIN_SECRET=${ORBIT_ADMIN_SECRET}
  - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
  - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
  - NODE_ENV=production
```

## Setup Guide

### 1. Deploy the Application

Deploy code-city-landing with all required environment variables.

### 2. Initialize S3 Allowlist

```bash
# Set admin secret locally
export ORBIT_ADMIN_SECRET=your-admin-secret

# Verify connection to S3
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1

# Add your first repo
node scripts/manage-pr-images.js add your-org/your-repo "Initial repo"

# Verify it was added
node scripts/manage-pr-images.js list
```

### 3. Add GitHub Action to Repository

Add `.github/workflows/pr-visualization.yml` to any repository you want PR images for:

```yaml
name: PR Visualization

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  post-visualization:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for PR data to be available
        run: sleep 5

      - name: Post PR Visualization Comment
        uses: actions/github-script@v6
        with:
          script: |
            # ... (full script in workflow file)
```

**Optional**: Set `CODE_CITY_LANDING_URL` in repository secrets if not using default domain.

### 4. Test the Setup

1. Open a test PR in an allowed repository
2. Wait for GitHub Action to run
3. Check for visualization comment
4. Verify image loads correctly

## Management Operations

### Managing Allowed Repositories

```bash
# List all allowed repos
node scripts/manage-pr-images.js list

# Add a new repo
node scripts/manage-pr-images.js add facebook/react "React main repo"

# Check if a repo is allowed
node scripts/manage-pr-images.js check vercel/next.js

# Remove a repo
node scripts/manage-pr-images.js remove old/deprecated-repo
```

### Direct API Management (Advanced)

```bash
# Using curl with admin secret
curl -X POST https://your-domain.com/api/admin/pr-image \
  -H "x-admin-secret: your-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"owner":"facebook","repo":"react","note":"Added via API"}'

# Get all allowed repos
curl https://your-domain.com/api/admin/pr-image \
  -H "x-admin-secret: your-admin-secret"
```

## Security Model

### How It Works

1. **No secrets in URLs** - URLs are completely public
2. **S3 Allowlist Check** - Server validates repo against S3 allowlist
3. **404 for Unauthorized** - Returns "Not Found" if repo not allowed
4. **Admin-Only Management** - Only admin secret holders can modify allowlist

### Security Benefits

- **No token leakage** - No secrets ever appear in URLs or logs
- **Centralized control** - Single allowlist in S3
- **Easy revocation** - Remove repo from allowlist to disable
- **Hidden endpoint** - 404 response doesn't reveal endpoint exists

### Rate Limiting (Future Enhancement)

Currently no rate limiting. For production at scale, consider:

- Cloudflare rate limiting
- Upstash Redis for distributed rate limits
- AWS API Gateway with throttling

## Troubleshooting

### PR Image Not Appearing

1. **Check if repo is allowed**:

   ```bash
   node scripts/manage-pr-images.js check owner/repo
   ```

2. **Check GitHub Action logs**:
   - Go to repo → Actions tab
   - Find the PR workflow run
   - Check for errors

3. **Test endpoint directly**:
   ```bash
   curl -I https://your-domain.com/api/pr-image/owner/repo/123
   # Should return 200 if allowed, 404 if not
   ```

### S3 Connection Issues

1. **Verify AWS credentials**:

   ```bash
   aws s3 ls s3://your-bucket-name/pr-image/
   ```

2. **Check IAM permissions** - Need:
   - `s3:GetObject`
   - `s3:PutObject`
   - `s3:HeadObject`

### Image Generation Failures

1. **Check server logs** for Puppeteer errors
2. **Verify Chrome/Chromium** is available (included in @sparticuz/chromium for serverless)
3. **Check memory limits** - Puppeteer needs ~512MB minimum

## Performance Considerations

### Caching

- Images cached in memory for 1 hour
- GitHub also caches images on their CDN
- Consider Redis for distributed cache in production

### Generation Time

- First generation: 10-30 seconds (cold start + rendering)
- Cached responses: <100ms
- Vercel function timeout: 30 seconds max

### Optimization Tips

1. **Pre-warm cache** - Generate images on PR open
2. **Use CDN** - CloudFront or Cloudflare in front of API
3. **Optimize viewport** - Smaller images generate faster

## Monitoring

### What to Track

```javascript
// Recommended logging
console.log(
  `PR image request: ${owner}/${repo}#${prNumber} - ${allowed ? "ALLOWED" : "DENIED"}`,
);
console.log(`Generation time: ${endTime - startTime}ms`);
console.log(`Cache ${cacheHit ? "HIT" : "MISS"}`);
```

### Metrics to Monitor

- Request volume per repository
- Cache hit rate
- Generation time (p50, p95, p99)
- Error rate
- S3 API latency

## Cost Analysis

### AWS S3 Costs

- **Storage**: ~$0.023/GB/month (allowlist is tiny, <1KB)
- **Requests**: $0.0004 per 1000 GET requests
- **Estimated**: <$1/month for typical usage

### Vercel Costs

- **Function Invocations**: Free tier includes 100K/month
- **Function Duration**: Free tier includes 100GB-hours
- **Bandwidth**: 100GB free
- **Estimated**: Free for most projects

### GitHub Actions

- **Public repos**: Unlimited free
- **Private repos**: 2000 minutes/month free
- **Estimated**: Minimal usage per PR

## Future Enhancements

### Planned Features

1. **Redis caching** - Replace in-memory cache
2. **Image optimization** - WebP format, compression
3. **Batch generation** - Pre-generate for all open PRs
4. **Webhook support** - Direct GitHub webhook instead of Action
5. **Custom templates** - Different visualization styles

### Potential Improvements

- **CDN integration** - Automatic CloudFront/Cloudflare setup
- **Analytics dashboard** - Track usage and performance
- **Self-service portal** - Let repo owners add themselves
- **Signed URLs** - Time-limited access for private repos
- **Multiple visualization types** - Treemap, flame graph, etc.

## Related Documentation

- [PR_IMAGE_SETUP.md](../PR_IMAGE_SETUP.md) - Quick setup guide
- [SECRET_MANAGEMENT.md](./SECRET_MANAGEMENT.md) - Security details
- [Puppeteer Docs](https://pptr.dev/) - Screenshot generation
- [GitHub Actions Docs](https://docs.github.com/en/actions) - Workflow reference
