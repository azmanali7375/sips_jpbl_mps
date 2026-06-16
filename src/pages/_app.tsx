import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Initial auth check
    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        setAuthChecked(true);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setAuthChecked(true);
        setLoading(false);
        // Only redirect if on protected page
        if (!router.pathname.startsWith("/auth") && !router.pathname.startsWith("/daftar") && !router.pathname.startsWith("/login")) {
          router.push("/auth/login");
        }
      } else if (event === "TOKEN_REFRESHED") {
        setAuthChecked(true);
        setLoading(false);
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
      const publicRoutes = ["/auth/login", "/auth/register", "/daftar", "/login", "/status-gate"];
      const isPublicRoute = publicRoutes.some((route) =>
        router.pathname.startsWith(route)
      );

      if (!session && !isPublicRoute) {
        // Not logged in and trying to access protected page
        router.push("/auth/login");
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      if (session && !isPublicRoute) {
        // Logged in - verify profile status
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          // Profile not found
          await supabase.auth.signOut();
          router.push("/auth/login");
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        // Check if user should be on status gate
        if (profile.status !== "Aktif" && !router.pathname.startsWith("/status-gate")) {
          router.push("/status-gate");
          setLoading(false);
          setAuthChecked(true);
          return;
        }
      }

      // All checks passed
      setLoading(false);
      setAuthChecked(true);
    } catch (error) {
      console.error("Auth check error:", error);
      setLoading(false);
      setAuthChecked(true);
    }
  }

  // Show loading only on initial load for non-public pages
  const publicPaths = ["/auth/login", "/auth/register", "/daftar", "/login"];
  const isPublicPath = publicPaths.some((path) => router.pathname.startsWith(path));

  if (loading && !isPublicPath && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuatkan...</p>
        </div>
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