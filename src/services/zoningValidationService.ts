/**
 * Zoning Validation Service
 * Validates OSC extracted data against RTD 2030 zoning limits
 */

export interface ZoningRule {
  zoning_code: string;
  max_plot_ratio: number;
  max_height_m: number;
  min_setback_m: number;
  max_coverage_percent: number;
  parking_ratio_per_unit?: number;
}

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  current_value: number | string;
  allowed_value?: number | string;
  reference?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors_count: number;
  warnings_count: number;
  info_count: number;
}

// RTD 2030 Segamat Zoning Limits (simplified - actual limits from policy docs)
const ZONING_LIMITS: Record<string, ZoningRule> = {
  "Kediaman Kepadatan Rendah": {
    zoning_code: "R1",
    max_plot_ratio: 0.6,
    max_height_m: 12,
    min_setback_m: 6,
    max_coverage_percent: 40,
    parking_ratio_per_unit: 2,
  },
  "Kediaman Kepadatan Sederhana": {
    zoning_code: "R2",
    max_plot_ratio: 1.0,
    max_height_m: 18,
    min_setback_m: 4.5,
    max_coverage_percent: 50,
    parking_ratio_per_unit: 1.5,
  },
  "Kediaman Kepadatan Tinggi": {
    zoning_code: "R3",
    max_plot_ratio: 2.0,
    max_height_m: 60,
    min_setback_m: 3,
    max_coverage_percent: 60,
    parking_ratio_per_unit: 1.2,
  },
  "Komersial": {
    zoning_code: "C",
    max_plot_ratio: 3.0,
    max_height_m: 75,
    min_setback_m: 3,
    max_coverage_percent: 70,
    parking_ratio_per_unit: 1,
  },
  "Industri Ringan": {
    zoning_code: "I1",
    max_plot_ratio: 1.5,
    max_height_m: 15,
    min_setback_m: 6,
    max_coverage_percent: 60,
  },
  "Campuran": {
    zoning_code: "M",
    max_plot_ratio: 2.5,
    max_height_m: 45,
    min_setback_m: 3,
    max_coverage_percent: 65,
    parking_ratio_per_unit: 1.5,
  },
};

/**
 * Find matching zoning rule
 */
function findZoningRule(zoning: string | null): ZoningRule | null {
  if (!zoning) return null;

  // Exact match
  if (ZONING_LIMITS[zoning]) {
    return ZONING_LIMITS[zoning];
  }

  // Partial match (case-insensitive)
  const zoningLower = zoning.toLowerCase();
  for (const [key, rule] of Object.entries(ZONING_LIMITS)) {
    if (key.toLowerCase().includes(zoningLower) || zoningLower.includes(key.toLowerCase())) {
      return rule;
    }
  }

  return null;
}

/**
 * Validate extracted OSC data against zoning rules
 */
export function validateOSCData(data: {
  zoning: string | null;
  nisbah_plot?: number | null;
  ketinggian_bangunan_m?: number | null;
  kawasan_pembangunan_m2?: number | null;
  kawasan_lantai_kasar_m2?: number | null;
  bil_tempat_letak_kereta?: number | null;
  bil_unit?: number | null;
}): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Find applicable zoning rule
  const zoningRule = findZoningRule(data.zoning);

  if (!zoningRule) {
    issues.push({
      field: "zoning",
      severity: "warning",
      message: "Zon tidak dikenali. Tidak dapat mengesahkan pematuhan.",
      current_value: data.zoning || "Tidak dinyatakan",
      reference: "RTD 2030 Segamat",
    });

    return {
      valid: true,
      issues,
      warnings_count: 1,
      errors_count: 0,
      info_count: 0,
    };
  }

  // Validate Plot Ratio
  if (data.nisbah_plot !== null && data.nisbah_plot !== undefined) {
    if (data.nisbah_plot > zoningRule.max_plot_ratio) {
      issues.push({
        field: "nisbah_plot",
        severity: "error",
        message: `Nisbah plot melebihi had yang dibenarkan untuk zon ${data.zoning}`,
        current_value: data.nisbah_plot.toFixed(2),
        allowed_value: `≤ ${zoningRule.max_plot_ratio}`,
        reference: "RTD 2030 Segamat - Jadual Kawalan Pembangunan",
      });
    } else if (data.nisbah_plot > zoningRule.max_plot_ratio * 0.9) {
      issues.push({
        field: "nisbah_plot",
        severity: "warning",
        message: `Nisbah plot hampir mencapai had maksimum (${(data.nisbah_plot / zoningRule.max_plot_ratio * 100).toFixed(0)}%)`,
        current_value: data.nisbah_plot.toFixed(2),
        allowed_value: `≤ ${zoningRule.max_plot_ratio}`,
        reference: "RTD 2030 Segamat",
      });
    }
  }

  // Validate Building Height
  if (data.ketinggian_bangunan_m !== null && data.ketinggian_bangunan_m !== undefined) {
    if (data.ketinggian_bangunan_m > zoningRule.max_height_m) {
      issues.push({
        field: "ketinggian_bangunan_m",
        severity: "error",
        message: `Ketinggian bangunan melebihi had yang dibenarkan untuk zon ${data.zoning}`,
        current_value: `${data.ketinggian_bangunan_m}m`,
        allowed_value: `≤ ${zoningRule.max_height_m}m`,
        reference: "RTD 2030 Segamat - Jadual Kawalan Pembangunan",
      });
    }
  }

  // Validate Site Coverage
  if (
    data.kawasan_pembangunan_m2 &&
    data.kawasan_lantai_kasar_m2 &&
    data.kawasan_pembangunan_m2 > 0
  ) {
    const coverage = (data.kawasan_lantai_kasar_m2 / data.kawasan_pembangunan_m2) * 100;
    if (coverage > zoningRule.max_coverage_percent) {
      issues.push({
        field: "kawasan_lantai_kasar_m2",
        severity: "error",
        message: `Liputan tapak (${coverage.toFixed(1)}%) melebihi had yang dibenarkan`,
        current_value: `${coverage.toFixed(1)}%`,
        allowed_value: `≤ ${zoningRule.max_coverage_percent}%`,
        reference: "RTD 2030 Segamat",
      });
    }
  }

  // Validate Parking Ratio
  if (
    zoningRule.parking_ratio_per_unit &&
    data.bil_tempat_letak_kereta !== null &&
    data.bil_unit !== null &&
    data.bil_unit > 0
  ) {
    const required_parking = data.bil_unit * zoningRule.parking_ratio_per_unit;
    if (data.bil_tempat_letak_kereta < required_parking) {
      issues.push({
        field: "bil_tempat_letak_kereta",
        severity: "error",
        message: `Bilangan tempat letak kereta tidak mencukupi`,
        current_value: `${data.bil_tempat_letak_kereta} petak`,
        allowed_value: `≥ ${Math.ceil(required_parking)} petak (${zoningRule.parking_ratio_per_unit} per unit)`,
        reference: "Garis Panduan Parkir MPS",
      });
    } else if (data.bil_tempat_letak_kereta < required_parking * 1.1) {
      issues.push({
        field: "bil_tempat_letak_kereta",
        severity: "info",
        message: `Tempat letak kereta mencukupi tetapi tiada margin`,
        current_value: `${data.bil_tempat_letak_kereta} petak`,
        allowed_value: `≥ ${Math.ceil(required_parking)} petak`,
        reference: "Garis Panduan Parkir MPS",
      });
    }
  }

  const errors_count = issues.filter((i) => i.severity === "error").length;
  const warnings_count = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errors_count === 0,
    issues,
    errors_count,
    warnings_count,
    info_count: issues.filter(i => i.severity === "info").length,
  };
}

/**
 * Get human-readable summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return "✓ Tiada isu pematuhan dikesan";
  }

  if (result.errors_count > 0) {
    return `⚠️ ${result.errors_count} ralat pematuhan, ${result.warnings_count} amaran`;
  }

  if (result.warnings_count > 0) {
    return `⚠ ${result.warnings_count} amaran pematuhan`;
  }

  return `ℹ ${result.issues.length} makluman`;
}