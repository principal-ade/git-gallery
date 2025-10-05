"use client";

import { useState, type FormEvent } from "react";

import type { GalleryRecord } from "@/types/gallery";

interface GalleryManagerProps {
  initialGalleries: GalleryRecord[];
  initialError?: string | null;
  currentUserLogin: string;
}

interface CreateGalleryFormState {
  name: string;
  description: string;
  allowPublicSubmissions: boolean;
}

export default function GalleryManager({
  initialGalleries,
  initialError,
  currentUserLogin,
}: GalleryManagerProps) {
  const [galleries, setGalleries] = useState<GalleryRecord[]>(initialGalleries);
  const [formState, setFormState] = useState<CreateGalleryFormState>({
    name: "",
    description: "",
    allowPublicSubmissions: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError || null,
  );
  const [updatingGalleryId, setUpdatingGalleryId] = useState<string | null>(
    null,
  );

  const resetMessages = () => {
    setErrorMessage(null);
    setActionMessage(null);
  };

  const handleCreateGallery = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!formState.name.trim()) {
      setErrorMessage("Gallery name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formState.name.trim(),
          description: formState.description.trim() || undefined,
          allowPublicSubmissions: formState.allowPublicSubmissions,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        gallery: GalleryRecord;
        error?: string;
      } | null;

      if (!response.ok || !data?.gallery) {
        throw new Error(data?.error || "Failed to create gallery");
      }

      setGalleries((current) => [data.gallery, ...current]);
      setFormState({
        name: "",
        description: "",
        allowPublicSubmissions: false,
      });
      setActionMessage(`Gallery “${data.gallery.name}” created successfully`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublicSubmissions = async (
    galleryId: string,
    allowPublicSubmissions: boolean,
  ) => {
    resetMessages();
    setUpdatingGalleryId(galleryId);

    try {
      const response = await fetch(`/api/galleries/${galleryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ allowPublicSubmissions }),
      });

      const data = (await response.json().catch(() => null)) as {
        gallery: GalleryRecord;
        error?: string;
      } | null;

      if (!response.ok || !data?.gallery) {
        throw new Error(data?.error || "Failed to update gallery");
      }

      setGalleries((current) =>
        current.map((gallery) =>
          gallery.id === galleryId ? data.gallery : gallery,
        ),
      );
      setActionMessage(
        allowPublicSubmissions
          ? "Gallery is now open for public submissions"
          : "Gallery submissions are limited to organizers",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingGalleryId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-white">Gallery manager</h1>
        <p className="text-gray-300">
          Signed in as <span className="font-medium">{currentUserLogin}</span>.
          Create hackathon galleries and control whether anyone can add
          repositories.
        </p>
      </header>

      <section className="p-8 border border-gray-800 bg-gray-900/70 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Create a new gallery
        </h2>
        <form className="space-y-6" onSubmit={handleCreateGallery}>
          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-gray-200">
              Gallery name
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Winter Hackathon 2025"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-gray-200">
              Description (optional)
            </label>
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Share context for participants about this gallery"
            />
          </div>

          <label className="flex items-center gap-3 text-left">
            <input
              type="checkbox"
              checked={formState.allowPublicSubmissions}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  allowPublicSubmissions: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-gray-700 bg-gray-950 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-200">
              Allow anyone with the link to add repositories to this gallery
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-5 py-2 text-white font-medium transition"
          >
            {isSubmitting ? "Creating…" : "Create gallery"}
          </button>
        </form>
      </section>

      {(errorMessage || actionMessage) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            errorMessage
              ? "border-red-500 bg-red-900/30 text-red-200"
              : "border-emerald-500 bg-emerald-900/30 text-emerald-200"
          }`}
        >
          {errorMessage || actionMessage}
        </div>
      )}

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">
          Existing galleries
        </h2>

        {galleries.length === 0 ? (
          <p className="text-gray-400">
            No galleries yet. Create one above to get started.
          </p>
        ) : (
          <ul className="space-y-4">
            {galleries.map((gallery) => (
              <li
                key={gallery.id}
                className="border border-gray-800 bg-gray-900/60 rounded-2xl p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">
                        {gallery.name}
                      </h3>
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
                        Created {new Date(gallery.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {gallery.description && (
                      <p className="text-gray-300 max-w-3xl">
                        {gallery.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-400">
                      Owner: {gallery.createdBy || "Unknown"} (
                      {gallery.createdByLogin || "unknown"})
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={`/my-galleries/${gallery.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/my-galleries/${gallery.id}`
                          : `/my-galleries/${gallery.id}`}
                      </a>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/my-galleries/${gallery.id}`;
                          navigator.clipboard.writeText(url);
                          setActionMessage("Gallery link copied to clipboard!");
                          setTimeout(() => setActionMessage(null), 3000);
                        }}
                        className="text-gray-400 hover:text-white transition"
                        title="Copy link"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    <label className="flex items-center gap-3 text-left">
                      <input
                        type="checkbox"
                        checked={gallery.allowPublicSubmissions}
                        onChange={(event) =>
                          handleTogglePublicSubmissions(
                            gallery.id,
                            event.target.checked,
                          )
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-950 text-blue-500 focus:ring-blue-500"
                        disabled={updatingGalleryId === gallery.id}
                      />
                      <span className="text-gray-200">
                        {gallery.allowPublicSubmissions
                          ? "Open to public submissions"
                          : "Only organizers can add repos"}
                      </span>
                    </label>
                    {updatingGalleryId === gallery.id && (
                      <span className="text-xs text-gray-400">Saving…</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
