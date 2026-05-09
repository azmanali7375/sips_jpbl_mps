import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services/authService";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  FileCheck,
  Shield,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getCurrentSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Memuatkan...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Sistem SPC MPS - Majlis Perbandaran Segamat"
        description="Sistem Pintar Kawalan Pembangunan untuk Jabatan Perancang Bandar & Landskap"
      />

      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-serif font-bold text-primary">
                  Sistem SPC MPS
                </h1>
                <p className="text-sm text-muted-foreground">
                  Majlis Perbandaran Segamat
                </p>
              </div>
              <div className="flex gap-3">
                {isAuthenticated ? (
                  <Button onClick={() => router.push("/dashboard")}>
                    Ke Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/auth/login")}
                    >
                      Log Masuk
                    </Button>
                    <Button onClick={() => router.push("/auth/register")}>
                      Daftar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Sistem Pintar Kawalan Pembangunan
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Platform bersepadu untuk menguruskan proses kawalan pembangunan
              secara sistematik, telus dan efisien di Jabatan Perancang Bandar
              & Landskap
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {!isAuthenticated && (
                <>
                  <Button size="lg" onClick={() => router.push("/auth/register")}>
                    Mula Sekarang
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/auth/login")}
                  >
                    Log Masuk
                  </Button>
                </>
              )}
              {isAuthenticated && (
                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  Ke Dashboard
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-16">
          <h3 className="text-3xl font-serif font-bold text-center mb-12">
            Ciri-Ciri Utama
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Penerimaan Digital
                </h4>
                <p className="text-sm text-muted-foreground">
                  Daftar permohonan dari OSC dengan muat naik dokumen secara
                  digital
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Aliran Kerja Automatik
                </h4>
                <p className="text-sm text-muted-foreground">
                  Agihan tugasan dan notifikasi automatik untuk setiap
                  peringkat
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">Lawatan Tapak</h4>
                <p className="text-sm text-muted-foreground">
                  Rekod lawatan dengan muat naik foto dan pemerhatian teknikal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Laporan Automatik
                </h4>
                <p className="text-sm text-muted-foreground">
                  Jana laporan teknikal dan syor berdasarkan garis panduan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Semakan Pematuhan
                </h4>
                <p className="text-sm text-muted-foreground">
                  Semak plot ratio, setback, ketinggian bangunan secara automatik
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Keputusan Mesyuarat
                </h4>
                <p className="text-sm text-muted-foreground">
                  Rekod keputusan OSC dan jana Borang C1/C2 secara automatik
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">Penjejakan Status</h4>
                <p className="text-sm text-muted-foreground">
                  Jejaki status permohonan dari pendaftaran hingga kelulusan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-serif font-bold mb-2">
                  Akses Berasaskan Peranan
                </h4>
                <p className="text-sm text-muted-foreground">
                  Kawalan akses mengikut peranan untuk keselamatan data
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Process Flow */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <h3 className="text-3xl font-serif font-bold text-center mb-12">
            Aliran Kerja Sistem
          </h3>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Penerimaan dari OSC",
                  desc: "Pembantu Tadbir daftar permohonan dengan upload dokumen",
                },
                {
                  step: "2",
                  title: "Agihan Permohonan",
                  desc: "Ketua Unit agih kepada Penolong Pegawai J5",
                },
                {
                  step: "3",
                  title: "Lawatan Tapak",
                  desc: "Pegawai teknikal buat lawatan dan muat naik foto",
                },
                {
                  step: "4",
                  title: "Laporan Teknikal",
                  desc: "Sistem jana laporan berdasarkan garis panduan",
                },
                {
                  step: "5",
                  title: "Semakan Ketua Jabatan",
                  desc: "Ketua Jabatan semak dan beri syor",
                },
                {
                  step: "6",
                  title: "Keputusan OSC",
                  desc: "Rekod keputusan mesyuarat dan jana borang",
                },
                {
                  step: "7",
                  title: "Pendaftaran Pelan",
                  desc: "Daftar pelan lulus dengan endorsement",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 items-start bg-card p-6 rounded-lg border border-border"
                >
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center bg-primary text-primary-foreground p-12 rounded-lg">
              <h3 className="text-3xl font-serif font-bold mb-4">
                Mulakan Hari Ini
              </h3>
              <p className="text-lg mb-8 opacity-90">
                Daftar akaun dan mula menguruskan permohonan pembangunan dengan
                lebih efisien
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push("/auth/register")}
              >
                Daftar Sekarang
              </Button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border bg-muted/20 mt-16">
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2026 Sistem SPC MPS - Jabatan Perancang Bandar & Landskap
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Majlis Perbandaran Segamat
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}