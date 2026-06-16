import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Upload, Edit, Trash2, Search, Filter, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DisplayFileNumber } from "@/components/DisplayFileNumber";
import { FilePreviewModal } from "@/components/FilePreviewModal";

interface Document {
  id: string;
  application_id: string;
  file_name: string;
  file_path: string;
  jenis_dokumen: string;
  versi: string;
  uploaded_by: string;
  uploaded_at: string;
  application?: {
    no_fail_jpl: string;
    no_permohonan_osc: string;
    nama_pemaju_pemilik: string;
    tajuk_permohonan: string;
  };
  uploader?: {
    full_name: string;
  };
}

const DOCUMENT_TYPES = [
  "Pelan Susun Atur",
  "Pelan Bangunan",
  "Pelan CAD",
  "Kebenaran Tanah",
  "Laporan Teknikal",
  "Surat Pemohon",
  "Dokumen OSC",
  "Lain-lain",
];

export default function DocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    application_id: "",
    jenis_dokumen: "Pelan Susun Atur",
    file_name: "",
    file_path: "",
    versi: "v1",
    catatan: "",
  });

  const [editForm, setEditForm] = useState({
    file_name: "",
    jenis_dokumen: "",
    versi: "",
    catatan: "",
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, filterType]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          application:applications(
            no_fail_jpl,
            no_permohonan_osc,
            nama_pemaju_pemilik,
            tajuk_permohonan
          ),
          uploader:profiles!documents_uploaded_by_fkey(
            full_name
          )
        `)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal memuatkan dokumen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function filterDocuments() {
    let filtered = [...documents];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.application?.no_fail_jpl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.application?.nama_pemaju_pemilik?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((doc) => doc.jenis_dokumen === filterType);
    }

    setFilteredDocuments(filtered);
  }

  async function handleUpload() {
    if (!uploadForm.application_id || !uploadForm.file_name || !uploadForm.file_path) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan semua medan",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna tidak dijumpai");

      const { error } = await supabase.from("documents").insert({
        application_id: uploadForm.application_id,
        file_name: uploadForm.file_name,
        file_path: uploadForm.file_path,
        jenis_dokumen: uploadForm.jenis_dokumen,
        versi: uploadForm.versi,
        uploaded_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Dokumen telah dimuat naik",
      });

      setShowUploadModal(false);
      setUploadForm({
        application_id: "",
        jenis_dokumen: "Pelan Susun Atur",
        file_name: "",
        file_path: "",
        versi: "v1",
        catatan: "",
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal memuat naik dokumen",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleEdit() {
    if (!selectedDocument) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          file_name: editForm.file_name,
          jenis_dokumen: editForm.jenis_dokumen,
          versi: editForm.versi,
        })
        .eq("id", selectedDocument.id);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Dokumen telah dikemaskini",
      });

      setShowEditModal(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal mengemaskini dokumen",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm("Adakah anda pasti mahu memadam dokumen ini?")) return;

    try {
      setDeleting(true);
      const { error } = await supabase.from("documents").delete().eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Dokumen telah dipadam",
      });

      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal memadam dokumen",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function openEditModal(doc: Document) {
    setSelectedDocument(doc);
    setEditForm({
      file_name: doc.file_name || "",
      jenis_dokumen: doc.jenis_dokumen || "",
      versi: doc.versi || "",
      catatan: "",
    });
    setShowEditModal(true);
  }

  function getDocumentTypeBadgeColor(type: string) {
    const colors: Record<string, string> = {
      "Pelan Susun Atur": "bg-blue-100 text-blue-800",
      "Pelan Bangunan": "bg-green-100 text-green-800",
      "Pelan CAD": "bg-purple-100 text-purple-800",
      "Kebenaran Tanah": "bg-yellow-100 text-yellow-800",
      "Laporan Teknikal": "bg-orange-100 text-orange-800",
      "Surat Pemohon": "bg-pink-100 text-pink-800",
      "Dokumen OSC": "bg-indigo-100 text-indigo-800",
      "Lain-lain": "bg-gray-100 text-gray-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  }

  if (loading) {
    return (
      <Layout>
        <SEO title="Dokumen" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuatkan dokumen...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Pengurusan Dokumen" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pengurusan Dokumen</h1>
            <p className="text-muted-foreground">
              Urus semua dokumen permohonan di sini
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Muat Naik Dokumen
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Dokumen</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pelan Susun Atur</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter((d) => d.jenis_dokumen === "Pelan Susun Atur").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pelan Bangunan</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter((d) => d.jenis_dokumen === "Pelan Bangunan").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Carian & Penapis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="search">Cari Dokumen</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="No. fail, nama dokumen, pemohon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter">Jenis Dokumen</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Senarai Dokumen ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tiada dokumen dijumpai</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Fail</TableHead>
                    <TableHead>Jenis Dokumen</TableHead>
                    <TableHead>Nama Dokumen</TableHead>
                    <TableHead>Versi</TableHead>
                    <TableHead>Dimuat Naik Oleh</TableHead>
                    <TableHead>Tarikh</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        {doc.application && (
                          <DisplayFileNumber
                            no_fail_jpl={doc.application.no_fail_jpl}
                            no_permohonan_osc={doc.application.no_permohonan_osc}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getDocumentTypeBadgeColor(doc.jenis_dokumen)}>
                          {doc.jenis_dokumen}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {doc.file_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.versi}</Badge>
                      </TableCell>
                      <TableCell>{doc.uploader?.full_name || "-"}</TableCell>
                      <TableCell>
                        {new Date(doc.uploaded_at).toLocaleDateString("ms-MY")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fileType = doc.file_path.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
                              setPreviewDocument(doc);
                              setShowPreviewModal(true);
                            }}
                            title="Preview"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/permohonan/${doc.application_id}`)}
                            title="View Application"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.file_path, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Muat Naik Dokumen Baharu</DialogTitle>
              <DialogDescription>
                Lengkapkan maklumat dokumen di bawah
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="application_id">ID Permohonan</Label>
                <Input
                  id="application_id"
                  value={uploadForm.application_id}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, application_id: e.target.value })
                  }
                  placeholder="UUID permohonan"
                />
              </div>
              <div>
                <Label htmlFor="jenis_dokumen">Jenis Dokumen</Label>
                <Select
                  value={uploadForm.jenis_dokumen}
                  onValueChange={(value) =>
                    setUploadForm({ ...uploadForm, jenis_dokumen: value })
                  }
                >
                  <SelectTrigger id="jenis_dokumen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file_name">Nama Dokumen</Label>
                <Input
                  id="file_name"
                  value={uploadForm.file_name}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, file_name: e.target.value })
                  }
                  placeholder="Nama dokumen"
                />
              </div>
              <div>
                <Label htmlFor="file_path">URL Dokumen</Label>
                <Input
                  id="file_path"
                  value={uploadForm.file_path}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, file_path: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="versi">Versi</Label>
                <Input
                  id="versi"
                  value={uploadForm.versi}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, versi: e.target.value })
                  }
                  placeholder="v1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Batal
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Memuat naik..." : "Muat Naik"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kemaskini Dokumen</DialogTitle>
              <DialogDescription>
                Kemaskini maklumat dokumen
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit_file_name">Nama Dokumen</Label>
                <Input
                  id="edit_file_name"
                  value={editForm.file_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, file_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit_jenis_dokumen">Jenis Dokumen</Label>
                <Select
                  value={editForm.jenis_dokumen}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, jenis_dokumen: value })
                  }
                >
                  <SelectTrigger id="edit_jenis_dokumen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_versi">Versi</Label>
                <Input
                  id="edit_versi"
                  value={editForm.versi}
                  onChange={(e) =>
                    setEditForm({ ...editForm, versi: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Batal
              </Button>
              <Button onClick={handleEdit}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* File Preview Modal */}
      {previewDocument && (
        <FilePreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewDocument(null);
          }}
          fileUrl={previewDocument.file_path}
          fileName={previewDocument.file_name}
          fileType={
            previewDocument.file_path.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : "image"
          }
        />
      )}
    </Layout>
  );
}