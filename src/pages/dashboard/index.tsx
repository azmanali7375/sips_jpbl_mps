import { useEffect, useState } from "react";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { profileService } from "@/services/profileService";
import { workflowService } from "@/services/workflowService";
import { applicationService } from "@/services/applicationService";
import type { Tables } from "@/integrations/supabase/types";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Upload,
  Users,
  ClipboardList,
  Camera,
  FileCheck
} from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [applications, setApplications] = useState<Tables<"applications">[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const profileData = await profileService.getCurrentProfile();
      setProfile(profileData);

      const appsData = await workflowService.getApplicationsByRole();
      setApplications(appsData);

      const statsData = await applicationService.getApplicationStats();
      setStats({
        total: statsData.total,
        pending: (statsData as any).pending ?? ((statsData as any).submitted + (statsData as any).under_review),
        approved: statsData.approved,
        rejected: statsData.rejected,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      osc_received: { variant: "outline", label: "Diterima dari OSC" },
      registered: { variant: "secondary", label: "Didaftarkan" },
      assigned: { variant: "default", label: "Diagihkan" },
      site_visit: { variant: "default", label: "Lawatan Tapak" },
      technical_report: { variant: "default", label: "Laporan Teknikal" },
      head_review: { variant: "default", label: "Semakan Ketua" },
      recommendation: { variant: "default", label: "Syor Diberikan" },
      osc_meeting: { variant: "outline", label: "Mesyuarat OSC" },
      approved: { variant: "default", label: "Diluluskan" },
      rejected: { variant: "destructive", label: "Ditolak" },
      approved_with_amendments: { variant: "default", label: "Lulus Dengan Pindaan" },
    };

    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRoleSpecificContent = () => {
    if (!profile) return null;

    switch (profile.role) {
      case "admin_assistant":
        return (
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anda bertanggungjawab mendaftar permohonan yang diterima dari OSC
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Permohonan Menunggu Pendaftaran</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "osc_received").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/dashboard/register">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Daftar Permohonan
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Permohonan Didaftarkan</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "registered").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/applications">
                      <FileText className="h-4 w-4 mr-2" />
                      Lihat Senarai
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "unit_head":
        return (
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anda bertanggungjawab mengagihkan permohonan kepada Penolong Pegawai Perancang
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Menunggu Agihan</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "registered").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/dashboard/assign">
                      <Users className="h-4 w-4 mr-2" />
                      Agih Permohonan
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sudah Diagihkan</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "assigned").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/applications">
                      <FileText className="h-4 w-4 mr-2" />
                      Lihat Senarai
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "assistant_planner_j5":
        return (
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anda bertanggungjawab menyemak permohonan, lawatan tapak dan menyediakan laporan teknikal
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tugasan Baru</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "assigned").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/dashboard/my-assignments">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Lihat Tugasan
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lawatan Tapak</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "site_visit").length} aktif
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/site-visits">
                      <Camera className="h-4 w-4 mr-2" />
                      Lawatan Tapak
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Laporan Teknikal</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "technical_report").length} sedia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/reports">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Lihat Laporan
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "department_head":
        return (
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anda bertanggungjawab menyemak laporan teknikal dan memberikan syor
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Menunggu Semakan</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "technical_report").length} laporan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/dashboard/review">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Semak Laporan
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Syor Diberikan</CardTitle>
                  <CardDescription>
                    {applications.filter(a => a.status === "recommendation").length} permohonan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/recommendations">
                      <FileText className="h-4 w-4 mr-2" />
                      Lihat Syor
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default: // applicant
        return (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Jumlah Permohonan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-3xl font-bold font-mono">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-8 w-8 text-accent" />
                    <p className="text-3xl font-bold font-mono">{stats.pending}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Diluluskan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-success" />
                    <p className="text-3xl font-bold font-mono">{stats.approved}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <p className="text-3xl font-bold font-mono">{stats.rejected}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tindakan Pantas</CardTitle>
                <CardDescription>Mulakan permohonan baru atau semak status</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <Link href="/dashboard/submit">
                    <Upload className="h-4 w-4 mr-2" />
                    Hantar Permohonan Baru
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/applications">
                    <FileText className="h-4 w-4 mr-2" />
                    Lihat Semua Permohonan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Layout>
      <SEO title="Dashboard - Sistem SPC MPS" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
          {profile && (
            <p className="text-muted-foreground mt-1">
              Selamat datang, {profile.full_name}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Memuatkan data...</p>
          </div>
        ) : (
          <>
            {getRoleSpecificContent()}

            {/* Recent Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Permohonan Terkini</CardTitle>
                <CardDescription>
                  {applications.length} permohonan berkaitan dengan anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Tiada permohonan untuk dipaparkan
                  </p>
                ) : (
                  <div className="space-y-4">
                    {applications.slice(0, 5).map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{app.project_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-mono">{app.tracking_number}</span>
                            <span>{app.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(app.status || "osc_received")}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/applications/${app.id}`}>
                              Lihat
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}