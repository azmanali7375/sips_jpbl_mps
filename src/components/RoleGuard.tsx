/**
 * RoleGuard Component
 * Conditionally renders children based on user role
 * 
 * Usage:
 * <RoleGuard roles={['admin', 'ketua_unit']}>
 *   <Button>Jana Borang C1</Button>
 * </RoleGuard>
 * 
 * <RoleGuard roles={['pegawai']} readOnly>
 *   <FormComponent />
 * </RoleGuard>
 */

import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RoleGuardProps {
  roles: string[];
  children: ReactNode;
  readOnly?: boolean;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, children, readOnly = false, fallback = null }: RoleGuardProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (profile && profile.status === "Aktif") {
        setUserRole(profile.role);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  // Check if user has required role
  const hasPermission = userRole && roles.includes(userRole);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // If readOnly mode, disable all inputs and buttons
  if (readOnly) {
    return (
      <div className="pointer-events-none opacity-60">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to get current user role
 */
export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status, full_name")
        .eq("id", user.id)
        .single();

      if (profile && profile.status === "Aktif") {
        setUserRole(profile.role);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setLoading(false);
    }
  }

  return { userRole, loading };
}