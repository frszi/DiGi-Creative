-- =====================================================================
-- DigiCreative Seed Data
-- Jalankan setelah database/schema.sql
-- =====================================================================

USE digicreative_db;

-- 1. Services
INSERT INTO services (slug, name, tagline, badge_label, short_description, price_hint, sort_order) VALUES
('social-media', 'Social Media', 'Manajemen & Konten Terpadu', 'Most Popular', 'Strategi konten terintegrasi Instagram, TikTok, & manajemen iklan.', 'Mulai Rp 2.5jt', 1),
('web-development', 'Web Development', 'Cepat, Responsif & Siap Konversi', 'Terpercaya', 'Perancangan website bisnis yang memukau dan mengonversi pengunjung.', 'Custom Web', 2),
('graphic-design', 'Graphic Design', 'Branding & Identitas Visual', 'Visual Master', 'Menciptakan identitas visual brand yang menarik dan berkarakter.', 'Brand Identity', 3),
('kelas-campus', 'Kelas DiGi Goes to Campus', 'Workshop & Edukasi Mahasiswa', 'Edukasi Kampus', 'Program kolaborasi seminar kapita digital ke berbagai kampus & organisasi mahasiswa.', 'Program Kolaborasi', 4),
('in-house-training', 'In House Training', 'Pelatihan Tim Internal Perusahaan', 'Corporate Program', 'Pelatihan intensif dan pendampingan keahlian tim kreatif & marketing perusahaan.', 'Custom Kurikulum', 5),
('digi-potrait', 'DiGi Potrait', 'Potret Eksekutif & Branding', 'Eksklusif Studio', 'Layanan fotografi profesional, personal branding, & kebutuhan visual korporat.', 'Studio & On-Site', 6);

-- 2. Packages (14 Paket Berbayar)
INSERT INTO packages (code, service_id, name, billing_cycle, price, is_popular) VALUES
('sm-startup', (SELECT id FROM services WHERE slug = 'social-media'), 'Paket Start-Up (Bulanan)', 'monthly', 2500000.00, 0),
('sm-growth', (SELECT id FROM services WHERE slug = 'social-media'), 'Paket Growth & Scale (Bulanan)', 'monthly', 4750000.00, 1),
('sm-enterprise', (SELECT id FROM services WHERE slug = 'social-media'), 'Paket Enterprise (Bulanan)', 'monthly', 8500000.00, 0),
('web-starter', (SELECT id FROM services WHERE slug = 'web-development'), 'Starter Landing Page', 'one_time', 3500000.00, 0),
('web-growth', (SELECT id FROM services WHERE slug = 'web-development'), 'Growth Company Profile', 'one_time', 4900000.00, 1),
('web-enterprise', (SELECT id FROM services WHERE slug = 'web-development'), 'Enterprise Custom Web', 'one_time', 9500000.00, 0),
('gd-starter', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Starter Visual', 'one_time', 1850000.00, 0),
('gd-growth', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Brand Identity Growth', 'one_time', 3850000.00, 1),
('gd-corporate', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Full Corporate Suite', 'one_time', 7500000.00, 0),
('ih-booster', (SELECT id FROM services WHERE slug = 'in-house-training'), 'Team Booster (1 Hari)', 'one_time', 12500000.00, 0),
('ih-mastery', (SELECT id FROM services WHERE slug = 'in-house-training'), 'Corporate Mastery (3 Hari)', 'one_time', 24500000.00, 1),
('dp-personal', (SELECT id FROM services WHERE slug = 'digi-potrait'), 'Personal Signature', 'one_time', 2450000.00, 0),
('dp-executive', (SELECT id FROM services WHERE slug = 'digi-potrait'), 'Executive Authority', 'one_time', 5800000.00, 1),
('dp-corporate', (SELECT id FROM services WHERE slug = 'digi-potrait'), 'Corporate All-Access', 'one_time', 14500000.00, 0);

-- 3. Promo Codes
INSERT INTO promo_codes (code, label, discount_type, discount_value, max_uses, is_active) VALUES
('DIGI10', 'Diskon 10% Pelanggan Baru', 'percent', 10.00, 500, 1),
('KELASDIGI', 'Potongan Rp 250.000 Alumni', 'fixed', 250000.00, 1000, 1);

-- 4. Articles (Artikel Nyata)
INSERT INTO articles (slug, title, category, filter_key, badge, excerpt, source_domain, external_url, author_name, author_role, author_initials, read_time, cover_image_url, is_featured) VALUES
('featured-meta-ads-revou', 'Pengenalan Dasar Facebook & Meta Ads untuk Pertumbuhan Bisnis Digital', 'Digital Ads • RevoU', 'Digital Ads', 'Trending Panduan', 'Panduan lengkap memahami struktur kampanye Meta Ads (Campaign, Ad Set, Ad), penentuan objective funnel, hingga optimasi audiens bisnis.', 'revou.co', 'https://www.revou.co/id/panduan-teknis/pengenalan-dasar-facebook-ads', 'Tim Editorial RevoU', 'revou.co', 'RV', '6 Menit', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80', 1),
('algoritma-ig-tiktok-remarketing', 'Algoritma Instagram vs TikTok: Strategi Konten agar Tembus FYP & Explore', 'Social Media', 'Social Media', NULL, 'Membedah sinyal utama algoritma Reels & TikTok mulai dari Watch Time, DM Shares, hingga konsistensi niche agar jangkauan organik melesat.', 'remarketing.id', 'https://remarketing.id/algoritma-instagram-vs-tiktok-2026/', 'Remarketing.id', 'Social Media Insight', 'RM', '5 Menit', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80', 0),
('landing-page-ematic', 'Cara Membuat Landing Page Konversi Tinggi untuk Bisnis & UMKM', 'Web Dev', 'Web Dev', NULL, 'Panduan menyusun struktur above-the-fold, headline persuasif, kecepatan loading website, dan penempatan tombol CTA yang efektif.', 'ematicsolutions.com', 'https://www.ematicsolutions.com/id/blog/cara-membuat-landing-page/', 'Ematic Solutions', 'Conversion Guide', 'ES', '6 Menit', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', 0),
('video-algoritma-tempatbelajar', 'Memahami Algoritma Instagram & TikTok untuk Maksimalkan Reach Video', 'Video & Desain', 'Video & Desain', NULL, 'Strategi hook 3 detik pertama, completion rate, dan optimasi audio trending untuk mendorong performa konten video pendek.', 'tempatbelajar.id', 'https://tempatbelajar.id/algoritma-instagram-tiktok-2026/', 'TempatBelajar.id', 'Content Creator Guide', 'TB', '4 Menit', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=800&q=80', 0),
('personal-branding-revou', 'Apa Itu Personal Branding & Cara Membangunnya di Era Digital', 'Personal Branding', 'Personal Branding', NULL, 'Langkah taktis membangun otoritas profesional di LinkedIn dan media sosial agar lebih dipercaya klien maupun rekruter.', 'revou.co', 'https://www.revou.co/id/kosakata/personal-branding', 'RevoU Indonesia', 'Career & Branding', 'RV', '5 Menit', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80', 0),
('strategi-bidding-meta-ads', 'Memahami dan Memilih Strategi Bidding Facebook & Meta Ads agar Tidak Boncos', 'Digital Ads', 'Digital Ads', NULL, 'Kupas tuntas perbedaan Highest Volume, Cost Per Result Goal, dan ROAS Goal untuk menjaga efisiensi biaya iklan digital.', 'revou.co', 'https://www.revou.co/id/panduan-teknis/memahami-dan-memilih-strategi-bidding-facebook-ads', 'RevoU Indonesia', 'Performance Ads', 'RV', '7 Menit', 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80', 0),
('branding-visual-ugm', 'Strategi Branding Visual untuk UMKM di Era Pemasaran Digital', 'Video & Desain', 'Video & Desain', NULL, 'Bagaimana konsistensi logo, tipografi, dan palet warna membangun kepercayaan konsumen dan membedakan UMKM dari kompetitor.', 'mooc.ugm.ac.id', 'https://mooc.ugm.ac.id/strategi-branding-visual-untuk-umkm-di-era-pemasaran-digital/', 'MOOC UGM', 'Visual Branding', 'UG', '5 Menit', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80', 0);

-- 5. Portfolios (Graphic Design Showcase)
INSERT INTO portfolios (slug, service_id, category, badge, year_location, title, subtitle, impact_result, is_dark_theme, monogram_code, accent_class, sort_order) VALUES
('nusa-artisan', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Brand Identity', 'BRAND IDENTITY', 'F&B • Jakarta 2024', 'Nusa Artisan Roastery', 'Rebranding logo, sistem tipografi heritage modern, & kemasan kopi specialty.', 'Kenaikan omset ritel +145% pasca peluncuran', 1, 'N', 'bg-yellow-400 text-slate-900', 1),
('lentera-studio', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Social Media Kit', 'SOCIAL MEDIA KIT', 'Architecture • Bandung', 'Lentera Studio Space', 'Sistem grid Instagram 45+ template modular, iconografi kustom, dan editorial layout.', 'Engagement rate naik dari 1.4% ke 4.9%', 0, 'L', 'bg-indigo-600 text-white', 2),
('bumi-kopi', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Packaging', 'PACKAGING & PRINT', 'FMCG • Surabaya', 'Bumi Kopi Visual Identity', 'Desain kemasan pouch ramah lingkungan, label botol cold brew, & merchandise kit.', 'Terjual habis 5.000 pcs di bulan pertama', 1, 'B', 'bg-amber-400 text-slate-900', 3),
('alodia-skincare', (SELECT id FROM services WHERE slug = 'graphic-design'), 'Social Media Kit', 'BRANDING & ADS KIT', 'Beauty • Nasional', 'Alodia Skincare & Digital Ads System', 'Visual direction kampanye peluncuran serum, aset Meta Ads berkonversi tinggi, & box packaging.', 'ROAS kampanye visual mencapai 5.8x', 0, 'A', 'bg-emerald-500 text-white', 4);

-- 6. Team Members
INSERT INTO team_members (full_name, role_title, specialty, photo_url, sort_order) VALUES
('Dimas Arya Pratama', 'Founder & CEO', 'Growth & Digital Strategy', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80', 1),
('Nadia Maharani, M.M.', 'Head of Digital Marketing', 'Funnel & Performance Ads', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80', 2),
('Rico Kusuma Wardhana', 'Lead Web & System', 'Next.js & High-Speed Web', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80', 3),
('Bagas Alamsyah', 'Creative Director', 'Brand Identity & Visual', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80', 4),
('Anisa Kirana Putri', 'Social Media Lead', 'Short-Form Video & Reels', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=500&q=80', 5),
('Rian Darmawan', 'Performance Ads Lead', 'Meta & Google Ads Scale', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80', 6),
('Dian Hapsari', 'Principal Brand Designer', 'Packaging & Guidelines', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80', 7),
('Fajar Satria', 'Lead Portrait & Video', 'Executive Studio & Motion', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80', 8);

-- 7. Testimonials
INSERT INTO testimonials (service_id, client_name, client_role, client_initials, metric_badge, rating, quote, is_featured) VALUES
((SELECT id FROM services WHERE slug = 'social-media'), 'Hendra Pratama', 'Owner Lentera Fashion Jakarta', 'HP', 'ROI 3.2x Lipat', 5, 'Semenjak bergabung dengan DigiCreative, engagement akun IG & TikTok kami naik drastis. Timnya super responsif, strategi kontennya selalu relevan, dan omset penjualan naik hampir 3.2x lipat dalam waktu 3 bulan!', 1),
((SELECT id FROM services WHERE slug = 'web-development'), 'Nadia Anggraini', 'Co-Founder Kopi Kenan Asia', 'NA', 'Nilai Konversi', 5, 'Website e-commerce (Web Dev) jadi jauh lebih cepat, rapi, dan terbukti konversi leads dari Google Ads & Meta Ads meningkat signifikan. Desain sistemnya juga bikin klien kami percaya.', 1),
((SELECT id FROM services WHERE slug = 'in-house-training'), 'Dian Sastro, M.M.', 'Business Owner & Retail Leader', 'DS', 'Omset Naik', 5, 'Layanan In-House Training & Kelas Goes to Campus dari tim DigiCreative benar-benar membuka wawasan tim internal kami. Sekarang produksi konten lebih terstruktur tanpa boncos.', 1);
