import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, LayoutDashboard, FilePlus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      
      const userProfile = await profileService.getCurrentProfile();
      setProfile(userProfile);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-background border-r flex flex-col">
        <div className="p-4 border-b flex items-center gap-2 text-primary">
          <FileText className="h-6 w-6" />
          <span className="font-serif font-bold text-lg leading-tight">
            DC Management<br/>
            <span className="text-xs font-sans font-normal text-muted-foreground">Segamat Municipal</span>
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          {profile?.role === 'applicant' && (
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/dashboard/submit">
                <FilePlus className="mr-2 h-4 w-4" />
                New Application
              </Link>
            </Button>
          )}
        </nav>
        
        <div className="p-4 border-t">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role === 'officer' ? 'Planning Officer' : profile?.role}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}