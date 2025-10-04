"use client";

import React from "react";
import { FileSuffixConfig } from "@/utils/fileColorMapping";
import Link from "next/link";

interface ColorInfoModalProps {
  selectedConfig: { extension: string; config: FileSuffixConfig } | null;
  onClose: () => void;
}

export const ColorInfoModal: React.FC<ColorInfoModalProps> = ({
  selectedConfig,
  onClose,
}) => {
  if (!selectedConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 shadow-sm"
                style={{
                  backgroundColor: selectedConfig.config.primary.color,
                  opacity: selectedConfig.config.primary.opacity,
                }}
              />
              {selectedConfig.config.secondary && (
                <div
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-md border border-white dark:border-gray-800 shadow-sm"
                  style={{
                    backgroundColor: selectedConfig.config.secondary.color,
                    opacity: selectedConfig.config.secondary.opacity,
                  }}
                />
              )}
            </div>
            <div>
              <h3 className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                {selectedConfig.config.displayName ||
                  selectedConfig.extension.substring(1).toUpperCase()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {selectedConfig.extension}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {selectedConfig.config.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {selectedConfig.config.description}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Primary:</span>
            <div className="flex items-center space-x-2">
              <span
                className="font-mono text-xs px-2 py-1 rounded flex items-center space-x-1"
                style={{
                  backgroundColor:
                    selectedConfig.config.primary.renderStrategy === "fill"
                      ? selectedConfig.config.primary.color
                      : "transparent",
                  border:
                    selectedConfig.config.primary.renderStrategy === "border"
                      ? `2px solid ${selectedConfig.config.primary.color}`
                      : selectedConfig.config.primary.renderStrategy === "glow"
                        ? `1px solid ${selectedConfig.config.primary.color}`
                        : "none",
                  boxShadow:
                    selectedConfig.config.primary.renderStrategy === "glow"
                      ? `0 0 8px ${selectedConfig.config.primary.color}`
                      : "none",
                  opacity: selectedConfig.config.primary.opacity,
                  color:
                    selectedConfig.config.primary.renderStrategy === "fill"
                      ? "#ffffff"
                      : selectedConfig.config.primary.color,
                }}
              >
                {selectedConfig.config.primary.renderStrategy}
              </span>
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                {selectedConfig.config.primary.color}
              </span>
            </div>
          </div>

          {selectedConfig.config.secondary && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Secondary:
              </span>
              <div className="flex items-center space-x-2">
                <span
                  className="font-mono text-xs px-2 py-1 rounded flex items-center space-x-1"
                  style={{
                    backgroundColor:
                      selectedConfig.config.secondary.renderStrategy === "fill"
                        ? selectedConfig.config.secondary.color
                        : "transparent",
                    border:
                      selectedConfig.config.secondary.renderStrategy ===
                      "border"
                        ? `2px solid ${selectedConfig.config.secondary.color}`
                        : selectedConfig.config.secondary.renderStrategy ===
                            "glow"
                          ? `1px solid ${selectedConfig.config.secondary.color}`
                          : "none",
                    boxShadow:
                      selectedConfig.config.secondary.renderStrategy === "glow"
                        ? `0 0 8px ${selectedConfig.config.secondary.color}`
                        : "none",
                    opacity: selectedConfig.config.secondary.opacity,
                    color:
                      selectedConfig.config.secondary.renderStrategy === "fill"
                        ? "#ffffff"
                        : selectedConfig.config.secondary.color,
                  }}
                >
                  {selectedConfig.config.secondary.renderStrategy}
                </span>
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {selectedConfig.config.secondary.color}
                </span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>
                Opacity: {(selectedConfig.config.primary.opacity ?? 1.0) * 100}%
              </span>
              {selectedConfig.config.secondary && (
                <span>
                  Secondary:{" "}
                  {(selectedConfig.config.secondary.opacity ?? 1.0) * 100}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer with links */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
          <Link
            href="/color-palette"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline flex items-center space-x-1"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            <span>View all colors</span>
          </Link>
          <a
            href="https://github.com/a24z-ai/git-gallery-palette"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center space-x-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>Contribute colors</span>
          </a>
        </div>
      </div>
    </div>
  );
};
