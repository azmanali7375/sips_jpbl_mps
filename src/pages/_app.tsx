import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // User logged in
        await checkUserStatus();
      } else if (event === "SIGNED_OUT") {
        // User logged out - only redirect if on protected page
        if (!router.pathname.startsWith("/auth")) {
          router.push("/auth/login");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Public routes that don't require auth
      const publicRoutes = ["/auth/login", "/auth/register", "/daftar", "/login"];
      const isPublicRoute = publicRoutes.some((route) =>
        router.pathname.startsWith(route)
      );

      if (!session && !isPublicRoute) {
        // Not logged in and not on public page - redirect to login
        router.push("/auth/login");
      } else if (session && !isPublicRoute) {
        // Logged in - check user status
        await checkUserStatus();
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function checkUserStatus() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // Profile not found - sign out
        await supabase.auth.signOut();
        router.push("/auth/login");
        return;
      }

      // Check if user should be on status gate page
      if (profile.status !== "Aktif" && !router.pathname.startsWith("/status-gate")) {
        router.push("/status-gate");
      } else if (
        profile.status === "Aktif" &&
        router.pathname.startsWith("/status-gate")
      ) {
        // Active user on status gate - redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  }

  // Show loading on initial auth check
  if (loading && !router.pathname.startsWith("/auth")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Memuatkan...</p>
      </div>
    );
  }

  return (
    <>
      <Component {...pageProps} />
      <Toaster />
    </>
  );
}
