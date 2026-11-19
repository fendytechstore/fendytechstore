# Fendy Freelance Store PRO

Paket awal berisi website pelanggan, dashboard admin, skema database Supabase, dan file CSV katalog hasil konversi.

## Isi paket
- `index.html`, `style.css`, `app.js`: website pelanggan desain baru.
- `admin.html`, `admin.js`: dashboard login admin, kelola produk/kategori/brand, dan pesanan.
- `supabase-setup.sql`: tabel, RLS, bucket foto, dan kebijakan keamanan.
- `config.js`: tempat mengisi URL dan publishable/anon key Supabase.
- `categories_import.csv`, `brands_import.csv`, `products_import.csv`: data awal dari file katalog yang kamu kirim.

## A. Buat project Supabase baru
1. Buka https://supabase.com/dashboard lalu login.
2. Pilih **New project**.
3. Nama: `Fendy Freelance Store`.
4. Buat database password yang kuat dan simpan sendiri.
5. Pilih region terdekat yang tersedia (misalnya Singapore bila tersedia).
6. Tunggu project selesai dibuat.

Saya tidak bisa membuat project di akun Supabase milikmu atau melihat password/credential akunmu. Langkah ini perlu kamu lakukan sendiri.

## B. Buat database
1. Di project baru, buka **SQL Editor** > **New query**.
2. Buka `supabase-setup.sql` dari paket ini, salin seluruh isinya, lalu jalankan.
3. Pastikan query selesai tanpa error.

## C. Buat akun admin dan beri akses
1. Buka **Authentication** > **Users** > **Add user**.
2. Masukkan email dan password admin yang kamu tentukan.
3. Setelah user dibuat, salin nilai **User UID**.
4. Kembali ke **SQL Editor**, jalankan perintah berikut dengan UUID milikmu:

```sql
insert into public.admin_users(user_id)
values ('GANTI_DENGAN_USER_UID');
```

Jangan bagikan password atau service role key kepada siapa pun.

## D. Ambil koneksi Supabase
1. Buka **Project Settings** > **API** (atau bagian **API Keys** pada tampilan dashboard terbaru).
2. Salin Project URL.
3. Salin **Publishable key** (atau legacy `anon` public key).
4. Buka `config.js`, ganti:
   - `https://PROJECT-REF.supabase.co` dengan Project URL.
   - `ISI_PUBLISHABLE_ATAU_ANON_KEY` dengan publishable/anon key.
5. Pastikan nomor WhatsApp admin `6282153719616` benar; ubah bila perlu.

**Jangan pernah memasukkan `service_role` / secret key ke file website.**

## E. Impor data kategori, brand, produk
Impor dilakukan berurutan karena brand mengacu kategori, dan produk mengacu brand:
1. Di Supabase **Table Editor**, pilih tabel `categories` > **Insert** > **Import data from CSV**, unggah `categories_import.csv`.
2. Ulangi pada tabel `brands` dengan `brands_import.csv`.
3. Ulangi pada tabel `products` dengan `products_import.csv`.

Kolom CSV telah disesuaikan dengan kolom tabel. Periksa preview pemetaan kolom sebelum menekan Import. Jika Supabase menolak karena data duplikat ID, hentikan dan kirim pesan errornya agar bisa kita rapikan tanpa menghapus data.

**Catatan foto:** CSV lama menggunakan path lokal seperti `img/produk/...`. Path itu bukan URL publik. Agar foto tampil di website baru, file gambar perlu ikut diunggah ke bucket `store-images` atau URL gambar publiknya dimasukkan ke kolom `image_url`. Fitur upload foto baru sudah disediakan di dashboard admin.

## F. Uji website
1. Upload semua file frontend (`index.html`, `style.css`, `app.js`, `admin.html`, `admin.js`, `config.js`) ke repository GitHub yang terhubung ke Cloudflare Pages.
2. Deploy Cloudflare Pages.
3. Buka halaman utama dan cek kategori/produk.
4. Buka `/admin.html`, login dengan akun admin.
5. Coba tambah produk, upload foto, ubah status, lalu uji kedua metode checkout.

## Fitur yang tersedia pada starter ini
- Katalog kategori, brand, pencarian, filter promo/pilihan toko, dan urut harga.
- Link detail produk dengan format query `?produk=slug`.
- Keranjang belanja.
- Checkout WhatsApp dan checkout website.
- Pesanan tersimpan di database dan terlihat di dashboard admin.
- Admin dapat mengelola produk, kategori, brand, status pesanan, dan upload foto produk.

## Batasan tahap awal
- Belum ada payment gateway / pembayaran otomatis.
- Checkout website menyimpan pesanan untuk konfirmasi manual admin.
- Belum ada ongkir otomatis, sinkron stok, variasi produk, kupon, atau notifikasi WhatsApp otomatis.
- URL foto lama perlu dimigrasikan dari folder gambar lama ke Storage.
- Sebelum toko dipakai publik, sebaiknya tambahkan validasi anti-spam/rate-limit untuk form pesanan dan verifikasi harga di sisi server.

## Ringkasan impor sumber
- Kategori: 28 baris.
- Brand: 139 ID unik dari 140 baris sumber. ID CORSAIR muncul dua kali untuk dua kategori; digabung menjadi satu brand dan kategori dibiarkan kosong agar tidak salah mengelompokkan produk.
- Produk: 1444 baris.
- File produk dibaca dengan encoding Windows-1252; isi teks dipertahankan dan diekspor ulang sebagai UTF-8.
- Jalur foto diubah dari backslash menjadi slash.
- Produk dari brand yang muncul pada lebih dari satu kategori dibiarkan tanpa category_id untuk diklasifikasikan manual; sumber CSV tidak memberi kategori langsung pada baris produk.
- Kolom `status` asli dipertahankan; status `tidak dijual` tidak ditampilkan ke pengunjung.
