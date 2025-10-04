import { Metadata } from "next";
import Link from "next/link";
import { mosaicImageClient } from "../../../../services/mosaicImageService";

interface ShareMetadata {
  owner: string;
  repo: string;
  repoPath: string;
  imageKey: string;
  imageUrl: string;
  createdAt: string;
  stats?: any;
}

async function getShareMetadata(
  owner: string,
  repo: string,
): Promise<ShareMetadata | null> {
  try {
    const metadataKey = `shared-metadata/${owner}/${repo}.json`;
    const metadata =
      await mosaicImageClient.getObject<ShareMetadata>(metadataKey);
    return metadata;
  } catch (error) {
    console.error("Failed to fetch share metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;

  // Try to get metadata from S3
  const metadata = await getShareMetadata(owner, repo);

  const repoPath = metadata?.repoPath || `${owner}/${repo}`;
  const imageUrl =
    metadata?.imageUrl ||
    `https://${process.env.S3_GIT_MOSAICS}.s3.amazonaws.com/mosaics/${owner}/${repo}.png`;

  return {
    title: `${repoPath} - Git Gallery Mosaic`,
    description: `Beautiful architecture visualization of ${repoPath} repository created with Git Gallery`,
    keywords: [
      "github",
      repoPath,
      metadata?.owner || "repository",
      metadata?.repo || "code",
      "code visualization",
      "repository architecture",
      "open source",
      "git gallery",
    ],

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
      title: `${repoPath} - Git Gallery`,
      description: `Beautiful architecture visualization of ${repoPath} repository`,
      type: "website",
      url: `${process.env.BASE_URL || "https://git-gallery.com"}/shared/${owner}/${repo}`,
      siteName: "Git Gallery",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${repoPath} Repository Architecture Visualization`,
        },
      ],
    },

    // Twitter Cards
    twitter: {
      card: "summary_large_image",
      title: `${repoPath} - Git Gallery`,
      description: `Beautiful architecture visualization of ${repoPath}`,
      images: [imageUrl],
      creator: "@principlemd",
    },

    // Additional meta tags
    robots: {
      index: true,
      follow: true,
    },

    // Canonical URL
    alternates: {
      canonical: `${process.env.BASE_URL || "https://principle-md.com"}/shared/${owner}/${repo}`,
    },
  };
}

export default async function SharedMosaicPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  // Get metadata from S3
  const metadata = await getShareMetadata(owner, repo);

  const repoPath = metadata?.repoPath || `${owner}/${repo}`;
  const imageUrl =
    metadata?.imageUrl ||
    `https://${process.env.S3_GIT_MOSAICS}.s3.amazonaws.com/mosaics/${owner}/${repo}.png`;
  const createdAt = metadata ? new Date(metadata.createdAt) : new Date();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: "#1a1f2e",
        color: "#f1e8dc",
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="text-center max-w-5xl mx-auto px-6">
        <div className="mb-8">
          <div className="text-center">
            <h1
              className="text-4xl font-bold mb-2"
              style={{
                fontFamily:
                  '"Crimson Text", "Georgia", "Times New Roman", serif',
                color: "#f1e8dc",
              }}
            >
              Git Gallery
            </h1>
            <div className="text-2xl font-medium">
              <span style={{ color: "#d4a574" }}>M</span>
              <span style={{ color: "#e0b584" }}>o</span>
              <span style={{ color: "#5c8a72" }}>s</span>
              <span style={{ color: "#c9b8a3" }}>a</span>
              <span style={{ color: "#a85751" }}>i</span>
              <span style={{ color: "#8b7968" }}>c</span>
            </div>
          </div>
        </div>

        <div
          className="p-8 mb-8"
          style={{
            backgroundColor: "#212738",
            boxShadow:
              "0 25px 35px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -6px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="mb-6">
            <img
              src={imageUrl}
              alt={`${repoPath} Repository Architecture Visualization`}
              className="w-full"
              style={{ maxWidth: "900px", margin: "0 auto" }}
            />
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {metadata?.owner && (
            <a
              href={`https://github.com/${metadata.owner}/${metadata.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: "transparent",
                color: "#c9b8a3",
                border: "2px solid rgba(212, 165, 116, 0.2)",
              }}
            >
              View on GitHub
            </a>
          )}

          <a
            href={`/mosaic/${owner}/${repo}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: "transparent",
              color: "#c9b8a3",
              border: "2px solid rgba(212, 165, 116, 0.2)",
            }}
          >
            Interactive
          </a>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: "#d4a574",
              color: "#1a1f2e",
              border: "2px solid transparent",
            }}
          >
            Create Your Mosaic
          </Link>
        </div>
      </div>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: `${repoPath} Git Gallery Mosaic`,
            description: `Interactive visualization of ${repoPath} repository architecture`,
            url: `${process.env.BASE_URL || "https://principle-md.com"}/shared/${owner}/${repo}`,
            creator: {
              "@type": "Organization",
              name: "Git Gallery",
              url: `${process.env.BASE_URL || "https://principle-md.com"}/mosaic`,
            },
            dateCreated: createdAt.toISOString(),
            image: imageUrl,
            about: metadata
              ? {
                  "@type": "SoftwareSourceCode",
                  name: metadata.repo,
                  author: {
                    "@type": "Person",
                    name: metadata.owner,
                  },
                  codeRepository: `https://github.com/${metadata.owner}/${metadata.repo}`,
                }
              : undefined,
          }),
        }}
      />
    </div>
  );
}
