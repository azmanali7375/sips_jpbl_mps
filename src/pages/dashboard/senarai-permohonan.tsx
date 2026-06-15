import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getOfficers } from "@/services/registrationService";
import {
  fetchApplicationsList,
  calculateSummary,
  getStatusBadgeVariant,
  getRowHighlightClass,
  ApplicationListItem,
  ApplicationFilters,
} from "@/services/applicationListService";
import {
  Search,
  Filter,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SenaraiPermohonan() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [officers, setOfficers] = useState<{ id: string; full_name: string }[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scaleFilter, setScaleFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");

  const [filters, setFilters] = useState<ApplicationFilters>({
    search: "",
    status_dalaman: "",
    skala_pembangunan: "",
    assigned_officer_id: "",
    date_from: "",
    date_to: "",
  });

  useEffect(() => {
    async function loadData() {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "officer";
      setUserRole(role);

      // Load officers for filter dropdown (admins/heads only)
      if (role === "admin" || role === "head") {
        const officersList = await getOfficers();
        setOfficers(officersList);
      }

      // Fetch applications
      await loadApplications(role, user.id);
    }

    loadData();
  }, [router]);

  async function loadApplications(role: string, uid: string) {
    setLoading(true);
    const data = await fetchApplicationsList(filters, role, uid);
    setApplications(data);
    setFilteredApplications(data);
    setLoading(false);
  }

  // Apply filters whenever filter values change
  useEffect(() => {
    if (applications.length > 0) {
      loadApplications(userRole, userId);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof ApplicationFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status_dalaman: "",
      skala_pembangunan: "",
      assigned_officer_id: "",
      date_from: "",
      date_to: "",
    });
  };

  const summary = calculateSummary(filteredApplications);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleRowClick = (applicationId: string) => {
    router.push(`/dashboard/permohonan/${applicationId}`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">
              Senarai Permohonan KM
            </h1>
            <p className="text-muted-foreground mt-1">
              Pemantauan KPI dan Status Permohonan Kebenaran Merancang
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/daftar-baharu")}>
            <FileText className="h-4 w-4 mr-2" />
            Daftar Baharu
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aktif</p>
                  <p className="text-2xl font-bold text-primary">{summary.aktif}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dalam Tempoh</p>
                  <p className="text-2xl font-bold text-green-600">{summary.dalam_tempoh}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Hampir Tamat (≤14 hari)
                  </p>
                  <p className="text-2xl font-bold text-orange-600">{summary.hampir_tamat}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Terlepas KPI</p>
                  <p className="text-2xl font-bold text-red-600">{summary.terlepas_kpi}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Penapis</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari No. OSC atau Nama Pemaju..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <Select
                    value={filters.status_dalaman}
                    onValueChange={(value) => handleFilterChange("status_dalaman", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Diterima">Diterima</SelectItem>
                      <SelectItem value="Dalam Semakan Teknikal">
                        Dalam Semakan Teknikal
                      </SelectItem>
                      <SelectItem value="Menunggu Ulasan ATD">Menunggu Ulasan ATD</SelectItem>
                      <SelectItem value="Kertas Perakuan Disediakan">
                        Kertas Perakuan Disediakan
                      </SelectItem>
                      <SelectItem value="Menunggu OSC">Menunggu OSC</SelectItem>
                      <SelectItem value="Lulus">Lulus</SelectItem>
                      <SelectItem value="Lulus Bersyarat">Lulus Bersyarat</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                      <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scale Filter */}
                <div>
                  <Select
                    value={filters.skala_pembangunan}
                    onValueChange={(value) => handleFilterChange("skala_pembangunan", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Skala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Skala</SelectItem>
                      <SelectItem value="Kecil">Kecil</SelectItem>
                      <SelectItem value="Sederhana">Sederhana</SelectItem>
                      <SelectItem value="Besar A">Besar A</SelectItem>
                      <SelectItem value="Besar B">Besar B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Officer Filter (Admin/Head only) */}
                {(userRole === "admin" || userRole === "head") && (
                  <div>
                    <Select
                      value={filters.assigned_officer_id}
                      onValueChange={(value) =>
                        handleFilterChange("assigned_officer_id", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter pegawai" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Pegawai</SelectItem>
                        {officers.map((officer) => (
                          <SelectItem key={officer.id} value={officer.id}>
                            {officer.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range */}
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange("date_from", e.target.value)}
                      placeholder="Dari"
                    />
                  </div>
                </div>

                <div>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange("date_to", e.target.value)}
                    placeholder="Hingga"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Kosongkan Penapis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">No. Fail JPL</TableHead>
                    <TableHead className="font-semibold">No. Permohonan OSC</TableHead>
                    <TableHead className="font-semibold">Nama Pemaju/Pemilik</TableHead>
                    <TableHead className="font-semibold">Skala</TableHead>
                    <TableHead className="font-semibold">Tarikh Lengkap OSC</TableHead>
                    <TableHead className="font-semibold">Tarikh KPI</TableHead>
                    <TableHead className="font-semibold text-center">Baki Hari</TableHead>
                    <TableHead className="font-semibold">Status Dalaman</TableHead>
                    <TableHead className="font-semibold">Pegawai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Memuatkan data...
                      </TableCell>
                    </TableRow>
                  ) : filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tiada permohonan dijumpai
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((app) => (
                      <TableRow
                        key={app.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          getRowHighlightClass(app.baki_hari, app.status_dalaman)
                        )}
                        onClick={() => handleRowClick(app.id)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {app.no_fail_jpl}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {app.no_permohonan_osc}
                        </TableCell>
                        <TableCell>{app.nama_pemaju_pemilik || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{app.skala_pembangunan}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(app.tarikh_lengkap_diterima_osc)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(app.tarikh_kpi)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "font-semibold",
                              app.baki_hari < 0
                                ? "text-red-600"
                                : app.baki_hari <= 14
                                ? "text-orange-600"
                                : "text-green-600"
                            )}
                          >
                            {app.baki_hari < 0 ? app.baki_hari : `+${app.baki_hari}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              getStatusBadgeVariant(app.status_dalaman) === "blue" &&
                                "bg-blue-100 text-blue-800 hover:bg-blue-200",
                              getStatusBadgeVariant(app.status_dalaman) === "teal" &&
                                "bg-teal-100 text-teal-800 hover:bg-teal-200",
                              getStatusBadgeVariant(app.status_dalaman) === "yellow" &&
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
                              getStatusBadgeVariant(app.status_dalaman) === "purple" &&
                                "bg-purple-100 text-purple-800 hover:bg-purple-200",
                              getStatusBadgeVariant(app.status_dalaman) === "orange" &&
                                "bg-orange-100 text-orange-800 hover:bg-orange-200",
                              getStatusBadgeVariant(app.status_dalaman) === "green" &&
                                "bg-green-100 text-green-800 hover:bg-green-200",
                              getStatusBadgeVariant(app.status_dalaman) === "gray" &&
                                "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}
                          >
                            {app.status_dalaman}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.assigned_officer_name || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground text-center">
          Menunjukkan {filteredApplications.length} daripada {applications.length} permohonan
        </div>
      </div>
    </Layout>
  );
}