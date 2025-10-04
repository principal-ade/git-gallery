"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Listen for auth errors from API calls
    const handleAuthError = async (event: CustomEvent) => {
      console.log("Auth error detected:", event.detail);

      // Check if we're already in the auth flow to prevent loops
      if (window.location.pathname.includes("/auth/")) {
        console.log("Already in auth flow, skipping redirect");
        return;
      }

      // Check if this is a scope issue
      if (
        event.detail?.status === 403 &&
        event.detail?.endpoint?.includes("/actions/")
      ) {
        console.error(
          "GitHub Actions access denied. You may need to re-authenticate with additional scopes.",
        );
        // Don't auto-redirect for scope issues, let user handle it
        return;
      }

      // Store current location
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "redirectAfterSignIn",
          window.location.pathname + window.location.search,
        );
      }

      // Re-authenticate
      await signIn("github");
    };

    window.addEventListener("auth-error" as any, handleAuthError);

    return () => {
      window.removeEventListener("auth-error" as any, handleAuthError);
    };
  }, [router]);

  // Check for session errors
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.log("Session refresh error detected");

      // Store current location
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "redirectAfterSignIn",
          window.location.pathname + window.location.search,
        );
      }

      // Re-authenticate
      signIn("github");
    }
  }, [session?.error]);

  // Handle redirect after sign-in
  useEffect(() => {
    if (session && !session.error && typeof window !== "undefined") {
      const redirectPath = sessionStorage.getItem("redirectAfterSignIn");
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterSignIn");
        router.push(redirectPath);
      }
    }
  }, [session, router]);

  return <>{children}</>;
}
