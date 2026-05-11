import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw } from "lucide-react";
import type { ComplianceCheckResult } from "@/services/complianceService";

interface ComplianceResultsProps {
  checkResult: ComplianceCheckResult | null;
  onRecheck?: () => void;
  onDownloadReport?: () => void;
  loading?: boolean;
}

export function ComplianceResults({ 
  checkResult, 
  onRecheck, 
  onDownloadReport,
  loading = false 
}: ComplianceResultsProps) {
  if (!checkResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Semakan Pematuhan</CardTitle>
          <CardDescription>
            Tiada keputusan semakan pematuhan tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Permohonan ini belum disemak untuk pematuhan peraturan.
              {onRecheck && (
                <Button 
                  onClick={onRecheck} 
                  className="ml-4" 
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Semak Sekarang
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (checkResult.overall_status) {
      case "passed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            LULUS
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive">
            <XCircle className="h-4 w-4 mr-1" />
            GAGAL
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500">
            <AlertTriangle className="h-4 w-4 mr-1" />
            LULUS DENGAN SYARAT
          </Badge>
        );
    }
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? "text-green-600" : "text-destructive";
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: "bg-red-500",
      warning: "bg-amber-500",
      info: "bg-blue-500",
    };
    return colors[severity as keyof typeof colors] || colors.info;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-3">
              Keputusan Semakan Pematuhan
              {getStatusBadge()}
            </CardTitle>
            <CardDescription className="mt-2">
              Disemak pada: {new Date(checkResult.check_date).toLocaleString("ms-MY")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onRecheck && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRecheck}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Semak Semula
              </Button>
            )}
            {onDownloadReport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDownloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Muat Turun Laporan
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {checkResult.total_rules}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Jumlah Peraturan
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {checkResult.passed_rules}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Lulus
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive">
                  {checkResult.failed_rules}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Gagal
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Butiran Semakan</h3>
          {checkResult.results.map((result, index) => (
            <Card 
              key={index}
              className={`border-l-4 ${
                result.passed 
                  ? "border-l-green-500" 
                  : "border-l-destructive"
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{result.rule_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {result.rule_type}
                      </Badge>
                      <Badge className={getSeverityBadge(result.severity)}>
                        {result.severity}
                      </Badge>
                    </div>
                    <p className={`text-sm mb-3 ${getStatusColor(result.passed)}`}>
                      {result.message}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nilai Dijangka:</span>
                        <span className="ml-2 font-medium">{result.expected_value}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nilai Sebenar:</span>
                        <span className="ml-2 font-medium">{result.actual_value}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {result.passed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Failure Summary */}
        {checkResult.failed_rules > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Tindakan Diperlukan:</div>
              <ul className="list-disc list-inside space-y-1">
                {checkResult.results
                  .filter(r => !r.passed)
                  .map((failure, idx) => (
                    <li key={idx} className="text-sm">
                      {failure.message}
                    </li>
                  ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}