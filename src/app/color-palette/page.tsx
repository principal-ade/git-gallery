"use client";

import { DEFAULT_FILE_CONFIGS } from "@/utils/fileColorMapping";
import { fetchColorPaletteConfig } from "@/services/configService";
import { useEffect, useState } from "react";
import { FileSuffixConfig } from "@/utils/fileColorMapping";
import { ColorInfoModal } from "@/components/ColorInfoModal";
import { SuffixDiscoveryPanel } from "@/components/SuffixDiscoveryPanel";
import { useSuffixDiscovery } from "@/hooks/useSuffixDiscovery";

export default function ColorPalettePage() {
  const [config, setConfig] = useState(DEFAULT_FILE_CONFIGS);
  const [selectedConfig, setSelectedConfig] = useState<{
    extension: string;
    config: FileSuffixConfig;
  } | null>(null);
  const [showDiscoveryPanel, setShowDiscoveryPanel] = useState(false);

  // Check for existing GitHub issues
  const { checkExistingIssues, existingIssues } = useSuffixDiscovery();

  useEffect(() => {
    fetchColorPaletteConfig().then((result) => {
      setConfig(result.config);
    });

    // Check for existing GitHub issues
    checkExistingIssues();
  }, [checkExistingIssues]);

  // Sort file extensions alphabetically
  const sortedExtensions = Object.keys(config.suffixConfigs).sort();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3"
              style={{
                fontFamily:
                  '"Crimson Text", "Georgia", "Times New Roman", serif',
              }}
            >
              Git Gallery
            </h1>

            {/* GitHub Issues Badge */}
            {existingIssues && existingIssues.pending > 0 && (
              <button
                onClick={() => setShowDiscoveryPanel(true)}
                className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {existingIssues.pending} Missing Colors
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiscoveryPanel(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Discover Suffixes
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Create Your Mosaic
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
              We could use some help with our colors!{" "}
              <a
                href="https://github.com/a24z-ai/git-gallery-palette"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
              >
                Contribute
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-10 py-10">
        <div className="mb-8">
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center">
            Explore colors and render strategies for different file types
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {sortedExtensions.map((extension) => {
            const configData = config.suffixConfigs[extension];
            const displayName =
              configData.displayName || extension.substring(1).toUpperCase();

            return (
              <div
                key={extension}
                onClick={() =>
                  setSelectedConfig({ extension, config: configData })
                }
                className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center space-x-3"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                    style={{
                      backgroundColor: configData.primary.color,
                      opacity: configData.primary.opacity,
                    }}
                    title={`Primary: ${configData.primary.color}`}
                  />
                  {configData.secondary && (
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-sm border border-white dark:border-gray-800"
                      style={{
                        backgroundColor: configData.secondary.color,
                        opacity: configData.secondary.opacity,
                      }}
                      title={`Secondary: ${configData.secondary.color}`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {displayName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                    {extension}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        <ColorInfoModal
          selectedConfig={selectedConfig}
          onClose={() => setSelectedConfig(null)}
        />

        {/* Suffix Discovery Panel */}
        {showDiscoveryPanel && (
          <SuffixDiscoveryPanel
            fileTree={null} // Will need to be provided when user loads a repo
            onClose={() => setShowDiscoveryPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
