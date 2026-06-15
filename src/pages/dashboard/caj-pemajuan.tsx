import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cajPemajanService, type CajPemajanData } from "@/services/cajPemajanService";
import { applicationService } from "@/services/applicationService";
import { Loader2, DollarSign, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";

export default function CajPemajanPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [cajData, setCajData] = useState<CajPemajanData | null>(null);

  // Form state
  const [jumlahCaj, setJumlahCaj] = useState("");
  const [dikiraOleh, setDikiraOleh] = useState("");
  const [tarikhNotis, setTarikhNotis] = useState(new Date().toISOString().split("T")[0]);
  const [tarikhLuputBayar, setTarikhLuputBayar] = useState("");
  const [catatan, setCatatan] = useState("");
  const [dikecualikan, setDikecualikan] = useState(false);

  // Payment recording state
  const [tarikhBayar, setTarikhBayar] = useState("");
  const [noResit, setNoResit] = useState("");

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    // Auto-calculate payment deadline (30 days from notice date)
    if (tarikhNotis) {
      const notisDate = new Date(tarikhNotis);
      notisDate.setDate(notisDate.getDate() + 30);
      setTarikhLuputBayar(notisDate.toISOString().split("T")[0]);
    }
  }, [tarikhNotis]);

  const loadData = async () => {
    try {
      setLoading(true);

      const app = await applicationService.getApplicationById(id as string);
      setApplication(app);

      const caj = await cajPemajanService.getCajPemajan(id as string);
      if (caj) {
        setCajData(caj);
        
        // Pre-fill form if data exists
        if (caj.jumlah_caj) setJumlahCaj(caj.jumlah_caj.toString());
        if (caj.dikira_oleh) setDikiraOleh(caj.dikira_oleh);
        if (caj.tarikh_notis) setTarikhNotis(caj.tarikh_notis);
        if (caj.tarikh_luput_bayar) setTarikhLuputBayar(caj.tarikh_luput_bayar);
        if (caj.catatan) setCatatan(caj.catatan);
        if (caj.status_caj === "Dikecualikan") setDikecualikan(true);
      }
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
  };

  const handleSubmitCajAmount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jumlahCaj || !dikiraOleh) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan semua medan wajib",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      await cajPemajanService.submitCajAmount({
        cajId: cajData!.id!,
        applicationId: id as string,
        jumlah_caj: parseFloat(jumlahCaj),
        dikira_oleh: dikiraOleh,
        tarikh_notis: tarikhNotis,
        tarikh_luput_bayar: tarikhLuputBayar,
        catatan: catatan || undefined,
        dikecualikan,
      });

      toast({
        title: "Berjaya",
        description: dikecualikan
          ? "Permohonan dikecualikan dari Caj Pemajuan"
          : "Jumlah Caj Pemajuan telah disimpan. Notis boleh dijana.",
      });

      await loadData();
    } catch (error) {
      console.error("Error submitting caj amount:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan maklumat",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateNotis = async () => {
    if (!cajData?.id) return;

    setGenerating(true);

    try {
      const notisData = await cajPemajanService.getNotisCajData(id as string);
      if (!notisData) {
        toast({
          title: "Ralat",
          description: "Gagal mendapatkan data untuk Notis Caj Pemajuan",
          variant: "destructive",
        });
        return;
      }

      const html = cajPemajanService.generateNotisCajHTML(notisData);
      const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const filename = `NotisCajPemajuan_${notisData.no_rujukan_fail.replace(/\//g, "_")}_${timestamp}.html`;

      cajPemajanService.downloadNotisCajPDF(html, filename);

      toast({
        title: "Notis Dijana",
        description: "Buka fail HTML dan cetak ke PDF dari pelayar anda.",
      });
    } catch (error) {
      console.error("Error generating notis:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana Notis Caj Pemajuan",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tarikhBayar || !noResit) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan tarikh bayaran dan nombor resit",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      await cajPemajanService.recordPayment(cajData!.id!, tarikhBayar, noResit);

      toast({
        title: "Bayaran Direkod",
        description: "Status Caj Pemajuan dikemaskini kepada 'Dibayar'. Borang C(1) kini boleh dijana.",
      });

      await loadData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Ralat",
        description: "Gagal merekod bayaran",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Belum Dikira":
        return <Badge variant="secondary">Belum Dikira</Badge>;
      case "Menunggu Bayaran":
        return <Badge className="bg-orange-500">Menunggu Bayaran</Badge>;
      case "Dibayar":
        return <Badge className="bg-green-600">Dibayar</Badge>;
      case "Dikecualikan":
        return <Badge className="bg-blue-600">Dikecualikan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (!cajData) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Rekod Caj Pemajuan tidak dijumpai untuk permohonan ini.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Caj Pemajuan</h1>
          <p className="text-muted-foreground">
            {application?.no_permohonan_osc} - {application?.tajuk_permohonan}
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status Caj Pemajuan</span>
              {getStatusBadge(cajData.status_caj)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {cajData.jumlah_caj && (
                <div>
                  <span className="text-muted-foreground">Jumlah Caj:</span>
                  <p className="font-semibold text-lg">
                    {new Intl.NumberFormat("ms-MY", {
                      style: "currency",
                      currency: "MYR",
                    }).format(cajData.jumlah_caj)}
                  </p>
                </div>
              )}
              {cajData.tarikh_luput_bayar && (
                <div>
                  <span className="text-muted-foreground">Tarikh Luput Bayar:</span>
                  <p className="font-medium">
                    {new Date(cajData.tarikh_luput_bayar).toLocaleDateString("ms-MY")}
                  </p>
                </div>
              )}
              {cajData.dikira_oleh && (
                <div>
                  <span className="text-muted-foreground">Dikira Oleh:</span>
                  <p>{cajData.dikira_oleh}</p>
                </div>
              )}
              {cajData.no_rujukan_caj && (
                <div>
                  <span className="text-muted-foreground">No. Rujukan:</span>
                  <p>{cajData.no_rujukan_caj}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entry Form (Belum Dikira) */}
        {cajData.status_caj === "Belum Dikira" && (
          <Card>
            <CardHeader>
              <CardTitle>Masukkan Jumlah Caj Pemajuan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitCajAmount} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="dikecualikan" checked={dikecualikan} onCheckedChange={setDikecualikan} />
                  <Label htmlFor="dikecualikan">Dikecualikan dari Caj Pemajuan</Label>
                </div>

                {!dikecualikan && (
                  <>
                    <div>
                      <Label>
                        Jumlah Caj (RM) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={jumlahCaj}
                        onChange={(e) => setJumlahCaj(e.target.value)}
                        placeholder="Contoh: 5000.00"
                        required={!dikecualikan}
                      />
                    </div>

                    <div>
                      <Label>
                        Dikira Oleh (Pegawai JPPH) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={dikiraOleh}
                        onChange={(e) => setDikiraOleh(e.target.value)}
                        placeholder="Nama pegawai JPPH"
                        required={!dikecualikan}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tarikh Notis</Label>
                        <Input
                          type="date"
                          value={tarikhNotis}
                          onChange={(e) => setTarikhNotis(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Tarikh Luput Bayar</Label>
                        <Input
                          type="date"
                          value={tarikhLuputBayar}
                          onChange={(e) => setTarikhLuputBayar(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto: 30 hari dari tarikh notis
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Catatan</Label>
                      <Textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        rows={3}
                        placeholder="Nota tambahan..."
                      />
                    </div>
                  </>
                )}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : dikecualikan ? (
                    "Tandakan Dikecualikan"
                  ) : (
                    "Simpan & Jana Notis"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Generate Notis (Menunggu Bayaran) */}
        {cajData.status_caj === "Menunggu Bayaran" && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notis Caj Pemajuan (Borang A)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerateNotis} disabled={generating} className="w-full">
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menjana...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Jana Notis Caj Pemajuan (Borang A)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Separator className="my-6" />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Rekod Bayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>
                        Tarikh Bayaran <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={tarikhBayar}
                        onChange={(e) => setTarikhBayar(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>
                        No. Resit <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={noResit}
                        onChange={(e) => setNoResit(e.target.value)}
                        placeholder="Contoh: RES/2026/001"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Rekod Bayaran
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* Payment Recorded */}
        {cajData.status_caj === "Dibayar" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <p className="font-semibold">Bayaran Telah Diterima</p>
              <p className="text-sm mt-1">
                Tarikh Bayaran: {cajData.tarikh_bayar && new Date(cajData.tarikh_bayar).toLocaleDateString("ms-MY")} | 
                No. Resit: {cajData.no_resit}
              </p>
              <p className="text-sm mt-2">
                Borang C(1) kini boleh dijana dari halaman Keputusan OSC.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Exempted */}
        {cajData.status_caj === "Dikecualikan" && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold">Dikecualikan dari Caj Pemajuan</p>
              <p className="text-sm mt-2">
                Borang C(1) boleh dijana terus tanpa bayaran Caj Pemajuan.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}