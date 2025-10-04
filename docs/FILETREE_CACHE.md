# Filetree Cache System

## Overview

The filetree cache system reduces GitHub API calls and improves performance by caching repository file trees in both S3 and local memory. This is particularly important for avoiding GitHub rate limits and providing faster responses to users.

## Features

### 🚀 Dual-Layer Caching

- **S3 Cache**: Persistent storage in AWS S3 bucket
- **Local Cache**: In-memory cache for ultra-fast responses (5-minute TTL by default)

### 🔑 Hash-Based Storage

- File trees are stored using SHA-256 hashes of `{owner}/{repo}@{ref}`
- Efficient key structure: `filetrees/{prefix}/{hash}.json`
- Prefix-based partitioning for better S3 performance

### 📊 Cache Management

- Cache statistics endpoint
- Individual cache invalidation
- Bulk local cache clearing
- ETag support for GitHub API optimization

## Configuration

### Environment Variables

```env
# S3 bucket for filetree caching
FILETREE_CACHE_BUCKET=code-cosmos-filetree-cache

# AWS credentials (required)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_id
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Service Configuration

The cache service can be configured with custom options:

```typescript
import { FileTreeCacheService } from "@/services/s3/filetree-cache";

const cacheService = new FileTreeCacheService({
  bucketName: "my-custom-bucket", // Default: FILETREE_CACHE_BUCKET env var
  enableLocalCache: true, // Default: true
  localCacheTTL: 10 * 60 * 1000, // Default: 5 minutes
});
```

## API Endpoints

### Fetch File Tree with Cache

```
GET /api/github/repo/{owner}/{name}?action=tree&ref={ref}
```

**Response Headers:**

- `X-Cache`: `HIT` or `MISS`
- `X-Cache-Type`: `s3` (when cache hit)

**Example:**

```bash
curl http://localhost:3000/api/github/repo/facebook/react?action=tree
```

### Cache Management

#### Get Cache Statistics

```
GET /api/cache/filetree
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "localCacheSize": 3,
    "localCacheKeys": ["hash1...", "hash2...", "hash3..."],
    "bucketName": "code-cosmos-filetree-cache"
  }
}
```

#### Invalidate Specific Cache

```
DELETE /api/cache/filetree?owner={owner}&repo={repo}&ref={ref}
```

#### Clear All Local Cache

```
DELETE /api/cache/filetree?clearAll=true
```

#### Manually Store in Cache

```
POST /api/cache/filetree

Body:
{
  "owner": "facebook",
  "repo": "react",
  "ref": "main",
  "data": { ... tree data ... },
  "githubEtag": "optional-etag"
}
```

## Cache Flow

1. **Request arrives** for repository file tree
2. **Check local cache** (if enabled)
   - If hit → Return immediately with `X-Cache: HIT`
3. **Check S3 cache**
   - If hit → Store in local cache and return with `X-Cache: HIT`
4. **Fetch from GitHub API**
   - Store in both S3 and local cache
   - Return with `X-Cache: MISS`

## Performance Benefits

### Before Cache

- Every file tree request hits GitHub API
- ~500-2000ms response time
- Risk of hitting GitHub rate limits (60/hour unauthenticated, 5000/hour authenticated)

### After Cache

- **Local cache hits**: ~5-10ms response time
- **S3 cache hits**: ~50-150ms response time
- **GitHub API calls**: Only on cache miss or invalidation
- **Rate limit protection**: Dramatically reduces API calls

## Testing

Run the test script to verify cache functionality:

```bash
# Basic test
node test-filetree-cache.js

# Test against production
API_BASE=https://your-domain.com node test-filetree-cache.js
```

The test script will:

1. Check cache statistics
2. Test cache MISS and HIT scenarios
3. Measure performance improvements
4. Test cache invalidation
5. Test bulk cache clearing

## S3 Bucket Structure

```
code-cosmos-filetree-cache/
├── filetrees/
│   ├── ab/  # Hash prefix for partitioning
│   │   └── ab1234567890...json
│   ├── cd/
│   │   └── cd9876543210...json
│   └── ...
```

## Cache Entry Format

Each cached entry contains:

```json
{
  "hash": "sha256_hash",
  "owner": "facebook",
  "repo": "react",
  "ref": "HEAD",
  "data": {
    "sha": "...",
    "url": "...",
    "tree": [...]
  },
  "cachedAt": "2024-01-01T12:00:00Z",
  "githubEtag": "W/\"abc123...\""
}
```

## Best Practices

1. **Monitor cache hit rates** to ensure effectiveness
2. **Set appropriate TTLs** based on your update frequency needs
3. **Use cache invalidation** when you know data has changed
4. **Enable local cache** for frequently accessed repositories
5. **Configure S3 lifecycle policies** to auto-expire old cache entries

## Troubleshooting

### Cache not working

- Check AWS credentials are configured
- Verify S3 bucket exists and has proper permissions
- Check application logs for S3 errors

### High cache miss rate

- Increase local cache TTL if appropriate
- Check if refs are changing frequently
- Verify S3 bucket is accessible

### Memory usage concerns

- Reduce local cache TTL
- Call `/api/cache/filetree?clearAll=true` periodically
- Disable local cache if needed

## Future Improvements

- [ ] Add cache warming for popular repositories
- [ ] Implement cache metrics and monitoring
- [ ] Add support for partial tree caching
- [ ] Implement smart invalidation based on GitHub webhooks
- [ ] Add Redis as an intermediate cache layer
- [ ] Support for CDN distribution of cached trees
