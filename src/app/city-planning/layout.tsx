import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City Planning - Configure Your Code City Grid Layout",
  description:
    "Design and configure custom grid layouts for your codebase visualization. Create organized, intuitive architecture maps with the City Planning tool.",
  keywords: [
    "code city",
    "grid layout",
    "repository visualization",
    "architecture planning",
    "codebase organization",
    "development tools",
  ],
  authors: [{ name: "Principle MD Team" }],

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    title: "City Planning - Configure Your Code City Grid Layout",
    description: "Design custom grid layouts for your codebase visualization",
    type: "website",
    url: "https://principle-md.com/city-planning",
    siteName: "City Planning",
    images: [
      {
        url: "/api/og/city-planning/default",
        width: 1200,
        height: 630,
        alt: "City Planning - Grid Layout Configuration Tool",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "City Planning - Configure Your Code City Grid Layout",
    description: "Design custom grid layouts for your codebase visualization",
    images: ["/api/og/city-planning/default"],
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
    canonical: "https://principle-md.com/city-planning",
  },

  // Viewport
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function CityPlanningLayout({
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
            name: "City Planning",
            description:
              "Design and configure custom grid layouts for your codebase visualization",
            url: "https://principle-md.com/city-planning",
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
