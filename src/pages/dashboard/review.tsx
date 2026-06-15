import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import {
  getComplianceRules,
  submitTechnicalReview,
  formatRequiredValue,
  JENIS_SEMAKAN_OPTIONS,
  KAEDAH_SEMAKAN_OPTIONS,
  KEPUTUSAN_SEMAKAN_OPTIONS,
  STATUS_PEMATUHAN_OPTIONS,
  type ComplianceCheckItem,
  type TechnicalReviewFormData,
} from "@/services/technicalReviewService";

export default function TechnicalReviewPage() {
  const router = useRouter();
  const { application_id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [complianceRules, setComplianceRules] = useState<any[]>([]);

  // Form state
  const [jenisSemakan, setJenisSemakan] = useState("Semakan Pertama");
  const [tarikhSemakan, setTarikhSemakan] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pegawaiPenyemak, setPegawaiPenyemak] = useState("");
  const [kaedahSemakan, setKaedahSemakan] = useState("Manual");
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheckItem[]>([]);
  const [keputusanSemakan, setKeputusanSemakan] = useState("");
  const [ringkasanUlasan, setRingkasanUlasan] = useState("");
  const [syaratSyarat, setSyaratSyarat] = useState("");
  const [cadanganKepadaOsc, setCadanganKepadaOsc] = useState("");

  useEffect(() => {
    if (!application_id) return;
    loadData();
  }, [application_id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);
      setPegawaiPenyemak(profile?.id || "");

      // Convert application_id to string (router.query can be string | string[])
      const appId = Array.isArray(application_id) ? application_id[0] : application_id;
      if (!appId) return;

      // Get application details
      const { data: appData } = await supabase
        .from("applications")
        .select("*")
        .eq("id", appId)
        .single();

      setApplication(appData);

      // Get officers
      const { data: officerList } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["officer", "assistant_planner_j5", "department_head"])
        .order("full_name");

      setOfficers(officerList || []);

      // Get compliance rules
      const rules = await getComplianceRules();
      setComplianceRules(rules);

      // Initialize compliance checks
      const checks: ComplianceCheckItem[] = rules.map((rule) => ({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type || "",
        required_value: formatRequiredValue(rule),
        proposed_value: "",
        status: "Tidak Berkaitan",
        catatan: "",
      }));
      setComplianceChecks(checks);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateComplianceCheck(index: number, field: string, value: string) {
    const updated = [...complianceChecks];
    updated[index] = { ...updated[index], [field]: value };
    setComplianceChecks(updated);
  }

  async function handleSubmit() {
    if (!application_id || !currentUser) return;

    // Validation
    if (!pegawaiPenyemak || !keputusanSemakan || !ringkasanUlasan.trim()) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan medan wajib: Pegawai Penyemak, Keputusan Semakan, dan Ringkasan Ulasan",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const formData: TechnicalReviewFormData = {
        application_id: application_id as string,
        jenis_semakan: jenisSemakan,
        tarikh_semakan: tarikhSemakan,
        pegawai_penyemak: pegawaiPenyemak,
        kaedah_semakan: kaedahSemakan,
        compliance_checks: complianceChecks,
        keputusan_semakan: keputusanSemakan,
        ringkasan_ulasan: ringkasanUlasan,
        syarat_syarat: syaratSyarat,
        cadangan_kepada_osc: cadanganKepadaOsc,
      };

      await submitTechnicalReview(formData, currentUser.id);

      toast({
        title: "Berjaya",
        description: "Semakan teknikal berjaya didaftarkan",
      });

      // Redirect back to application detail
      router.push(`/dashboard/permohonan/${application_id}`);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan semakan teknikal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
          <Button onClick={() => router.push("/dashboard")}>
            Kembali ke Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/permohonan/${application_id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">Daftar Semakan Teknikal</h1>
              <p className="text-muted-foreground">
                {application.no_fail_jpl} - {application.nama_pemaju_pemilik}
              </p>
            </div>
          </div>
        </div>

        {/* Form Section 1: Maklumat Semakan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Semakan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">No. Fail (Rujukan)</label>
                <Input value={application.no_fail_jpl} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Jenis Semakan *</label>
                <Select value={jenisSemakan} onValueChange={setJenisSemakan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_SEMAKAN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tarikh Semakan *</label>
                <Input
                  type="date"
                  value={tarikhSemakan}
                  onChange={(e) => setTarikhSemakan(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Pegawai Penyemak *</label>
                <Select value={pegawaiPenyemak} onValueChange={setPegawaiPenyemak}>
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
              </div>
              <div>
                <label className="text-sm font-medium">Kaedah Semakan *</label>
                <Select value={kaedahSemakan} onValueChange={setKaedahSemakan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KAEDAH_SEMAKAN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Check Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Semakan Pematuhan</CardTitle>
            <CardDescription>
              Semak setiap peraturan dan rekodkan pematuhan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peraturan</TableHead>
                  <TableHead>Nilai Diperlukan</TableHead>
                  <TableHead>Nilai Cadangan</TableHead>
                  <TableHead>Status Pematuhan</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceChecks.map((check, index) => (
                  <TableRow key={check.rule_id}>
                    <TableCell>
                      <div className="font-medium">{check.rule_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {check.rule_type}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {check.required_value}
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Nilai dari pelan"
                        value={check.proposed_value}
                        onChange={(e) =>
                          updateComplianceCheck(index, "proposed_value", e.target.value)
                        }
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={check.status}
                        onValueChange={(value) =>
                          updateComplianceCheck(index, "status", value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_PEMATUHAN_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Catatan"
                        value={check.catatan}
                        onChange={(e) =>
                          updateComplianceCheck(index, "catatan", e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Outcome */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Keputusan Semakan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Keputusan Semakan *</label>
              <Select value={keputusanSemakan} onValueChange={setKeputusanSemakan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keputusan" />
                </SelectTrigger>
                <SelectContent>
                  {KEPUTUSAN_SEMAKAN_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Ringkasan Ulasan *</label>
              <Textarea
                rows={5}
                placeholder="Masukkan ringkasan ulasan teknikal..."
                value={ringkasanUlasan}
                onChange={(e) => setRingkasanUlasan(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Syarat-syarat (jika berkaitan)</label>
              <Textarea
                rows={4}
                placeholder="Masukkan syarat-syarat lulus bersyarat..."
                value={syaratSyarat}
                onChange={(e) => setSyaratSyarat(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cadangan kepada OSC</label>
              <Textarea
                rows={4}
                placeholder="Masukkan cadangan untuk OSC..."
                value={cadanganKepadaOsc}
                onChange={(e) => setCadanganKepadaOsc(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/permohonan/${application_id}`)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? "Menyimpan..." : "Simpan Semakan"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}