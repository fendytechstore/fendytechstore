# Fendy Freelance Store PRO — navigasi kategori bertahap

## Perubahan tampilan
- Logo toko menggunakan file `logo-fendy.png` dari logo yang diberikan.
- Header ringkas: Home, Menu, Tracking, Media Sosial, Keranjang.
- Halaman awal hanya menampilkan **Shop by Category**.
- Klik kategori untuk melihat brand; klik brand untuk melihat produk; klik produk untuk membuka detail.
- Navigasi browser/tombol kembali mempertahankan halaman sebelumnya dan posisi scroll.
- Kartu kategori, brand, dan produk memakai gambar `object-fit: contain` agar produk tidak terpotong pada HP maupun desktop.
- Menu Media Sosial mengambil tautan dari `config.js`.

## Dashboard admin
- Menu terpisah untuk Produk, Kategori, Brand, dan Pesanan.
- Produk: tambah, edit, hapus, upload foto.
- Kategori: tambah, edit nama/deskripsi/foto, hapus.
- Brand: tambah, edit nama/kategori/foto, hapus.
- Foto kategori dan brand diunggah ke bucket Supabase `store-images`.
- Saat edit kategori/brand, ID dikunci agar relasi data produk/brand tidak rusak. Gunakan tombol "Kategori baru"/"Brand baru" untuk data baru.
- Jika foto baru tidak dipilih saat edit, foto sebelumnya dipertahankan.

## Pengaturan sebelum deploy
1. Pastikan `config.js` berisi URL dan Publishable/anon key dari project Supabase toko.
2. Isi `TRACKING_URL` dengan alamat website tracking servis.
3. Isi `SOCIAL_LINKS.TIKTOK`, `FACEBOOK`, dan `INSTAGRAM` dengan tautan akun toko. Tautan yang kosong tidak ditampilkan.
4. Pastikan SQL setup sebelumnya sudah dijalankan dan bucket `store-images` tersedia.
5. Upload seluruh file dalam folder ini ke repository GitHub yang tersambung ke Cloudflare Pages.

## File
- `index.html`, `style.css`, `app.js`: website pelanggan.
- `admin.html`, `admin.js`: dashboard admin.
- `config.js`: konfigurasi koneksi dan tautan navigasi.
- `logo-fendy.png`: logo toko yang dikirim.
- `supabase-setup.sql`: skema Supabase.
- `*_import.csv`: data impor awal.

## Catatan penting
Perubahan ini mempertahankan struktur tabel Supabase yang sudah ada; tidak perlu menjalankan ulang SQL hanya untuk desain dan navigasi ini. Foto lama tetap perlu memiliki URL publik yang valid. Untuk brand tanpa `category_id`, atur kategori brand melalui dashboard admin agar muncul pada alur kategori > brand > produk.
