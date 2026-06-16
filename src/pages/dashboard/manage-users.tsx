import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { RoleGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { auditLogService } from "@/services/auditLogService";
import { Check, X, Edit, UserCog, Power, AlertCircle, Search } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  staff_id: string;
  email: string;
  designation: string;
  department: string;
  phone: string | null;
  role: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  last_login: string | null;
  created_at: string;
}

export default function UserManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Approve modal
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [assignedRole, setAssignedRole] = useState<string>("");

  // Reject modal
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit modal
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    role: "",
    status: "",
    designation: "",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter, statusFilter]);

  async function checkAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile.role !== "admin") {
        toast({
          title: "Akses Ditolak",
          description: "Anda tidak mempunyai akses ke halaman ini.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      setCurrentUser(profile);
      loadUsers();
    } catch (error) {
      console.error("Access check error:", error);
      router.push("/dashboard");
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai pengguna",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.staff_id.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }

  async function handleApprove() {
    if (!selectedUser || !assignedRole || !currentUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "Aktif",
          role: assignedRole,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: selectedUser.id,
        title: "Akaun Diluluskan",
        message: `Akaun anda telah diluluskan. Anda kini boleh log masuk ke SIPS sebagai ${assignedRole}.`,
        type: "success",
        is_read: false,
      });

      toast({
        title: "Berjaya",
        description: `Akaun ${selectedUser.full_name} telah diluluskan`,
      });

      // Log audit entry
      await auditLogService.log({
        user_id: currentUser.id,
        action: auditLogService.actions.USER_APPROVED,
        target_user_id: selectedUser.id,
        details: {
          assigned_role: assignedRole,
          user_name: selectedUser.full_name,
          user_email: selectedUser.email,
        },
      });

      setShowApproveDialog(false);
      setSelectedUser(null);
      setAssignedRole("");
      loadUsers();
    } catch (error) {
      console.error("Approve error:", error);
      toast({
        title: "Ralat",
        description: "Gagal meluluskan akaun",
        variant: "destructive",
      });
    }
  }

  async function handleReject() {
    if (!selectedUser || !rejectionReason.trim() || !currentUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "Ditolak",
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: selectedUser.id,
        title: "Akaun Ditolak",
        message: `Permohonan pendaftaran anda telah ditolak. Sebab: ${rejectionReason}`,
        type: "error",
        is_read: false,
      });

      toast({
        title: "Berjaya",
        description: `Akaun ${selectedUser.full_name} telah ditolak`,
      });

      // Log audit entry
      await auditLogService.log({
        user_id: currentUser.id,
        action: auditLogService.actions.USER_REJECTED,
        target_user_id: selectedUser.id,
        details: {
          rejection_reason: rejectionReason,
          user_name: selectedUser.full_name,
          user_email: selectedUser.email,
        },
      });

      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason("");
      loadUsers();
    } catch (error) {
      console.error("Reject error:", error);
      toast({
        title: "Ralat",
        description: "Gagal menolak akaun",
        variant: "destructive",
      });
    }
  }

  async function handleEdit() {
    if (!selectedUser || !currentUser) return;

    // Security check: cannot change own role or deactivate own account
    if (selectedUser.id === currentUser.id) {
      if (editForm.role !== currentUser.role) {
        toast({
          title: "Tidak Dibenarkan",
          description: "Anda tidak boleh menukar peranan sendiri",
          variant: "destructive",
        });
        return;
      }
      if (editForm.status !== "Aktif") {
        toast({
          title: "Tidak Dibenarkan",
          description: "Anda tidak boleh menyahaktifkan akaun sendiri",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: editForm.role,
          status: editForm.status,
          designation: editForm.designation,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Maklumat pengguna dikemaskini",
      });

      // Log audit entry
      await auditLogService.log({
        user_id: currentUser.id,
        action: auditLogService.actions.USER_UPDATED,
        target_user_id: selectedUser.id,
        details: {
          changes: {
            role: editForm.role,
            status: editForm.status,
            designation: editForm.designation,
          },
          user_name: selectedUser.full_name,
        },
      });

      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error("Edit error:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini pengguna",
        variant: "destructive",
      });
    }
  }

  async function handleToggleStatus(user: UserProfile) {
    if (!currentUser) return;

    // Security check: cannot deactivate own account
    if (user.id === currentUser.id && user.status === "Aktif") {
      toast({
        title: "Tidak Dibenarkan",
        description: "Anda tidak boleh menyahaktifkan akaun sendiri",
        variant: "destructive",
      });
      return;
    }

    const newStatus = user.status === "Aktif" ? "Tidak Aktif" : "Aktif";
    const action = newStatus === "Aktif" ? "diaktifkan semula" : "dinyahaktifkan";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Akaun ${user.full_name} telah ${action}`,
      });

      // Log audit entry
      await auditLogService.log({
        user_id: currentUser.id,
        action: newStatus === "Aktif" ? auditLogService.actions.USER_ACTIVATED : auditLogService.actions.USER_DEACTIVATED,
        target_user_id: user.id,
        details: {
          previous_status: user.status,
          new_status: newStatus,
          user_name: user.full_name,
        },
      });

      loadUsers();
    } catch (error) {
      console.error("Toggle status error:", error);
      toast({
        title: "Ralat",
        description: "Gagal menukar status akaun",
        variant: "destructive",
      });
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Aktif":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>;
      case "Menunggu Kelulusan":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Menunggu</Badge>;
      case "Tidak Aktif":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Tidak Aktif</Badge>;
      case "Ditolak":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getRoleLabel(role: string | null) {
    if (!role) return "-";
    const roleMap: Record<string, string> = {
      admin: "Admin",
      ketua_unit: "Ketua Unit",
      pegawai: "Pegawai Perancang",
      penolong: "Penolong Pegawai",
      viewer: "Pengurusan (Viewer)",
    };
    return roleMap[role] || role;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Memuatkan...</p>
        </div>
      </Layout>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "Menunggu Kelulusan");
  const pendingCount = pendingUsers.length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pengurusan Pengguna</h1>
          <p className="text-muted-foreground mt-1">
            Urus pendaftaran, peranan, dan status pengguna SIPS
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Menunggu Kelulusan {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="all">Semua Pengguna</TabsTrigger>
          </TabsList>

          {/* Tab 1: Pending Approvals */}
          <TabsContent value="pending" className="space-y-4">
            {pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tiada pendaftaran baharu yang menunggu kelulusan.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingUsers.map((user) => (
                  <Card key={user.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {user.full_name} <span className="text-muted-foreground font-normal">({user.staff_id})</span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                        </div>
                        {getStatusBadge(user.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Jawatan:</span> {user.designation}
                          </div>
                          <div>
                            <span className="font-medium">Tarikh Daftar:</span>{" "}
                            {new Date(user.created_at).toLocaleDateString("ms-MY")}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowApproveDialog(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Luluskan
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Tolak
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: All Users */}
          <TabsContent value="all" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau No. Staf..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tapis mengikut peranan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Peranan</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="ketua_unit">Ketua Unit</SelectItem>
                      <SelectItem value="pegawai">Pegawai Perancang</SelectItem>
                      <SelectItem value="penolong">Penolong Pegawai</SelectItem>
                      <SelectItem value="viewer">Pengurusan (Viewer)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tapis mengikut status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Menunggu Kelulusan">Menunggu Kelulusan</SelectItem>
                      <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>No. Staf</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Jawatan</TableHead>
                      <TableHead>Peranan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Tiada pengguna dijumpai
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.staff_id}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.designation}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditForm({
                                  role: user.role || "",
                                  status: user.status,
                                  designation: user.designation,
                                });
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.status === "Aktif" || user.status === "Tidak Aktif" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(user)}
                                disabled={user.id === currentUser?.id && user.status === "Aktif"}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luluskan Pendaftaran</DialogTitle>
            <DialogDescription>
              Tetapkan peranan untuk pengguna ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedUser?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                No. Staf: {selectedUser?.staff_id}
              </p>
            </div>
            <div>
              <Label>Peranan yang ditetapkan:</Label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peranan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ketua_unit">Ketua Unit</SelectItem>
                  <SelectItem value="pegawai">Pegawai Perancang</SelectItem>
                  <SelectItem value="penolong">Penolong Pegawai Perancang</SelectItem>
                  <SelectItem value="viewer">Pengurusan (Viewer)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Admin hanya boleh ditetapkan secara manual dalam pangkalan data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={!assignedRole}
            >
              Sahkan Kelulusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pendaftaran</DialogTitle>
            <DialogDescription>
              Sebab penolakan akan dihantar kepada pengguna
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedUser?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                Email: {selectedUser?.email}
              </p>
            </div>
            <div>
              <Label>Sebab penolakan (akan dihantar ke pengguna):</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Cth: Butiran tidak lengkap / Bukan staf JPL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Sahkan Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah peranan, status, atau jawatan pengguna
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedUser?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                Email: {selectedUser?.email} (tidak boleh diubah)
              </p>
            </div>
            <div>
              <Label>Peranan:</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                disabled={selectedUser?.id === currentUser?.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="ketua_unit">Ketua Unit</SelectItem>
                  <SelectItem value="pegawai">Pegawai Perancang</SelectItem>
                  <SelectItem value="penolong">Penolong Pegawai</SelectItem>
                  <SelectItem value="viewer">Pengurusan (Viewer)</SelectItem>
                </SelectContent>
              </Select>
              {selectedUser?.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Anda tidak boleh menukar peranan sendiri
                </p>
              )}
            </div>
            <div>
              <Label>Status:</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                disabled={selectedUser?.id === currentUser?.id && editForm.status === "Aktif"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
              {selectedUser?.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Anda tidak boleh menyahaktifkan akaun sendiri
                </p>
              )}
            </div>
            <div>
              <Label>Jawatan:</Label>
              <Input
                value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                placeholder="Pegawai Perancang Bandar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}