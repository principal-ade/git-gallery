import type { Metadata } from "next";
import { mosaicImageClient } from "../../../../services/mosaicImageService";

// This will be enhanced with dynamic metadata generation
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  const repoPath = `${owner}/${repo}`;

  // Check if we have a generated mosaic image, otherwise fall back to generic OG image
  const existingImageUrl = await mosaicImageClient.getExistingImageUrl(
    owner,
    repo,
  );
  const imageUrl = existingImageUrl || `/api/og/mosaic/${owner}/${repo}`;

  return {
    title: `${repoPath} - Git Gallery Visualization`,
    description: `Explore the architecture of ${repoPath} through an interactive code mosaic. See how this repository is structured with beautiful visualizations.`,
    keywords: [
      "github",
      repoPath,
      owner,
      repo,
      "code visualization",
      "repository architecture",
      "open source",
    ],

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
      title: `${repoPath} - Repository Mosaic`,
      description: `Explore the architecture of ${repoPath} through an interactive code mosaic`,
      type: "website",
      url: `https://principle-md.com/mosaic/${owner}/${repo}`,
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
      title: `${repoPath} - Repository Mosaic`,
      description: `Explore the architecture of ${repoPath} through an interactive code mosaic`,
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
      canonical: `https://principle-md.com/mosaic/${owner}/${repo}`,
    },
  };
}

export default async function RepoMosaicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const repoPath = `${owner}/${repo}`;

  return (
    <>
      {children}

      {/* JSON-LD structured data for the specific repository */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: `${repoPath} Architecture Mosaic`,
            description: `Interactive visualization of the ${repoPath} repository architecture`,
            url: `https://principle-md.com/mosaic/${owner}/${repo}`,
            creator: {
              "@type": "Organization",
              name: "Git Gallery",
              url: "https://principle-md.com/mosaic",
            },
            about: {
              "@type": "SoftwareSourceCode",
              name: repoPath,
              codeRepository: `https://github.com/${owner}/${repo}`,
            },
            mainEntity: {
              "@type": "SoftwareSourceCode",
              name: repo,
              author: {
                "@type": "Person",
                name: owner,
              },
              codeRepository: `https://github.com/${owner}/${repo}`,
            },
          }),
        }}
      />
    </>
  );
}
