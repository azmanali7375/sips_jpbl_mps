import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  getApplicationDetail,
  getWorkflowHistory,
  updateApplicationStatus,
  reassignApplication,
  updateApplicationNotes,
  getAvailableOfficers,
  calculateKPIProgress,
  type ApplicationDetailData,
  type WorkflowHistoryWithProfile,
} from "@/services/applicationDetailService";
import { Edit, FileText, MapPin, FileBarChart, Upload, ArrowLeft, Save } from "lucide-react";
import { authService } from "@/services/authService";

const STATUS_COLORS: Record<string, string> = {
  "Diterima": "bg-blue-500",
  "Dalam Semakan Teknikal": "bg-teal-500",
  "Menunggu Ulasan ATD": "bg-yellow-500",
  "Kertas Perakuan Disediakan": "bg-purple-500",
  "Menunggu OSC": "bg-orange-500",
  "Lulus": "bg-green-500",
  "Lulus Bersyarat": "bg-green-500",
  "Ditolak": "bg-gray-500",
  "Dibatalkan": "bg-gray-500",
};

const STATUS_OPTIONS = [
  "Diterima",
  "Dalam Semakan Teknikal",
  "Menunggu Ulasan ATD",
  "Kertas Perakuan Disediakan",
  "Menunggu OSC",
  "Lulus",
  "Lulus Bersyarat",
  "Ditolak",
  "Dibatalkan",
];

export default function ApplicationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [application, setApplication] = useState<ApplicationDetailData | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryWithProfile[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [notes, setNotes] = useState("");

  // Load data
  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user with profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get user profile for role
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      // Get application details
      const appData = await getApplicationDetail(id as string);
      setApplication(appData);
      setSelectedStatus(appData?.status_dalaman || "");
      setSelectedOfficer(appData?.assigned_officer_id || "");
      setNotes(appData?.catatan_dalaman || "");

      // Get workflow history
      const history = await getWorkflowHistory(id as string);
      setWorkflowHistory(history);

      // Get officers (for admin only)
      if (profile?.role === "admin" || profile?.role === "department_head") {
        const officerList = await getAvailableOfficers();
        setOfficers(officerList);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan maklumat permohonan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!application || !currentUser) return;

    try {
      setSaving(true);
      await updateApplicationStatus(
        application.id,
        selectedStatus,
        currentUser.id,
        `Status dikemaskini kepada: ${selectedStatus}`
      );

      toast({
        title: "Berjaya",
        description: "Status permohonan dikemaskini",
      });

      loadData(); // Reload to show updated history
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengemas kini status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleOfficerReassign() {
    if (!application || !currentUser || !selectedOfficer) return;

    try {
      setSaving(true);
      await reassignApplication(application.id, selectedOfficer, currentUser.id);

      toast({
        title: "Berjaya",
        description: "Permohonan diagihkan kepada pegawai lain",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengagihkan permohonan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesUpdate() {
    if (!application || !currentUser) return;

    try {
      setSaving(true);
      await updateApplicationNotes(application.id, notes, currentUser.id);

      toast({
        title: "Berjaya",
        description: "Catatan dikemaskini",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengemas kini catatan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Memuatkan...</div>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-muted-foreground">Permohonan tidak dijumpai</div>
          <Button onClick={() => router.push("/dashboard/senarai-permohonan")}>
            Kembali ke Senarai
          </Button>
        </div>
      </Layout>
    );
  }

  const kpiProgress = application.tarikh_lengkap_diterima_osc && application.tarikh_kpi
    ? calculateKPIProgress(application.tarikh_lengkap_diterima_osc, application.tarikh_kpi)
    : null;

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "department_head";

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/senarai-permohonan")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">Butiran Permohonan</h1>
              <p className="text-muted-foreground">{application.no_fail_jpl}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Permohonan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/review?application_id=${application.id}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Daftar Semakan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/site-visit/${application.id}`)}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Lawatan Tapak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/reports/${application.id}`)}
            >
              <FileBarChart className="h-4 w-4 mr-2" />
              Jana Ulasan
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Muat Naik Dokumen
            </Button>
          </div>
        </div>

        {/* Section 1: Maklumat Permohonan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. Fail JPL</div>
              <div className="text-base">{application.no_fail_jpl}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. Permohonan OSC</div>
              <div className="text-base">{application.no_permohonan_osc}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Kategori Permohonan</div>
              <div className="text-base">{application.kategori_permohonan || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Skala Pembangunan</div>
              <div className="text-base">{application.skala_pembangunan || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Jenis Proses PR</div>
              <div className="text-base">{application.jenis_proses_pr || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status Semakan (OSC)</div>
              <div className="text-base">{application.status_semakan_osc || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tarikh Penghantaran</div>
              <div className="text-base">
                {application.tarikh_penghantaran
                  ? new Date(application.tarikh_penghantaran).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                ⭐ Tarikh Lengkap Diterima OSC
              </div>
              <div className="text-base font-medium">
                {application.tarikh_lengkap_diterima_osc
                  ? new Date(application.tarikh_lengkap_diterima_osc).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tarikh KPI</div>
              <div className="text-base font-medium">
                {application.tarikh_kpi
                  ? new Date(application.tarikh_kpi).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Maklumat Pemohon */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Pemohon</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Nama Pemohon (SP)</div>
              <div className="text-base">{application.nama_sp || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. KP Pemohon</div>
              <div className="text-base">{application.no_kp_sp || "-"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Nama Pemaju/Pemilik</div>
              <div className="text-base">{application.nama_pemaju_pemilik || "-"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Maklumat Pembangunan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Pembangunan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tajuk Permohonan</div>
              <div className="text-base">{application.tajuk_permohonan || "-"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Lokasi/Mercu Tanda Berhampiran
                </div>
                <div className="text-base">{application.lokasi_mercu_tanda || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Mukim</div>
                <div className="text-base">{application.mukim || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Daerah</div>
                <div className="text-base">{application.daerah || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Negeri</div>
                <div className="text-base">{application.negeri || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Rancangan Tempatan</div>
                <div className="text-base">{application.rancangan_tempatan || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zoning</div>
                <div className="text-base">{application.zoning || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Longitud</div>
                <div className="text-base font-mono">{application.longitud || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Latitud</div>
                <div className="text-base font-mono">{application.latitud || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Semakan KPI */}
        {kpiProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Semakan KPI</CardTitle>
              <CardDescription>
                Progress tempoh 57 hari dari tarikh lengkap diterima OSC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">{kpiProgress.daysElapsed}</div>
                  <div className="text-sm text-muted-foreground">Hari Berlalu</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{kpiProgress.totalDays}</div>
                  <div className="text-sm text-muted-foreground">Jumlah Hari</div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      kpiProgress.daysRemaining < 0
                        ? "text-destructive"
                        : kpiProgress.daysRemaining <= 7
                        ? "text-orange-500"
                        : "text-green-600"
                    }`}
                  >
                    {kpiProgress.daysRemaining}
                  </div>
                  <div className="text-sm text-muted-foreground">Hari Berbaki</div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress
                  value={kpiProgress.progressPercentage}
                  className={`h-3 ${
                    kpiProgress.status === "overdue"
                      ? "[&>div]:bg-destructive"
                      : kpiProgress.status === "critical"
                      ? "[&>div]:bg-red-500"
                      : kpiProgress.status === "warning"
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-green-500"
                  }`}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {kpiProgress.status === "overdue"
                      ? "Terlepas KPI"
                      : kpiProgress.status === "critical"
                      ? "Kritikal (>50 hari)"
                      : kpiProgress.status === "warning"
                      ? "Amaran (40-50 hari)"
                      : "Dalam Tempoh"}
                  </span>
                  <span>{Math.round(kpiProgress.progressPercentage)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: Status & Pegawai */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Status & Pegawai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status Dalaman</label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-500"}`}
                          />
                          {status}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && selectedStatus !== application.status_dalaman && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleStatusUpdate}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Status
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Pegawai Bertanggungjawab</label>
                <Select
                  value={selectedOfficer}
                  onValueChange={setSelectedOfficer}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.full_name} ({officer.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && selectedOfficer !== application.assigned_officer_id && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleOfficerReassign}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Agihkan Semula
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Catatan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Catatan Dalaman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Tambah catatan dalaman..."
            />
            {notes !== application.catatan_dalaman && (
              <Button onClick={handleNotesUpdate} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Simpan Catatan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Section 7: Sejarah Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Sejarah Workflow</CardTitle>
            <CardDescription>
              Rekod perubahan status dalam urutan terkini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workflowHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Tiada rekod sejarah
              </div>
            ) : (
              <div className="space-y-4">
                {workflowHistory.map((record, index) => (
                  <div key={record.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{record.to_status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.created_at).toLocaleString("ms-MY", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <div className="text-sm">
                          {record.comment || "Tiada catatan"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Oleh: {record.changed_by_profile?.full_name || "Sistem"} (
                          {record.changed_by_profile?.role || "system"})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}