import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getAuthToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  // First try to use the user's token if they're authenticated
  if (session?.accessToken) {
    return session.accessToken;
  }

  // Fall back to the environment variable token
  return process.env.GITHUB_TOKEN || null;
}
