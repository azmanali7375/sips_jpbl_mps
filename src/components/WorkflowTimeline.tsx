import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { workflowService } from "@/services/workflowService";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Users,
  FileCheck,
  Gavel,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface WorkflowTimelineProps {
  applicationId: string;
}

export function WorkflowTimeline({ applicationId }: WorkflowTimelineProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [applicationId]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await workflowService.getWorkflowHistory(applicationId);
    setHistory(data);
    setLoading(false);
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      osc_received: "Diterima OSC",
      registered: "Berdaftar",
      assigned: "Ditugaskan",
      site_visit: "Lawatan Tapak",
      technical_report: "Laporan Teknikal",
      head_review: "Semakan Ketua",
      recommendation: "Cadangan",
      osc_meeting: "Mesyuarat OSC",
      approved: "Diluluskan",
      rejected: "Ditolak",
      approved_with_amendments: "Lulus Dengan Pindaan",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "h-5 w-5";
    switch (status) {
      case "osc_received":
        return <FileText className={iconClass} />;
      case "registered":
        return <FileCheck className={iconClass} />;
      case "assigned":
        return <Users className={iconClass} />;
      case "site_visit":
        return <MapPin className={iconClass} />;
      case "technical_report":
        return <FileText className={iconClass} />;
      case "head_review":
        return <Users className={iconClass} />;
      case "recommendation":
        return <FileCheck className={iconClass} />;
      case "osc_meeting":
        return <Gavel className={iconClass} />;
      case "approved":
        return <CheckCircle2 className={iconClass} />;
      case "rejected":
        return <XCircle className={iconClass} />;
      case "approved_with_amendments":
        return <AlertCircle className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "approved":
        return "bg-success text-success-foreground";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      case "approved_with_amendments":
        return "bg-accent text-accent-foreground";
      case "osc_received":
      case "registered":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sejarah Permohonan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sejarah Permohonan</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Tiada sejarah perubahan</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {history.map((item, index) => (
                <div key={item.id} className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-1 p-2 rounded-full ${getStatusColor(
                      item.to_status
                    )}`}
                  >
                    {getStatusIcon(item.to_status)}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge className={getStatusColor(item.to_status)}>
                          {getStatusLabel(item.to_status)}
                        </Badge>
                        {item.from_status && item.from_status !== item.to_status && (
                          <span className="text-sm text-muted-foreground ml-2">
                            dari {getStatusLabel(item.from_status)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.created_at), "dd MMM yyyy, HH:mm", {
                          locale: ms,
                        })}
                      </p>
                    </div>

                    {item.profiles && (
                      <p className="text-sm text-muted-foreground">
                        Oleh: {item.profiles.full_name || "Sistem"} ({item.profiles.role})
                      </p>
                    )}

                    {item.comment && (
                      <p className="text-sm bg-muted p-3 rounded-lg">{item.comment}</p>
                    )}
                  </div>

                  {index < history.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}