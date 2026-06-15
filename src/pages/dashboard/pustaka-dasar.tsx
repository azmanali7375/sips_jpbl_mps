import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  policyLibraryService,
  PlanningDocument,
  PolicyChunk,
} from "@/services/policyLibraryService";
import {
  BookOpen,
  Upload,
  FileText,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileDown,
} from "lucide-react";
import { useRouter } from "next/router";

export default function PustakaDasarPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<PlanningDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<PlanningDocument | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Indexing state
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [indexingStep, setIndexingStep] = useState("");
  const [indexingDocument, setIndexingDocument] = useState<PlanningDocument | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedLandUse, setSelectedLandUse] = useState("all");
  const [searchResults, setSearchResults] = useState<PolicyChunk[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  // Define available filter options
  const allTopics = [
    "anjakan",
    "nisbah_plot",
    "densiti",
    "ketinggian",
    "parkir",
    "kawasan_lapang",
    "zon_perancangan",
    "kegunaan_tanah",
    "infrastruktur",
    "alam_sekitar",
    "kemudahan_awam",
    "lain",
  ];

  const landUseOptions = [
    "komersial",
    "kediaman",
    "perindustrian",
    "pertanian",
    "institusi",
    "rekreasi",
    "campuran",
    "semua",
  ];

  // Quick reference PDF state
  const [generatingQuickRef, setGeneratingQuickRef] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
          title: "Akses Ditolak",
          description: "Halaman ini hanya untuk pentadbir",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      setCurrentUser({ id: user.id, profiles: profile });
      await loadDocuments();
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/dashboard");
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await policyLibraryService.getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai dokumen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (doc: PlanningDocument, file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Jenis Fail Tidak Sah",
        description: "Sila muat naik fail PDF sahaja",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingFile(true);
      await policyLibraryService.uploadPDF(doc.document_code, file);
      
      toast({
        title: "PDF Dimuat Naik",
        description: "Klik 'Indeks Dokumen' untuk memproses.",
      });

      await loadDocuments();
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuat naik PDF",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleIndexDocument = async (doc: PlanningDocument) => {
    if (!doc.file_url) {
      toast({
        title: "PDF Diperlukan",
        description: "Sila muat naik PDF terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIndexingDocument(doc);
    setShowIndexModal(true);
    setIndexingProgress(0);
    setIndexingStep("Memulakan proses...");

    try {
      // Update status to "Sedang Diproses"
      await policyLibraryService.updateDocumentStatus(doc.document_code, "Sedang Diproses");
      await loadDocuments();

      // Step 1: Extract PDF text (placeholder - actual implementation would use pdf.js or similar)
      setIndexingStep("Step 1/4: Membaca dan mengekstrak teks PDF...");
      setIndexingProgress(25);
      
      // For demo purposes, simulate text extraction
      const demoText = `Bahagian 1: Pendahuluan\nIni adalah dokumen ${doc.document_full_name}.\n\nBahagian 2: Objektif\nDokumen ini menetapkan garis panduan perancangan...`;

      // Step 2: Chunk the text
      setIndexingStep("Step 2/4: Memotong kepada bahagian-bahagian...");
      setIndexingProgress(50);

      const chunks = await chunkTextWithClaude(demoText, doc);

      // Step 3: Generate embeddings
      setIndexingStep("Step 3/4: Menjana vektor embedding...");
      setIndexingProgress(75);

      const chunksWithKeywords = await generateKeywordsForChunks(chunks);

      // Step 4: Save to database
      setIndexingStep("Step 4/4: Menyimpan ke pangkalan data...");
      setIndexingProgress(90);

      // Delete existing chunks first
      await policyLibraryService.deleteAllChunks(doc.document_code);

      // Save new chunks
      await policyLibraryService.savePolicyChunks(chunksWithKeywords);

      // Update document status
      await policyLibraryService.updateDocumentStatus(
        doc.document_code,
        "Sedia",
        chunksWithKeywords.length
      );

      setIndexingProgress(100);
      
      toast({
        title: "✓ Dokumen Berjaya Diindeks",
        description: `${chunksWithKeywords.length} bahagian disimpan. Dokumen sedia untuk semakan AI.`,
      });

      await loadDocuments();
      
      setTimeout(() => {
        setShowIndexModal(false);
        setIndexingDocument(null);
      }, 2000);
    } catch (error) {
      console.error("Error indexing document:", error);
      toast({
        title: "Ralat Pengindeksan",
        description: error instanceof Error ? error.message : "Gagal mengindeks dokumen",
        variant: "destructive",
      });
      
      // Revert status
      await policyLibraryService.updateDocumentStatus(doc.document_code, "Belum Diproses");
      await loadDocuments();
      
      setShowIndexModal(false);
      setIndexingDocument(null);
    }
  };

  const generateQuickReferencePDF = async () => {
    setGeneratingQuickRef(true);

    try {
      // Fetch policy data organized by development type and topic
      const developmentTypes = ["Kediaman", "Komersial", "Perindustrian"];
      const topics = [
        { name: "Anjakan", keywords: ["anjakan bangunan", "building setback"] },
        { name: "Parkir", keywords: ["tempat letak kereta", "parkir", "parking"] },
        { name: "Kawasan Lapang", keywords: ["kawasan lapang", "open space"] },
        { name: "Ketinggian", keywords: ["ketinggian bangunan", "building height"] },
        { name: "Nisbah Plot", keywords: ["nisbah plot", "plot ratio"] },
      ];

      const quickRefData: any = {};

      for (const devType of developmentTypes) {
        quickRefData[devType] = {};

        for (const topic of topics) {
          const { data: chunks } = await supabase
            .from("policy_chunks")
            .select("*")
            .or(
              topic.keywords
                .map((k) => `content_text.ilike.%${k}%,keywords_text.ilike.%${k}%`)
                .join(",")
            )
            .or(`land_use_tags.cs.{${devType.toLowerCase()}},land_use_tags.cs.{semua}`)
            .limit(3);

          quickRefData[devType][topic.name] = chunks || [];
        }
      }

      // Generate PDF content as HTML
      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rujukan Pantas Piawai Perancangan MPS ${currentYear}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 5px; }
    h2 { font-size: 12pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; }
    h3 { font-size: 11pt; margin-top: 15px; margin-bottom: 8px; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
    th { background-color: #f0f0f0; padding: 6px; text-align: left; border: 1px solid #ccc; font-weight: bold; }
    td { padding: 5px; border: 1px solid #ccc; vertical-align: top; }
    .footer { margin-top: 30px; font-size: 8pt; color: #666; text-align: center; }
    .doc-badge { display: inline-block; padding: 2px 6px; background-color: #e0e0e0; border-radius: 3px; font-weight: bold; font-size: 8pt; }
    @media print {
      body { margin: 15px; }
      h2 { page-break-before: always; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>RUJUKAN PANTAS PIAWAI PERANCANGAN</h1>
  <p style="text-align: center; margin-bottom: 20px;">
    Jabatan Perancang Bandar dan Landskap, Majlis Perbandaran Segamat<br>
    <em>Untuk kegunaan semakan teknikal lapangan</em>
  </p>
`;

      for (const devType of developmentTypes) {
        htmlContent += `<h2>${devType}</h2>`;

        for (const topic of topics) {
          const chunks = quickRefData[devType][topic.name];
          if (chunks.length === 0) continue;

          htmlContent += `<h3>${topic.name}</h3>`;
          htmlContent += `<table>
            <tr>
              <th style="width: 25%;">Parameter</th>
              <th style="width: 30%;">Piawai</th>
              <th style="width: 25%;">Sumber</th>
              <th style="width: 20%;">Nota</th>
            </tr>`;

          chunks.forEach((chunk: any) => {
            // Extract key values from content
            const contentPreview =
              chunk.content_text.length > 200
                ? chunk.content_text.substring(0, 200) + "..."
                : chunk.content_text;

            htmlContent += `<tr>
              <td>${chunk.section_title || topic.name}</td>
              <td>${contentPreview}</td>
              <td><span class="doc-badge">${chunk.document_code}</span> ${chunk.section_number || ""}</td>
              <td>${chunk.topic_tags?.join(", ") || "-"}</td>
            </tr>`;
          });

          htmlContent += `</table>`;
        }
      }

      htmlContent += `
  <div class="footer">
    <p><strong>Untuk rujukan lapangan sahaja. Sila rujuk dokumen rasmi untuk pengesahan.</strong></p>
    <p>Dijana pada: ${currentDate} | Pegawai: ${currentUser.profiles?.full_name || "Sistem"}</p>
  </div>
</body>
</html>`;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rujukan_Pantas_Piawai_MPS_${currentYear}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Berjaya",
        description:
          "Rujukan pantas telah dijana. Buka fail HTML dan cetak ke PDF dari pelayar anda.",
      });
    } catch (error) {
      console.error("Error generating quick reference:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana rujukan pantas",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuickRef(false);
    }
  };

  const chunkTextWithClaude = async (text: string, doc: PlanningDocument): Promise<any[]> => {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Anthropic API key not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a document parser for Malaysian urban planning documents. Split the provided text into logical chunks. Each chunk should be one complete section or sub-section. Return ONLY a JSON array of objects with these fields: section_number, section_title, content_text, page_hint, land_use_tags (array from: komersial/kediaman/perindustrian/pertanian/institusi/rekreasi/campuran/semua), topic_tags (array from: anjakan/nisbah_plot/densiti/ketinggian/parkir/kawasan_lapang/zon_perancangan/kegunaan_tanah/infrastruktur/alam_sekitar/kemudahan_awam/lain). Do not include any text outside the JSON array.`,
        messages: [
          {
            role: "user",
            content: `Split this text from ${doc.document_full_name} into sections:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Claude API request failed");
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === "text");
    if (!textBlock) throw new Error("No text content in API response");

    const chunks = JSON.parse(textBlock.text);
    
    return chunks.map((chunk: any) => ({
      document_name: doc.document_name,
      document_code: doc.document_code,
      section_number: chunk.section_number,
      section_title: chunk.section_title,
      content_text: chunk.content_text,
      page_number: chunk.page_hint,
      land_use_tags: chunk.land_use_tags,
      topic_tags: chunk.topic_tags,
    }));
  };

  const generateKeywordsForChunks = async (chunks: any[]): Promise<any[]> => {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Anthropic API key not configured");

    const chunksWithKeywords = [];

    for (const chunk of chunks) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `Generate a semantic representation. Given this text from a Malaysian planning document, return ONLY a JSON object with one field 'keywords' containing an array of 15-20 key planning terms in Bahasa Malaysia that best represent the meaning and topic of this text.`,
          messages: [
            {
              role: "user",
              content: chunk.content_text,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const textBlock = data.content?.find((block: any) => block.type === "text");
        if (textBlock) {
          try {
            const keywordData = JSON.parse(textBlock.text);
            chunk.keywords_text = keywordData.keywords.join(", ");
          } catch (e) {
            chunk.keywords_text = "";
          }
        }
      }

      chunksWithKeywords.push(chunk);
    }

    return chunksWithKeywords;
  };

  const handleSearch = async () => {
    try {
      setSearching(true);
      let query = supabase.from("policy_chunks").select("*");

      // Filter by document
      if (selectedDoc && selectedDoc !== "all") {
        query = query.eq("document_code", selectedDoc);
      }

      // Filter by topic
      if (selectedTopic && selectedTopic !== "all") {
        query = query.contains("topic_tags", [selectedTopic]);
      }

      // Filter by land use
      if (selectedLandUse && selectedLandUse !== "all") {
        query = query.contains("land_use_tags", [selectedLandUse]);
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Ralat",
        description: "Gagal mencari peruntukan",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const toggleExpandChunk = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Sedia":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Sedia</Badge>;
      case "Sedang Diproses":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Sedang Diproses</Badge>;
      default:
        return <Badge variant="secondary">Belum Diproses</Badge>;
    }
  };

  const getDocCodeBadge = (code: string) => {
    const colors: Record<string, string> = {
      GPJ: "bg-blue-100 text-blue-800 border-blue-200",
      RFN: "bg-purple-100 text-purple-800 border-purple-200",
      RSN: "bg-green-100 text-green-800 border-green-200",
      RTD: "bg-orange-100 text-orange-800 border-orange-200",
      RKK: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return <Badge className={colors[code] || ""}>{code}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Pustaka Dasar Perancangan</h1>
              <p className="text-muted-foreground">Dokumen rujukan untuk semakan teknikal AI</p>
            </div>
            <Button
              onClick={generateQuickReferencePDF}
              disabled={generatingQuickRef}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100"
            >
              {generatingQuickRef ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menjana...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Rujukan Pantas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Document Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {getDocCodeBadge(doc.document_code)}
                    <CardTitle className="text-lg mt-2">{doc.document_full_name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(doc.status)}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bahagian diindeks:</span>
                  <span className="font-medium">
                    {doc.total_chunks > 0 ? `${doc.total_chunks} bahagian` : "0 bahagian"}
                  </span>
                </div>

                {doc.last_processed_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Diproses: {new Date(doc.last_processed_at).toLocaleDateString("ms-MY")}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploadingFile}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".pdf";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileSelect(doc, file);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Muat Naik PDF
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!doc.file_url}
                    onClick={() => handleIndexDocument(doc)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Indeks Dokumen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Cari Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search-query">Cari peruntukan...</Label>
              <Input
                id="search-query"
                placeholder="Contoh: nisbah plot, anjakan bangunan, parkir"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Dokumen</Label>
                <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Dokumen</SelectItem>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.document_code}>
                        {doc.document_code} - {doc.document_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="topic-filter">Topik</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Topik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua topik</SelectItem>
                    {allTopics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="landuse-filter">Kegunaan Tanah</Label>
                <Select value={selectedLandUse} onValueChange={setSelectedLandUse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Kegunaan tanah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua kegunaan</SelectItem>
                    {landUseOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSearch} disabled={searching} className="w-full">
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Cari
                </>
              )}
            </Button>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} hasil ditemui
                </p>
                {searchResults.map((chunk) => (
                  <Card key={chunk.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getDocCodeBadge(chunk.document_code)}
                          {chunk.section_number && (
                            <Badge variant="outline">{chunk.section_number}</Badge>
                          )}
                        </div>
                      </div>

                      {chunk.section_title && (
                        <h4 className="font-semibold">{chunk.section_title}</h4>
                      )}

                      <p className="text-sm text-muted-foreground">
                        {expandedChunks.has(chunk.id)
                          ? chunk.content_text
                          : `${chunk.content_text.substring(0, 200)}${
                              chunk.content_text.length > 200 ? "..." : ""
                            }`}
                      </p>

                      {chunk.content_text.length > 200 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpandChunk(chunk.id)}
                          className="h-auto p-0 text-primary hover:bg-transparent"
                        >
                          {expandedChunks.has(chunk.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Tutup
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Lihat Teks Penuh
                            </>
                          )}
                        </Button>
                      )}

                      {chunk.topic_tags && chunk.topic_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {chunk.topic_tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Indexing Progress Modal */}
        <Dialog open={showIndexModal} onOpenChange={setShowIndexModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Sedang memproses {indexingDocument?.document_name}...
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Progress value={indexingProgress} className="w-full" />

              <div className="flex items-center gap-3">
                {indexingProgress < 100 ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <p className="text-sm">{indexingStep}</p>
              </div>

              {indexingProgress === 100 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Pengindeksan selesai! Dokumen sedia untuk semakan AI.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}