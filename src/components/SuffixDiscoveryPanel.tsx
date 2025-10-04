"use client";

import { useState, useEffect } from "react";
import { useSuffixDiscovery } from "@/hooks/useSuffixDiscovery";

interface SuffixDiscoveryPanelProps {
  fileTree?: { allFiles?: Array<{ path: string }> } | null;
  onClose?: () => void;
}

export function SuffixDiscoveryPanel({
  fileTree,
  onClose,
}: SuffixDiscoveryPanelProps) {
  const {
    discoverSuffixes,
    checkExistingIssues,
    loading,
    error,
    result,
    existingIssues,
  } = useSuffixDiscovery();

  const [minOccurrences, setMinOccurrences] = useState(10);

  // Check existing issues on mount
  useEffect(() => {
    checkExistingIssues();
  }, []);

  const handleDiscover = async () => {
    if (!fileTree) {
      alert("No file tree available. Please load a repository first.");
      return;
    }

    await discoverSuffixes(fileTree, {
      autoCreateIssues: false, // Just analyze, don't create issues
      minOccurrences,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Suffix Discovery & Tracking
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Find file extensions without color configurations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Existing Issues Summary */}
          {existingIssues && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                GitHub Issue Status
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-400">
                    Total Issues:
                  </span>
                  <span className="ml-2 font-mono font-semibold">
                    {existingIssues.totalIssues}
                  </span>
                </div>
                <div>
                  <span className="text-green-700 dark:text-green-400">
                    Resolved:
                  </span>
                  <span className="ml-2 font-mono font-semibold">
                    {existingIssues.resolved}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700 dark:text-amber-400">
                    Pending:
                  </span>
                  <span className="ml-2 font-mono font-semibold">
                    {existingIssues.pending}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Occurrences
                </label>
                <input
                  type="number"
                  min="1"
                  value={minOccurrences}
                  onChange={(e) => setMinOccurrences(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleDiscover}
                disabled={loading || !fileTree}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Analyzing..." : "Analyze File Tree"}
              </button>
            </div>

            {result?.stats?.newIssues && result.stats.newIssues > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✅ Automatically created {result.stats.newIssues} GitHub
                  issues for missing colors!
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Statistics */}
              <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.stats.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Suffixes
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {result.stats.withColors}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Have Colors
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {result.stats.withoutColors}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Missing Colors
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {result.stats.existingIssues}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Existing Issues
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {result.stats.newIssues}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    New Issues
                  </div>
                </div>
              </div>

              {/* Missing Suffixes List */}
              {result.missingSuffixes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Missing Color Configurations
                  </h3>
                  <div className="space-y-2">
                    {result.missingSuffixes.map((suffix) => (
                      <div
                        key={suffix.suffix}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-semibold text-lg text-gray-900 dark:text-white">
                            {suffix.suffix}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {suffix.count} files
                          </span>
                        </div>
                        <div>
                          {suffix.hasIssue ? (
                            <a
                              href={suffix.issueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View Issue
                            </a>
                          ) : (
                            <span className="text-sm text-amber-600 dark:text-amber-400">
                              No issue yet
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.missingSuffixes.length === 0 && (
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 mx-auto text-green-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    All discovered file extensions have colors!
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    No missing configurations found with {minOccurrences}+
                    occurrences
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
