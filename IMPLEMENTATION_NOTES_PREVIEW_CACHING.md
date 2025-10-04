# GitMosaic Preview & Caching Implementation Notes

## Overview

GitMosaic is a viral marketing tool that creates beautiful, shareable visualizations of GitHub repository file structures. Users can generate a "mosaic" visualization of any public repository and share it on social media. The current implementation works but needs preview generation and caching to scale properly.

## Current Architecture

### Key Components

1. **MosaicPostcard Component** (`/src/app/mosaic/components/MosaicPostcard.tsx`)
   - Unified component used on both main page and individual repo pages
   - Displays repository info (avatar, name, stats) alongside visualization
   - Responsive design with ~2.4:1 aspect ratio (900px max width, 380px height)

2. **Visualization Pipeline**
   - `GitHubService` fetches repository file tree via GitHub API
   - File filtering excludes config/generated files (JSON, MD, YAML, etc.)
   - `useCodeCityData` hook processes file tree into city visualization data
   - `ArchitectureMapHighlightLayers` renders the actual mosaic with language-based coloring

3. **Social Sharing**
   - Dynamic Open Graph images at `/api/og/mosaic/[owner]/[repo]/route.tsx`
   - Currently generates simple placeholder images
   - Twitter/LinkedIn share URLs with custom text

## Critical Implementation Needs

### 1. Real Preview Generation

**Problem**: Social media previews currently show placeholder images, not actual mosaics.

**Required Implementation**:

```typescript
// /src/app/api/og/mosaic/[owner]/[repo]/route.tsx needs:

1. Server-side canvas rendering of actual mosaic
   - Use node-canvas or similar for server-side rendering
   - Generate same visualization as client-side ArchitectureMapHighlightLayers
   - Match exact styling: warm gradient background, language colors, layout

2. Caching layer for generated images
   - Store in S3/Cloudflare R2 with keys like: og-image/{owner}/{repo}/{commit-sha}.png
   - Include metadata: generation timestamp, file count, primary language

3. Fallback strategy
   - If generation fails/times out, use attractive placeholder
   - Consider pre-generating for popular repos
```

### 2. Repository Data Caching

**Problem**: Every page load fetches full file tree from GitHub API (rate limits, slow).

**Required Implementation**:

```typescript
// Suggested cache architecture:

interface CachedRepoData {
  owner: string;
  repo: string;
  branch: string;
  lastCommitSha: string;
  fileTree: FileSystemTree;
  stats: RepoStats;
  cachedAt: Date;
  expiresAt: Date;
}

// Cache storage options (in order of preference):
1. Redis/Upstash - Fast, supports TTL
2. PostgreSQL with JSONB - Persistent, queryable
3. S3/R2 with CloudFront - Cheap, globally distributed

// Cache key strategy:
`repo-data:${owner}:${repo}:${branch}`

// Cache invalidation:
- TTL: 1 hour for active repos, 24 hours for inactive
- Webhook: GitHub webhook on push events
- Manual: Provide refresh button for users
```

### 3. Performance Optimizations

**Current Issues**:

- Large repos (>10k files) cause browser lag
- File tree processing happens on every render
- No progressive loading

**Solutions**:

```typescript
// 1. Implement file tree pagination/virtualization
const MAX_FILES_PER_LAYER = 1000;
const virtualizedLayers = useMemo(() => {
  // Process only visible files
  // Aggregate small file groups
}, [fileTree, viewport]);

// 2. Web Worker for heavy processing
// Move file categorization and layer generation to worker
// /src/workers/mosaic-processor.worker.ts

// 3. Progressive enhancement
// Show low-res preview immediately
// Load full visualization progressively
```

### 4. Database Schema (if implementing persistent cache)

```sql
-- Repository cache
CREATE TABLE repo_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  branch VARCHAR(255) DEFAULT 'main',
  commit_sha VARCHAR(40),
  file_tree JSONB NOT NULL,
  file_count INTEGER,
  primary_language VARCHAR(50),
  stats JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_repo_lookup (owner, repo, branch),
  INDEX idx_expires (expires_at)
);

-- Generated previews
CREATE TABLE preview_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  INDEX idx_preview_lookup (owner, repo)
);

-- Analytics (optional but valuable)
CREATE TABLE mosaic_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  action VARCHAR(50), -- 'view', 'share', 'create'
  referrer TEXT,
  user_agent TEXT,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_analytics_repo (owner, repo),
  INDEX idx_analytics_time (created_at)
);
```

### 5. API Routes Structure

```typescript
// /src/app/api/mosaic/[owner]/[repo]/data/route.ts
// Returns cached repo data or fetches fresh

// /src/app/api/mosaic/[owner]/[repo]/preview/route.ts
// Returns generated preview image URL

// /src/app/api/mosaic/[owner]/[repo]/refresh/route.ts
// Forces cache refresh for specific repo

// /src/app/api/mosaic/popular/route.ts
// Returns list of popular/trending mosaics
```

### 6. Environment Variables Needed

```env
# Caching
REDIS_URL=
CACHE_TTL_SECONDS=3600

# Image Storage
S3_BUCKET_NAME=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
CLOUDFRONT_URL=

# GitHub API (for higher rate limits)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_INSTALLATION_ID=

# Analytics (optional)
POSTHOG_API_KEY=
AMPLITUDE_API_KEY=
```

### 7. Testing Considerations

1. **Load Testing**
   - Test with repos of various sizes (10, 100, 1000, 10000 files)
   - Concurrent request handling
   - Cache stampede prevention

2. **Edge Cases**
   - Private repos (should fail gracefully)
   - Deleted/renamed repos
   - Empty repos
   - Repos with unusual file structures

3. **Preview Generation**
   - Ensure consistency between client and server rendering
   - Test with different aspect ratios
   - Verify Open Graph tags work on all platforms

### 8. Monitoring & Analytics

Track these metrics:

- Cache hit rate
- Preview generation time
- Most viewed repositories
- Share conversion rate
- Error rates by repository size
- API rate limit usage

### 9. Future Enhancements

1. **Mosaic Customization**
   - User-selectable color themes
   - Filter by file types
   - Time-lapse visualization (show repo growth)

2. **Social Features**
   - Mosaic gallery/discovery
   - User collections
   - Embed widgets

3. **Performance**
   - WebAssembly for visualization engine
   - Edge computing for preview generation
   - Predictive pre-caching of trending repos

## Implementation Priority

### Phase 1 (MVP Cache - 1 week)

1. Basic Redis caching for repo data
2. Simple TTL-based expiration
3. Manual preview generation improvement

### Phase 2 (Scale - 2 weeks)

1. Automated preview generation with canvas
2. S3/CDN for preview storage
3. GitHub webhook integration

### Phase 3 (Polish - 1 week)

1. Analytics implementation
2. Performance optimizations
3. Error handling improvements

## Key Decisions for Next Team

1. **Hosting**: Where will this be deployed? (Vercel, AWS, self-hosted?)
2. **Database**: SQL or NoSQL for persistent cache?
3. **CDN**: CloudFlare, AWS CloudFront, or other?
4. **Monitoring**: DataDog, New Relic, or custom?
5. **Authentication**: Will we add user accounts later?

## Contact & Resources

- Current implementation uses Next.js 14 with App Router
- Visualization library: `markdown-slides-shared-lib/code-city`
- GitHub API: REST v3 (consider GraphQL for better performance)
- Design inspired by code.golf and github.com/marketplace

## Security Considerations

1. **Rate Limiting**: Implement per-IP rate limiting to prevent abuse
2. **Input Validation**: Sanitize owner/repo params to prevent injection
3. **CORS**: Configure appropriately for embed functionality
4. **Secrets**: Never expose GitHub tokens to client
5. **Cache Poisoning**: Validate data before caching

---

_Last Updated: [Current Date]_
_Original Implementation: GitMosaic v1.0_
