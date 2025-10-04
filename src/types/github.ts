export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  isValid: boolean;
  isPublic: boolean;
}

export interface License {
  key: string;
  name: string;
  spdx_id: string;
  url: string;
  node_id: string;
}

export interface RepoMetadata {
  name: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  updatedAt: string;
  defaultBranch: string;
  htmlUrl: string;
  size: number;
  openIssues: number;
  license?: License | null;
  createdAt: string;
  pushedAt: string;
  ageInDays: number;
  daysSinceLastPush: number;
  activityStatus: "active" | "moderate" | "slow" | "inactive";
  ownerAvatar?: string;
  isFork?: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  headRef: string;
  baseRef: string;
  htmlUrl: string;
  body?: string;
}

export interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string; // For renamed files
}

export interface PRComment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string; // For file-specific comments
  line?: number; // For line-specific comments
  commit_id?: string;
  original_commit_id?: string;
  diff_hunk?: string;
  position?: number;
  original_position?: number;
  in_reply_to_id?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

// GitHub API response types (raw)
export interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string;
  fork: boolean;
  size: number;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
  created_at: string;
  pushed_at: string;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  } | null;
}

export interface GitHubPRResponse {
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  changed_files: number;
  additions: number;
  deletions: number;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  html_url: string;
  body: string;
}

export interface GitHubPRFileResponse {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubPRCommentResponse {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
  line?: number;
  commit_id?: string;
  original_commit_id?: string;
  diff_hunk?: string;
  position?: number;
  original_position?: number;
  in_reply_to_id?: number;
}

// New interfaces for maintainer information
export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: "User" | "Bot";
  contributions: number;
}

export interface Collaborator {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: "User" | "Bot";
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  role_name?: string;
}

export interface UserProfile {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: "User" | "Organization" | "Bot";
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  bio?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  twitter_username?: string;
}

export interface MaintainerInfo {
  login: string;
  avatar_url: string;
  html_url: string;
  type: "User" | "Bot";
  contributions?: number;
  role: "owner" | "maintainer" | "contributor";
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  profile?: {
    name?: string;
    company?: string;
    blog?: string;
    location?: string;
    bio?: string;
  };
}
