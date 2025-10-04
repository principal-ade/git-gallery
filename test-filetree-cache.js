#!/usr/bin/env node

/**
 * Test script for filetree cache functionality
 * Tests S3 caching, local caching, and cache invalidation
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Test repositories
const TEST_REPOS = [
  { owner: "facebook", repo: "react" },
  { owner: "vercel", repo: "next.js" },
  { owner: "microsoft", repo: "vscode" },
];

async function makeRequest(url, options = {}) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data,
      elapsed,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      elapsed: Date.now() - startTime,
    };
  }
}

async function testFileTreeCache() {
  console.log(
    `${colors.bright}${colors.cyan}🧪 Testing Filetree Cache System${colors.reset}\n`,
  );

  // Test cache statistics
  console.log(`${colors.yellow}📊 Checking cache statistics...${colors.reset}`);
  const statsResult = await makeRequest(`${API_BASE}/api/cache/filetree`);

  if (statsResult.success) {
    console.log(`${colors.green}✅ Cache stats retrieved:${colors.reset}`);
    console.log(
      `   Local cache size: ${statsResult.data.stats.localCacheSize}`,
    );
    console.log(`   S3 bucket: ${statsResult.data.stats.bucketName}`);
  } else {
    console.log(
      `${colors.red}❌ Failed to get cache stats: ${statsResult.error || statsResult.data.error}${colors.reset}`,
    );
  }

  console.log();

  // Test fetching filetrees
  for (const { owner, repo } of TEST_REPOS) {
    console.log(`${colors.blue}📂 Testing ${owner}/${repo}...${colors.reset}`);

    // First request (should be cache MISS)
    console.log("   First request (expecting cache MISS)...");
    const firstRequest = await makeRequest(
      `${API_BASE}/api/github/repo/${owner}/${repo}?action=tree`,
    );

    if (firstRequest.success) {
      const cacheStatus = firstRequest.headers["x-cache"] || "UNKNOWN";
      const isHit = cacheStatus === "HIT";
      const icon = isHit ? "💾" : "🌐";
      const color = isHit ? colors.green : colors.yellow;

      console.log(`   ${icon} Cache: ${color}${cacheStatus}${colors.reset}`);
      console.log(`   ⏱️  Time: ${firstRequest.elapsed}ms`);
      console.log(`   📁 Tree items: ${firstRequest.data.tree?.length || 0}`);
    } else {
      console.log(
        `   ${colors.red}❌ Request failed: ${firstRequest.error || firstRequest.data.error}${colors.reset}`,
      );
      continue;
    }

    // Second request (should be cache HIT)
    console.log("   Second request (expecting cache HIT)...");
    const secondRequest = await makeRequest(
      `${API_BASE}/api/github/repo/${owner}/${repo}?action=tree`,
    );

    if (secondRequest.success) {
      const cacheStatus = secondRequest.headers["x-cache"] || "UNKNOWN";
      const isHit = cacheStatus === "HIT";
      const icon = isHit ? "💾" : "🌐";
      const color = isHit ? colors.green : colors.yellow;

      console.log(`   ${icon} Cache: ${color}${cacheStatus}${colors.reset}`);
      console.log(`   ⏱️  Time: ${secondRequest.elapsed}ms`);

      // Compare times
      if (secondRequest.elapsed < firstRequest.elapsed) {
        const speedup = (
          ((firstRequest.elapsed - secondRequest.elapsed) /
            firstRequest.elapsed) *
          100
        ).toFixed(1);
        console.log(
          `   ${colors.green}🚀 ${speedup}% faster than first request!${colors.reset}`,
        );
      }
    } else {
      console.log(
        `   ${colors.red}❌ Request failed: ${secondRequest.error || secondRequest.data.error}${colors.reset}`,
      );
    }

    console.log();
  }

  // Test cache invalidation
  if (TEST_REPOS.length > 0) {
    const { owner, repo } = TEST_REPOS[0];
    console.log(
      `${colors.magenta}🗑️  Testing cache invalidation for ${owner}/${repo}...${colors.reset}`,
    );

    const invalidateResult = await makeRequest(
      `${API_BASE}/api/cache/filetree?owner=${owner}&repo=${repo}`,
      { method: "DELETE" },
    );

    if (invalidateResult.success) {
      console.log(
        `   ${colors.green}✅ Cache invalidated successfully${colors.reset}`,
      );

      // Verify invalidation worked
      console.log("   Fetching again (should be cache MISS)...");
      const afterInvalidate = await makeRequest(
        `${API_BASE}/api/github/repo/${owner}/${repo}?action=tree`,
      );

      if (afterInvalidate.success) {
        const cacheStatus = afterInvalidate.headers["x-cache"] || "UNKNOWN";
        const isMiss = cacheStatus === "MISS";

        if (isMiss) {
          console.log(
            `   ${colors.green}✅ Confirmed: Cache was properly invalidated (${cacheStatus})${colors.reset}`,
          );
        } else {
          console.log(
            `   ${colors.yellow}⚠️  Warning: Expected MISS but got ${cacheStatus}${colors.reset}`,
          );
        }
      }
    } else {
      console.log(
        `   ${colors.red}❌ Failed to invalidate cache: ${invalidateResult.error || invalidateResult.data.error}${colors.reset}`,
      );
    }

    console.log();
  }

  // Test clearing all local cache
  console.log(
    `${colors.magenta}🗑️  Testing clear all local cache...${colors.reset}`,
  );
  const clearAllResult = await makeRequest(
    `${API_BASE}/api/cache/filetree?clearAll=true`,
    { method: "DELETE" },
  );

  if (clearAllResult.success) {
    console.log(
      `   ${colors.green}✅ Local cache cleared successfully${colors.reset}`,
    );
  } else {
    console.log(
      `   ${colors.red}❌ Failed to clear cache: ${clearAllResult.error || clearAllResult.data.error}${colors.reset}`,
    );
  }

  // Final stats
  console.log();
  console.log(`${colors.yellow}📊 Final cache statistics...${colors.reset}`);
  const finalStats = await makeRequest(`${API_BASE}/api/cache/filetree`);

  if (finalStats.success) {
    console.log(`   Local cache size: ${finalStats.data.stats.localCacheSize}`);
    if (finalStats.data.stats.localCacheKeys.length > 0) {
      console.log(`   Cached repos:`);
      finalStats.data.stats.localCacheKeys.forEach((key) => {
        console.log(`     - ${key.substring(0, 8)}...`);
      });
    }
  }

  console.log(
    `\n${colors.bright}${colors.green}✨ Cache testing complete!${colors.reset}`,
  );
}

// Run the test
testFileTreeCache().catch(console.error);
