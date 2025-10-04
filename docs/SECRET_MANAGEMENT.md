# Secret Management Guide

## Overview

This guide explains how to manage secrets for the PR image generation feature and other protected endpoints.

## PR Image Generation Security

### How It Works

1. **Without Secret (Public Access)**:
   - Images are publicly accessible
   - No authentication required
   - Suitable for open source projects
   - Logs warnings in production

2. **With Secret (Signed URLs)**:
   - URLs include expiration time and signature
   - Links expire after 24 hours (configurable)
   - Prevents unauthorized image generation
   - Reduces server load from abuse

### Setting Up Secrets

#### 1. Generate a Secret

```bash
# Generate a secure random secret
openssl rand -hex 32
```

#### 2. Set Environment Variables

##### Local Development (.env.local)

```env
PR_IMAGE_SECRET=your-generated-secret-here
```

##### Vercel Deployment

```bash
vercel env add PR_IMAGE_SECRET
# Enter the secret when prompted
# Select Production, Preview, and Development
```

##### GitHub Actions

1. Go to your repository → Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `PR_IMAGE_SECRET`
4. Value: Your generated secret
5. Add secret

#### 3. Deploy with Secrets

##### Vercel

```bash
# Pull environment variables locally
vercel env pull

# Deploy with secrets
vercel --prod
```

##### Docker

```dockerfile
ENV PR_IMAGE_SECRET=${PR_IMAGE_SECRET}
```

```bash
docker run -e PR_IMAGE_SECRET=your-secret your-image
```

## Secret Rotation

### When to Rotate

- Every 90 days (recommended)
- If a secret is compromised
- When team members leave
- After security incidents

### How to Rotate

1. **Generate new secret**:

   ```bash
   openssl rand -hex 32
   ```

2. **Update in parallel** (avoid downtime):
   - First update GitHub Actions secret
   - Then update Vercel/deployment
   - Finally remove old secret

3. **Monitor for issues**:
   - Check GitHub Actions logs
   - Monitor PR comment generation
   - Review server logs for auth failures

## Security Best Practices

### DO ✅

- Use different secrets for different environments
- Store secrets in environment variables only
- Use secret management services (AWS Secrets Manager, Vercel env, etc.)
- Rotate secrets regularly
- Monitor for unauthorized access attempts

### DON'T ❌

- Commit secrets to git
- Put secrets in URLs (except signed URLs with expiration)
- Share secrets in Slack/Discord/Email
- Use the same secret across different services
- Log secrets in console output

## Troubleshooting

### PR Images Not Loading

1. **Check if secret is set**:

   ```bash
   # Local
   echo $PR_IMAGE_SECRET

   # Vercel
   vercel env ls
   ```

2. **Verify GitHub Action has secret**:
   - Go to Settings → Secrets → Actions
   - Confirm PR_IMAGE_SECRET exists

3. **Check URL expiration**:
   - Signed URLs expire after 24 hours
   - PR needs to be refreshed for new image

### Authentication Failures

Check server logs for specific error:

- `"URL has expired"` - Normal for old PRs, refresh needed
- `"Invalid signature"` - Secret mismatch between GitHub Action and server
- `"Invalid signature parameters"` - Malformed URL

### Testing Authentication

```bash
# Test without secret (should work in dev)
curl http://localhost:3002/api/pr-image/facebook/react/27000

# Test with expired URL (should fail)
curl "http://localhost:3002/api/pr-image/facebook/react/27000?expires=1&sig=invalid"

# Generate valid signed URL (see test page)
# http://localhost:3002/test/pr-image
```

## Multiple Environments

### Development

```env
# .env.local
PR_IMAGE_SECRET=dev-secret-only-for-local
NODE_ENV=development
```

### Staging

```env
# Vercel Preview
PR_IMAGE_SECRET=staging-secret-abc123
NODE_ENV=production
```

### Production

```env
# Vercel Production
PR_IMAGE_SECRET=prod-secret-xyz789
NODE_ENV=production
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
env:
  CODE_CITY_LANDING_URL: ${{ vars.CODE_CITY_LANDING_URL }}
  PR_IMAGE_SECRET: ${{ secrets.PR_IMAGE_SECRET }}
```

### Vercel Deploy Button

```json
{
  "env": {
    "PR_IMAGE_SECRET": {
      "description": "Secret for PR image generation (optional)",
      "required": false
    }
  }
}
```

## Monitoring

### What to Log

✅ Safe to log:

- Request counts
- Cache hit/miss rates
- Generation times
- Error types (not details)

❌ Never log:

- The actual secret
- Full signed URLs
- Signature values
- User tokens

### Metrics to Track

```javascript
// Example monitoring
console.log(
  `PR image: ${owner}/${repo}#${prNumber} - ${cacheHit ? "CACHE_HIT" : "GENERATED"}`,
);
console.log(
  `Auth: ${validation.valid ? "SUCCESS" : "FAILED"} - ${validation.error || "OK"}`,
);
```

## Questions?

For issues or questions about secret management:

1. Check this guide
2. Review `.env.example`
3. Check server logs
4. Open an issue on GitHub
