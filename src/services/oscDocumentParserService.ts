/**
 * OSC Document Parser Service
 * Uses Claude API to extract data from OSC 3 Plus documents
 */

export interface OSCExtractedData {
  maklumat_am: {
    no_permohonan_osc: string | null;
    jenis_aplikasi: "KM" | "PB" | null;
    kategori_permohonan: string | null;
    skala_pembangunan: string | null;
    nama_sp: string | null;
    no_kp_sp: string | null;
    jenis_proses_pr: string | null;
    status_permohonan: string | null;
    tarikh_penghantaran: string | null;
    tarikh_lengkap_diterima_osc: string | null;
    jabatan_memperaku: string | null;
    negeri: string | null;
    daerah: string | null;
    mukim: string | null;
    tajuk_permohonan: string | null;
    nama_pemaju_pemilik: string | null;
    lokasi_mercu_tanda: string | null;
    longitud: number | null;
    latitud: number | null;
    rancangan_tempatan: string | null;
    zoning: string | null;
  };
  maklumat_tanah: Array<{
    jenis_lot: string;
    no_lot: string;
    pemilik_tanah: string;
    kategori: string;
    syarat_nyata: string;
    catatan: string;
  }>;
  maklumat_permohonan: {
    kawasan_pembangunan_m2: number | null;
    kawasan_pembangunan_hektar: number | null;
    kawasan_pembangunan_ekar: number | null;
    nisbah_plot: number | null;
    kawasan_penempatan_m2: number | null;
    kawasan_boleh_dibina_m2: number | null;
    kawasan_lantai_kasar_m2: number | null;
    kawasan_landskap_lembut_m2: number | null;
    kawasan_landskap_keras_m2: number | null;
    kawasan_jalan_m2: number | null;
    bil_tempat_letak_kereta: number | null;
    bil_tempat_letak_motosikal: number | null;
    bil_tempat_letak_oku: number | null;
  };
  pecahan_pembangunan: Array<{
    jenis_guna_tanah: string;
    komponen: string;
    bil_unit: number | null;
    bil_tingkat: number | null;
    bil_tingkat_bawah_tanah: number | null;
    kawasan_lantai_kasar_m2: number | null;
    ketinggian_bangunan_m: number | null;
    jenis_strata: string;
    kegunaan_bangunan: Array<{
      jenis_bangunan: string;
      aras: number;
      bil_unit: number | null;
      kawasan_lantai_kasar_m2: number | null;
    }>;
  }>;
}

export interface ParseResult {
  success: boolean;
  data?: OSCExtractedData;
  error?: string;
  jenis_aplikasi?: "KM" | "PB";
  kpi_hari?: number;
}

const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `Parse this OSC 3 Plus Malaysian planning document.
Return ONLY valid JSON with no explanation.
Return null for any field not visible. Never guess.
The document has 4 sections: Maklumat Am, Maklumat Tanah, Maklumat Permohonan, Pecahan Pembangunan.
Extract ALL fields from ALL sections.

Return this exact JSON structure:
{
  "maklumat_am": {
    "no_permohonan_osc": "string",
    "jenis_aplikasi": "KM" or "PB" or null,
    "kategori_permohonan": "string",
    "skala_pembangunan": "string",
    "nama_sp": "string",
    "no_kp_sp": "string (digits from brackets only)",
    "jenis_proses_pr": "string",
    "status_permohonan": "string",
    "tarikh_penghantaran": "string (YYYY-MM-DD)",
    "tarikh_lengkap_diterima_osc": "string (YYYY-MM-DD)",
    "jabatan_memperaku": "string (dept name only)",
    "negeri": "string",
    "daerah": "string",
    "mukim": "string",
    "tajuk_permohonan": "string",
    "nama_pemaju_pemilik": "string",
    "lokasi_mercu_tanda": "string",
    "longitud": "number",
    "latitud": "number",
    "rancangan_tempatan": "string",
    "zoning": "string"
  },
  "maklumat_tanah": [
    {
      "jenis_lot": "string",
      "no_lot": "string",
      "pemilik_tanah": "string",
      "kategori": "string",
      "syarat_nyata": "string",
      "catatan": "string"
    }
  ],
  "maklumat_permohonan": {
    "kawasan_pembangunan_m2": "number",
    "kawasan_pembangunan_hektar": "number",
    "kawasan_pembangunan_ekar": "number",
    "nisbah_plot": "number",
    "kawasan_penempatan_m2": "number",
    "kawasan_boleh_dibina_m2": "number",
    "kawasan_lantai_kasar_m2": "number",
    "kawasan_landskap_lembut_m2": "number",
    "kawasan_landskap_keras_m2": "number",
    "kawasan_jalan_m2": "number",
    "bil_tempat_letak_kereta": "integer",
    "bil_tempat_letak_motosikal": "integer",
    "bil_tempat_letak_oku": "integer"
  },
  "pecahan_pembangunan": [
    {
      "jenis_guna_tanah": "string",
      "komponen": "string",
      "bil_unit": "integer",
      "bil_tingkat": "integer",
      "bil_tingkat_bawah_tanah": "integer",
      "kawasan_lantai_kasar_m2": "number",
      "ketinggian_bangunan_m": "number",
      "jenis_strata": "string",
      "kegunaan_bangunan": [
        {
          "jenis_bangunan": "string",
          "aras": "integer",
          "bil_unit": "integer",
          "kawasan_lantai_kasar_m2": "number"
        }
      ]
    }
  ]
}`;

/**
 * Convert file to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get MIME type for document
 */
function getMimeType(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  
  return mimeTypes[extension || ""] || file.type || "application/pdf";
}

/**
 * Detect jenis_aplikasi from no_permohonan_osc prefix
 */
function detectJenisAplikasi(no_permohonan_osc: string | null): {
  jenis_aplikasi: "KM" | "PB" | null;
  kpi_hari: number;
} {
  if (!no_permohonan_osc) {
    return { jenis_aplikasi: null, kpi_hari: 57 };
  }
  
  if (no_permohonan_osc.startsWith("MPSEG-KM")) {
    return { jenis_aplikasi: "KM", kpi_hari: 57 };
  }
  
  if (no_permohonan_osc.startsWith("MPSEG-PB")) {
    return { jenis_aplikasi: "PB", kpi_hari: 14 };
  }
  
  return { jenis_aplikasi: null, kpi_hari: 57 };
}

/**
 * Parse OSC document using Claude API
 */
export async function parseOSCDocument(file: File): Promise<ParseResult> {
  try {
    if (!CLAUDE_API_KEY) {
      return {
        success: false,
        error: "API key tidak dikonfigurasi. Sila hubungi pentadbir sistem.",
      };
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mimeType = getMimeType(file);
    
    // Determine document type (PDF or image)
    const sourceType = mimeType === "application/pdf" ? "document" : "image";

    // Call Claude API
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: sourceType,
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Extract all fields from all 4 sections of this OSC 3 Plus document and return as JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error:", errorData);
      return {
        success: false,
        error: `API error: ${errorData.error?.message || "Unknown error"}`,
      };
    }

    const result = await response.json();
    
    // Extract JSON from Claude's response
    const textContent = result.content?.[0]?.text || "";
    
    // Try to parse JSON from the response
    let extractedData: OSCExtractedData;
    
    try {
      // Remove markdown code fences if present
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, textContent];
      const jsonString = jsonMatch[1] || textContent;
      
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        success: false,
        error: "Gagal memproses respons AI. Format data tidak sah.",
      };
    }

    // Auto-detect jenis_aplikasi and kpi_hari
    const { jenis_aplikasi, kpi_hari } = detectJenisAplikasi(
      extractedData.maklumat_am.no_permohonan_osc
    );
    
    // Override jenis_aplikasi if detected
    if (jenis_aplikasi) {
      extractedData.maklumat_am.jenis_aplikasi = jenis_aplikasi;
    }

    return {
      success: true,
      data: extractedData,
      jenis_aplikasi: jenis_aplikasi || undefined,
      kpi_hari,
    };
  } catch (error) {
    console.error("Error parsing OSC document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ralat tidak dijangka",
    };
  }
}