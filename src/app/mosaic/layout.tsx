import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Git Gallery - Visualize Your GitHub Repository",
  description:
    "Transform your codebase into a beautiful, shareable architecture mosaic. Discover patterns in your code through stunning visual representations.",
  keywords: [
    "github",
    "code visualization",
    "repository",
    "architecture",
    "development",
    "open source",
  ],
  authors: [{ name: "Git Gallery Team" }],

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    title: "Git Gallery - Visualize Your GitHub Repository",
    description:
      "Transform your codebase into a beautiful, shareable architecture mosaic",
    type: "website",
    url: "https://principle-md.com/mosaic",
    siteName: "Git Gallery",
    images: [
      {
        url: "/api/og/mosaic/default",
        width: 1200,
        height: 630,
        alt: "Git Gallery - Repository Visualization Tool",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "Git Gallery - Visualize Your GitHub Repository",
    description:
      "Transform your codebase into a beautiful, shareable architecture mosaic",
    images: ["/api/og/mosaic/default"],
    creator: "@principlemd",
  },

  // Additional meta tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Canonical URL
  alternates: {
    canonical: "https://principle-md.com/mosaic",
  },

  // Viewport
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function MosaicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Git Gallery",
            description:
              "Transform your GitHub repository into a beautiful, shareable architecture mosaic",
            url: "https://principle-md.com/mosaic",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            creator: {
              "@type": "Organization",
              name: "Principle MD",
              url: "https://principle-md.com",
            },
          }),
        }}
      />
    </>
  );
}
