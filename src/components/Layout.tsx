import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { kpiWarningService } from "@/services/kpiWarningService";
import { NotificationCenter } from "@/components/NotificationCenter";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Home, 
  FileText, 
  Search, 
  HardHat, 
  FolderOpen, 
  Gavel, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  UserCog,
  FileCheck,
  BookOpen
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: ReactNode;
  href?: string;
  adminOnly?: boolean;
  subItems?: { label: string; href: string }[];
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProfile();
    loadUser();
    
    // Run KPI warning check on page load
    kpiWarningService.checkAndNotify();
  }, []);

  async function loadProfile() {
    const data = await profileService.getCurrentProfile();
    setProfile(data);
  }

  async function loadUser() {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  }

  async function handleLogout() {
    await authService.signOut();
    router.push("/auth/login");
  }

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isAdmin = profile?.role === "admin";

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      href: "/dashboard",
    },
    {
      label: "Permohonan",
      icon: <FileText className="h-5 w-5" />,
      subItems: [
        { label: "Daftar Baharu", href: "/dashboard/daftar-baharu" },
        { label: "Senarai Permohonan", href: "/dashboard/senarai-permohonan" },
      ],
    },
    {
      label: "Semakan Teknikal",
      icon: <Search className="h-5 w-5" />,
      href: "/dashboard/review",
    },
    {
      label: "Lawatan Tapak",
      icon: <HardHat className="h-5 w-5" />,
      href: "/dashboard/my-assignments",
    },
    {
      label: "Dokumen",
      icon: <FolderOpen className="h-5 w-5" />,
      href: "/dashboard/senarai-permohonan",
    },
    {
      label: "Keputusan OSC",
      icon: <Gavel className="h-5 w-5" />,
      href: "/dashboard/osc-decisions",
      adminOnly: true,
    },
    {
      label: "Laporan",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/dashboard/approved-plans",
      adminOnly: true,
    },
    {
      label: "Tetapan",
      icon: <Settings className="h-5 w-5" />,
      subItems: [
        { label: "Pengguna", href: "/dashboard/manage-users" },
        { label: "Garis Panduan", href: "/dashboard/compliance-rules" },
        { label: "Templat Laporan", href: "/dashboard/report-templates" },
      ],
    },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
        <div className="flex h-16 items-center px-4 gap-4">
          {/* Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-primary-foreground hover:bg-primary/80"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* App Name */}
          <div className="flex-1">
            <h1 className="text-lg font-bold">SIPS – Smart Internal Processing System</h1>
            <p className="text-xs text-primary-foreground/80">
              Jabatan Perancang Bandar dan Landskap | Majlis Perbandaran Segamat
            </p>
          </div>

          {/* Right Section: Notifications + User */}
          <div className="flex items-center gap-4">
            <NotificationCenter />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                  {profile?.full_name || user?.email}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar Navigation */}
        <aside
          className={cn(
            "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-card transition-transform duration-200",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="h-full overflow-y-auto p-4">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => (
                <li key={item.label}>
                  {item.subItems ? (
                    <div>
                      <button
                        onClick={() => toggleMenu(item.label)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "hover:bg-muted hover:text-foreground",
                          expandedMenus[item.label] ? "bg-muted text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          {item.icon}
                          {item.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedMenus[item.label] && "rotate-180"
                          )}
                        />
                      </button>
                      {expandedMenus[item.label] && (
                        <ul className="mt-1 ml-8 space-y-1">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "block rounded-md px-3 py-2 text-sm transition-colors",
                                  "hover:bg-muted hover:text-foreground",
                                  router.pathname === subItem.href
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-muted hover:text-foreground",
                        router.pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-200",
            sidebarOpen ? "ml-64" : "ml-0"
          )}
        >
          <div className="container mx-auto p-6">
            {children}
          </div>

          {/* Footer */}
          <footer className="mt-12 border-t bg-card py-6 text-center text-sm text-muted-foreground">
            <p>© 2026 Majlis Perbandaran Segamat | Kumpulan Resolver – SIPS v1.0</p>
          </footer>
        </main>
      </div>
    </div>
  );
}