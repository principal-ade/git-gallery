import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { S3PRImageStore } from "@/lib/s3-pr-image-store";

// Simple in-memory cache for development
// In production, use Redis or a proper cache
const imageCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ owner: string; repo: string; prNumber: string }> },
) {
  const { owner, repo, prNumber } = await params;
  const cacheKey = `pr-${owner}-${repo}-${prNumber}`;

  // Check if repo is allowed (skip in development/test)
  const isDevelopment = process.env.NODE_ENV === "development";
  const isTestPage = request.headers.get("referer")?.includes("/test/pr-image");

  if (!isDevelopment && !isTestPage) {
    try {
      const store = new S3PRImageStore();
      const isAllowed = await store.isRepoAllowed(owner, repo);

      if (!isAllowed) {
        console.log(
          `PR image request denied: ${owner}/${repo} not in allowlist`,
        );
        // Return 404 to hide the fact this endpoint exists
        return new NextResponse("Not found", { status: 404 });
      }

      console.log(`PR image request allowed: ${owner}/${repo}#${prNumber}`);
    } catch (error) {
      console.error("Failed to check repo allowlist:", error);
      // If we can't check S3, deny the request
      return new NextResponse("Service unavailable", { status: 503 });
    }
  }

  try {
    // Check cache first
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Serving cached image for PR #${prNumber}`);
      return new NextResponse(cached.buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600", // Browser cache for 1 hour
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`Generating new image for ${owner}/${repo} PR #${prNumber}`);

    // Generate new image
    const imageBuffer = await generatePRImage(owner, repo, parseInt(prNumber));

    // Cache the image
    imageCache.set(cacheKey, {
      buffer: imageBuffer,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    cleanupCache();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Failed to generate PR image:", error);

    // Return a fallback image or error response
    return NextResponse.json(
      { error: "Failed to generate PR image" },
      { status: 500 },
    );
  }
}

async function generatePRImage(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<Buffer> {
  let browser;

  try {
    // Configure puppeteer based on environment
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // Production: Use system-installed Chromium
      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";
      browser = await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        defaultViewport: { width: 1200, height: 800 },
        executablePath,
        headless: true,
      });
    } else {
      // Development: Use local Chrome
      // Try common Chrome paths
      const possiblePaths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
        "/usr/bin/google-chrome", // Linux
        "/usr/bin/chromium-browser", // Linux Chromium
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", // Windows 32-bit
      ];

      let executablePath;
      for (const path of possiblePaths) {
        try {
          const fs = require("fs");
          if (fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        } catch {
          // Continue to next path
        }
      }

      if (!executablePath) {
        throw new Error(
          "Chrome/Chromium not found. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable",
        );
      }

      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2, // Higher quality
    });

    // Build the URL to the PR page
    const baseUrl = process.env.BASE_URL || "http://localhost:3002";
    const prPageUrl = `${baseUrl}/pr/${owner}/${repo}/${prNumber}`;

    console.log(`Navigating to: ${prPageUrl}`);

    // Navigate to the PR page
    await page.goto(prPageUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for the PR postcard to render
    try {
      await page.waitForSelector(
        '[data-testid="pr-postcard"], .pr-postcard, div[style*="aspect-ratio"]',
        {
          timeout: 15000,
        },
      );
    } catch {
      console.log("Postcard selector not found, waiting for any content...");
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Fallback wait
    }

    // Find the postcard element
    const postcardElement =
      (await page.$('[data-testid="pr-postcard"]')) ||
      (await page.$(".pr-postcard")) ||
      (await page.$('div[style*="aspect-ratio: 2"]'));

    if (!postcardElement) {
      throw new Error("Could not find PR postcard element on page");
    }

    // Take screenshot of just the postcard
    const screenshot = await postcardElement.screenshot({
      type: "png",
      omitBackground: false,
      captureBeyondViewport: false,
    });

    await browser.close();

    return Buffer.from(screenshot);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

function cleanupCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  imageCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => imageCache.delete(key));

  if (keysToDelete.length > 0) {
    console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}
