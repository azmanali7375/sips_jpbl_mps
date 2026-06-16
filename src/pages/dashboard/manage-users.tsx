import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Shield, Search, Edit, Mail, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
  { value: "ketua_unit", label: "Ketua Unit", color: "bg-purple-100 text-purple-800" },
  { value: "penolong_pegawai_j5", label: "Penolong Pegawai (J5)", color: "bg-blue-100 text-blue-800" },
  { value: "pembantu_tadbir", label: "Pembantu Tadbir", color: "bg-green-100 text-green-800" },
];

export default function ManageUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [updating, setUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    role: "",
    department: "",
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  async function checkAdminAccess() {
    const profile = await profileService.getCurrentProfile();
    setCurrentProfile(profile);
    
    if (profile?.role !== "admin") {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin boleh mengakses halaman ini",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    loadUsers();
  }

  async function loadUsers() {
    try {
      setLoading(true);
      
      // Get all profiles with auth user data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth users data
      let authUsers: any[] = [];
      try {
        const { data, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && data?.users) {
          authUsers = data.users;
        }
      } catch (error) {
        console.warn("Could not fetch auth users:", error);
      }

      // Merge profile and auth data
      const mergedUsers: UserProfile[] = (profiles || []).map((profile) => {
        const authUser = authUsers.find((u) => u.id === profile.id);
        return {
          id: profile.id,
          email: authUser?.email || profile.email || "N/A",
          full_name: profile.full_name || "N/A",
          role: profile.role || "pembantu_tadbir",
          department: profile.department,
          created_at: profile.created_at || "",
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      });

      setUsers(mergedUsers);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal memuatkan senarai pengguna",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function filterUsers() {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (filterRole !== "all") {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  }

  function openEditModal(user: UserProfile) {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      department: user.department || "",
    });
    setShowEditModal(true);
  }

  async function handleUpdateUser() {
    if (!selectedUser) return;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          role: editForm.role,
          department: editForm.department || null,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Maklumat pengguna telah dikemaskini",
      });

      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal mengemaskini pengguna",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  }

  function getRoleBadge(role: string) {
    const roleConfig = ROLES.find((r) => r.value === role);
    return (
      <Badge className={roleConfig?.color || "bg-gray-100 text-gray-800"}>
        {roleConfig?.label || role}
      </Badge>
    );
  }

  function getRoleStats() {
    return ROLES.map((role) => ({
      ...role,
      count: users.filter((u) => u.role === role.value).length,
    }));
  }

  if (loading) {
    return (
      <Layout>
        <SEO title="Pengurusan Pengguna" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuatkan senarai pengguna...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Pengurusan Pengguna" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pengurusan Pengguna</h1>
            <p className="text-muted-foreground">
              Urus peranan dan maklumat pengguna sistem
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Admin Panel</span>
          </div>
        </div>

        {/* Role Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          {getRoleStats().map((role) => (
            <Card key={role.value}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{role.label}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{role.count}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((role.count / users.length) * 100).toFixed(0)}% daripada jumlah
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tukar peranan pengguna dengan berhati-hati. Peranan menentukan akses kepada fungsi sistem.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Carian & Penapis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="search">Cari Pengguna</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nama, email, jabatan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter">Peranan</Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger id="filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Peranan</SelectItem>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Senarai Pengguna ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Klik butang Edit untuk menukar peranan pengguna
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tiada pengguna dijumpai</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Penuh</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peranan</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Log Masuk Terakhir</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.department || "-"}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(user.last_sign_in_at).toLocaleString("ms-MY")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Belum log masuk</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          disabled={user.id === currentProfile?.id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kemaskini Pengguna</DialogTitle>
              <DialogDescription>
                Tukar peranan dan jabatan pengguna
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedUser && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              )}

              <div>
                <Label htmlFor="edit_role">Peranan</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger id="edit_role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Peranan menentukan tahap akses dalam sistem
                </p>
              </div>

              <div>
                <Label htmlFor="edit_department">Jabatan (Opsional)</Label>
                <Input
                  id="edit_department"
                  value={editForm.department}
                  onChange={(e) =>
                    setEditForm({ ...editForm, department: e.target.value })
                  }
                  placeholder="Contoh: Bahagian Perancangan"
                />
              </div>

              {/* Role Descriptions */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-2">Keterangan Peranan:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><strong>Admin:</strong> Akses penuh kepada semua fungsi</li>
                  <li><strong>Ketua Unit:</strong> Semakan, kelulusan, laporan</li>
                  <li><strong>Penolong Pegawai (J5):</strong> Semakan teknikal, lawatan tapak</li>
                  <li><strong>Pembantu Tadbir:</strong> Pendaftaran, dokumentasi</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Batal
              </Button>
              <Button onClick={handleUpdateUser} disabled={updating}>
                {updating ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}