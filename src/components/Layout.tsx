import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import type { Tables } from "@/integrations/supabase/types";
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  ClipboardList,
  Users,
  Camera,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await profileService.getCurrentProfile();
    setProfile(data);
  };

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/");
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      applicant: "Pemohon",
      admin_assistant: "Pembantu Tadbir",
      unit_head: "Ketua Unit",
      assistant_planner_j5: "Penolong Pegawai J5",
      department_head: "Ketua Jabatan",
    };
    return labels[role] || role;
  };

  // Role-based navigation items
  const getNavigationItems = () => {
    const common = [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ];

    const roleItems: Record<string, any[]> = {
      applicant: [
        { href: "/dashboard/submit", icon: Upload, label: "Hantar Permohonan" },
        { href: "/dashboard/applications", icon: FileText, label: "Permohonan Saya" },
      ],
      admin_assistant: [
        { href: "/dashboard/register", icon: ClipboardList, label: "Daftar Permohonan" },
        { href: "/dashboard/applications", icon: FileText, label: "Semua Permohonan" },
      ],
      unit_head: [
        { href: "/dashboard/assign", icon: Users, label: "Agih Permohonan" },
        { href: "/dashboard/my-assignments", icon: ClipboardList, label: "Tugasan Saya" },
        { href: "/dashboard/site-visits", icon: Camera, label: "Lawatan Tapak" },
        { href: "/dashboard/reports", icon: FileCheck, label: "Laporan Teknikal" },
        { href: "/dashboard/applications", icon: FileText, label: "Senarai Permohonan" },
      ],
      assistant_planner_j5: [
        { href: "/dashboard/my-assignments", icon: ClipboardList, label: "Tugasan Saya" },
        { href: "/dashboard/site-visits", icon: Camera, label: "Lawatan Tapak" },
        { href: "/dashboard/reports", icon: FileCheck, label: "Laporan Teknikal" },
      ],
      department_head: [
        { href: "/dashboard/review", icon: FileCheck, label: "Semakan Laporan" },
        { href: "/dashboard/recommendations", icon: FileText, label: "Syor Saya" },
      ],
    };

    return [...common, ...(roleItems[profile?.role || ""] || [])];
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 bg-card border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-serif font-bold text-primary">
              Sistem SPC MPS
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Majlis Perbandaran Segamat
            </p>
          </div>

          {/* User info */}
          {profile && (
            <div className="p-4 border-b border-border bg-muted/30">
              <p className="font-medium text-sm">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(profile.role)}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {getNavigationItems().map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm
                    transition-colors
                    ${isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-foreground"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-4 border-t border-border space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4 mr-3" />
              Tetapan
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Log Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}