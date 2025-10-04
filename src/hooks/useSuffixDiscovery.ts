import { useState, useCallback } from "react";

export interface SuffixDiscoveryResult {
  stats: {
    total: number;
    withColors: number;
    withoutColors: number;
    existingIssues: number;
    newIssues: number;
  };
  missingSuffixes: Array<{
    suffix: string;
    count: number;
    hasIssue: boolean;
    issueUrl?: string;
  }>;
  report: string;
}

export interface ExistingIssuesResult {
  totalIssues: number;
  resolved: number;
  pending: number;
  issues: Array<{
    suffix: string;
    issueNumber: number;
    title: string;
    url: string;
    hasColor: boolean;
    createdAt: string;
  }>;
}

export function useSuffixDiscovery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuffixDiscoveryResult | null>(null);
  const [existingIssues, setExistingIssues] =
    useState<ExistingIssuesResult | null>(null);

  const discoverSuffixes = useCallback(
    async (
      fileTree: any,
      options: {
        autoCreateIssues?: boolean;
        minOccurrences?: number;
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/suffix-discovery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileTree,
            autoCreateIssues: options.autoCreateIssues ?? true,
            minOccurrences: options.minOccurrences || 10,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to discover suffixes");
        }

        const data = (await response.json()) as {
          success: boolean;
        } & SuffixDiscoveryResult;
        setResult(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const checkExistingIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/suffix-discovery", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch existing issues");
      }

      const data = (await response.json()) as ExistingIssuesResult;
      setExistingIssues(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    discoverSuffixes,
    checkExistingIssues,
    loading,
    error,
    result,
    existingIssues,
  };
}
