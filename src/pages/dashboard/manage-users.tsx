import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/router";

interface Profile {
  id: string;
  full_name: string | null;
  staff_id: string | null;
  designation: string | null;
  role: string | null;
  department: string | null;
  organisation: string | null;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchProfiles();
  }, []);

  const checkUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can access this page.",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    setCurrentUserRole(profile.role);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("staff_id", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfiles(data ?? []);
    }
    setLoading(false);
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile({ ...profile });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProfile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        role: editingProfile.role,
        designation: editingProfile.designation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingProfile.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User profile updated successfully.",
      });
      setIsEditDialogOpen(false);
      fetchProfiles();
    }
    setSaving(false);
  };

  if (currentUserRole !== "admin") {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Urus Pengguna</h1>
          <p className="text-muted-foreground">
            Manage user profiles, roles, and designations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-mono font-semibold">
                      {profile.staff_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {profile.full_name}
                    </TableCell>
                    <TableCell>{profile.designation}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          profile.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : profile.role === "unit_head"
                            ? "bg-secondary/10 text-secondary"
                            : profile.role === "department_head"
                            ? "bg-accent/10 text-accent"
                            : profile.role === "assistant_planner_j5"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {profile.role === "admin" && "Admin"}
                        {profile.role === "admin_assistant" && "Admin Assistant"}
                        {profile.role === "unit_head" && "Unit Head"}
                        {profile.role === "assistant_planner_j5" && "Assistant Planner J5"}
                        {profile.role === "department_head" && "Department Head"}
                        {profile.role === "applicant" && "Applicant"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {profile.department}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(profile)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>
                Update the role and designation for {editingProfile?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="staff-id">Staff ID</Label>
                <Input
                  id="staff-id"
                  value={editingProfile?.staff_id ?? ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={editingProfile?.full_name ?? ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={editingProfile?.designation ?? ""}
                  onChange={(e) =>
                    setEditingProfile(
                      editingProfile
                        ? { ...editingProfile, designation: e.target.value }
                        : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editingProfile?.role ?? ""}
                  onValueChange={(value) =>
                    setEditingProfile(
                      editingProfile ? { ...editingProfile, role: value } : null
                    )
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="admin_assistant">Admin Assistant</SelectItem>
                    <SelectItem value="unit_head">Unit Head</SelectItem>
                    <SelectItem value="assistant_planner_j5">Assistant Planner J5</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="applicant">Applicant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}