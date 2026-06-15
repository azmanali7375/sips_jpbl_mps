import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { laporanTeknikalService, type BahagianBData } from "@/services/laporanTeknikalService";
import { Loader2, Save, Plus, X, ArrowLeft } from "lucide-react";

// Types for Bahagian C
interface BahagianCRow {
  nilai: string;
  selaras: "Selaras" | "Tidak" | null;
}

interface BahagianCData {
  c_a_bp: string;
  c_a_bpk: string;
  c_b: BahagianCRow;
  c_c: BahagianCRow;
  c_d: BahagianCRow;
  c_e: BahagianCRow;
  c_f: BahagianCRow;
  c_g: BahagianCRow;
  c_h: string;
}

// Types for Bahagian D
interface BahagianDRow {
  piawaian: string;
  pelan: string;
  keselarasan: "Selaras" | "Tidak" | null;
  nota: string;
}

// RMB and Kemudahan Awam use 6-column table with two keselarasan columns
interface BahagianDRow6Col {
  piawaian: string;
  pelan: string;
  keselarasan_unit: "Selaras" | "Tidak" | null;
  saiz_luas: string;
  keselarasan_saiz: "Selaras" | "Tidak" | null;
  nota: string;
}

// For dynamic rows in Kemudahan Awam and Pembangunan Lain
interface BahagianDDynamicRow extends BahagianDRow6Col {
  item: string;
}

interface BahagianDData {
  kesediaan_tapak: {
    lebar_tapak: BahagianDRow;
    panjang_tapak: BahagianDRow;
    saiz_lot: BahagianDRow;
    aras_lot_jiran: BahagianDRow;
    cerun: BahagianDRow;
    saliran: BahagianDRow;
  };
  jalan_akses: {
    jalan_utama: BahagianDRow;
    jalan_pengumpul: BahagianDRow;
    jalan_tempatan: BahagianDRow;
    lorong_belakang: BahagianDRow;
    pejalan_kaki: BahagianDRow;
  };
  anjakan_bangunan: {
    hadapan: BahagianDRow;
    tepi_kanan: BahagianDRow;
    tepi_kiri: BahagianDRow;
    belakang: BahagianDRow;
    laluan_pejalan_kaki: BahagianDRow;
    dari_rizab_jalan: BahagianDRow;
    dari_pe: BahagianDRow;
    dari_stp: BahagianDRow;
    dari_kta: BahagianDRow;
  };
  parkir: {
    kereta: BahagianDRow;
    motorsikal: BahagianDRow;
    lori: BahagianDRow;
    bas: BahagianDRow;
    oku: BahagianDRow;
    ramp: BahagianDRow;
  };
  kawasan_lapang: {
    keluasan: BahagianDRow;
    kedudukan: BahagianDRow;
  };
  rmb: {
    rmb_a: BahagianDRow6Col;
    rmb_b: BahagianDRow6Col;
    rmb_c: BahagianDRow6Col;
    rmb_d: BahagianDRow6Col;
    kedai_sederhana: BahagianDRow6Col;
  };
  kemudahan_awam: BahagianDDynamicRow[];
  pembangunan_lain: BahagianDDynamicRow[];
}

// Types for Bahagian E
interface BahagianERow {
  keselarasan: "TB" | "Selaras" | "Tidak" | null;
  nota: string;
}

interface BahagianEData {
  tia: BahagianERow;
  rsa: BahagianERow;
  hidrolik: BahagianERow;
  kejuruteraan_pembentungan: BahagianERow;
  beban_tnb: BahagianERow;
  eia: BahagianERow;
  telekomunikasi: BahagianERow;
}

// Types for Bahagian F
interface BahagianFData {
  f_a: string;
  f_b: string;
  f_c: string;
  f_d: string;
  f_e: string;
  f_f: string;
  f_g: string;
}

// Types for Bahagian G
interface BahagianGDynamicRow extends BahagianDRow {
  item: string;
}

interface BahagianGData {
  g1_bangunan_struktur: {
    jenis_bangunan: BahagianDRow;
    keluasan_tapak: BahagianDRow;
    ketinggian: BahagianDRow;
    jarak_pembangunan: BahagianDRow;
    pelan_pagar: BahagianDRow;
    sistem_perparitan: BahagianDRow;
    langkah_cerun: BahagianDRow;
    binaan_9m: BahagianDRow;
    binaan_lalulintas: BahagianDRow;
    permit_khas: BahagianDRow;
    binaan_sementara: BahagianDRow;
  };
  g1_additional: BahagianGDynamicRow[];
  g2_taska: {
    saiz_minimum: BahagianDRow;
    ruang_permainan: BahagianDRow;
    bilik_darjah: BahagianDRow;
    tandas: BahagianDRow;
    pengubahsuaian_fasad: BahagianDRow;
    papan_iklan: BahagianDRow;
    landskap_lembut: BahagianDRow;
    kod_warna: BahagianDRow;
    persetujuan_jiran: BahagianDRow;
    sokongan_jkm: BahagianDRow;
    sokongan_jbpm: BahagianDRow;
    sokongan_pkd: BahagianDRow;
  };
  g2_additional: BahagianGDynamicRow[];
}

export default function LaporanTeknikalPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form data
  const [noRujukanFail, setNoRujukanFail] = useState("");
  const [isKmt, setIsKmt] = useState(false);
  const [statusLaporan, setStatusLaporan] = useState("Draf");
  const [bahagianA, setBahagianA] = useState("");
  const [bahagianB, setBahagianB] = useState<BahagianBData>({
    b_a_i_lots: [{ no_lot: "", mukim: "" }],
    b_a_ii_pemilik: "",
    b_a_iii_pemohon: "",
    b_a_iv_luas: "",
    b_a_v_syarat_nyata: "",
    b_a_vi_syarat_khas: "",
    b_b_gadaian: "",
    b_c_pengesahan_pelan: null,
    b_d_akses: "",
    b_e_aktiviti: "",
    tarikh_lawatan: "",
    masa_lawatan: "",
  });

  const [bahagianC, setBahagianC] = useState<BahagianCData>({
    c_a_bp: "",
    c_a_bpk: "",
    c_b: { nilai: "", selaras: null },
    c_c: { nilai: "", selaras: null },
    c_d: { nilai: "", selaras: null },
    c_e: { nilai: "", selaras: null },
    c_f: { nilai: "", selaras: null },
    c_g: { nilai: "", selaras: null },
    c_h: "",
  });

  const emptyDRow = (): BahagianDRow => ({ piawaian: "", pelan: "", keselarasan: null, nota: "" });
  const emptyD6Row = (): BahagianDRow6Col => ({ piawaian: "", pelan: "", keselarasan_unit: null, saiz_luas: "", keselarasan_saiz: null, nota: "" });
  const emptyDynamicRow = (): BahagianDDynamicRow => ({ item: "", piawaian: "", pelan: "", keselarasan_unit: null, saiz_luas: "", keselarasan_saiz: null, nota: "" });

  const [bahagianD, setBahagianD] = useState<BahagianDData>({
    kesediaan_tapak: {
      lebar_tapak: emptyDRow(),
      panjang_tapak: emptyDRow(),
      saiz_lot: emptyDRow(),
      aras_lot_jiran: emptyDRow(),
      cerun: emptyDRow(),
      saliran: emptyDRow(),
    },
    jalan_akses: {
      jalan_utama: emptyDRow(),
      jalan_pengumpul: emptyDRow(),
      jalan_tempatan: emptyDRow(),
      lorong_belakang: emptyDRow(),
      pejalan_kaki: emptyDRow(),
    },
    anjakan_bangunan: {
      hadapan: emptyDRow(),
      tepi_kanan: emptyDRow(),
      tepi_kiri: emptyDRow(),
      belakang: emptyDRow(),
      laluan_pejalan_kaki: emptyDRow(),
      dari_rizab_jalan: emptyDRow(),
      dari_pe: emptyDRow(),
      dari_stp: emptyDRow(),
      dari_kta: emptyDRow(),
    },
    parkir: {
      kereta: emptyDRow(),
      motorsikal: emptyDRow(),
      lori: emptyDRow(),
      bas: emptyDRow(),
      oku: emptyDRow(),
      ramp: emptyDRow(),
    },
    kawasan_lapang: {
      keluasan: emptyDRow(),
      kedudukan: emptyDRow(),
    },
    rmb: {
      rmb_a: emptyD6Row(),
      rmb_b: emptyD6Row(),
      rmb_c: emptyD6Row(),
      rmb_d: emptyD6Row(),
      kedai_sederhana: emptyD6Row(),
    },
    kemudahan_awam: Array(5).fill(null).map(() => emptyDynamicRow()),
    pembangunan_lain: Array(5).fill(null).map(() => emptyDynamicRow()),
  });

  const [bahagianE, setBahagianE] = useState<BahagianEData>({
    tia: { keselarasan: "TB", nota: "" },
    rsa: { keselarasan: "TB", nota: "" },
    hidrolik: { keselarasan: "TB", nota: "" },
    kejuruteraan_pembentungan: { keselarasan: "TB", nota: "" },
    beban_tnb: { keselarasan: "TB", nota: "" },
    eia: { keselarasan: "TB", nota: "" },
    telekomunikasi: { keselarasan: "TB", nota: "" },
  });

  const [bahagianF, setBahagianF] = useState<BahagianFData>({
    f_a: "",
    f_b: "",
    f_c: "",
    f_d: "",
    f_e: "",
    f_f: "",
    f_g: "",
  });

  const [ulasanSyorF, setUlasanSyorF] = useState("");
  const [ulasanSyorG, setUlasanSyorG] = useState("");

  const [bahagianG, setBahagianG] = useState<BahagianGData>({
    g1_bangunan_struktur: {
      jenis_bangunan: emptyDRow(),
      keluasan_tapak: emptyDRow(),
      ketinggian: emptyDRow(),
      jarak_pembangunan: emptyDRow(),
      pelan_pagar: emptyDRow(),
      sistem_perparitan: emptyDRow(),
      langkah_cerun: emptyDRow(),
      binaan_9m: emptyDRow(),
      binaan_lalulintas: emptyDRow(),
      permit_khas: emptyDRow(),
      binaan_sementara: emptyDRow(),
    },
    g1_additional: Array(3).fill(null).map(() => ({ item: "", ...emptyDRow() })),
    g2_taska: {
      saiz_minimum: emptyDRow(),
      ruang_permainan: emptyDRow(),
      bilik_darjah: emptyDRow(),
      tandas: emptyDRow(),
      pengubahsuaian_fasad: emptyDRow(),
      papan_iklan: emptyDRow(),
      landskap_lembut: emptyDRow(),
      kod_warna: emptyDRow(),
      persetujuan_jiran: emptyDRow(),
      sokongan_jkm: emptyDRow(),
      sokongan_jbpm: emptyDRow(),
      sokongan_pkd: emptyDRow(),
    },
    g2_additional: Array(3).fill(null).map(() => ({ item: "", ...emptyDRow() })),
  });

  const [disediakanOleh, setDisediakanOleh] = useState("");
  const [jawatanPenyedia, setJawatanPenyedia] = useState("");
  const [tarikhDisediakan, setTarikhDisediakan] = useState(new Date().toISOString().split("T")[0]);

  // Current section (for progress indicator)
  const [currentSection, setCurrentSection] = useState("A");

  // Load data
  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  // Auto-save every 60 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 60000); // 60 seconds

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, bahagianA, bahagianB, bahagianC, bahagianD, bahagianE, bahagianF, bahagianG, ulasanSyorF, ulasanSyorG, noRujukanFail, isKmt]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get application data for pre-filling
      const { application, landLots } = await laporanTeknikalService.getApplicationData(id as string);

      // Get existing laporan if any
      const laporan = await laporanTeknikalService.getLaporanTeknikal(id as string);

      if (laporan) {
        // Load existing data
        setNoRujukanFail(laporan.no_rujukan_fail || "");
        setIsKmt(laporan.is_kmt || false);
        setStatusLaporan(laporan.status_laporan || "Draf");
        setBahagianA(laporan.bahagian_a || "");
        
        // Type assertion for bahagian_b from JSONB
        if (laporan.bahagian_b && typeof laporan.bahagian_b === 'object') {
          setBahagianB(laporan.bahagian_b as unknown as BahagianBData);
        }

        // Load Bahagian C
        if (laporan.bahagian_c && typeof laporan.bahagian_c === 'object') {
          setBahagianC(laporan.bahagian_c as unknown as BahagianCData);
        }

        // Load Bahagian D
        if (laporan.bahagian_d && typeof laporan.bahagian_d === 'object') {
          setBahagianD(laporan.bahagian_d as unknown as BahagianDData);
        }

        // Load Bahagian E
        if (laporan.bahagian_e && typeof laporan.bahagian_e === 'object') {
          setBahagianE(laporan.bahagian_e as unknown as BahagianEData);
        }

        // Load Bahagian F
        if (laporan.bahagian_f && typeof laporan.bahagian_f === 'object') {
          setBahagianF(laporan.bahagian_f as unknown as BahagianFData);
        }

        // Load Bahagian G
        if (laporan.bahagian_g && typeof laporan.bahagian_g === 'object') {
          setBahagianG(laporan.bahagian_g as unknown as BahagianGData);
        }

        // Load ulasan and signature fields
        setUlasanSyorF(laporan.ulasan_syor_f || "");
        setUlasanSyorG(laporan.ulasan_syor_g || "");
        setDisediakanOleh(laporan.disediakan_oleh || "");
        setJawatanPenyedia(laporan.jawatan_penyedia || "");
        setTarikhDisediakan(laporan.tarikh_disediakan || new Date().toISOString().split("T")[0]);
      } else {
        // Pre-fill from application data
        setNoRujukanFail(application.no_permohonan_osc || "");
        
        // Pre-fill user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, designation")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            setDisediakanOleh(profile.full_name || "");
            setJawatanPenyedia(profile.designation || "");
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal memuatkan data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    try {
      setSaving(true);

      await laporanTeknikalService.saveLaporanTeknikal(id as string, {
        no_rujukan_fail: noRujukanFail,
        is_kmt: isKmt,
        status_laporan: statusLaporan,
        bahagian_a: bahagianA,
        bahagian_b: bahagianB,
        bahagian_c: bahagianC,
        bahagian_d: bahagianD,
        bahagian_e: bahagianE,
        bahagian_f: bahagianF,
        bahagian_g: bahagianG,
        ulasan_syor_f: ulasanSyorF,
        ulasan_syor_g: ulasanSyorG,
        disediakan_oleh: disediakanOleh,
        jawatan_penyedia: jawatanPenyedia,
        tarikh_disediakan: tarikhDisediakan,
      });

      setHasUnsavedChanges(false);

      if (!isAutoSave) {
        toast({
          title: "Berjaya",
          description: "Laporan teknikal disimpan",
        });
      }
    } catch (error) {
      console.error("Error saving:", error);
      if (!isAutoSave) {
        toast({
          variant: "destructive",
          title: "Ralat",
          description: "Gagal menyimpan laporan teknikal",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const markChanged = () => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  const validateForm = (): boolean => {
    // Check required sections
    if (!bahagianA.trim()) {
      toast({
        variant: "destructive",
        title: "Bahagian A tidak lengkap",
        description: "Sila lengkapkan Bahagian A terlebih dahulu",
      });
      setCurrentSection("A");
      return false;
    }

    if (!bahagianB.b_a_i_lots[0]?.no_lot) {
      toast({
        variant: "destructive",
        title: "Bahagian B tidak lengkap",
        description: "Sila lengkapkan Bahagian B terlebih dahulu",
      });
      setCurrentSection("B");
      return false;
    }

    if (!ulasanSyorF.trim()) {
      toast({
        variant: "destructive",
        title: "Bahagian F tidak lengkap",
        description: "Sila lengkapkan Ulasan/Syor Bahagian F",
      });
      setCurrentSection("F");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // Save with status Dikemukakan
      await laporanTeknikalService.saveLaporanTeknikal(id as string, {
        no_rujukan_fail: noRujukanFail,
        is_kmt: isKmt,
        status_laporan: "Dikemukakan",
        bahagian_a: bahagianA,
        bahagian_b: bahagianB,
        bahagian_c: bahagianC,
        bahagian_d: bahagianD,
        bahagian_e: bahagianE,
        bahagian_f: bahagianF,
        bahagian_g: bahagianG,
        ulasan_syor_f: ulasanSyorF,
        ulasan_syor_g: ulasanSyorG,
        disediakan_oleh: disediakanOleh,
        jawatan_penyedia: jawatanPenyedia,
        tarikh_disediakan: tarikhDisediakan,
      });

      // Update workflow
      const { workflowService } = await import("@/services/workflowService");
      await workflowService.updateStatus(
        id as string,
        "technical_report" as any,
        "Laporan Teknikal Dikemukakan kepada OSC"
      );

      // Send notification to admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const { notificationService } = await import("@/services/notificationService");
        await notificationService.createBulk(
          admins.map((admin) => ({
            userId: admin.id,
            type: "submission" as any,
            title: "Laporan Teknikal Dikemukakan",
            message: `Laporan Teknikal ${noRujukanFail} telah dikemukakan.`,
            applicationId: id as string,
          }))
        );
      }

      setStatusLaporan("Dikemukakan");
      setHasUnsavedChanges(false);

      toast({
        title: "Berjaya",
        description: "Laporan Teknikal berjaya dikemukakan.",
      });

      // Redirect back to application
      setTimeout(() => {
        router.push(`/dashboard/permohonan/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal mengemukakan laporan teknikal",
      });
    } finally {
      setSaving(false);
    }
  };

  // Bahagian B handlers
  const addLot = () => {
    setBahagianB({
      ...bahagianB,
      b_a_i_lots: [...bahagianB.b_a_i_lots, { no_lot: "", mukim: "" }],
    });
    markChanged();
  };

  const removeLot = (index: number) => {
    const newLots = bahagianB.b_a_i_lots.filter((_, i) => i !== index);
    setBahagianB({
      ...bahagianB,
      b_a_i_lots: newLots.length > 0 ? newLots : [{ no_lot: "", mukim: "" }],
    });
    markChanged();
  };

  const updateLot = (index: number, field: "no_lot" | "mukim", value: string) => {
    const newLots = [...bahagianB.b_a_i_lots];
    newLots[index][field] = value;
    setBahagianB({ ...bahagianB, b_a_i_lots: newLots });
    markChanged();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const sections = [
    { id: "A", label: "A" },
    { id: "B", label: "B" },
    { id: "C", label: "C", disabled: false },
    { id: "D", label: "D", disabled: false },
    { id: "E", label: "E", disabled: false },
    { id: "F", label: "F", disabled: false },
    { id: "G", label: "G*", disabled: !isKmt },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-10 bg-background border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/permohonan/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl font-serif font-bold">
                  Laporan Teknikal
                </h1>
                {noRujukanFail && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {noRujukanFail}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saving && (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </span>
              )}
              {hasUnsavedChanges && !saving && (
                <span className="text-sm text-warning">Perubahan belum disimpan</span>
              )}
              <Badge variant={statusLaporan === "Draf" ? "secondary" : "default"}>
                {statusLaporan}
              </Badge>
              <Button onClick={() => handleSave()} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Simpan Draf
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => !section.disabled && setCurrentSection(section.id)}
                disabled={section.disabled}
                className={`
                  px-4 py-2 rounded-md font-medium transition-colors
                  ${currentSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : section.disabled
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }
                `}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card>
          <CardContent className="pt-6 space-y-8">
            {/* Header Block */}
            <div className="space-y-2">
              <p className="text-center font-bold text-lg">
                JABATAN PERANCANG BANDAR DAN LANDSKAP
              </p>
              <p className="text-center font-bold text-lg">
                MAJLIS PERBANDARAN SEGAMAT
              </p>
              <p className="text-center font-bold text-lg underline">
                LAPORAN TEKNIKAL PERMOHONAN
              </p>
              
              <div className="flex items-center gap-4 mt-6">
                <Label className="whitespace-nowrap">No. Rujukan Fail :</Label>
                <Input
                  value={noRujukanFail}
                  onChange={(e) => {
                    setNoRujukanFail(e.target.value);
                    markChanged();
                  }}
                  className="max-w-md"
                />
              </div>

              <div className="flex items-center gap-4 mt-4">
                <Label>Permohonan KMT (Kebenaran Merancang Terhad)?</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isKmt}
                    onCheckedChange={(checked) => {
                      setIsKmt(checked);
                      markChanged();
                    }}
                  />
                  <span className="text-sm font-medium">
                    {isKmt ? "Ya" : "Tidak"}
                  </span>
                </div>
              </div>
            </div>

            {/* BAHAGIAN A */}
            {(currentSection === "A" || currentSection === "B") && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">A. KECUKUPAN DOKUMEN</h2>
                <p className="text-sm italic text-muted-foreground">
                  (senaraikan dokumen yang tidak lengkap)
                </p>
                <Textarea
                  value={bahagianA}
                  onChange={(e) => {
                    setBahagianA(e.target.value);
                    markChanged();
                  }}
                  rows={5}
                  placeholder="Senaraikan dokumen yang tidak lengkap. Taip 'Tiada' jika semua dokumen lengkap."
                />
              </div>
            )}

            {/* BAHAGIAN B */}
            {currentSection === "B" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold">B. MAKLUMAT TAPAK</h2>

                {/* b_a: Maklumat Asas */}
                <div className="space-y-4">
                  <h3 className="font-semibold">a. Maklumat Asas</h3>

                  {/* i. No. Lot / Hakmilik */}
                  <div className="space-y-2">
                    <Label>i. No. Lot / Hakmilik</Label>
                    {bahagianB.b_a_i_lots.map((lot, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="No. Lot / Hakmilik"
                          value={lot.no_lot}
                          onChange={(e) => updateLot(index, "no_lot", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Mukim"
                          value={lot.mukim}
                          onChange={(e) => updateLot(index, "mukim", e.target.value)}
                          className="flex-1"
                        />
                        {bahagianB.b_a_i_lots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLot(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addLot}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Lot
                    </Button>
                  </div>

                  {/* ii. Pemilik */}
                  <div className="space-y-2">
                    <Label>ii. Pemilik</Label>
                    <Textarea
                      value={bahagianB.b_a_ii_pemilik}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, b_a_ii_pemilik: e.target.value });
                        markChanged();
                      }}
                      rows={2}
                    />
                  </div>

                  {/* iii. Pemohon */}
                  <div className="space-y-2">
                    <Label>iii. Pemohon</Label>
                    <Input
                      value={bahagianB.b_a_iii_pemohon}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, b_a_iii_pemohon: e.target.value });
                        markChanged();
                      }}
                    />
                  </div>

                  {/* iv. Luas Lot */}
                  <div className="space-y-2">
                    <Label>iv. Luas Lot</Label>
                    <Input
                      value={bahagianB.b_a_iv_luas}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, b_a_iv_luas: e.target.value });
                        markChanged();
                      }}
                      placeholder="cth: 1.20 ekar / 4,856 m²"
                    />
                  </div>

                  {/* v. Syarat Nyata */}
                  <div className="space-y-2">
                    <Label>v. Syarat Nyata</Label>
                    <Textarea
                      value={bahagianB.b_a_v_syarat_nyata}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, b_a_v_syarat_nyata: e.target.value });
                        markChanged();
                      }}
                      rows={2}
                    />
                  </div>

                  {/* vi. Syarat Khas */}
                  <div className="space-y-2">
                    <Label>vi. Syarat Khas (Jika ada)</Label>
                    <Textarea
                      value={bahagianB.b_a_vi_syarat_khas}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, b_a_vi_syarat_khas: e.target.value });
                        markChanged();
                      }}
                      rows={2}
                    />
                  </div>
                </div>

                {/* b_b: Gadaian */}
                <div className="space-y-2">
                  <h3 className="font-semibold">b. Gadaian dan Lain-Lain Sekatan (jika ada)</h3>
                  <Textarea
                    value={bahagianB.b_b_gadaian}
                    onChange={(e) => {
                      setBahagianB({ ...bahagianB, b_b_gadaian: e.target.value });
                      markChanged();
                    }}
                    rows={2}
                  />
                </div>

                {/* b_c: Pengesahan Pelan */}
                <div className="space-y-2">
                  <h3 className="font-semibold">c. Pengesahan Pelan Ukur dengan Pelan Akui</h3>
                  <RadioGroup
                    value={bahagianB.b_c_pengesahan_pelan || ""}
                    onValueChange={(value) => {
                      setBahagianB({ ...bahagianB, b_c_pengesahan_pelan: value as "YA" | "TIDAK" });
                      markChanged();
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="YA" id="pelan-ya" />
                      <Label htmlFor="pelan-ya">YA</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="TIDAK" id="pelan-tidak" />
                      <Label htmlFor="pelan-tidak">TIDAK</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* b_d: Akses */}
                <div className="space-y-2">
                  <h3 className="font-semibold">d. Akses ke Tapak</h3>
                  <Textarea
                    value={bahagianB.b_d_akses}
                    onChange={(e) => {
                      setBahagianB({ ...bahagianB, b_d_akses: e.target.value });
                      markChanged();
                    }}
                    rows={2}
                  />
                </div>

                {/* b_e: Aktiviti Sedia Ada */}
                <div className="space-y-2">
                  <h3 className="font-semibold">e. Aktiviti Sedia Ada</h3>
                  <Textarea
                    value={bahagianB.b_e_aktiviti}
                    onChange={(e) => {
                      setBahagianB({ ...bahagianB, b_e_aktiviti: e.target.value });
                      markChanged();
                    }}
                    rows={2}
                  />
                </div>

                {/* Lawatan Tapak */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tarikh Lawatan Tapak</Label>
                    <Input
                      type="date"
                      value={bahagianB.tarikh_lawatan}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, tarikh_lawatan: e.target.value });
                        markChanged();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Masa</Label>
                    <Input
                      type="time"
                      value={bahagianB.masa_lawatan}
                      onChange={(e) => {
                        setBahagianB({ ...bahagianB, masa_lawatan: e.target.value });
                        markChanged();
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BAHAGIAN C */}
            {currentSection === "C" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold">C. SEMAKAN TEKNIKAL PERANCANGAN</h2>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="border p-3 text-left font-semibold">Parameter</th>
                        <th className="border p-3 text-left font-semibold">Nilai / Maklumat</th>
                        <th className="border p-3 text-center font-semibold w-24">Selaras</th>
                        <th className="border p-3 text-center font-semibold w-24">Tidak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row c_a - No radio buttons */}
                      <tr>
                        <td className="border p-3 font-medium">a. Blok Perancangan (BP)</td>
                        <td className="border p-3" colSpan={3}>
                          <div className="flex gap-2">
                            <Input
                              placeholder="BP"
                              value={bahagianC.c_a_bp}
                              onChange={(e) => {
                                setBahagianC({ ...bahagianC, c_a_bp: e.target.value });
                                markChanged();
                              }}
                              className="w-32"
                            />
                            <Input
                              placeholder="BPK"
                              value={bahagianC.c_a_bpk}
                              onChange={(e) => {
                                setBahagianC({ ...bahagianC, c_a_bpk: e.target.value });
                                markChanged();
                              }}
                              className="w-32"
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Row c_b - Zon Perancangan */}
                      <tr className={bahagianC.c_b.selaras === "Tidak" ? "bg-red-50" : ""}>
                        <td className="border p-3 font-medium">b. Zon Perancangan</td>
                        <td className="border p-3">
                          <Input
                            value={bahagianC.c_b.nilai}
                            onChange={(e) => {
                              setBahagianC({
                                ...bahagianC,
                                c_b: { ...bahagianC.c_b, nilai: e.target.value },
                              });
                              markChanged();
                            }}
                          />
                        </td>
                        <td className="border p-3 text-center">
                          <RadioGroup
                            value={bahagianC.c_b.selaras || ""}
                            onValueChange={(value) => {
                              setBahagianC({
                                ...bahagianC,
                                c_b: { ...bahagianC.c_b, selaras: value as "Selaras" | "Tidak" },
                              });
                              markChanged();
                            }}
                          >
                            <RadioGroupItem value="Selaras" id="c_b_selaras" />
                          </RadioGroup>
                        </td>
                        <td className="border p-3 text-center">
                          <RadioGroup
                            value={bahagianC.c_b.selaras || ""}
                            onValueChange={(value) => {
                              setBahagianC({
                                ...bahagianC,
                                c_b: { ...bahagianC.c_b, selaras: value as "Selaras" | "Tidak" },
                              });
                              markChanged();
                            }}
                          >
                            <RadioGroupItem value="Tidak" id="c_b_tidak" />
                          </RadioGroup>
                        </td>
                      </tr>

                      {/* Rows c_c through c_g - same pattern */}
                      {[
                        { key: "c_c", label: "c. Kelas Kegunaan Tanah" },
                        { key: "c_d", label: "d. Densiti Dibenarkan" },
                        { key: "c_e", label: "e. Nisbah Plot Dibenarkan" },
                        { key: "c_f", label: "f. Ketinggian Dibenarkan" },
                        { key: "c_g", label: "g. Kawasan Plinth" },
                      ].map((item) => {
                        const rowKey = item.key as keyof Pick<BahagianCData, "c_c" | "c_d" | "c_e" | "c_f" | "c_g">;
                        const rowData = bahagianC[rowKey] as BahagianCRow;
                        return (
                          <tr key={item.key} className={rowData.selaras === "Tidak" ? "bg-red-50" : ""}>
                            <td className="border p-3 font-medium">{item.label}</td>
                            <td className="border p-3">
                              <Input
                                value={rowData.nilai}
                                onChange={(e) => {
                                  setBahagianC({
                                    ...bahagianC,
                                    [rowKey]: { ...rowData, nilai: e.target.value },
                                  });
                                  markChanged();
                                }}
                              />
                            </td>
                            <td className="border p-3 text-center">
                              <RadioGroup
                                value={rowData.selaras || ""}
                                onValueChange={(value) => {
                                  setBahagianC({
                                    ...bahagianC,
                                    [rowKey]: { ...rowData, selaras: value as "Selaras" | "Tidak" },
                                  });
                                  markChanged();
                                }}
                              >
                                <RadioGroupItem value="Selaras" id={`${item.key}_selaras`} />
                              </RadioGroup>
                            </td>
                            <td className="border p-3 text-center">
                              <RadioGroup
                                value={rowData.selaras || ""}
                                onValueChange={(value) => {
                                  setBahagianC({
                                    ...bahagianC,
                                    [rowKey]: { ...rowData, selaras: value as "Selaras" | "Tidak" },
                                  });
                                  markChanged();
                                }}
                              >
                                <RadioGroupItem value="Tidak" id={`${item.key}_tidak`} />
                              </RadioGroup>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Row c_h - No radio buttons */}
                      <tr>
                        <td className="border p-3 font-medium">h. Kesetaraan Penduduk (berdasarkan cadangan)</td>
                        <td className="border p-3" colSpan={3}>
                          <Input
                            value={bahagianC.c_h}
                            onChange={(e) => {
                              setBahagianC({ ...bahagianC, c_h: e.target.value });
                              markChanged();
                            }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted rounded-md">
                  <p className="font-semibold">
                    Jumlah Tidak Selaras:{" "}
                    {[bahagianC.c_b, bahagianC.c_c, bahagianC.c_d, bahagianC.c_e, bahagianC.c_f, bahagianC.c_g].filter(
                      (row) => row.selaras === "Tidak"
                    ).length}
                  </p>
                </div>
              </div>
            )}

            {/* BAHAGIAN D */}
            {currentSection === "D" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold">D. SEMAKAN PERINCIAN CADANGAN</h2>
                  <p className="text-sm italic text-muted-foreground">(Lampirkan Kiraan-Kiraan Jika Berkaitan)</p>
                </div>

                {/* D-a: Kesediaan Tapak */}
                <div className="space-y-3">
                  <h3 className="font-semibold">a. Kesediaan Tapak</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "lebar_tapak", label: "Lebar tapak" },
                          { key: "panjang_tapak", label: "Panjang tapak" },
                          { key: "saiz_lot", label: "Saiz lot" },
                          { key: "aras_lot_jiran", label: "Aras dgn Lot Jiran" },
                          { key: "cerun", label: "Cerun" },
                          { key: "saliran", label: "Saliran" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["kesediaan_tapak"];
                          const rowData = bahagianD.kesediaan_tapak[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kesediaan_tapak: {
                                        ...bahagianD.kesediaan_tapak,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kesediaan_tapak: {
                                        ...bahagianD.kesediaan_tapak,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kesediaan_tapak: {
                                        ...bahagianD.kesediaan_tapak,
                                        [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`${item.key}_selaras`} />
                                    <Label htmlFor={`${item.key}_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`${item.key}_tidak`} />
                                    <Label htmlFor={`${item.key}_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.nota}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kesediaan_tapak: {
                                        ...bahagianD.kesediaan_tapak,
                                        [rowKey]: { ...rowData, nota: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-b: Jalan & Akses */}
                <div className="space-y-3">
                  <h3 className="font-semibold">b. Jalan & Akses</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "jalan_utama", label: "Jalan Utama" },
                          { key: "jalan_pengumpul", label: "Jalan Pengumpul" },
                          { key: "jalan_tempatan", label: "Jalan Tempatan" },
                          { key: "lorong_belakang", label: "Lorong Belakang" },
                          { key: "pejalan_kaki", label: "Pejalan Kaki" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["jalan_akses"];
                          const rowData = bahagianD.jalan_akses[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      jalan_akses: {
                                        ...bahagianD.jalan_akses,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      jalan_akses: {
                                        ...bahagianD.jalan_akses,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      jalan_akses: {
                                        ...bahagianD.jalan_akses,
                                        [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`${item.key}_selaras`} />
                                    <Label htmlFor={`${item.key}_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`${item.key}_tidak`} />
                                    <Label htmlFor={`${item.key}_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.nota}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      jalan_akses: {
                                        ...bahagianD.jalan_akses,
                                        [rowKey]: { ...rowData, nota: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-c: Anjakan Bangunan */}
                <div className="space-y-3">
                  <h3 className="font-semibold">c. Anjakan Bangunan</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "hadapan", label: "Hadapan" },
                          { key: "tepi_kanan", label: "Tepi Kanan" },
                          { key: "tepi_kiri", label: "Tepi Kiri" },
                          { key: "belakang", label: "Belakang" },
                          { key: "laluan_pejalan_kaki", label: "Laluan Pejalan Kaki" },
                          { key: "dari_rizab_jalan", label: "Dari Rizab Jalan" },
                          { key: "dari_pe", label: "Dari PE" },
                          { key: "dari_stp", label: "Dari STP" },
                          { key: "dari_kta", label: "Dari KTA" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["anjakan_bangunan"];
                          const rowData = bahagianD.anjakan_bangunan[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      anjakan_bangunan: {
                                        ...bahagianD.anjakan_bangunan,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      anjakan_bangunan: {
                                        ...bahagianD.anjakan_bangunan,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      anjakan_bangunan: {
                                        ...bahagianD.anjakan_bangunan,
                                        [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`${item.key}_selaras`} />
                                    <Label htmlFor={`${item.key}_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`${item.key}_tidak`} />
                                    <Label htmlFor={`${item.key}_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.nota}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      anjakan_bangunan: {
                                        ...bahagianD.anjakan_bangunan,
                                        [rowKey]: { ...rowData, nota: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-d: Parkir */}
                <div className="space-y-3">
                  <h3 className="font-semibold">d. Parkir</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "kereta", label: "Kereta" },
                          { key: "motorsikal", label: "Motorsikal" },
                          { key: "lori", label: "Lori" },
                          { key: "bas", label: "Bas" },
                          { key: "oku", label: "OKU" },
                          { key: "ramp", label: "Ramp" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["parkir"];
                          const rowData = bahagianD.parkir[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      parkir: {
                                        ...bahagianD.parkir,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      parkir: {
                                        ...bahagianD.parkir,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      parkir: {
                                        ...bahagianD.parkir,
                                        [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`parkir_${item.key}_selaras`} />
                                    <Label htmlFor={`parkir_${item.key}_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`parkir_${item.key}_tidak`} />
                                    <Label htmlFor={`parkir_${item.key}_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.nota}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      parkir: {
                                        ...bahagianD.parkir,
                                        [rowKey]: { ...rowData, nota: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-e: Kawasan Lapang */}
                <div className="space-y-3">
                  <h3 className="font-semibold">e. Kawasan Lapang</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "keluasan", label: "Keluasan" },
                          { key: "kedudukan", label: "Kedudukan / Lokasi" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["kawasan_lapang"];
                          const rowData = bahagianD.kawasan_lapang[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kawasan_lapang: {
                                        ...bahagianD.kawasan_lapang,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kawasan_lapang: {
                                        ...bahagianD.kawasan_lapang,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kawasan_lapang: {
                                        ...bahagianD.kawasan_lapang,
                                        [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`lapang_${item.key}_selaras`} />
                                    <Label htmlFor={`lapang_${item.key}_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`lapang_${item.key}_tidak`} />
                                    <Label htmlFor={`lapang_${item.key}_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.nota}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      kawasan_lapang: {
                                        ...bahagianD.kawasan_lapang,
                                        [rowKey]: { ...rowData, nota: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-f: Rumah Mampu Milik */}
                <div className="space-y-3">
                  <h3 className="font-semibold">f. Rumah Mampu Milik</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-28">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Saiz & Luas</th>
                          <th className="border p-2 text-center font-semibold text-sm w-28">Keselarasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "rmb_a", label: "RMB A" },
                          { key: "rmb_b", label: "RMB B" },
                          { key: "rmb_c", label: "RMB C" },
                          { key: "rmb_d", label: "RMB D" },
                          { key: "kedai_sederhana", label: "Kedai Sederhana" },
                        ].map((item) => {
                          const rowKey = item.key as keyof BahagianDData["rmb"];
                          const rowData = bahagianD.rmb[rowKey];
                          return (
                            <tr key={item.key} className={rowData.keselarasan_unit === "Tidak" || rowData.keselarasan_saiz === "Tidak" ? "bg-red-50" : ""}>
                              <td className="border p-2 text-sm">{item.label}</td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.piawaian}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      rmb: {
                                        ...bahagianD.rmb,
                                        [rowKey]: { ...rowData, piawaian: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                  placeholder="Unit"
                                />
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.pelan}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      rmb: {
                                        ...bahagianD.rmb,
                                        [rowKey]: { ...rowData, pelan: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                  placeholder="Unit"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan_unit || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      rmb: {
                                        ...bahagianD.rmb,
                                        [rowKey]: { ...rowData, keselarasan_unit: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`rmb_${item.key}_unit_selaras`} />
                                    <Label htmlFor={`rmb_${item.key}_unit_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`rmb_${item.key}_unit_tidak`} />
                                    <Label htmlFor={`rmb_${item.key}_unit_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                              <td className="border p-2">
                                <Input
                                  value={rowData.saiz_luas}
                                  onChange={(e) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      rmb: {
                                        ...bahagianD.rmb,
                                        [rowKey]: { ...rowData, saiz_luas: e.target.value },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="h-8 text-sm"
                                  placeholder="m²"
                                />
                              </td>
                              <td className="border p-2">
                                <RadioGroup
                                  value={rowData.keselarasan_saiz || ""}
                                  onValueChange={(value) => {
                                    setBahagianD({
                                      ...bahagianD,
                                      rmb: {
                                        ...bahagianD.rmb,
                                        [rowKey]: { ...rowData, keselarasan_saiz: value as "Selaras" | "Tidak" },
                                      },
                                    });
                                    markChanged();
                                  }}
                                  className="flex gap-2 justify-center"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Selaras" id={`rmb_${item.key}_saiz_selaras`} />
                                    <Label htmlFor={`rmb_${item.key}_saiz_selaras`} className="text-xs">Selaras</Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="Tidak" id={`rmb_${item.key}_saiz_tidak`} />
                                    <Label htmlFor={`rmb_${item.key}_saiz_tidak`} className="text-xs">Tidak</Label>
                                  </div>
                                </RadioGroup>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D-g: Kemudahan Awam */}
                <div className="space-y-3">
                  <h3 className="font-semibold">g. Kemudahan Awam</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-28">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Saiz & Luas</th>
                          <th className="border p-2 text-center font-semibold text-sm w-28">Keselarasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bahagianD.kemudahan_awam.map((row, index) => (
                          <tr key={index} className={row.keselarasan_unit === "Tidak" || row.keselarasan_saiz === "Tidak" ? "bg-red-50" : ""}>
                            <td className="border p-2">
                              <Input
                                value={row.item}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].item = e.target.value;
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                                placeholder="Nama kemudahan"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.piawaian}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].piawaian = e.target.value;
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.pelan}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].pelan = e.target.value;
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="border p-2">
                              <RadioGroup
                                value={row.keselarasan_unit || ""}
                                onValueChange={(value) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].keselarasan_unit = value as "Selaras" | "Tidak";
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="flex gap-2 justify-center"
                              >
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Selaras" id={`kemudahan_${index}_unit_selaras`} />
                                  <Label htmlFor={`kemudahan_${index}_unit_selaras`} className="text-xs">Selaras</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Tidak" id={`kemudahan_${index}_unit_tidak`} />
                                  <Label htmlFor={`kemudahan_${index}_unit_tidak`} className="text-xs">Tidak</Label>
                                </div>
                              </RadioGroup>
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.saiz_luas}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].saiz_luas = e.target.value;
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="border p-2">
                              <RadioGroup
                                value={row.keselarasan_saiz || ""}
                                onValueChange={(value) => {
                                  const newRows = [...bahagianD.kemudahan_awam];
                                  newRows[index].keselarasan_saiz = value as "Selaras" | "Tidak";
                                  setBahagianD({ ...bahagianD, kemudahan_awam: newRows });
                                  markChanged();
                                }}
                                className="flex gap-2 justify-center"
                              >
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Selaras" id={`kemudahan_${index}_saiz_selaras`} />
                                  <Label htmlFor={`kemudahan_${index}_saiz_selaras`} className="text-xs">Selaras</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Tidak" id={`kemudahan_${index}_saiz_tidak`} />
                                  <Label htmlFor={`kemudahan_${index}_saiz_tidak`} className="text-xs">Tidak</Label>
                                </div>
                              </RadioGroup>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBahagianD({
                        ...bahagianD,
                        kemudahan_awam: [...bahagianD.kemudahan_awam, emptyDynamicRow()],
                      });
                      markChanged();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Kemudahan
                  </Button>
                  <p className="text-xs italic text-muted-foreground">(sila tambah helaian lain jika diperlukan)</p>
                </div>

                {/* D-h: Pembangunan Lain */}
                <div className="space-y-3">
                  <h3 className="font-semibold">h. Pembangunan Lain</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Item</th>
                          <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                          <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                          <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bahagianD.pembangunan_lain.map((row, index) => (
                          <tr key={index} className={row.keselarasan_unit === "Tidak" ? "bg-red-50" : ""}>
                            <td className="border p-2">
                              <Input
                                value={row.item}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.pembangunan_lain];
                                  newRows[index].item = e.target.value;
                                  setBahagianD({ ...bahagianD, pembangunan_lain: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                                placeholder="Nama item"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.piawaian}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.pembangunan_lain];
                                  newRows[index].piawaian = e.target.value;
                                  setBahagianD({ ...bahagianD, pembangunan_lain: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.pelan}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.pembangunan_lain];
                                  newRows[index].pelan = e.target.value;
                                  setBahagianD({ ...bahagianD, pembangunan_lain: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="border p-2">
                              <RadioGroup
                                value={row.keselarasan_unit || ""}
                                onValueChange={(value) => {
                                  const newRows = [...bahagianD.pembangunan_lain];
                                  newRows[index].keselarasan_unit = value as "Selaras" | "Tidak";
                                  setBahagianD({ ...bahagianD, pembangunan_lain: newRows });
                                  markChanged();
                                }}
                                className="flex gap-2 justify-center"
                              >
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Selaras" id={`pembangunan_${index}_selaras`} />
                                  <Label htmlFor={`pembangunan_${index}_selaras`} className="text-xs">Selaras</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <RadioGroupItem value="Tidak" id={`pembangunan_${index}_tidak`} />
                                  <Label htmlFor={`pembangunan_${index}_tidak`} className="text-xs">Tidak</Label>
                                </div>
                              </RadioGroup>
                            </td>
                            <td className="border p-2">
                              <Input
                                value={row.nota}
                                onChange={(e) => {
                                  const newRows = [...bahagianD.pembangunan_lain];
                                  newRows[index].nota = e.target.value;
                                  setBahagianD({ ...bahagianD, pembangunan_lain: newRows });
                                  markChanged();
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBahagianD({
                        ...bahagianD,
                        pembangunan_lain: [...bahagianD.pembangunan_lain, emptyDynamicRow()],
                      });
                      markChanged();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Item
                  </Button>
                  <p className="text-xs italic text-muted-foreground">(sila tambah helaian lain jika diperlukan)</p>
                </div>
              </div>
            )}

            {/* BAHAGIAN E */}
            {currentSection === "E" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold">E. SEMAKAN LAPORAN-LAPORAN BERKAITAN</h2>
                  <p className="text-sm italic text-muted-foreground">(Jika berkaitan)</p>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="border p-3 text-left font-semibold">Jenis Laporan</th>
                        <th className="border p-3 text-center font-semibold w-48">Keselarasan</th>
                        <th className="border p-3 text-left font-semibold">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "tia", label: "Laporan Nilaian Kesan Lalulintas (TIA) (JKR)" },
                        { key: "rsa", label: "Laporan RSA (Road Safety Audit Stage 1 & 2) (JKR)" },
                        { key: "hidrolik", label: "Laporan Hidrolik / Hidrologi (MASMA)" },
                        { key: "kejuruteraan_pembentungan", label: "Laporan Kejuruteraan Pembentungan (IWK)" },
                        { key: "beban_tnb", label: "Laporan Kiraan & Anggaran Beban Permulaan & Muktamad (TNB)" },
                        { key: "eia", label: "Laporan EIA (JAS)" },
                        { key: "telekomunikasi", label: "Pelan Cadangan Infrastruktur Telekomunikasi (SKMM)" },
                      ].map((item) => {
                        const rowKey = item.key as keyof BahagianEData;
                        const rowData = bahagianE[rowKey];
                        return (
                          <tr key={item.key}>
                            <td className="border p-3 text-sm">{item.label}</td>
                            <td className="border p-3">
                              <RadioGroup
                                value={rowData.keselarasan || "TB"}
                                onValueChange={(value) => {
                                  setBahagianE({
                                    ...bahagianE,
                                    [rowKey]: { ...rowData, keselarasan: value as "TB" | "Selaras" | "Tidak" },
                                  });
                                  markChanged();
                                }}
                                className="flex gap-3 justify-center"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="TB" id={`${item.key}_tb`} />
                                  <Label htmlFor={`${item.key}_tb`} className="text-sm">TB</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Selaras" id={`${item.key}_selaras`} />
                                  <Label htmlFor={`${item.key}_selaras`} className="text-sm">Selaras</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Tidak" id={`${item.key}_tidak`} />
                                  <Label htmlFor={`${item.key}_tidak`} className="text-sm">Tidak</Label>
                                </div>
                              </RadioGroup>
                            </td>
                            <td className="border p-3">
                              <Input
                                value={rowData.nota}
                                onChange={(e) => {
                                  setBahagianE({
                                    ...bahagianE,
                                    [rowKey]: { ...rowData, nota: e.target.value },
                                  });
                                  markChanged();
                                }}
                                placeholder={rowData.keselarasan !== "TB" ? "Wajib diisi untuk Selaras/Tidak" : ""}
                                className="h-8 text-sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BAHAGIAN F */}
            {currentSection === "F" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold">F. SEMAKAN TERHADAP CADANGAN / LCP</h2>
                  <p className="text-sm italic text-muted-foreground">(Rujuk Cadangan Permohonan / LCP)</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold">a. Keselarasan Cadangan Bangunan Berdasarkan Piawaian</Label>
                    <Textarea
                      value={bahagianF.f_a}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_a: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">b. Kesinambungan Sistem Jalan dengan Kawasan Sekitar</Label>
                    <Textarea
                      value={bahagianF.f_b}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_b: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">c. Penyesuaian Cadangan Bentuk Muka Bumi & Sistem Saliran Sedia Ada</Label>
                    <Textarea
                      value={bahagianF.f_c}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_c: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">d. Penyesuaian Cadangan Keperluan Infrastruktur (Air, Elektrik, Pembentungan dll.)</Label>
                    <Textarea
                      value={bahagianF.f_d}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_d: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">e. Penyesuaian Cadangan dengan Dasar-Dasar Semasa (termasuk RFN, RSN, RTD, RKK & PTK)</Label>
                    <Textarea
                      value={bahagianF.f_e}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_e: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">f. Lain-lain Penemuan Yang Relevan</Label>
                    <Textarea
                      value={bahagianF.f_f}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_f: e.target.value });
                        markChanged();
                      }}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">g. MyLCP Score (jika berkaitan)</Label>
                    <Input
                      type="number"
                      value={bahagianF.f_g}
                      onChange={(e) => {
                        setBahagianF({ ...bahagianF, f_g: e.target.value });
                        markChanged();
                      }}
                      placeholder="MyLCP Score"
                      className="mt-2 max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">(Lampirkan cetakan MyLCP Score)</p>
                  </div>
                </div>

                {/* Ulasan / Syor */}
                <div className="space-y-3 pt-6 border-t">
                  <h3 className="font-bold">ULASAN / SYOR TERHADAP PERMOHONAN</h3>
                  <Textarea
                    value={ulasanSyorF}
                    onChange={(e) => {
                      setUlasanSyorF(e.target.value);
                      markChanged();
                    }}
                    rows={8}
                    placeholder="Nyatakan ulasan dan syor terhadap permohonan ini..."
                  />
                </div>

                {/* Signature Block */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Disediakan Oleh :</Label>
                      <Input
                        value={disediakanOleh}
                        onChange={(e) => {
                          setDisediakanOleh(e.target.value);
                          markChanged();
                        }}
                        placeholder="Nama"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Jawatan :</Label>
                      <Input
                        value={jawatanPenyedia}
                        onChange={(e) => {
                          setJawatanPenyedia(e.target.value);
                          markChanged();
                        }}
                        placeholder="Jawatan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tarikh :</Label>
                      <Input
                        type="date"
                        value={tarikhDisediakan}
                        onChange={(e) => {
                          setTarikhDisediakan(e.target.value);
                          markChanged();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BAHAGIAN G (KMT Only) */}
            {currentSection === "G" && (
              <div className="space-y-6">
                {!isKmt ? (
                  <div className="p-6 bg-muted rounded-md text-center text-muted-foreground">
                    <p>Bahagian G — Tidak berkenaan (bukan permohonan KMT)</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold">G. BAGI PERMOHONAN KMT</h2>

                    {/* G.1 - Bangunan, Struktur & Menara */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">1. KMT bagi Bangunan, Struktur & Menara Pemancar</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="border p-2 text-left font-semibold text-sm">Item</th>
                              <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                              <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                              <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                              <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { key: "jenis_bangunan", label: "a. Jenis Bangunan (struktur)" },
                              { key: "keluasan_tapak", label: "b. Keluasan Tapak Dibenar" },
                              { key: "ketinggian", label: "c. Ketinggian (struktur / menara)" },
                              { key: "jarak_pembangunan", label: "d. Jarak dari Pembangunan" },
                              { key: "pelan_pagar", label: "e. Pelan Pagar & Pintu Masuk" },
                              { key: "sistem_perparitan", label: "f. Sistem Perparitan" },
                              { key: "langkah_cerun", label: "g. Langkah Penstabilan Cerun" },
                              { key: "binaan_9m", label: "h. Binaan 9m dari pavement" },
                              { key: "binaan_lalulintas", label: "i. Binaan tidak ganggu lalulintas" },
                              { key: "permit_khas", label: "j. Permit khas / LPS" },
                              { key: "binaan_sementara", label: "k. Binaan jenis sementara" },
                            ].map((item) => {
                              const rowKey = item.key as keyof BahagianGData["g1_bangunan_struktur"];
                              const rowData = bahagianG.g1_bangunan_struktur[rowKey];
                              return (
                                <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                                  <td className="border p-2 text-sm">{item.label}</td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.piawaian}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g1_bangunan_struktur: {
                                            ...bahagianG.g1_bangunan_struktur,
                                            [rowKey]: { ...rowData, piawaian: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.pelan}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g1_bangunan_struktur: {
                                            ...bahagianG.g1_bangunan_struktur,
                                            [rowKey]: { ...rowData, pelan: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <RadioGroup
                                      value={rowData.keselarasan || ""}
                                      onValueChange={(value) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g1_bangunan_struktur: {
                                            ...bahagianG.g1_bangunan_struktur,
                                            [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="flex gap-2 justify-center"
                                    >
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Selaras" id={`g1_${item.key}_selaras`} />
                                        <Label htmlFor={`g1_${item.key}_selaras`} className="text-xs">Selaras</Label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Tidak" id={`g1_${item.key}_tidak`} />
                                        <Label htmlFor={`g1_${item.key}_tidak`} className="text-xs">Tidak</Label>
                                      </div>
                                    </RadioGroup>
                                  </td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.nota}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g1_bangunan_struktur: {
                                            ...bahagianG.g1_bangunan_struktur,
                                            [rowKey]: { ...rowData, nota: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            {bahagianG.g1_additional.map((row, index) => (
                              <tr key={`g1_add_${index}`} className={row.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                                <td className="border p-2">
                                  <Input
                                    value={row.item}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g1_additional];
                                      newRows[index].item = e.target.value;
                                      setBahagianG({ ...bahagianG, g1_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                    placeholder="Item tambahan"
                                  />
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.piawaian}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g1_additional];
                                      newRows[index].piawaian = e.target.value;
                                      setBahagianG({ ...bahagianG, g1_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.pelan}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g1_additional];
                                      newRows[index].pelan = e.target.value;
                                      setBahagianG({ ...bahagianG, g1_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="border p-2">
                                  <RadioGroup
                                    value={row.keselarasan || ""}
                                    onValueChange={(value) => {
                                      const newRows = [...bahagianG.g1_additional];
                                      newRows[index].keselarasan = value as "Selaras" | "Tidak";
                                      setBahagianG({ ...bahagianG, g1_additional: newRows });
                                      markChanged();
                                    }}
                                    className="flex gap-2 justify-center"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="Selaras" id={`g1_add_${index}_selaras`} />
                                      <Label htmlFor={`g1_add_${index}_selaras`} className="text-xs">Selaras</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="Tidak" id={`g1_add_${index}_tidak`} />
                                      <Label htmlFor={`g1_add_${index}_tidak`} className="text-xs">Tidak</Label>
                                    </div>
                                  </RadioGroup>
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.nota}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g1_additional];
                                      newRows[index].nota = e.target.value;
                                      setBahagianG({ ...bahagianG, g1_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBahagianG({
                            ...bahagianG,
                            g1_additional: [...bahagianG.g1_additional, { item: "", ...emptyDRow() }],
                          });
                          markChanged();
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Item
                      </Button>
                    </div>

                    {/* G.2 - Taska / Tadika */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">2. KMT bagi Taska / Tadika / Pusat Jagaan Kanak-Kanak</h3>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="border p-2 text-left font-semibold text-sm">Item</th>
                              <th className="border p-2 text-left font-semibold text-sm">Piawaian</th>
                              <th className="border p-2 text-left font-semibold text-sm">Pelan</th>
                              <th className="border p-2 text-center font-semibold text-sm w-32">Keselarasan</th>
                              <th className="border p-2 text-left font-semibold text-sm">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { key: "saiz_minimum", label: "a. Saiz minimum bangunan" },
                              { key: "ruang_permainan", label: "b. Ruang permainan / rekreasi" },
                              { key: "bilik_darjah", label: "c. Bilik darjah" },
                              { key: "tandas", label: "d. Tandas (U/L/P)" },
                              { key: "pengubahsuaian_fasad", label: "e. Pengubahsuaian fasad" },
                              { key: "papan_iklan", label: "f. Papan iklan tidak tutup fasad" },
                              { key: "landskap_lembut", label: "g. Landskap Lembut 10%" },
                              { key: "kod_warna", label: "h. Kod Warna (ceria)" },
                              { key: "persetujuan_jiran", label: "i. Persetujuan Jiran (4 penjuru)" },
                              { key: "sokongan_jkm", label: "j. Sokongan JKM atau PPD" },
                              { key: "sokongan_jbpm", label: "k. Sokongan JBPM" },
                              { key: "sokongan_pkd", label: "l. Sokongan PKD" },
                            ].map((item) => {
                              const rowKey = item.key as keyof BahagianGData["g2_taska"];
                              const rowData = bahagianG.g2_taska[rowKey];
                              return (
                                <tr key={item.key} className={rowData.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                                  <td className="border p-2 text-sm">{item.label}</td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.piawaian}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g2_taska: {
                                            ...bahagianG.g2_taska,
                                            [rowKey]: { ...rowData, piawaian: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.pelan}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g2_taska: {
                                            ...bahagianG.g2_taska,
                                            [rowKey]: { ...rowData, pelan: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <RadioGroup
                                      value={rowData.keselarasan || ""}
                                      onValueChange={(value) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g2_taska: {
                                            ...bahagianG.g2_taska,
                                            [rowKey]: { ...rowData, keselarasan: value as "Selaras" | "Tidak" },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="flex gap-2 justify-center"
                                    >
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Selaras" id={`g2_${item.key}_selaras`} />
                                        <Label htmlFor={`g2_${item.key}_selaras`} className="text-xs">Selaras</Label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Tidak" id={`g2_${item.key}_tidak`} />
                                        <Label htmlFor={`g2_${item.key}_tidak`} className="text-xs">Tidak</Label>
                                      </div>
                                    </RadioGroup>
                                  </td>
                                  <td className="border p-2">
                                    <Input
                                      value={rowData.nota}
                                      onChange={(e) => {
                                        setBahagianG({
                                          ...bahagianG,
                                          g2_taska: {
                                            ...bahagianG.g2_taska,
                                            [rowKey]: { ...rowData, nota: e.target.value },
                                          },
                                        });
                                        markChanged();
                                      }}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            {bahagianG.g2_additional.map((row, index) => (
                              <tr key={`g2_add_${index}`} className={row.keselarasan === "Tidak" ? "bg-red-50" : ""}>
                                <td className="border p-2">
                                  <Input
                                    value={row.item}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g2_additional];
                                      newRows[index].item = e.target.value;
                                      setBahagianG({ ...bahagianG, g2_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                    placeholder="Item tambahan"
                                  />
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.piawaian}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g2_additional];
                                      newRows[index].piawaian = e.target.value;
                                      setBahagianG({ ...bahagianG, g2_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.pelan}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g2_additional];
                                      newRows[index].pelan = e.target.value;
                                      setBahagianG({ ...bahagianG, g2_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="border p-2">
                                  <RadioGroup
                                    value={row.keselarasan || ""}
                                    onValueChange={(value) => {
                                      const newRows = [...bahagianG.g2_additional];
                                      newRows[index].keselarasan = value as "Selaras" | "Tidak";
                                      setBahagianG({ ...bahagianG, g2_additional: newRows });
                                      markChanged();
                                    }}
                                    className="flex gap-2 justify-center"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="Selaras" id={`g2_add_${index}_selaras`} />
                                      <Label htmlFor={`g2_add_${index}_selaras`} className="text-xs">Selaras</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="Tidak" id={`g2_add_${index}_tidak`} />
                                      <Label htmlFor={`g2_add_${index}_tidak`} className="text-xs">Tidak</Label>
                                    </div>
                                  </RadioGroup>
                                </td>
                                <td className="border p-2">
                                  <Input
                                    value={row.nota}
                                    onChange={(e) => {
                                      const newRows = [...bahagianG.g2_additional];
                                      newRows[index].nota = e.target.value;
                                      setBahagianG({ ...bahagianG, g2_additional: newRows });
                                      markChanged();
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBahagianG({
                            ...bahagianG,
                            g2_additional: [...bahagianG.g2_additional, { item: "", ...emptyDRow() }],
                          });
                          markChanged();
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Item
                      </Button>
                    </div>

                    {/* Ulasan / Syor for G */}
                    <div className="space-y-3 pt-6 border-t">
                      <h3 className="font-bold">ULASAN / SYOR TERHADAP PERMOHONAN</h3>
                      <Textarea
                        value={ulasanSyorG}
                        onChange={(e) => {
                          setUlasanSyorG(e.target.value);
                          markChanged();
                        }}
                        rows={8}
                        placeholder="Nyatakan ulasan dan syor terhadap permohonan KMT ini..."
                      />
                    </div>

                    {/* Signature Block for G */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Disediakan Oleh :</Label>
                          <Input
                            value={disediakanOleh}
                            onChange={(e) => {
                              setDisediakanOleh(e.target.value);
                              markChanged();
                            }}
                            placeholder="Nama"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Jawatan :</Label>
                          <Input
                            value={jawatanPenyedia}
                            onChange={(e) => {
                              setJawatanPenyedia(e.target.value);
                              markChanged();
                            }}
                            placeholder="Jawatan"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tarikh :</Label>
                          <Input
                            type="date"
                            value={tarikhDisediakan}
                            onChange={(e) => {
                              setTarikhDisediakan(e.target.value);
                              markChanged();
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-20">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/permohonan/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Permohonan
            </Button>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => handleSave()}
                disabled={saving || statusLaporan === "Dikemukakan"}
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan Draf
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={saving || statusLaporan === "Dikemukakan"}
              >
                Kemukakan
              </Button>

              <Button
                variant="outline"
                className="bg-success text-white hover:bg-success/90"
                disabled={hasUnsavedChanges}
                title={hasUnsavedChanges ? "Simpan draf dahulu" : ""}
              >
                Jana PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Add padding to bottom to prevent content being hidden by fixed bar */}
        <div className="h-24"></div>
      </div>
    </Layout>
  );
}