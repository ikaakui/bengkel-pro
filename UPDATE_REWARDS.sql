-- Jalankan script SQL ini di SQL Editor Supabase Anda
-- untuk memperbarui struktur tabel "rewards"

ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'item',
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS description text;

-- Insert default rewards
INSERT INTO rewards (name, points_required, reward_type, description, is_active)
VALUES 
('Gratis Ganti Oli', 500, 'item', 'Dapatkan layanan ganti oli gratis untuk kendaraan Anda.', true),
('Gratis Cuci Mobil', 250, 'item', 'Dapatkan layanan cuci mobil gratis untuk kendaraan Anda.', true);
