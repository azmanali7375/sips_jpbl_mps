import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { workflowService } from "@/services/workflowService";
import type { Tables } from "@/integrations/supabase/types";
import { ClipboardList, MapPin, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MyAssignments() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Tables<"applications">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await workflowService.getAssignedToMe();
      setAssignments(data);
    } catch (error) {
      console.error("Error loading assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      assigned: "default",
      site_visit: "secondary",
      technical_report: "outline",
    };

    const labels: Record<string, string> = {
      assigned: "Baru Diterima",
      site_visit: "Lawatan Tapak",
      technical_report: "Laporan Teknikal",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleStartSiteVisit = async (applicationId: string) => {
    await workflowService.updateStatus(applicationId, "site_visit");
    router.push(`/dashboard/site-visit/${applicationId}`);
  };

  return (
    <Layout>
      <SEO title="Tugasan Saya - Sistem SPC MPS" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Tugasan Saya</h1>
          <p className="text-muted-foreground mt-1">
            Permohonan yang diagihkan kepada anda
          </p>
        </div>

        {assignments.length === 0 && !loading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tiada tugasan pada masa ini
            </AlertDescription>
          </Alert>
        )}

        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Senarai Tugasan
              </CardTitle>
              <CardDescription>
                {assignments.length} permohonan memerlukan tindakan anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Rujukan</TableHead>
                    <TableHead>Nama Projek</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarikh Diagih</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-sm">
                        {app.tracking_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.project_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {app.location}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {app.assigned_at
                          ? new Date(app.assigned_at).toLocaleDateString("ms-MY")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status === "assigned" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartSiteVisit(app.id)}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Mula Lawatan Tapak
                          </Button>
                        )}
                        {app.status === "site_visit" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/site-visit/${app.id}`)}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Sambung Lawatan
                          </Button>
                        )}
                        {app.status === "technical_report" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/dashboard/report/${app.id}`)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Lihat Laporan
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}