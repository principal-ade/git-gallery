import { NextRequest, NextResponse } from "next/server";
import { getAssetDownloadUrl } from "@/config/desktop-app";

// This endpoint proxies download requests to GitHub releases
// Uses the same security token as the releases endpoint
const RELEASES_ONLY_TOKEN = process.env.GITHUB_RELEASES_READONLY_TOKEN;

export async function GET(request: NextRequest) {
  try {
    // Get the asset ID and filename from query parameters
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const filename = searchParams.get("filename");

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 },
      );
    }

    if (!RELEASES_ONLY_TOKEN) {
      const isDevelopment = process.env.NODE_ENV === "development";

      if (isDevelopment) {
        console.log("========================================");
        console.log("🔧 DEVELOPMENT MODE - Download Request");
        console.log("========================================");
        console.log(`Attempted download of asset ID: ${assetId}`);
        console.log(`Filename: ${filename || "not provided"}`);
        console.log("");
        console.log("In production, this would download from GitHub releases.");
        console.log("Token required: GITHUB_RELEASES_READONLY_TOKEN");
        console.log("========================================");

        // In development, return a helpful message instead of error
        return NextResponse.json(
          {
            message: "Download would work in production with proper token",
            assetId,
            filename,
            note: "Set GITHUB_RELEASES_READONLY_TOKEN in .env.local to test downloads",
          },
          { status: 200 },
        );
      }

      console.error(
        "[SECURITY] Missing GITHUB_RELEASES_READONLY_TOKEN for download",
      );
      return NextResponse.json(
        { error: "Download service not configured" },
        { status: 500 },
      );
    }

    // SECURITY: Only allow downloads from our specific repository
    const DOWNLOAD_ENDPOINT = getAssetDownloadUrl(assetId);

    // Fetch the asset from GitHub with proper authentication
    const response = await fetch(DOWNLOAD_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${RELEASES_ONLY_TOKEN}`,
        Accept: "application/octet-stream", // This tells GitHub to return the binary file
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      console.error("[SECURITY] GitHub download error:", response.status);

      if (response.status === 404) {
        return NextResponse.json(
          { error: "Download not found" },
          { status: 404 },
        );
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Download access denied" },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "Download failed" },
        { status: response.status },
      );
    }

    // Use the filename from query params or try to get it from headers
    let downloadFilename = filename || "download";

    // Try to get filename from GitHub's response headers if not provided
    if (!filename) {
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          downloadFilename = match[1];
        }
      }
    }

    // Determine content type based on file extension
    const getContentType = (filename: string) => {
      const ext = filename.toLowerCase().split(".").pop();
      const contentTypes: { [key: string]: string } = {
        dmg: "application/x-apple-diskimage",
        exe: "application/x-msdownload",
        msi: "application/x-msi",
        deb: "application/vnd.debian.binary-package",
        rpm: "application/x-rpm",
        appimage: "application/x-executable",
        zip: "application/zip",
        "tar.gz": "application/gzip",
        gz: "application/gzip",
      };
      return contentTypes[ext || ""] || "application/octet-stream";
    };

    // Stream the file content back to the user
    const headers = new Headers();
    headers.set("Content-Type", getContentType(downloadFilename));
    headers.set(
      "Content-Disposition",
      `attachment; filename="${downloadFilename}"`,
    );
    headers.set(
      "Content-Length",
      response.headers.get("content-length") || "0",
    );

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[SECURITY] Error in download endpoint:", error);
    return NextResponse.json(
      { error: "Download service unavailable" },
      { status: 500 },
    );
  }
}
