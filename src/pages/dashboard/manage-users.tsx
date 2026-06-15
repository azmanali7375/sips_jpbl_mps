import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, UserCog } from "lucide-react";

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
  rejection_reason: string | null;
  created_at: string;
}

export default function ManageUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [assignedRole, setAssignedRole] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadUsers();
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }

  async function loadUsers() {
    try {
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

  async function handleApprove() {
    if (!selectedUser || !assignedRole) {
      toast({
        title: "Ralat",
        description: "Sila pilih peranan pengguna",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "Aktif",
          role: assignedRole,
          approved_by: currentUserId,
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

      setShowApproveDialog(false);
      setSelectedUser(null);
      setAssignedRole("");
      loadUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Ralat",
        description: "Gagal meluluskan akaun",
        variant: "destructive",
      });
    }
  }

  async function handleReject() {
    if (!selectedUser || !rejectionReason.trim()) {
      toast({
        title: "Ralat",
        description: "Sila nyatakan sebab penolakan",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "Ditolak",
          rejection_reason: rejectionReason,
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
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

      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason("");
      loadUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Ralat",
        description: "Gagal menolak akaun",
        variant: "destructive",
      });
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktif":
        return <Badge className="bg-green-600">Aktif</Badge>;
      case "Menunggu Kelulusan":
        return <Badge className="bg-yellow-600">Menunggu Kelulusan</Badge>;
      case "Ditolak":
        return <Badge className="bg-red-600">Ditolak</Badge>;
      case "Tidak Aktif":
        return <Badge className="bg-gray-600">Tidak Aktif</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return <span className="text-muted-foreground text-sm">-</span>;

    const colors: Record<string, string> = {
      admin: "bg-purple-600",
      ketua_unit: "bg-blue-600",
      pegawai: "bg-green-600",
      penolong: "bg-cyan-600",
      viewer: "bg-gray-600",
    };

    return <Badge className={colors[role] || "bg-gray-600"}>{role}</Badge>;
  };

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
  const activeUsers = users.filter((u) => u.status === "Aktif");
  const rejectedUsers = users.filter((u) => u.status === "Ditolak");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Urus Pengguna</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
              <div className="text-sm text-muted-foreground">Menunggu Kelulusan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activeUsers.length}</div>
              <div className="text-sm text-muted-foreground">Pengguna Aktif</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm text-muted-foreground">Jumlah Pengguna</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        {pendingUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Pendaftaran Menunggu Kelulusan ({pendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. Kakitangan</TableHead>
                    <TableHead>Emel</TableHead>
                    <TableHead>Jawatan</TableHead>
                    <TableHead>Tarikh Daftar</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.staff_id}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.designation}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("ms-MY")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowApproveDialog(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Lulus
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRejectDialog(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Tolak
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        <Card>
          <CardHeader>
            <CardTitle>Semua Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>No. Kakitangan</TableHead>
                  <TableHead>Emel</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tarikh Daftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.staff_id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("ms-MY")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luluskan Pengguna</DialogTitle>
            <DialogDescription>
              Tetapkan peranan sistem untuk {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role">Peranan Sistem</Label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peranan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="ketua_unit">Ketua Unit</SelectItem>
                  <SelectItem value="pegawai">Pegawai</SelectItem>
                  <SelectItem value="penolong">Penolong</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleApprove}>Lulus Akaun</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengguna</DialogTitle>
            <DialogDescription>
              Nyatakan sebab penolakan untuk {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Sebab Penolakan</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Contoh: Maklumat tidak lengkap, no. kakitangan tidak sah, dll."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Tolak Akaun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}