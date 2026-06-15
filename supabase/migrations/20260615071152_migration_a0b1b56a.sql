-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create policy_chunks table
CREATE TABLE IF NOT EXISTS policy_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_code TEXT NOT NULL,
  chapter_number TEXT,
  section_number TEXT,
  section_title TEXT,
  content_text TEXT NOT NULL,
  page_number INTEGER,
  land_use_tags TEXT[],
  topic_tags TEXT[],
  keywords_text TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS policy_chunks_embedding_idx ON policy_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create planning_documents master table
CREATE TABLE IF NOT EXISTS planning_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code TEXT UNIQUE NOT NULL,
  document_name TEXT NOT NULL,
  document_full_name TEXT,
  year INTEGER,
  authority TEXT,
  file_url TEXT,
  total_chunks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Belum Diproses',
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 5 documents
INSERT INTO planning_documents (document_code, document_name, document_full_name, year, authority) VALUES
  ('GPJ', 'Manual GPJ', 'Manual Garispanduan Perancangan Negeri Johor', 2020, 'Jabatan Perancangan Bandar dan Desa Negeri Johor'),
  ('RFN', 'Rancangan Fizikal Negara', 'Rancangan Fizikal Negara (Edisi Ketiga)', 2016, 'Jabatan Perancangan Bandar dan Desa Semenanjung Malaysia'),
  ('RSN', 'RSN Johor 2035', 'Rancangan Struktur Negeri Johor 2035', 2018, 'Pejabat Perancangan Negeri Johor'),
  ('RTD', 'RTD Segamat 2030', 'Rancangan Tempatan Daerah Segamat 2030 (Penggantian)', 2022, 'Majlis Perbandaran Segamat'),
  ('RKK', 'RKK Segamat 2035', 'Rancangan Kawasan Khas Pembaharuan Semula Bandar Segamat 2035', 2023, 'Majlis Perbandaran Segamat')
ON CONFLICT (document_code) DO NOTHING;

-- Enable RLS on both tables
ALTER TABLE policy_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin full access to policy_chunks" ON policy_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to planning_documents" ON planning_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public read access for policy_chunks (for AI reference during technical review)
CREATE POLICY "Public read policy_chunks" ON policy_chunks
  FOR SELECT USING (true);

-- Public read access for planning_documents
CREATE POLICY "Public read planning_documents" ON planning_documents
  FOR SELECT USING (true);