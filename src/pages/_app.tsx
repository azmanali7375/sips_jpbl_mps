import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import { errorLogger } from "@/services/errorLoggerService";
import { ErrorLogPanel } from "@/components/ErrorLogPanel";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Log navigation events
    const handleRouteChangeStart = (url: string) => {
      errorLogger.logNavigation("Route change started", {
        from: router.pathname,
        to: url,
      });
    };

    const handleRouteChangeComplete = (url: string) => {
      errorLogger.logNavigation("Route change completed", {
        to: url,
      });
    };

    const handleRouteChangeError = (err: any, url: string) => {
      errorLogger.logNavigation("Route change error", {
        from: router.pathname,
        to: url,
        error: err?.message || String(err),
      });
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);
    router.events.on("routeChangeError", handleRouteChangeError);

    // Check authentication on mount
    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      errorLogger.logAuth(`Auth state changed: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
      });

      if (event === "SIGNED_IN" && session) {
        await checkUserStatus();
      } else if (event === "SIGNED_OUT") {
        if (!router.pathname.startsWith("/auth") && !router.pathname.startsWith("/daftar") && !router.pathname.startsWith("/login")) {
          errorLogger.logNavigation("Redirecting to login (signed out)", {
            from: router.pathname,
          });
          router.push("/auth/login");
        }
      }
    });

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      router.events.off("routeChangeError", handleRouteChangeError);
      subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const publicRoutes = [
        "/auth/login",
        "/auth/register",
        "/daftar",
        "/login",
        "/status-gate",
      ];
      const isPublicRoute = publicRoutes.some((route) =>
        router.pathname.startsWith(route)
      );

      errorLogger.logAuth("Auth check", {
        hasSession: !!session,
        pathname: router.pathname,
        isPublicRoute,
      });

      if (!session && !isPublicRoute) {
        errorLogger.logNavigation("Redirecting to login (no session)", {
          from: router.pathname,
        });
        router.push("/auth/login");
      } else if (session && !isPublicRoute) {
        await checkUserStatus();
      }
    } catch (error: any) {
      errorLogger.logAuth("Auth check failed", { pathname: router.pathname }, error);
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
      if (!user) {
        errorLogger.logAuth("No user found in session");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        errorLogger.logRLS("Profile fetch failed", {
          userId: user.id,
          error: profileError.message,
          code: profileError.code,
        });
      }

      if (!profile) {
        errorLogger.logAuth("Profile not found for user", { userId: user.id });
        await supabase.auth.signOut();
        router.push("/auth/login");
        return;
      }

      errorLogger.logAuth("User status checked", {
        userId: user.id,
        status: profile.status,
        role: profile.role,
        pathname: router.pathname,
      });

      if (profile.status !== "Aktif" && !router.pathname.startsWith("/status-gate")) {
        errorLogger.logNavigation("Redirecting to status gate", {
          from: router.pathname,
          status: profile.status,
        });
        router.push("/status-gate");
      } else if (
        profile.status === "Aktif" &&
        router.pathname.startsWith("/status-gate")
      ) {
        errorLogger.logNavigation("Redirecting active user to dashboard", {
          from: router.pathname,
        });
        router.push("/dashboard");
      }
    } catch (error: any) {
      errorLogger.logAuth("Status check failed", { error: error?.message }, error);
      console.error("Status check error:", error);
    }
  }

  if (loading && !router.pathname.startsWith("/auth") && !router.pathname.startsWith("/daftar") && !router.pathname.startsWith("/login")) {
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
      <ErrorLogPanel />
    </>
  );
}