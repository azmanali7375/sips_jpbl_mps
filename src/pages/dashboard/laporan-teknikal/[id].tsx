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
  });

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
  }, [hasUnsavedChanges, bahagianA, bahagianB, bahagianC, bahagianD, noRujukanFail, isKmt]);

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
      } else {
        // Pre-fill from application data
        setNoRujukanFail(application.no_permohonan_osc || "");
        
        // Pre-fill Bahagian B - mukim comes from application, not land_lots
        const prefilled: BahagianBData = {
          ...bahagianB,
          b_a_i_lots: landLots.length > 0
            ? landLots.map(lot => ({ no_lot: lot.no_lot || "", mukim: application.mukim || "" }))
            : [{ no_lot: "", mukim: application.mukim || "" }],
          b_a_ii_pemilik: application.nama_pemaju_pemilik || "",
          b_a_iii_pemohon: application.nama_sp || "",
          b_a_v_syarat_nyata: landLots[0]?.syarat_nyata || "",
        };
        setBahagianB(prefilled);
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
    { id: "E", label: "E", disabled: true },
    { id: "F", label: "F", disabled: true },
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}