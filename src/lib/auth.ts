import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

// Define GitHub profile type without extending Profile to avoid conflicts
interface GitHubProfile {
  login: string;
  id: number;
  name?: string | null;
  email?: string | null;
  image?: string;
  [key: string]: any;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo write:discussion workflow",
          prompt: "consent", // Only show consent screen, not login if already authenticated
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        // Cast profile to GitHubProfile to access GitHub-specific fields
        const githubProfile = profile as GitHubProfile;

        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : null, // Convert to ms
          refreshToken: account.refresh_token,
          login: githubProfile.login,
          id: String(githubProfile.id),
        };
      }

      // Return previous token if the access token has not expired yet
      if (
        token.accessTokenExpires === null ||
        Date.now() < (token.accessTokenExpires as number)
      ) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.login = token.login as string;
        session.user.id = token.id as string;
      }
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: any) {
  try {
    // GitHub OAuth tokens don't expire by default, but if we had a refresh token mechanism:
    // const url = "https://github.com/login/oauth/access_token"
    // const response = await fetch(url, { ... })

    // For now, just mark the token as needing re-authentication
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Extend the built-in session/user types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
      login: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number | null;
    refreshToken?: string;
    login?: string;
    id?: string;
    error?: string;
  }
}
