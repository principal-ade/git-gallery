import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth-utils";

function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

const GITHUB_API_BASE = "https://api.github.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    // Get the auth token (user's token or fallback to env token)
    const token = await getAuthToken();

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CodeCity-App/1.0",
    };

    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
      headers,
    });

    if (!response.ok) {
      let errorMessage = `GitHub API Error: ${response.status} ${response.statusText}`;

      // Add token diagnostic information for 401 errors
      if (response.status === 401) {
        const tokenSource = token
          ? token === process.env.GITHUB_TOKEN
            ? "environment"
            : "user session"
          : "none";
        const tokenPrefix = token ? `${token.substring(0, 8)}...` : "null";

        errorMessage += `\nToken Status: ${tokenSource} (${tokenPrefix})`;

        if (!token) {
          errorMessage +=
            "\nSuggestion: No GitHub token available. Please set GITHUB_TOKEN environment variable or authenticate with GitHub.";
        } else {
          errorMessage +=
            "\nSuggestion: Token may be expired or invalid. Please check your GitHub token permissions and expiration.";
        }
      }

      // For 404, just return null instead of throwing
      if (response.status === 404) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "User not found",
              twitter_username: null,
            },
            { status: 404 },
          ),
        );
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    const responseObj = NextResponse.json(data);
    return addCorsHeaders(responseObj);
  } catch (error: any) {
    console.error("GitHub Users API Error:", error.message);
    return addCorsHeaders(
      NextResponse.json(
        {
          error: error.message || "Failed to fetch user profile",
          twitter_username: null,
        },
        { status: 500 },
      ),
    );
  }
}
