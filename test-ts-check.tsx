import { GitHubService } from "./src/services/githubService";

async function testComponent() {
  const githubService = new GitHubService();

  // Use the public fetchFileSystemTree method instead
  const tree = await githubService.fetchFileSystemTree("owner", "repo", "main");

  return tree;
}

export default testComponent;
