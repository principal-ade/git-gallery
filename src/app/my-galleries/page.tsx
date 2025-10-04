"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, FolderOpen, Grid3x3 } from "lucide-react";
import {
  MosaicThemeProvider,
  useMosaicTheme,
} from "../mosaic/components/MosaicTheme";
import Link from "next/link";
import { GalleryStorage } from "../../lib/galleryStorage";
import { Gallery } from "../../types/gallery";

function MyGalleriesContent() {
  const theme = useMosaicTheme();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState("");
  const [newGalleryDescription, setNewGalleryDescription] = useState("");
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);

  // Load galleries from localStorage
  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = () => {
    const loaded = GalleryStorage.getAll();
    setGalleries(loaded);
  };

  const handleCreateGallery = () => {
    if (!newGalleryName.trim()) return;

    GalleryStorage.create(newGalleryName.trim(), newGalleryDescription.trim());
    loadGalleries();
    setShowCreateModal(false);
    setNewGalleryName("");
    setNewGalleryDescription("");
  };

  const handleDeleteGallery = (id: string) => {
    if (confirm("Are you sure you want to delete this gallery?")) {
      GalleryStorage.delete(id);
      loadGalleries();
    }
  };

  const handleUpdateGallery = () => {
    if (!editingGallery || !editingGallery.name.trim()) return;

    GalleryStorage.update(editingGallery.id, {
      name: editingGallery.name.trim(),
      description: editingGallery.description?.trim(),
    });
    loadGalleries();
    setEditingGallery(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Header Section */}
      <section
        style={{
          padding: "2rem 1.5rem",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1
                style={{
                  fontSize: theme.fontSizes["4xl"],
                  fontWeight: theme.fontWeights.bold,
                  fontFamily: theme.fonts.heading,
                  lineHeight: "1.1",
                  marginBottom: "0.5rem",
                  background:
                    "linear-gradient(135deg, #d4a574 0%, #e0b584 50%, #c9b8a3 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  cursor: "pointer",
                }}
              >
                My Galleries
              </h1>
            </Link>
            <p
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.textSecondary,
              }}
            >
              Create and manage your custom repository collections
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              ...theme.components.button.primary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <Plus size={20} />
            New Gallery
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: theme.colors.textSecondary,
              fontSize: theme.fontSizes.sm,
              padding: "0.5rem 1rem",
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
              transition: "all 0.2s ease",
            }}
          >
            ← Home
          </Link>
          <Link
            href="/gallery"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: theme.colors.textSecondary,
              fontSize: theme.fontSizes.sm,
              padding: "0.5rem 1rem",
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
              transition: "all 0.2s ease",
            }}
          >
            <Grid3x3 size={16} />
            Community Gallery
          </Link>
        </div>
      </section>

      {/* Galleries Grid */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 1.5rem 4rem",
        }}
      >
        {galleries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.radius.xl,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <FolderOpen
              size={64}
              style={{
                marginBottom: "1rem",
                opacity: 0.5,
                color: theme.colors.textMuted,
              }}
            />
            <h3
              style={{
                fontSize: theme.fontSizes.xl,
                marginBottom: "0.5rem",
                color: theme.colors.text,
              }}
            >
              No galleries yet
            </h3>
            <p
              style={{
                fontSize: theme.fontSizes.base,
                color: theme.colors.textSecondary,
                marginBottom: "1.5rem",
              }}
            >
              Create your first gallery to organize your favorite repositories
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                ...theme.components.button.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <Plus size={20} />
              Create Your First Gallery
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                style={{
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.xl,
                  padding: "1.5rem",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "1rem",
                  }}
                >
                  <Link
                    href={`/my-galleries/${gallery.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      flex: 1,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: theme.fontSizes.lg,
                        fontWeight: theme.fontWeights.semibold,
                        marginBottom: "0.5rem",
                        color: theme.colors.text,
                      }}
                    >
                      {gallery.name}
                    </h3>
                    {gallery.description && (
                      <p
                        style={{
                          fontSize: theme.fontSizes.sm,
                          color: theme.colors.textSecondary,
                          marginBottom: "0.75rem",
                        }}
                      >
                        {gallery.description}
                      </p>
                    )}
                  </Link>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => setEditingGallery({ ...gallery })}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: theme.colors.textMuted,
                        padding: "0.25rem",
                      }}
                      aria-label="Edit gallery"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteGallery(gallery.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: theme.colors.error,
                        padding: "0.25rem",
                      }}
                      aria-label="Delete gallery"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: theme.fontSizes.sm,
                    color: theme.colors.textMuted,
                  }}
                >
                  <Grid3x3 size={16} />
                  <span>
                    {gallery.repos.length}{" "}
                    {gallery.repos.length === 1 ? "repository" : "repositories"}
                  </span>
                </div>

                <Link
                  href={`/my-galleries/${gallery.id}`}
                  style={{
                    ...theme.components.button.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "1rem",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  View Gallery
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create/Edit Gallery Modal */}
      {(showCreateModal || editingGallery) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => {
            setShowCreateModal(false);
            setEditingGallery(null);
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radius["2xl"],
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: theme.colors.shadowXl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3
                style={{
                  fontSize: theme.fontSizes.xl,
                  fontWeight: theme.fontWeights.bold,
                  margin: 0,
                }}
              >
                {editingGallery ? "Edit Gallery" : "Create New Gallery"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGallery(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: theme.colors.textMuted,
                  padding: "0.25rem",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Gallery Name
              </label>
              <input
                type="text"
                value={editingGallery ? editingGallery.name : newGalleryName}
                onChange={(e) =>
                  editingGallery
                    ? setEditingGallery({
                        ...editingGallery,
                        name: e.target.value,
                      })
                    : setNewGalleryName(e.target.value)
                }
                placeholder="My Awesome Repositories"
                style={{
                  ...theme.components.input,
                  width: "100%",
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: theme.fontWeights.medium,
                  marginBottom: "0.5rem",
                  display: "block",
                  color: theme.colors.textSecondary,
                }}
              >
                Description (optional)
              </label>
              <textarea
                value={
                  editingGallery
                    ? editingGallery.description || ""
                    : newGalleryDescription
                }
                onChange={(e) =>
                  editingGallery
                    ? setEditingGallery({
                        ...editingGallery,
                        description: e.target.value,
                      })
                    : setNewGalleryDescription(e.target.value)
                }
                placeholder="A collection of my favorite open source projects"
                style={{
                  ...theme.components.input,
                  width: "100%",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGallery(null);
                  setNewGalleryName("");
                  setNewGalleryDescription("");
                }}
                style={{
                  ...theme.components.button.secondary,
                  flex: 1,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={
                  editingGallery ? handleUpdateGallery : handleCreateGallery
                }
                style={{
                  ...theme.components.button.primary,
                  flex: 1,
                  cursor: "pointer",
                }}
              >
                {editingGallery ? "Save Changes" : "Create Gallery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyGalleriesPage() {
  return (
    <MosaicThemeProvider>
      <MyGalleriesContent />
    </MosaicThemeProvider>
  );
}
