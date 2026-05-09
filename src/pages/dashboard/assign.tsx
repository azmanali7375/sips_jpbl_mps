import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { workflowService } from "@/services/workflowService";
import type { Tables } from "@/integrations/supabase/types";
import { Users, FileText, AlertCircle, CheckCircle } from "lucide-react";

export default function AssignApplications() {
  const router = useRouter();
  const [applications, setApplications] = useState<Tables<"applications">[]>([]);
  const [planners, setPlanners] = useState<Tables<"profiles">[]>([]);
  const [selectedApp, setSelectedApp] = useState<Tables<"applications"> | null>(null);
  const [selectedPlanner, setSelectedPlanner] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, plannersData] = await Promise.all([
        workflowService.getApplicationsByRole(),
        workflowService.getAvailablePlanners(),
      ]);

      // Filter only registered applications (ready for assignment)
      const registeredApps = appsData.filter(app => app.status === "registered");
      setApplications(registeredApps);
      setPlanners(plannersData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedApp || !selectedPlanner) return;

    setAssigning(true);
    setError("");

    try {
      const result = await workflowService.assignToPlanner(
        selectedApp.id,
        selectedPlanner,
        notes
      );

      if (result) {
        setSuccess(`Permohonan ${selectedApp.tracking_number} berjaya diagihkan`);
        setSelectedApp(null);
        setSelectedPlanner("");
        setNotes("");
        loadData(); // Reload to update list
      } else {
        throw new Error("Gagal mengagihkan permohonan");
      }
    } catch (err: any) {
      console.error("Assignment error:", err);
      setError(err.message || "Ralat semasa mengagihkan permohonan");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Layout>
      <SEO title="Agih Permohonan - Sistem SPC MPS" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Agih Permohonan</h1>
          <p className="text-muted-foreground mt-1">
            Agihkan permohonan kepada Penolong Pegawai Perancang Bandar & Desa J5
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Menunggu Agihan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-accent" />
                <p className="text-3xl font-bold font-mono">{applications.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pegawai Tersedia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <p className="text-3xl font-bold font-mono">{planners.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Diagihkan Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-success" />
                <p className="text-3xl font-bold font-mono">0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Memuatkan permohonan...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Tiada permohonan menunggu agihan pada masa ini
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Senarai Permohonan</CardTitle>
              <CardDescription>
                {applications.length} permohonan menunggu agihan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{app.project_name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono">{app.tracking_number}</span>
                        <span>{app.location}</span>
                        {app.project_type && (
                          <Badge variant="outline">{app.project_type}</Badge>
                        )}
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedApp(app)}>
                          <Users className="h-4 w-4 mr-2" />
                          Agih
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Agih Permohonan</DialogTitle>
                          <DialogDescription>
                            {app.tracking_number} - {app.project_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Pilih Penolong Pegawai J5</Label>
                            <Select
                              value={selectedPlanner}
                              onValueChange={setSelectedPlanner}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih pegawai" />
                              </SelectTrigger>
                              <SelectContent>
                                {planners.map((planner) => (
                                  <SelectItem key={planner.id} value={planner.id}>
                                    {planner.full_name}
                                    {planner.department && ` - ${planner.department}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Nota Tambahan (Pilihan)</Label>
                            <Textarea
                              placeholder="Arahan atau nota khas untuk pegawai..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={handleAssign}
                              disabled={!selectedPlanner || assigning}
                              className="flex-1"
                            >
                              {assigning ? "Mengagih..." : "Agih Sekarang"}
                            </Button>
                            <DialogTrigger asChild>
                              <Button variant="outline">Batal</Button>
                            </DialogTrigger>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}