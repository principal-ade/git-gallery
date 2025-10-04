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
  const imageUrl = existingImageUrl || `/api/og/city-planning/${owner}/${repo}`;

  return {
    title: `${repoPath} - City Planning Grid Layout`,
    description: `Configure and design a custom grid layout for ${repoPath}. Organize your codebase visualization with the City Planning tool.`,
    keywords: [
      "github",
      repoPath,
      owner,
      repo,
      "grid layout",
      "code city",
      "repository organization",
      "architecture planning",
    ],

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
      title: `${repoPath} - City Planning Grid Layout`,
      description: `Configure and design a custom grid layout for ${repoPath}`,
      type: "website",
      url: `https://principle-md.com/city-planning/${owner}/${repo}`,
      siteName: "City Planning",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${repoPath} Grid Layout Configuration`,
        },
      ],
    },

    // Twitter Cards
    twitter: {
      card: "summary_large_image",
      title: `${repoPath} - City Planning Grid Layout`,
      description: `Configure and design a custom grid layout for ${repoPath}`,
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
      canonical: `https://principle-md.com/city-planning/${owner}/${repo}`,
    },
  };
}

export default async function CityPlanningRepoLayout({
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
            name: `${repoPath} Grid Layout Configuration`,
            description: `Interactive grid layout planner for the ${repoPath} repository`,
            url: `https://principle-md.com/city-planning/${owner}/${repo}`,
            creator: {
              "@type": "Organization",
              name: "City Planning",
              url: "https://principle-md.com/city-planning",
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
