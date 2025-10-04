import { FileSuffixColorConfig } from "@/utils/fileColorMapping";

export interface SuffixInfo {
  suffix: string;
  count: number;
  hasColor: boolean;
  sampleFiles: string[];
}

export interface GitHubIssue {
  title: string;
  number: number;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
  created_at: string;
  html_url: string;
}

/**
 * Extract all unique file suffixes from a file tree
 */
function extractSuffixesFromFileTree(
  fileTree: { allFiles?: Array<{ path: string }> } | null,
): Map<string, SuffixInfo> {
  const suffixMap = new Map<string, SuffixInfo>();

  if (!fileTree?.allFiles) {
    return suffixMap;
  }

  fileTree.allFiles.forEach((file) => {
    const lastDot = file.path.lastIndexOf(".");

    // Skip files without extensions or that end with a dot
    if (lastDot === -1 || lastDot === file.path.length - 1) {
      return;
    }

    const suffix = file.path.substring(lastDot).toLowerCase();

    if (!suffixMap.has(suffix)) {
      suffixMap.set(suffix, {
        suffix,
        count: 0,
        hasColor: false,
        sampleFiles: [],
      });
    }

    const info = suffixMap.get(suffix)!;
    info.count++;

    // Keep up to 5 sample files
    if (info.sampleFiles.length < 5) {
      info.sampleFiles.push(file.path);
    }
  });

  return suffixMap;
}

/**
 * Check which suffixes have colors in the config
 */
function checkSuffixColors(
  suffixes: Map<string, SuffixInfo>,
  config: FileSuffixColorConfig,
): Map<string, SuffixInfo> {
  suffixes.forEach((info) => {
    info.hasColor = !!config.suffixConfigs[info.suffix];
  });

  return suffixes;
}

/**
 * Get missing suffix issues from git-gallery-palette repo
 */
export async function getExistingSuffixIssues(
  token?: string,
): Promise<Map<string, GitHubIssue>> {
  const issueMap = new Map<string, GitHubIssue>();

  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "git-gallery-suffix-discovery",
    };

    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    // Fetch open issues with color-request label
    const response = await fetch(
      "https://api.github.com/repos/a24z-ai/git-gallery-palette/issues?labels=color-request&state=open&per_page=100",
      { headers },
    );

    if (!response.ok) {
      console.warn("Failed to fetch existing issues:", response.status);
      return issueMap;
    }

    const issues = (await response.json()) as GitHubIssue[];

    // Parse suffix from issue title
    issues.forEach((issue) => {
      const match = issue.title.match(/Add color for (\.[\w\-\+]+) files/i);
      if (match) {
        const suffix = match[1].toLowerCase();
        issueMap.set(suffix, issue);
      }
    });

    console.log(`Found ${issueMap.size} existing suffix issues`);
  } catch (error) {
    console.error("Error fetching existing issues:", error);
  }

  return issueMap;
}

/**
 * Create a GitHub issue for a missing suffix
 */
async function createSuffixIssue(
  suffix: string,
  suffixInfo: SuffixInfo,
  token: string,
): Promise<GitHubIssue | null> {
  try {
    const issueBody = `
## File Extension: \`${suffix}\`

A new file extension has been discovered that doesn't have a color configuration yet.

### Statistics
- **Occurrences found**: ${suffixInfo.count}
- **First seen in**: Git Gallery file tree analysis

### Sample Files
${suffixInfo.sampleFiles.map((file) => `- \`${file}\``).join("\n")}

### Suggested Configuration
Please add a color configuration for \`${suffix}\` files to improve visualization in Git Gallery.

\`\`\`json
"${suffix}": {
  "primary": {
    "color": "#YOUR_COLOR_HERE",
    "renderStrategy": "fill",
    "opacity": 0.7
  },
  "displayName": "${suffix.substring(1).toUpperCase()}"
}
\`\`\`

---
*This issue was automatically created by Git Gallery's suffix discovery system.*
`;

    const response = await fetch(
      "https://api.github.com/repos/a24z-ai/git-gallery-palette/issues",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "git-gallery-suffix-discovery",
        },
        body: JSON.stringify({
          title: `Add color for ${suffix} files`,
          body: issueBody,
          labels: ["color-request", "file-extension", "auto-discovered"],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create issue: ${response.status} - ${error}`);
    }

    const issue = (await response.json()) as GitHubIssue;
    console.log(`Created issue #${issue.number} for ${suffix}`);
    return issue;
  } catch (error) {
    console.error(`Error creating issue for ${suffix}:`, error);
    return null;
  }
}

/**
 * Process discovered suffixes and create issues for missing colors
 */
export async function processMissingSuffixes(
  fileTree: { allFiles?: Array<{ path: string }> } | null,
  config: FileSuffixColorConfig,
  options: {
    token?: string;
    createIssues?: boolean;
    minOccurrences?: number;
  } = {},
): Promise<{
  total: number;
  withColors: number;
  withoutColors: number;
  existingIssues: number;
  newIssues: number;
  missingSuffixes: SuffixInfo[];
}> {
  const { token, createIssues = false, minOccurrences = 1 } = options;

  // Extract and check suffixes
  const suffixes = extractSuffixesFromFileTree(fileTree);
  checkSuffixColors(suffixes, config);

  // Filter missing suffixes that meet minimum occurrence threshold
  const missingSuffixes = Array.from(suffixes.values())
    .filter((info) => !info.hasColor && info.count >= minOccurrences)
    .sort((a, b) => b.count - a.count); // Sort by count descending

  // Get existing issues
  const existingIssues = await getExistingSuffixIssues(token);

  // Find suffixes that need new issues
  const needsIssues = missingSuffixes.filter(
    (info) => !existingIssues.has(info.suffix),
  );

  let newIssuesCreated = 0;

  // Create issues if requested and token provided
  if (createIssues && token && needsIssues.length > 0) {
    console.log(
      `Creating issues for ${needsIssues.length} missing suffixes...`,
    );

    // Limit to top 5 to avoid rate limiting
    const toCreate = needsIssues.slice(0, 5);

    for (const suffixInfo of toCreate) {
      const issue = await createSuffixIssue(
        suffixInfo.suffix,
        suffixInfo,
        token,
      );
      if (issue) {
        newIssuesCreated++;
        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (needsIssues.length > 5) {
      console.log(
        `Note: Only created issues for top 5 suffixes. ${needsIssues.length - 5} more remain.`,
      );
    }
  }

  const withColors = Array.from(suffixes.values()).filter(
    (info) => info.hasColor,
  ).length;

  return {
    total: suffixes.size,
    withColors,
    withoutColors: missingSuffixes.length,
    existingIssues: Array.from(existingIssues.keys()).length,
    newIssues: newIssuesCreated,
    missingSuffixes,
  };
}

/**
 * Generate a report of missing suffixes
 */
export function generateMissingSuffixReport(
  missingSuffixes: SuffixInfo[],
  existingIssues: Map<string, GitHubIssue>,
): string {
  if (missingSuffixes.length === 0) {
    return "All discovered file extensions have color configurations! 🎉";
  }

  let report = `# Missing Color Configurations\n\n`;
  report += `Found ${missingSuffixes.length} file extensions without colors:\n\n`;

  missingSuffixes.forEach((info) => {
    const existingIssue = existingIssues.get(info.suffix);
    const issueStatus = existingIssue
      ? `[Issue #${existingIssue.number}](${existingIssue.html_url})`
      : "**No issue yet**";

    report += `### ${info.suffix}\n`;
    report += `- **Count**: ${info.count} files\n`;
    report += `- **Status**: ${issueStatus}\n`;
    report += `- **Sample**: ${info.sampleFiles[0] || "N/A"}\n\n`;
  });

  return report;
}
