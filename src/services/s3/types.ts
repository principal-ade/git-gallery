// Types for S3 services - copied from shared lib, will be moved to core later

export interface RepositoryBasicInfo {
  owner: string;
  name: string;
  key: string;
  lastModified: Date;
  size: number;
}

export interface CodeRepository {
  type: "github";
  owner: string;
  repo: string;
  branch: string;
}

// Custom Error Classes for code-city
export class RepositoryNotFoundError extends Error {
  readonly code = "REPOSITORY_NOT_FOUND";
  readonly owner: string;
  readonly repo: string;

  constructor(owner: string, repo: string, message?: string) {
    super(message || `Repository ${owner}/${repo} not found`);
    this.name = "RepositoryNotFoundError";
    this.owner = owner;
    this.repo = repo;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RepositoryNotFoundError);
    }
  }
}

export class FileTreeNotFoundError extends Error {
  readonly code = "FILE_TREE_NOT_FOUND";
  readonly owner: string;
  readonly repo: string;
  readonly key: string;

  constructor(owner: string, repo: string, key: string, message?: string) {
    super(message || `File tree not found for repository ${owner}/${repo}`);
    this.name = "FileTreeNotFoundError";
    this.owner = owner;
    this.repo = repo;
    this.key = key;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileTreeNotFoundError);
    }
  }
}

export class GithubMetadataNotFoundError extends Error {
  readonly code = "GITHUB_METADATA_NOT_FOUND";
  readonly owner: string;
  readonly repo: string;
  readonly key: string;

  constructor(owner: string, repo: string, key: string, message?: string) {
    super(
      message || `Github metadata not found for repository ${owner}/${repo}`,
    );
    this.name = "GithubMetadataNotFoundError";
    this.owner = owner;
    this.repo = repo;
    this.key = key;
  }
}

export class S3OperationError extends Error {
  readonly code = "S3_OPERATION_ERROR";
  readonly operation: string;
  readonly bucket: string;
  readonly key?: string;
  readonly originalError: Error;

  constructor(
    operation: string,
    bucket: string,
    originalError: Error,
    key?: string,
  ) {
    super(`S3 ${operation} operation failed: ${originalError.message}`);
    this.name = "S3OperationError";
    this.operation = operation;
    this.bucket = bucket;
    this.key = key;
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, S3OperationError);
    }
  }
}

export class InvalidRepositoryError extends Error {
  readonly code = "INVALID_REPOSITORY";
  readonly owner: string;
  readonly repo: string;
  readonly reason: string;

  constructor(owner: string, repo: string, reason: string) {
    super(`Invalid repository ${owner}/${repo}: ${reason}`);
    this.name = "InvalidRepositoryError";
    this.owner = owner;
    this.repo = repo;
    this.reason = reason;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidRepositoryError);
    }
  }
}

// Union type for all custom errors
export type CodeCityError =
  | RepositoryNotFoundError
  | FileTreeNotFoundError
  | S3OperationError
  | InvalidRepositoryError;
