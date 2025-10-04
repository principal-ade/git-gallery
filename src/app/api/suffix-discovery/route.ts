import { NextRequest, NextResponse } from "next/server";
import {
  processMissingSuffixes,
  generateMissingSuffixReport,
  getExistingSuffixIssues,
} from "@/services/suffixDiscoveryService";
import { getColorPaletteConfigSync } from "@/services/configService";

// Server-side GitHub token for creating issues
const GITHUB_TOKEN = process.env.GITHUB_PAT_SUFFIX_TRACKING;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileTree, autoCreateIssues = true, minOccurrences = 10 } = body;

    if (!fileTree) {
      return NextResponse.json(
        { error: "fileTree is required" },
        { status: 400 },
      );
    }

    // Get current color configuration
    const { config } = getColorPaletteConfigSync();

    // Use server token if available, otherwise don't create issues
    const token = GITHUB_TOKEN;
    const shouldCreateIssues = autoCreateIssues && !!token;

    if (autoCreateIssues && !token) {
      console.warn(
        "GITHUB_PAT_SUFFIX_TRACKING not configured - skipping issue creation",
      );
    }

    // Process missing suffixes and automatically create issues if configured
    const result = await processMissingSuffixes(fileTree, config, {
      token,
      createIssues: shouldCreateIssues,
      minOccurrences,
    });

    // Get existing issues for report
    const existingIssues = await getExistingSuffixIssues(token);

    // Generate report
    const report = generateMissingSuffixReport(
      result.missingSuffixes,
      existingIssues,
    );

    return NextResponse.json({
      success: true,
      stats: {
        total: result.total,
        withColors: result.withColors,
        withoutColors: result.withoutColors,
        existingIssues: result.existingIssues,
        newIssues: result.newIssues,
      },
      missingSuffixes: result.missingSuffixes.map((info) => ({
        suffix: info.suffix,
        count: info.count,
        hasIssue: existingIssues.has(info.suffix),
        issueUrl: existingIssues.get(info.suffix)?.html_url,
      })),
      report,
    });
  } catch (error) {
    console.error("Suffix discovery error:", error);
    return NextResponse.json(
      {
        error: "Failed to process suffix discovery",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check existing suffix issues
 */
export async function GET() {
  try {
    // Use server token
    const token = GITHUB_TOKEN;

    // Get existing issues
    const existingIssues = await getExistingSuffixIssues(token);

    // Get current color configuration
    const { config } = getColorPaletteConfigSync();

    // Find which issues have been resolved (now have colors)
    const resolvedSuffixes: string[] = [];
    const pendingSuffixes: string[] = [];

    existingIssues.forEach((issue, suffix) => {
      if (config.suffixConfigs[suffix]) {
        resolvedSuffixes.push(suffix);
      } else {
        pendingSuffixes.push(suffix);
      }
    });

    return NextResponse.json({
      totalIssues: existingIssues.size,
      resolved: resolvedSuffixes.length,
      pending: pendingSuffixes.length,
      issues: Array.from(existingIssues.entries()).map(([suffix, issue]) => ({
        suffix,
        issueNumber: issue.number,
        title: issue.title,
        url: issue.html_url,
        hasColor: !!config.suffixConfigs[suffix],
        createdAt: issue.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching suffix issues:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch suffix issues",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
