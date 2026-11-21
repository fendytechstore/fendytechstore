# Fendy Tech Store — panduan instalasi

Paket ini berisi website toko, halaman detail produk yang bisa dibagikan, dashboard admin, pengaturan link tracking/media sosial/Google Maps, skema Supabase, dan data CSV katalog.

## 1. Siapkan Supabase
1. Buat project di https://supabase.com/dashboard.
2. Buka **SQL Editor → New query**.
3. Jalankan seluruh isi `supabase-setup.sql`. Script ini membuat tabel katalog, pesanan, storage foto, dan `store_settings` untuk pengaturan website.
4. Di **Authentication → Users**, buat akun admin menggunakan email dan password milikmu.
5. Salin User UID akun tersebut, lalu jalankan:
   ```sql
   insert into public.admin_users(user_id)
   values ('GANTI_DENGAN_USER_UID');
   ```

## 2. Hubungkan website
Buka `config.js`, isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari Project Settings → API. Gunakan publishable/anon key, **jangan pernah** memasukkan service_role/secret key ke website. Pastikan nomor WhatsApp admin benar.

## 3. Impor katalog
Impor CSV melalui Table Editor, berurutan:
1. `categories_import.csv` ke tabel `categories`
2. `brands_import.csv` ke tabel `brands`
3. `products_import.csv` ke tabel `products`

Pastikan pemetaan kolom sesuai saat import. Foto yang masih berupa path lokal dari katalog lama perlu diunggah melalui dashboard atau diganti URL publiknya.

## 4. Jalankan dan deploy
Untuk tes lokal, jalankan web server statis dari folder ini (contoh VS Code Live Server). Untuk publik, upload seluruh file website ke hosting static seperti Cloudflare Pages, Netlify, atau hosting web biasa. Pastikan `index.html`, `admin.html`, `app.js`, `admin.js`, `style.css`, `config.js`, dan `logo-fendy.png` berada pada folder deploy yang sama.

## 5. Gunakan dashboard admin
Buka `/admin.html`, login dengan email/password akun admin.

- **Kategori / Brand / Produk:** tambah baru, edit data, upload foto, dan lihat semua data. Upload foto saat revisi akan mengganti URL foto yang dipakai katalog.
- **Tracking:** isi URL halaman pelacakan.
- **Media sosial:** isi URL TikTok, Instagram, dan Facebook.
- **Lokasi / Map:** isi link embed Google Maps (paling baik) atau URL Google Maps.
- **Pesanan:** cek detail pesanan dan verifikasi transfer secara manual. Jangan setujui pembayaran sebelum dana benar-benar masuk ke rekening.

## Fitur yang disiapkan
- Navigasi Home, Menu, Tracking, Media sosial, Lokasi, dan login admin.
- Alur kategori → brand → produk → detail produk.
- URL detail produk menggunakan `?produk=slug`, sehingga bisa dibagikan dan dibuka langsung.
- Tombol kembali dan riwayat browser menjaga posisi kategori/brand/produk.
- Pencarian parsial lintas nama produk, brand, spesifikasi (misalnya `vivo`, `axioo`, atau `cctv`).
- Foto kategori, brand, dan produk dengan ukuran area konsisten dan `object-fit: contain`; foto upload dikompres ke WebP agar lebih seragam dan ringan.
- Layout responsif untuk ponsel Android/iOS, tablet, dan desktop.
- Keranjang, checkout WhatsApp, serta pesanan website dengan konfirmasi manual.

## Catatan penting sebelum live
- Isi kredensial Supabase dan buat admin terlebih dahulu. Tanpa itu, website tidak dapat memuat katalog.
- URL gambar lama berbentuk path lokal tidak otomatis bisa ditampilkan dari hosting baru.
- Belum ada payment gateway. Status awal pesanan adalah `menunggu pembayaran`; admin wajib mencocokkan dana secara manual sebelum mengubah status menjadi `pembayaran terverifikasi` atau `disetujui / diproses`.
- Link Google Maps yang dimasukkan untuk tampilan peta sebaiknya berupa **Embed a map** URL dari Google Maps. Jika menggunakan link biasa, gunakan tautan buka Google Maps.
- Link tracking harus berupa halaman eksternal yang disediakan jasa ekspedisi atau sistem tracking yang digunakan toko.
- Untuk penggunaan publik, tambahkan validasi anti-spam/rate limit dan validasi harga/stock di sisi server. Pertimbangkan juga ongkir, variasi produk, kupon, dan notifikasi otomatis sebagai pengembangan berikutnya.

## Data impor
Data katalog yang disertakan berasal dari file sumber sebelumnya: 28 kategori, 139 ID brand unik (duplikasi ID CORSAIR digabung), dan 1.444 produk. Cek data dan foto setelah impor.
