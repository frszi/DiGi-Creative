# Struktur Database DigiCreative (`digicreative_db`)

Skema database relasional (MySQL 8.0+ / MariaDB 10.6+) yang mendukung seluruh fitur website **DigiCreative** (`kelasdigi.id`), mulai dari katalog layanan, paket harga, kode promo, transaksi *payment gateway*, formulir *leads*, artikel, portofolio, hingga profil tim.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ orders : "membuat"
    users ||--o{ leads : "ditugaskan_ke"
    services ||--o{ packages : "memiliki"
    services ||--o{ portfolios : "menampilkan"
    services ||--o{ leads : "diminati_pada"
    services ||--o{ testimonials : "memiliki"
    packages ||--o{ orders : "dipesan_di"
    promo_codes ||--o{ orders : "diterapkan_pada"
    orders ||--o{ payments : "dibayar_melalui"

    users {
        bigint id PK
        string full_name
        string email UK
        string phone
        enum role
    }
    services {
        bigint id PK
        string slug UK
        string name
        string badge_label
        string price_hint
    }
    packages {
        bigint id PK
        string code UK
        bigint service_id FK
        string name
        enum billing_cycle
        decimal price
        boolean is_popular
    }
    promo_codes {
        bigint id PK
        string code UK
        enum discount_type
        decimal discount_value
        int used_count
    }
    orders {
        bigint id PK
        string invoice_id UK
        bigint package_id FK
        bigint promo_code_id FK
        string customer_name
        string customer_email
        decimal total_amount
        enum status
    }
    payments {
        bigint id PK
        bigint order_id FK
        string gateway_reference UK
        enum method_group
        string method_detail
        string va_number
        enum payment_status
        datetime paid_at
    }
    leads {
        bigint id PK
        enum source_page
        bigint service_id FK
        string full_name
        string phone
        string organization_name
        enum status
    }
    articles {
        bigint id PK
        string slug UK
        string title
        string filter_key
        string external_url
        boolean is_featured
    }
    portfolios {
        bigint id PK
        string slug UK
        bigint service_id FK
        string category
        string title
        string impact_result
    }
    team_members {
        bigint id PK
        string full_name
        string role_title
        string specialty
    }
    testimonials {
        bigint id PK
        bigint service_id FK
        string client_name
        string metric_badge
        tinyint rating
    }
```

## Ringkasan 11 Tabel
| No | Tabel | Fungsi |
|---|---|---|
| 1 | `users` | Akun admin, konsultan, dan customer. |
| 2 | `services` | 6 layanan utama DigiCreative (Social Media, Web Dev, Graphic Design, Goes to Campus, In House Training, DiGi Potrait). |
| 3 | `packages` | 14 paket harga berbayar yang terhubung ke masing-masing layanan. |
| 4 | `promo_codes` | Kode promo (`DIGI10`, `KELASDIGI`) dengan tipe diskon persen/nominal. |
| 5 | `orders` | Pesanan paket beserta invoice, rincian subtotal/diskon/admin fee, dan status. |
| 6 | `payments` | Detail pembayaran gateway (QRIS, Virtual Account, E-Wallet, Kartu) & log webhook. |
| 7 | `leads` | Semua pengajuan form dari Beranda, Kontak, Kampus, In-House Training, dan DiGi Potrait. |
| 8 | `articles` | Daftar artikel edukasi & URL redirect ke website sumber aslinya. |
| 9 | `portfolios` | Portofolio karya desain & proyek klien dengan kategori filter. |
| 10 | `team_members` | 8 profil tim ahli pada halaman Profil Perusahaan. |
| 11 | `testimonials` | Testimoni klien per layanan lengkap dengan badge metrik. |

## Cara Import ke MySQL / phpMyAdmin (XAMPP / Laragon)
1. Buka **phpMyAdmin** atau terminal MySQL.
2. Import file `database/schema.sql` terlebih dahulu untuk membuat database `digicreative_db` dan seluruh tabelnya.
3. Import file `database/seed.sql` untuk mengisi data awal yang identik dengan website.

Atau via CLI:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
