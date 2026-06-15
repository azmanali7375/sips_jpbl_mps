/* eslint-disable @typescript-eslint/no-empty-object-type */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applicant_id: string
          assigned_at: string | null
          assigned_officer_id: string | null
          building_height: number | null
          catatan_dalaman: string | null
          created_at: string | null
          daerah: string | null
          decision_date: string | null
          department_head_id: string | null
          head_review_completed_at: string | null
          id: string
          jabatan_memperaku: string | null
          jenis_proses_pr: string | null
          kategori_permohonan: string | null
          land_use_zone: string | null
          latitud: number | null
          location: string
          lokasi_mercu_tanda: string | null
          longitud: number | null
          lot_number: string | null
          mukim: string | null
          nama_pemaju_pemilik: string | null
          nama_sp: string | null
          negeri: string | null
          no_fail_jpl: string | null
          no_kp_sp: string | null
          no_permohonan_osc: string | null
          osc_meeting_date: string | null
          plot_area: number | null
          plot_ratio: number | null
          project_name: string
          project_type: string | null
          rancangan_tempatan: string | null
          registered_by: string | null
          reviewed_at: string | null
          setback_front: number | null
          setback_rear: number | null
          setback_side: number | null
          site_visit_completed_at: string | null
          skala_pembangunan: string | null
          status: string | null
          status_dalaman: string | null
          status_semakan_osc: string | null
          submitted_at: string | null
          tajuk_permohonan: string | null
          tarikh_kpi: string | null
          tarikh_lengkap_diterima_osc: string | null
          tarikh_penghantaran: string | null
          technical_report_completed_at: string | null
          tracking_number: string
          unit_head_id: string | null
          updated_at: string | null
          zoning: string | null
        }
        Insert: {
          applicant_id: string
          assigned_at?: string | null
          assigned_officer_id?: string | null
          building_height?: number | null
          catatan_dalaman?: string | null
          created_at?: string | null
          daerah?: string | null
          decision_date?: string | null
          department_head_id?: string | null
          head_review_completed_at?: string | null
          id?: string
          jabatan_memperaku?: string | null
          jenis_proses_pr?: string | null
          kategori_permohonan?: string | null
          land_use_zone?: string | null
          latitud?: number | null
          location: string
          lokasi_mercu_tanda?: string | null
          longitud?: number | null
          lot_number?: string | null
          mukim?: string | null
          nama_pemaju_pemilik?: string | null
          nama_sp?: string | null
          negeri?: string | null
          no_fail_jpl?: string | null
          no_kp_sp?: string | null
          no_permohonan_osc?: string | null
          osc_meeting_date?: string | null
          plot_area?: number | null
          plot_ratio?: number | null
          project_name: string
          project_type?: string | null
          rancangan_tempatan?: string | null
          registered_by?: string | null
          reviewed_at?: string | null
          setback_front?: number | null
          setback_rear?: number | null
          setback_side?: number | null
          site_visit_completed_at?: string | null
          skala_pembangunan?: string | null
          status?: string | null
          status_dalaman?: string | null
          status_semakan_osc?: string | null
          submitted_at?: string | null
          tajuk_permohonan?: string | null
          tarikh_kpi?: string | null
          tarikh_lengkap_diterima_osc?: string | null
          tarikh_penghantaran?: string | null
          technical_report_completed_at?: string | null
          tracking_number?: string
          unit_head_id?: string | null
          updated_at?: string | null
          zoning?: string | null
        }
        Update: {
          applicant_id?: string
          assigned_at?: string | null
          assigned_officer_id?: string | null
          building_height?: number | null
          catatan_dalaman?: string | null
          created_at?: string | null
          daerah?: string | null
          decision_date?: string | null
          department_head_id?: string | null
          head_review_completed_at?: string | null
          id?: string
          jabatan_memperaku?: string | null
          jenis_proses_pr?: string | null
          kategori_permohonan?: string | null
          land_use_zone?: string | null
          latitud?: number | null
          location?: string
          lokasi_mercu_tanda?: string | null
          longitud?: number | null
          lot_number?: string | null
          mukim?: string | null
          nama_pemaju_pemilik?: string | null
          nama_sp?: string | null
          negeri?: string | null
          no_fail_jpl?: string | null
          no_kp_sp?: string | null
          no_permohonan_osc?: string | null
          osc_meeting_date?: string | null
          plot_area?: number | null
          plot_ratio?: number | null
          project_name?: string
          project_type?: string | null
          rancangan_tempatan?: string | null
          registered_by?: string | null
          reviewed_at?: string | null
          setback_front?: number | null
          setback_rear?: number | null
          setback_side?: number | null
          site_visit_completed_at?: string | null
          skala_pembangunan?: string | null
          status?: string | null
          status_dalaman?: string | null
          status_semakan_osc?: string | null
          submitted_at?: string | null
          tajuk_permohonan?: string | null
          tarikh_kpi?: string | null
          tarikh_lengkap_diterima_osc?: string | null
          tarikh_penghantaran?: string | null
          technical_report_completed_at?: string | null
          tracking_number?: string
          unit_head_id?: string | null
          updated_at?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_department_head_id_fkey"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_unit_head_id_fkey"
            columns: ["unit_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_plans: {
        Row: {
          application_id: string
          created_at: string | null
          endorsed_by: string | null
          endorsed_date: string
          endorsement_stamp_path: string | null
          id: string
          notes: string | null
          plan_file_path: string | null
          plan_registration_number: string
          registered_by: string
          registration_date: string | null
          syarat_kelulusan: string | null
          tarikh_kelulusan: string | null
          tarikh_tamat_sah: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          endorsed_by?: string | null
          endorsed_date: string
          endorsement_stamp_path?: string | null
          id?: string
          notes?: string | null
          plan_file_path?: string | null
          plan_registration_number: string
          registered_by: string
          registration_date?: string | null
          syarat_kelulusan?: string | null
          tarikh_kelulusan?: string | null
          tarikh_tamat_sah?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          endorsed_by?: string | null
          endorsed_date?: string
          endorsement_stamp_path?: string | null
          id?: string
          notes?: string | null
          plan_file_path?: string | null
          plan_registration_number?: string
          registered_by?: string
          registration_date?: string | null
          syarat_kelulusan?: string | null
          tarikh_kelulusan?: string | null
          tarikh_tamat_sah?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_plans_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_plans_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_value: number | null
          min_value: number | null
          rule_name: string
          rule_type: string | null
          updated_at: string | null
          zone_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rule_name: string
          rule_type?: string | null
          updated_at?: string | null
          zone_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rule_name?: string
          rule_type?: string | null
          updated_at?: string | null
          zone_type?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          application_id: string
          catatan: string | null
          file_extension: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          jenis_dokumen: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          versi: string | null
        }
        Insert: {
          application_id: string
          catatan?: string | null
          file_extension?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          jenis_dokumen?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          versi?: string | null
        }
        Update: {
          application_id?: string
          catatan?: string | null
          file_extension?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          jenis_dokumen?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          versi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          application_id: string
          created_at: string | null
          file_path: string | null
          generated_by: string
          id: string
          is_finalized: boolean | null
          report_content: string
          report_type: string
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          file_path?: string | null
          generated_by: string
          id?: string
          is_finalized?: boolean | null
          report_content: string
          report_type: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          file_path?: string | null
          generated_by?: string
          id?: string
          is_finalized?: boolean | null
          report_content?: string
          report_type?: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      land_lots: {
        Row: {
          application_id: string
          catatan: string | null
          created_at: string | null
          id: string
          jenis_lot: string
          kategori: string | null
          no_lot: string
          pemilik_tanah: string | null
          syarat_nyata: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          jenis_lot: string
          kategori?: string | null
          no_lot: string
          pemilik_tanah?: string | null
          syarat_nyata?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          jenis_lot?: string
          kategori?: string | null
          no_lot?: string
          pemilik_tanah?: string | null
          syarat_nyata?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "land_lots_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      laporan_teknikal: {
        Row: {
          application_id: string
          bahagian_a: string | null
          bahagian_b: Json | null
          bahagian_c: Json | null
          bahagian_d: Json | null
          bahagian_e: Json | null
          bahagian_f: Json | null
          bahagian_g: Json | null
          created_at: string | null
          disediakan_oleh: string | null
          id: string
          is_kmt: boolean | null
          jawatan_penyedia: string | null
          no_rujukan_fail: string | null
          status_laporan: string | null
          tarikh_disediakan: string | null
          ulasan_syor_f: string | null
          ulasan_syor_g: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          bahagian_a?: string | null
          bahagian_b?: Json | null
          bahagian_c?: Json | null
          bahagian_d?: Json | null
          bahagian_e?: Json | null
          bahagian_f?: Json | null
          bahagian_g?: Json | null
          created_at?: string | null
          disediakan_oleh?: string | null
          id?: string
          is_kmt?: boolean | null
          jawatan_penyedia?: string | null
          no_rujukan_fail?: string | null
          status_laporan?: string | null
          tarikh_disediakan?: string | null
          ulasan_syor_f?: string | null
          ulasan_syor_g?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          bahagian_a?: string | null
          bahagian_b?: Json | null
          bahagian_c?: Json | null
          bahagian_d?: Json | null
          bahagian_e?: Json | null
          bahagian_f?: Json | null
          bahagian_g?: Json | null
          created_at?: string | null
          disediakan_oleh?: string | null
          id?: string
          is_kmt?: boolean | null
          jawatan_penyedia?: string | null
          no_rujukan_fail?: string | null
          status_laporan?: string | null
          tarikh_disediakan?: string | null
          ulasan_syor_f?: string | null
          ulasan_syor_g?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laporan_teknikal_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      osc_decisions: {
        Row: {
          amendment_requirements: string | null
          application_id: string
          approval_conditions: string | null
          catatan_osc: string | null
          created_at: string | null
          decision_type: string
          id: string
          meeting_date: string
          meeting_number: string | null
          no_kelulusan_km: string | null
          recorded_by: string
          rejection_reasons: string | null
          tempoh_sah_kelulusan: number | null
          updated_at: string | null
        }
        Insert: {
          amendment_requirements?: string | null
          application_id: string
          approval_conditions?: string | null
          catatan_osc?: string | null
          created_at?: string | null
          decision_type: string
          id?: string
          meeting_date: string
          meeting_number?: string | null
          no_kelulusan_km?: string | null
          recorded_by: string
          rejection_reasons?: string | null
          tempoh_sah_kelulusan?: number | null
          updated_at?: string | null
        }
        Update: {
          amendment_requirements?: string | null
          application_id?: string
          approval_conditions?: string | null
          catatan_osc?: string | null
          created_at?: string | null
          decision_type?: string
          id?: string
          meeting_date?: string
          meeting_number?: string | null
          no_kelulusan_km?: string | null
          recorded_by?: string
          rejection_reasons?: string | null
          tempoh_sah_kelulusan?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "osc_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osc_decisions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string | null
          id: string
          organisation: string | null
          phone: string | null
          role: string | null
          staff_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          organisation?: string | null
          phone?: string | null
          role?: string | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organisation?: string | null
          phone?: string | null
          role?: string | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template_content: string
          template_name: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content: string
          template_name: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content?: string
          template_name?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          application_id: string
          cadangan_kepada_osc: string | null
          comment: string
          compliance_results: Json | null
          created_at: string | null
          decision: string | null
          id: string
          jenis_semakan: string | null
          kaedah_semakan: string | null
          keputusan_semakan: string | null
          officer_id: string
          ringkasan_ulasan: string | null
          syarat_syarat: string | null
          tarikh_semakan: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          cadangan_kepada_osc?: string | null
          comment: string
          compliance_results?: Json | null
          created_at?: string | null
          decision?: string | null
          id?: string
          jenis_semakan?: string | null
          kaedah_semakan?: string | null
          keputusan_semakan?: string | null
          officer_id: string
          ringkasan_ulasan?: string | null
          syarat_syarat?: string | null
          tarikh_semakan?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          cadangan_kepada_osc?: string | null
          comment?: string
          compliance_results?: Json | null
          created_at?: string | null
          decision?: string | null
          id?: string
          jenis_semakan?: string | null
          kaedah_semakan?: string | null
          keputusan_semakan?: string | null
          officer_id?: string
          ringkasan_ulasan?: string | null
          syarat_syarat?: string | null
          tarikh_semakan?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_photos: {
        Row: {
          caption: string | null
          id: string
          location_description: string | null
          photo_type: string | null
          photo_url: string
          site_visit_id: string
          tarikh_gambar: string | null
          uploaded_at: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          location_description?: string | null
          photo_type?: string | null
          photo_url: string
          site_visit_id: string
          tarikh_gambar?: string | null
          uploaded_at?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          location_description?: string | null
          photo_type?: string | null
          photo_url?: string
          site_visit_id?: string
          tarikh_gambar?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_photos_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          access_notes: string | null
          application_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          masa_lawatan: string | null
          observations: string | null
          officer_id: string
          penemuan: string | null
          site_condition: string | null
          status_lawatan: string | null
          surrounding_development: string | null
          technical_notes: string | null
          tindakan_susulan: string | null
          tujuan_lawatan: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          access_notes?: string | null
          application_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          masa_lawatan?: string | null
          observations?: string | null
          officer_id: string
          penemuan?: string | null
          site_condition?: string | null
          status_lawatan?: string | null
          surrounding_development?: string | null
          technical_notes?: string | null
          tindakan_susulan?: string | null
          tujuan_lawatan?: string | null
          updated_at?: string | null
          visit_date: string
        }
        Update: {
          access_notes?: string | null
          application_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          masa_lawatan?: string | null
          observations?: string | null
          officer_id?: string
          penemuan?: string | null
          site_condition?: string | null
          status_lawatan?: string | null
          surrounding_development?: string | null
          technical_notes?: string | null
          tindakan_susulan?: string | null
          tujuan_lawatan?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_history: {
        Row: {
          application_id: string
          changed_by: string
          comment: string | null
          created_at: string | null
          from_status: string | null
          id: string
          to_status: string
        }
        Insert: {
          application_id: string
          changed_by: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          to_status: string
        }
        Update: {
          application_id?: string
          changed_by?: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      written_directives: {
        Row: {
          application_id: string
          arahan: string | null
          catatan: string | null
          created_at: string | null
          directive_content: string
          directive_number: string | null
          id: string
          jenis_borang: string | null
          prepared_by: string
          prepared_date: string | null
          reviewed_by: string | null
          sent_date: string | null
          signed_by: string | null
          signed_date: string | null
          status: string | null
          status_pematuhan: string | null
          tarikh_dikeluarkan: string | null
          tarikh_pematuhan_dikehendaki: string | null
          tarikh_pematuhan_diterima: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          arahan?: string | null
          catatan?: string | null
          created_at?: string | null
          directive_content: string
          directive_number?: string | null
          id?: string
          jenis_borang?: string | null
          prepared_by: string
          prepared_date?: string | null
          reviewed_by?: string | null
          sent_date?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string | null
          status_pematuhan?: string | null
          tarikh_dikeluarkan?: string | null
          tarikh_pematuhan_dikehendaki?: string | null
          tarikh_pematuhan_diterima?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          arahan?: string | null
          catatan?: string | null
          created_at?: string | null
          directive_content?: string
          directive_number?: string | null
          id?: string
          jenis_borang?: string | null
          prepared_by?: string
          prepared_date?: string | null
          reviewed_by?: string | null
          sent_date?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string | null
          status_pematuhan?: string | null
          tarikh_dikeluarkan?: string | null
          tarikh_pematuhan_dikehendaki?: string | null
          tarikh_pematuhan_diterima?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "written_directives_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_directives_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_directives_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_directives_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_jpl_file_number: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
