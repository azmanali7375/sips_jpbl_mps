import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { profileService } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { validateOSCData } from "@/services/zoningValidationService";
import type { Tables } from "@/integrations/supabase/types";
import { 
  FileText, 
  Clock, 
  AlertTriangle,
  XCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar
} from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  jumlahAktif: number;
  dalamTempoKpi: number;
  hampirTamat: number;
  kpiTerlepas: number;
}

interface ApplicationWithDetails extends Tables<"applications"> {
  profiles?: {
    full_name: string;
  } | null;
}

export default function SIPSDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    jumlahAktif: 0,
    dalamTempoKpi: 0,
    hampirTamat: 0,
    kpiTerlepas: 0,
  });
  const [statusData, setStatusData] = useState<Array<{ status: string; count: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ category: string; count: number }>>([]);
  const [kpiPerformance, setKpiPerformance] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const profileData = await profileService.getCurrentProfile();
      setProfile(profileData);

      const isAdmin = profileData?.role === "admin" || profileData?.role === "unit_head" || profileData?.role === "department_head";

      // Build query based on role
      let query = supabase
        .from("applications")
        .select(`
          *,
          profiles:assigned_officer_id(full_name)
        `)
        .order("tarikh_kpi", { ascending: true });

      // Filter by assigned officer for non-admin roles
      if (!isAdmin && profileData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("assigned_officer_id", user.id);
        }
      }

      const { data: applications, error } = await query;

      if (error) throw error;

      const apps = applications || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate stats
      const activeStatuses = ["osc_received", "registered", "assigned", "site_visit", "technical_report", "head_review", "recommendation", "osc_meeting", "approved_with_amendments"];
      const activeApps = apps.filter(app => activeStatuses.includes(app.status || ""));

      const jumlahAktif = activeApps.length;
      
      let dalamTempoKpi = 0;
      let hampirTamat = 0;
      let kpiTerlepas = 0;

      activeApps.forEach(app => {
        if (app.tarikh_kpi) {
          const kpiDate = new Date(app.tarikh_kpi);
          kpiDate.setHours(0, 0, 0, 0);
          const diffTime = kpiDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            kpiTerlepas++;
          } else if (diffDays <= 14) {
            hampirTamat++;
          } else {
            dalamTempoKpi++;
          }
        }
      });

      setStats({ jumlahAktif, dalamTempoKpi, hampirTamat, kpiTerlepas });

      // Status distribution
      const statusCounts = apps.reduce((acc: Record<string, number>, app) => {
        const status = app.status || "osc_received";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const statusLabels: Record<string, string> = {
        osc_received: "Diterima dari OSC",
        registered: "Didaftarkan",
        assigned: "Diagihkan",
        site_visit: "Lawatan Tapak",
        technical_report: "Laporan Teknikal",
        head_review: "Semakan Ketua",
        recommendation: "Syor",
        osc_meeting: "Mesyuarat OSC",
        approved: "Lulus",
        rejected: "Ditolak",
        approved_with_amendments: "Lulus Dengan Pindaan",
      };

      setStatusData(
        Object.entries(statusCounts).map(([status, count]) => ({
          status: statusLabels[status] || status,
          count,
        }))
      );

      // Category distribution
      const categoryCounts = apps.reduce((acc: Record<string, number>, app) => {
        const category = app.skala_pembangunan || "Tidak Dinyatakan";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      setCategoryData(
        Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          count,
        }))
      );

      // KPI Performance - active applications only
      setKpiPerformance(activeApps as unknown as ApplicationWithDetails[]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRemainingDays = (tarikhKpi: string | null): number => {
    if (!tarikhKpi) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const kpiDate = new Date(tarikhKpi);
    kpiDate.setHours(0, 0, 0, 0);
    const diffTime = kpiDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysRemaining: number, kpiDays: number) => {
    // Calculate proportional thresholds based on KPI days
    // PB (14 days): Red ≤ 3, Orange 4-7
    // KM (57 days): Red ≤ 7, Orange 8-14
    const redThreshold = kpiDays === 14 ? 3 : 7;
    const orangeThreshold = kpiDays === 14 ? 7 : 14;

    if (daysRemaining <= redThreshold) return "text-red-600";
    if (daysRemaining <= orangeThreshold) return "text-orange-500";
    return "text-green-600";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      under_review: "Semakan",
      approved: "Lulus",
      rejected: "Tolak",
      approved_with_amendments: "Pindaan",
    };
    return labels[status] || status;
  };

  const getRowColor = (remainingDays: number): string => {
    if (remainingDays <= 7) return "bg-destructive/10 hover:bg-destructive/20";
    if (remainingDays <= 14) return "bg-accent/10 hover:bg-accent/20";
    return "hover:bg-muted/50";
  };

  const getStatusBadge = (status: string, daysRemaining: number, kpiDays: number) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      osc_received: { variant: "outline", label: "Diterima" },
      registered: { variant: "secondary", label: "Daftar" },
      assigned: { variant: "default", label: "Agih" },
      site_visit: { variant: "default", label: "Tapak" },
      technical_report: { variant: "default", label: "Laporan" },
      head_review: { variant: "default", label: "Semak" },
      recommendation: { variant: "default", label: "Syor" },
      osc_meeting: { variant: "outline", label: "OSC" },
      approved: { variant: "default", label: "Lulus" },
      rejected: { variant: "destructive", label: "Tolak" },
      approved_with_amendments: { variant: "default", label: "Pindaan" },
    };

    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const COLORS = ["#0F172A", "#1E40AF", "#3B82F6", "#60A5FA", "#93C5FD", "#DBEAFE"];
  const STATUS_COLORS = ["#1E40AF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Memuatkan data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="SIPS Dashboard - JPL MPS" />
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-serif font-bold text-primary">
            SIPS – Smart Internal Processing System
          </h1>
          <p className="text-muted-foreground mt-1">
            Jabatan Perancang Bandar & Landskap, Majlis Perbandaran Segamat
          </p>
          {profile && (
            <p className="text-sm text-muted-foreground mt-1">
              Selamat datang, {profile.full_name} ({profile.role === "admin" ? "Pentadbir" : profile.role === "unit_head" ? "Ketua Unit" : profile.role === "department_head" ? "Ketua Jabatan" : profile.role === "assistant_planner_j5" ? "Penolong Pegawai Perancang J5" : "Pegawai"})
            </p>
          )}
        </div>

        {/* Row 1: KPI Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Jumlah Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-primary">{stats.jumlahAktif}</p>
              <p className="text-xs text-muted-foreground mt-1">Permohonan belum selesai</p>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-success" />
                Dalam Tempoh Kpi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-success">{stats.dalamTempoKpi}</p>
              <p className="text-xs text-muted-foreground mt-1">{'>'}14 hari bekerja lagi</p>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Hampir Tamat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-accent">{stats.hampirTamat}</p>
              <p className="text-xs text-muted-foreground mt-1">≤14 hari bekerja</p>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                KPI Terlepas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-destructive">{stats.kpiTerlepas}</p>
              <p className="text-xs text-muted-foreground mt-1">Melebihi 57 hari</p>
            </CardContent>
          </Card>
        </div>

        {/* OSC Compliance Summary */}
        {(() => {
          // Run validation on all pending applications
          const complianceResults = kpiPerformance
            .filter(app => app.status === "pending" || app.status === "under_review")
            .map(app => ({
              application: app,
              validation: validateOSCData({
                zoning: (app as any).zoning,
                nisbah_plot: (app as any).nisbah_plot,
                ketinggian_bangunan_m: (app as any).ketinggian_bangunan_m,
                kawasan_pembangunan_m2: (app as any).kawasan_pembangunan_m2,
                kawasan_lantai_kasar_m2: (app as any).kawasan_lantai_kasar_m2,
                bil_tempat_letak_kereta: (app as any).bil_tempat_letak_kereta,
                bil_unit: (app as any).bil_unit,
              })
            }));

          const totalWithIssues = complianceResults.filter(r => r.validation.issues.length > 0).length;
          const totalErrors = complianceResults.reduce((sum, r) => sum + r.validation.errors_count, 0);
          const totalWarnings = complianceResults.reduce((sum, r) => sum + r.validation.warnings_count, 0);
          const totalInfo = complianceResults.reduce((sum, r) => sum + r.validation.info_count, 0);

          // Top violation categories
          const violationCategories: Record<string, number> = {};
          complianceResults.forEach(r => {
            r.validation.issues.forEach(issue => {
              violationCategories[issue.field] = (violationCategories[issue.field] || 0) + 1;
            });
          });

          const topViolations = Object.entries(violationCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          const nonCompliantApps = complianceResults
            .filter(r => r.validation.errors_count > 0)
            .slice(0, 5);

          return totalWithIssues > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Status Pematuhan OSC
                  <Badge variant="secondary">{totalWithIssues} permohonan dengan isu</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center">{totalWithIssues}</div>
                      <div className="text-xs text-center text-muted-foreground mt-1">
                        Permohonan Dengan Isu
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center text-red-700">{totalErrors}</div>
                      <div className="text-xs text-center text-red-600 mt-1">
                        Ralat Kritikal
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center text-orange-700">{totalWarnings}</div>
                      <div className="text-xs text-center text-orange-600 mt-1">
                        Amaran
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center text-blue-700">{totalInfo}</div>
                      <div className="text-xs text-center text-blue-600 mt-1">
                        Makluman
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Top Violations */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm">Pelanggaran Teratas</h4>
                    <div className="space-y-2">
                      {topViolations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Tiada pelanggaran dijumpai</p>
                      ) : (
                        topViolations.map(([field, count]) => (
                          <div key={field} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm font-medium capitalize">
                              {field.replace(/_/g, " ")}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Non-Compliant Applications */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm">Permohonan Tidak Patuh (Ralat Kritikal)</h4>
                    <div className="space-y-2">
                      {nonCompliantApps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Tiada ralat kritikal</p>
                      ) : (
                        nonCompliantApps.map(({ application, validation }) => (
                          <div 
                            key={application.id} 
                            className="p-2 bg-red-50 border border-red-200 rounded hover:bg-red-100 cursor-pointer transition-colors"
                            onClick={() => router.push(`/dashboard/permohonan/${application.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-red-900 truncate">
                                  {application.no_fail_jpl}
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                  {validation.errors_count} ralat, {validation.warnings_count} amaran
                                </div>
                              </div>
                              <Badge className="ml-2 bg-red-600 text-white">
                                {validation.errors_count}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {nonCompliantApps.length > 0 && (
                      <Button
                        variant="link"
                        className="text-xs mt-2 h-auto p-0"
                        onClick={() => router.push("/dashboard/senarai-permohonan")}
                      >
                        Lihat semua permohonan →
                      </Button>
                    )}
                  </div>
                </div>

                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Pematuhan automatik berdasarkan RTD 2030 Segamat. Semakan manual masih diperlukan untuk perincian penuh.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          );
        })()}

        {/* Row 2 & 3: Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Applications by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Permohonan Mengikut Status
              </CardTitle>
              <CardDescription>Taburan permohonan mengikut peringkat pemprosesan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={120} style={{ fontSize: "12px" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1E40AF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Applications by KM Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Permohonan Mengikut Kategori
              </CardTitle>
              <CardDescription>Taburan mengikut saiz pembangunan (KM)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.category} (${(entry.percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: KPI Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              KPI Performance – Permohonan Aktif
            </CardTitle>
            <CardDescription>
              Permohonan disusun mengikut keutamaan (paling kritikal di atas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Fail</TableHead>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Baki Hari</TableHead>
                    <TableHead>Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Tiada permohonan aktif
                      </TableCell>
                    </TableRow>
                  ) : (
                    kpiPerformance.slice(0, 10).map((app) => {
                      const remainingDays = calculateRemainingDays(app.tarikh_kpi);
                      return (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.no_fail_jpl}</TableCell>
                          <TableCell>{app.nama_pemaju_pemilik}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{app.jenis_aplikasi || "KM"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                app.status === "approved"
                                  ? "default"
                                  : app.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {getStatusLabel(app.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {app.tarikh_kpi ? (
                              <span className={getStatusColor(calculateDaysRemaining(app.tarikh_kpi), app.kpi_hari || 57)}>
                                {calculateDaysRemaining(app.tarikh_kpi)} hari
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/permohonan/${app.id}`)}
                            >
                              Lihat
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}