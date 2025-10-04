"use client";

import React, { useState, useEffect } from "react";
import { Grid3x3, Loader2, ImageOff, MessageCircle } from "lucide-react";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../mosaic/components/MosaicTheme";
import Link from "next/link";

interface GalleryItem {
  owner: string;
  repo: string;
  repoPath: string;
  imageUrl: string;
  createdAt: string;
  stats?: {
    name: string;
    fullName: string;
    description: string;
    stars: number;
    language: string;
    createdAt: string;
    updatedAt: string;
  };
}

function MosaicGalleryContent() {
  const theme = useMosaicTheme();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch gallery items
  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the gallery data from the API
      const response = await fetch("/api/gallery");
      if (!response.ok) {
        throw new Error("Failed to fetch gallery items");
      }

      const data = await response.json();
      // Items are already sorted by S3 metadata (most recent first)
      setGalleryItems(data.items || []);
    } catch (err) {
      console.error("Failed to load gallery:", err);
      setError("Failed to load gallery items. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
        position: "relative",
      }}
    >
      {/* Discord Button - Absolute positioned top right */}
      <a
        href="https://discord.gg/qj66tT9c"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: theme.colors.backgroundSecondary,
          color: theme.colors.text,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`,
          fontSize: theme.fontSizes.sm,
          fontWeight: theme.fontWeights.medium,
          textDecoration: "none",
          transition: "all 0.2s ease",
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            theme.colors.backgroundTertiary;
          e.currentTarget.style.borderColor = theme.colors.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            theme.colors.backgroundSecondary;
          e.currentTarget.style.borderColor = theme.colors.border;
        }}
      >
        <MessageCircle size={14} />
        Join Discord
      </a>

      {/* Header Section */}
      <section
        style={{
          padding: "2rem 1.5rem",
          maxWidth: "1400px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <h1
            style={{
              fontSize: theme.fontSizes["5xl"],
              fontWeight: theme.fontWeights.bold,
              fontFamily: theme.fonts.heading,
              lineHeight: "1.1",
              marginBottom: "1rem",
              background:
                "linear-gradient(135deg, #d4a574 0%, #e0b584 50%, #c9b8a3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.02em",
              textShadow: "0 2px 4px rgba(212, 165, 116, 0.1)",
              cursor: "pointer",
            }}
          >
            Git Gallery
          </h1>
        </Link>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: theme.colors.primaryLight,
            color: theme.colors.primary,
            padding: "0.5rem 1rem",
            borderRadius: theme.radius.full,
            fontSize: theme.fontSizes.sm,
            fontWeight: theme.fontWeights.medium,
            marginBottom: "2rem",
          }}
        >
          <Grid3x3 size={16} />
          Community Showcase
        </div>
      </section>

      {/* Gallery Grid */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 1.5rem 4rem",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              gap: "1rem",
              color: theme.colors.textSecondary,
            }}
          >
            <Loader2
              size={32}
              style={{
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ fontSize: theme.fontSizes.base }}>Loading gallery...</p>
          </div>
        ) : error ? (
          <div
            style={{
              backgroundColor: "rgba(168, 87, 81, 0.1)",
              border: `1px solid ${theme.colors.error}`,
              borderRadius: theme.radius.xl,
              padding: "2rem",
              textAlign: "center",
              color: theme.colors.error,
            }}
          >
            <p>{error}</p>
          </div>
        ) : galleryItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              color: theme.colors.textMuted,
            }}
          >
            <ImageOff
              size={48}
              style={{ marginBottom: "1rem", opacity: 0.5 }}
            />
            <p style={{ fontSize: theme.fontSizes.lg, marginBottom: "0.5rem" }}>
              No mosaics found
            </p>
            <p style={{ fontSize: theme.fontSizes.sm }}>
              Be the first to create one!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "2rem",
            }}
          >
            {galleryItems.map((item) => (
              <GalleryCard
                key={`${item.owner}/${item.repo}`}
                item={item}
                theme={theme}
              />
            ))}
          </div>
        )}
      </section>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Gallery Card Component - Simple image-only cards
function GalleryCard({ item, theme }: { item: GalleryItem; theme: any }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link href={`/mosaic/${item.repoPath}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          cursor: "pointer",
          transition: "transform 0.2s ease",
          border: `2px solid ${theme.colors.primary}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {!imageError ? (
          <img
            src={item.imageUrl}
            alt={`${item.repo} visualization`}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              minHeight: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.backgroundTertiary,
              color: theme.colors.textMuted,
            }}
          >
            <ImageOff size={32} />
          </div>
        )}
      </div>
    </Link>
  );
}

export default function MosaicGalleryPage() {
  return (
    <MosaicThemeProvider>
      <MosaicGalleryContent />
    </MosaicThemeProvider>
  );
}
