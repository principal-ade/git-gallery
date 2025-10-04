# Environment Variables Fix for Gallery Project

## 🚨 Critical Issues Found

### 1. **NEXT*PUBLIC* Variables Being Used Server-Side**

These variables are problematic because they're baked in at build time, but you're using them in server-side code where runtime variables would be better:

#### **NEXT_PUBLIC_BASE_URL**

- **Currently used in:** Server-side API routes and pages
- **Problem:** Can't change URL after build
- **Fix:** Replace with `BASE_URL` (runtime variable)

#### **NEXT_PUBLIC_S3_URL**

- **Currently used in:** Gallery API route
- **Problem:** S3 URL baked into build
- **Fix:** Replace with `S3_URL` or construct from bucket name

## 📋 Complete Environment Variables List

### ✅ Correctly Used Server-Side Variables (Runtime in App Runner)

```yaml
# AWS Configuration
AWS_REGION: us-east-1
AWS_ACCESS_KEY_ID: your_key_id
AWS_SECRET_ACCESS_KEY: your_secret

# S3 Buckets
S3_GIT_MOSAICS: git-mosaics
FEEDBACK_S3_BUCKET: your-feedback-bucket
ORBIT_S3_BUCKET: your-orbit-bucket
FILETREE_CACHE_BUCKET: code-cosmos-filetree-cache

# GitHub Configuration
GITHUB_TOKEN: your_github_token
GITHUB_CLIENT_ID: your_client_id
GITHUB_CLIENT_SECRET: your_client_secret
GITHUB_RELEASES_READONLY_TOKEN: your_releases_token
GITHUB_REDIRECT_URI: https://your-domain.com/api/orbit/auth/github/callback

# Authentication
NEXTAUTH_URL: https://your-domain.com
NEXTAUTH_SECRET: your_secret
ROOM_TOKEN_SECRET: your_room_secret

# Admin Keys
ORBIT_ADMIN_SECRET: your_admin_secret
ADMIN_API_KEY: your_api_key

# Environment
NODE_ENV: production
```

### ❌ Variables to Fix

## 🔧 Required Code Changes

### 1. Fix NEXT_PUBLIC_BASE_URL Usage

**File: `/src/services/githubService.ts:33`**

```typescript
// BEFORE (line 33-34)
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`

// AFTER
const baseUrl = process.env.BASE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
```

**File: `/src/app/shared/[owner]/[repo]/page.tsx`**

```typescript
// BEFORE (lines 57, 86, 200, 204)
url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://git-gallery.com"}/shared/${owner}/${repo}`;

// AFTER
url: `${process.env.BASE_URL || "https://git-gallery.com"}/shared/${owner}/${repo}`;
```

**File: `/src/app/api/mosaic/[owner]/[repo]/share-image/route.ts:74`**

```typescript
// BEFORE
const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/shared/${owner}/${repo}`;

// AFTER
const shareUrl = `${process.env.BASE_URL || "http://localhost:3000"}/shared/${owner}/${repo}`;
```

**File: `/src/app/api/mosaic/[owner]/[repo]/share/route.ts:96`**

```typescript
// BEFORE
const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/shared/${shareId}`;

// AFTER
const shareUrl = `${process.env.BASE_URL || "http://localhost:3000"}/shared/${shareId}`;
```

### 2. Fix NEXT_PUBLIC_S3_URL Usage

**File: `/src/app/api/gallery/route.ts:52`**

```typescript
// BEFORE
imageUrl: `${process.env.NEXT_PUBLIC_S3_URL || 'https://your-s3-bucket.s3.amazonaws.com'}/mosaics/a24z-ai/a24z-Memory.png`,

// AFTER (construct URL from bucket name)
imageUrl: `https://${process.env.S3_GIT_MOSAICS}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/mosaics/a24z-ai/a24z-Memory.png`,
```

## 📝 Updated App Runner Configuration

**File: `apprunner.yaml`**

```yaml
version: 1.0
runtime: docker
build:
  commands:
    pre-build:
      - echo "Pre-build phase"
    build:
      - echo "Build phase handled by Dockerfile"
    post-build:
      - echo "Post-build phase"
run:
  runtime-version: latest
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    # Core Configuration
    - name: NODE_ENV
      value: production
    - name: BASE_URL
      value: "https://your-domain.com"

    # AWS Configuration
    - name: AWS_REGION
      value: us-east-1
    - name: AWS_ACCESS_KEY_ID
      value: "your_access_key"
    - name: AWS_SECRET_ACCESS_KEY
      value: "your_secret_key"

    # S3 Buckets
    - name: S3_GIT_MOSAICS
      value: "git-mosaics"
    - name: FEEDBACK_S3_BUCKET
      value: "your-feedback-bucket"
    - name: ORBIT_S3_BUCKET
      value: "your-orbit-bucket"
    - name: FILETREE_CACHE_BUCKET
      value: "code-cosmos-filetree-cache"

    # GitHub Configuration
    - name: GITHUB_TOKEN
      value: "your_github_token"
    - name: GITHUB_CLIENT_ID
      value: "your_client_id"
    - name: GITHUB_CLIENT_SECRET
      value: "your_client_secret"
    - name: GITHUB_RELEASES_READONLY_TOKEN
      value: "your_releases_token"

    # Authentication
    - name: NEXTAUTH_URL
      value: "https://your-domain.com"
    - name: NEXTAUTH_SECRET
      value: "your_nextauth_secret"
    - name: ROOM_TOKEN_SECRET
      value: "your_room_secret"

    # Admin Configuration
    - name: ORBIT_ADMIN_SECRET
      value: "your_admin_secret"
    - name: ADMIN_API_KEY
      value: "your_api_key"
```

## 🚀 Migration Steps

1. **Update Code**: Apply all the code changes listed above to remove `NEXT_PUBLIC_` prefixes
2. **Update App Runner Config**: Use the updated `apprunner.yaml` configuration
3. **Deploy**: The new configuration will use runtime variables instead of build-time
4. **Test**: Verify all features work with the new variable setup

## ⚠️ Important Notes

1. **Security**: Never commit actual secrets to the repository - use AWS Secrets Manager or App Runner's environment variable configuration
2. **BASE_URL**: This should be your production domain (e.g., `https://git-gallery.com`)
3. **AWS Credentials**: Consider using IAM roles instead of access keys when possible
4. **Build vs Runtime**:
   - Build-time variables (`NEXT_PUBLIC_*`) are baked into the JavaScript bundle
   - Runtime variables are read from the server environment on each request
   - For App Runner, runtime variables are much more flexible

## 🔍 Variables Currently Missing in apprunner.yaml

Your current `apprunner.yaml` is missing most required variables. Only these are configured:

- ✅ NODE_ENV
- ✅ AWS_REGION
- ❌ AWS_S3_BUCKET (should be multiple specific bucket vars)

All other variables listed above need to be added to your App Runner configuration.
