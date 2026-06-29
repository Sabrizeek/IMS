"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Protects a page for a specific role.
 * Redirects to `redirectTo` only after hydration is complete AND
 * there is confirmed no valid session — never while a token exists in
 * sessionStorage (which means hydration might still be in flight).
 */
export function useAuthGuard(requiredRole: "student" | "department", redirectTo: string) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // While hydrating, do nothing — sessionStorage token means session may still load
    if (!ready) return;

    // If there is a token in sessionStorage for this specific role, assume session is valid until proven otherwise
    const hasToken = typeof window !== "undefined" && !!sessionStorage.getItem(`ims.${requiredRole}.token`);
    if (hasToken && !user) return; // still loading

    // Now we can safely redirect if the role doesn't match
    if (!user || user.role !== requiredRole) {
      router.replace(redirectTo);
    }
  }, [ready, user, router, requiredRole, redirectTo]);

  return { ready, user };
}
