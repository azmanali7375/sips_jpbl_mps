import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { publicHolidayService, type PublicHoliday } from "@/services/publicHolidayService";
import { Calendar, Plus, Pencil, Trash2, Download } from "lucide-react";

export default function CutiUmumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [holidayCount, setHolidayCount] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<PublicHoliday | null>(null);
  const [formData, setFormData] = useState({
    tarikh: "",
    nama_cuti: "",
    jenis_cuti: "Kebangsaan",
    tahun: new Date().getFullYear(),
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadHolidays();
    }
  }, [selectedYear]);

  async function checkAuth() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        toast({
          title: "Akses Dinafikan",
          description: "Anda tidak mempunyai akses ke halaman ini",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/auth/login");
    }
  }

  async function loadHolidays() {
    try {
      const data = await publicHolidayService.getByYear(selectedYear);
      setHolidays(data);

      const count = await publicHolidayService.countByYear(selectedYear);
      setHolidayCount(count);
    } catch (error) {
      console.error("Error loading holidays:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data cuti umum",
        variant: "destructive",
      });
    }
  }

  async function handleAdd() {
    try {
      if (!formData.tarikh || !formData.nama_cuti) {
        toast({
          title: "Ralat",
          description: "Sila lengkapkan semua medan yang diperlukan",
          variant: "destructive",
        });
        return;
      }

      await publicHolidayService.create({
        tarikh: formData.tarikh,
        nama_cuti: formData.nama_cuti,
        jenis_cuti: formData.jenis_cuti,
        tahun: formData.tahun,
      });

      toast({
        title: "Berjaya",
        description: "Cuti umum berjaya ditambah",
      });

      setShowAddDialog(false);
      setFormData({
        tarikh: "",
        nama_cuti: "",
        jenis_cuti: "Kebangsaan",
        tahun: new Date().getFullYear(),
      });
      loadHolidays();
    } catch (error: any) {
      console.error("Error adding holiday:", error);
      toast({
        title: "Ralat",
        description: error.message?.includes("duplicate")
          ? "Tarikh ini sudah wujud dalam senarai"
          : "Gagal menambah cuti umum",
        variant: "destructive",
      });
    }
  }

  async function handleEdit() {
    try {
      if (!selectedHoliday || !formData.tarikh || !formData.nama_cuti) {
        toast({
          title: "Ralat",
          description: "Sila lengkapkan semua medan yang diperlukan",
          variant: "destructive",
        });
        return;
      }

      await publicHolidayService.update(selectedHoliday.id, {
        tarikh: formData.tarikh,
        nama_cuti: formData.nama_cuti,
        jenis_cuti: formData.jenis_cuti,
        tahun: formData.tahun,
      });

      toast({
        title: "Berjaya",
        description: "Cuti umum berjaya dikemaskini",
      });

      setShowEditDialog(false);
      setSelectedHoliday(null);
      loadHolidays();
    } catch (error) {
      console.error("Error updating holiday:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini cuti umum",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    try {
      if (!selectedHoliday) return;

      await publicHolidayService.delete(selectedHoliday.id);

      toast({
        title: "Berjaya",
        description: "Cuti umum berjaya dipadam",
      });

      setShowDeleteDialog(false);
      setSelectedHoliday(null);
      loadHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam cuti umum",
        variant: "destructive",
      });
    }
  }

  function openEditDialog(holiday: PublicHoliday) {
    setSelectedHoliday(holiday);
    setFormData({
      tarikh: holiday.tarikh,
      nama_cuti: holiday.nama_cuti,
      jenis_cuti: holiday.jenis_cuti || "Kebangsaan",
      tahun: holiday.tahun || new Date().getFullYear(),
    });
    setShowEditDialog(true);
  }

  function openDeleteDialog(holiday: PublicHoliday) {
    setSelectedHoliday(holiday);
    setShowDeleteDialog(true);
  }

  function getJenisBadgeColor(jenis: string | null) {
    switch (jenis) {
      case "Kebangsaan":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Negeri Johor":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Daerah Segamat":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Memuatkan...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cuti Umum</h1>
            <p className="text-muted-foreground">
              Urus cuti umum untuk pengiraan hari bekerja
            </p>
          </div>
          <RoleGuard roles={["admin"]}>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Cuti
            </Button>
          </RoleGuard>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Senarai Cuti Umum
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Tahun:</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="secondary">
                  {holidayCount} hari cuti direkodkan
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada cuti umum direkodkan untuk tahun {selectedYear}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Nama Cuti</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        {new Date(holiday.tarikh).toLocaleDateString("ms-MY", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{holiday.nama_cuti}</TableCell>
                      <TableCell>
                        <Badge className={getJenisBadgeColor(holiday.jenis_cuti)}>
                          {holiday.jenis_cuti || "Lain-lain"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RoleGuard roles={["admin"]}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(holiday)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(holiday)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RoleGuard>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Cuti Umum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tarikh</Label>
              <Input
                type="date"
                value={formData.tarikh}
                onChange={(e) => setFormData({ ...formData, tarikh: e.target.value })}
              />
            </div>
            <div>
              <Label>Nama Cuti</Label>
              <Input
                value={formData.nama_cuti}
                onChange={(e) => setFormData({ ...formData, nama_cuti: e.target.value })}
                placeholder="Cth: Hari Kebangsaan"
              />
            </div>
            <div>
              <Label>Jenis Cuti</Label>
              <Select
                value={formData.jenis_cuti}
                onValueChange={(value) => setFormData({ ...formData, jenis_cuti: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kebangsaan">Kebangsaan</SelectItem>
                  <SelectItem value="Negeri Johor">Negeri Johor</SelectItem>
                  <SelectItem value="Daerah Segamat">Daerah Segamat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tahun</Label>
              <Input
                type="number"
                value={formData.tahun}
                onChange={(e) =>
                  setFormData({ ...formData, tahun: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAdd}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kemaskini Cuti Umum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tarikh</Label>
              <Input
                type="date"
                value={formData.tarikh}
                onChange={(e) => setFormData({ ...formData, tarikh: e.target.value })}
              />
            </div>
            <div>
              <Label>Nama Cuti</Label>
              <Input
                value={formData.nama_cuti}
                onChange={(e) => setFormData({ ...formData, nama_cuti: e.target.value })}
              />
            </div>
            <div>
              <Label>Jenis Cuti</Label>
              <Select
                value={formData.jenis_cuti}
                onValueChange={(value) => setFormData({ ...formData, jenis_cuti: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kebangsaan">Kebangsaan</SelectItem>
                  <SelectItem value="Negeri Johor">Negeri Johor</SelectItem>
                  <SelectItem value="Daerah Segamat">Daerah Segamat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tahun</Label>
              <Input
                type="number"
                value={formData.tahun}
                onChange={(e) =>
                  setFormData({ ...formData, tahun: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Cuti Umum</DialogTitle>
          </DialogHeader>
          <p>
            Adakah anda pasti mahu memadam <strong>{selectedHoliday?.nama_cuti}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}