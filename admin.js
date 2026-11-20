
/* ==========================================
   FENDY FREELANCE STORE PRO
   ADMIN DASHBOARD
   ========================================== */

const C = window.STORE_CONFIG || {};

const db = window.supabase?.createClient(
  C.SUPABASE_URL || "",
  C.SUPABASE_ANON_KEY || ""
);

const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c])
);

const slug = s => String(s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

let cats = [];
let brands = [];
let products = [];

let starting = false;

/* ==========================================
   NOTIFICATION
   ========================================== */

function say(message) {
  const el = $("loginMsg");
  if (el) el.textContent = message || "";
}

/* ==========================================
   CHECK DATABASE CONNECTION
   ========================================== */

if (!db) {
  console.error("Supabase configuration not found.");
}

/* ==========================================
   ADMIN LOGIN CHECK
   ========================================== */

async function start() {

  if (starting) return;
  starting = true;

  try {

    // Periksa sesi pengguna
    const {
      data: userData,
      error: userError
    } = await db.auth.getUser();

    if (userError) {
      say("Gagal memeriksa akun: " + userError.message);
      return;
    }

    const user = userData.user;

    if (!user) {
      say("Silakan login kembali.");
      return;
    }

    // Periksa apakah UUID terdaftar sebagai admin
    const {
      data: adminRecord,
      error: adminError
    } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Tampilkan error database yang sebenarnya
    if (adminError) {
      console.error("Admin verification error:", adminError);

      say(
        "Gagal memeriksa hak admin: " +
        adminError.message
      );

      return;
    }

    // Pastikan akun terdaftar
    if (!adminRecord) {
      say(
        "Akun belum terdaftar sebagai admin. " +
        "Periksa UUID pada tabel admin_users."
      );

      await db.auth.signOut();
      return;
    }

    // Login berhasil
    say("");

    $("login").hidden = true;
    $("dashboard").hidden = false;

    // Muat seluruh data dashboard
    await refresh();

  } catch (error) {

    console.error("Start error:", error);

    say("Terjadi kesalahan: " + error.message);

  } finally {

    starting = false;

  }
}

/* ==========================================
   LOAD DASHBOARD DATA
   ========================================== */

async function refresh() {

  if (!db) return;

  try {

    const [c, b, p, o] = await Promise.all([

      db.from("categories")
        .select("*")
        .order("name"),

      db.from("brands")
        .select("*")
        .order("name"),

      db.from("products")
        .select("*,brands(name)")
        .order("created_at", {
          ascending: false
        })
        .limit(500),

      db.from("orders")
        .select("*")
        .order("created_at", {
          ascending: false
        })
        .limit(200)

    ]);

    if (c.error || b.error || p.error || o.error) {

      const error =
        c.error || b.error || p.error || o.error;

      say("Gagal memuat dashboard: " + error.message);

      console.error(error);

      return;
    }

    cats = c.data || [];
    brands = b.data || [];
    products = p.data || [];

    // Pilihan brand
    $("pBrand").innerHTML = brands
      .map(x =>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
      )
      .join("");

    // Pilihan kategori produk
    $("pCategory").innerHTML = cats
      .map(x =>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
      )
      .join("");

    // Pilihan kategori brand
    $("bCategory").innerHTML = cats
      .map(x =>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
      )
      .join("");

    // Tabel produk
    $("productRows").innerHTML = `
      <table>
        <tr>
          <th>Produk</th>
          <th>Harga</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>

        ${products.map(x => `
          <tr>
            <td>
              ${esc(x.name)}
              <br>
              <small>${esc(x.id)}</small>
            </td>

            <td>
              Rp${Number(x.price).toLocaleString("id-ID")}
            </td>

            <td>${esc(x.status)}</td>

            <td>
              <button data-edit="${esc(x.id)}">
                Edit
              </button>

              <button data-del="${esc(x.id)}">
                Hapus
              </button>
            </td>
          </tr>
        `).join("")}

      </table>
    `;

    // Tabel kategori
    $("categoryRows").innerHTML = `
      <table>
        ${cats.map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>
              <button data-cdel="${esc(x.id)}">
                Hapus
              </button>
            </td>
          </tr>
        `).join("")}
      </table>
    `;

    // Tabel brand
    $("brandRows").innerHTML = `
      <table>
        ${brands.map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>
              <button data-bdel="${esc(x.id)}">
                Hapus
              </button>
            </td>
          </tr>
        `).join("")}
      </table>
    `;

    // Tabel pesanan
    $("orderRows").innerHTML = `
      <table>
        <tr>
          <th>No. pesanan</th>
          <th>Pelanggan</th>
          <th>Total</th>
          <th>Metode</th>
          <th>Status</th>
        </tr>

        ${(o.data || []).map(x => `
          <tr>
            <td>${esc(x.order_code)}</td>

            <td>
              ${esc(x.customer_name)}
              <br>
              ${esc(x.customer_phone)}
            </td>

            <td>
              Rp${Number(x.subtotal).toLocaleString("id-ID")}
            </td>

            <td>${esc(x.checkout_method)}</td>

            <td>
              <select
                data-order="${esc(x.id)}"
              >
                ${[
                  "baru",
                  "diproses",
                  "menunggu pembayaran",
                  "selesai",
                  "dibatalkan"
                ].map(s => `
                  <option ${s === x.status ? "selected" : ""}>
                    ${s}
                  </option>
                `).join("")}
              </select>
            </td>
          </tr>
        `).join("")}

      </table>
    `;

    // Tombol edit produk
    document.querySelectorAll("[data-edit]")
      .forEach(button => {
        button.onclick = () =>
          editProduct(button.dataset.edit);
      });

    // Tombol hapus produk
    document.querySelectorAll("[data-del]")
      .forEach(button => {
        button.onclick = () =>
          deleteProduct(button.dataset.del);
      });

    // Tombol hapus kategori
    document.querySelectorAll("[data-cdel]")
      .forEach(button => {
        button.onclick = () =>
          deleteRow("categories", button.dataset.cdel);
      });

    // Tombol hapus brand
    document.querySelectorAll("[data-bdel]")
      .forEach(button => {
        button.onclick = () =>
          deleteRow("brands", button.dataset.bdel);
      });

    // Update status pesanan
    document.querySelectorAll("[data-order]")
      .forEach(select => {

        select.onchange = async () => {

          const { error } = await db
            .from("orders")
            .update({
              status: select.value
            })
            .eq("id", select.dataset.order);

          if (error) {
            alert(error.message);
          } else {
            alert("Status pesanan berhasil diperbarui.");
          }

        };

      });

  } catch (error) {

    console.error(error);

    say("Gagal memuat data: " + error.message);

  }

}

/* ==========================================
   DELETE DATA
   ========================================== */

async function deleteRow(table, id) {

  if (!confirm("Yakin ingin menghapus data ini?")) {
    return;
  }

  const { error } = await db
    .from(table)
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
  } else {
    alert("Data berhasil dihapus.");
    await refresh();
  }

}

async function deleteProduct(id) {

  if (!confirm("Yakin ingin menghapus produk ini?")) {
    return;
  }

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
  } else {
    alert("Produk berhasil dihapus.");
    await refresh();
  }

}

/* ==========================================
   EDIT PRODUCT
   ========================================== */

function editProduct(id) {

  const p = products.find(x => x.id === id);

  if (!p) return;

  $("pId").value = p.id;
  $("pName").value = p.name;
  $("pSlug").value = p.slug;
  $("pPrice").value = p.price;
  $("pPromo").value = p.promo_price || "";
  $("pBrand").value = p.brand_id || "";
  $("pCategory").value = p.category_id || "";
  $("pStatus").value = p.status;
  $("pStock").value = p.stock ?? "";
  $("pBonus").value = p.bonus || "";
  $("pSpecs").value = p.specs || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

/* ==========================================
   UPLOAD PRODUCT PHOTO
   ========================================== */

async function uploadPhoto(file) {

  if (!file) return "";

  const ext = (
    file.name.split(".").pop() || "jpg"
  ).toLowerCase();

  const path =
    `products/${Date.now()}-${slug(file.name)}.${ext}`;

  const { error } = await db.storage
    .from("store-images")
    .upload(path, file, {
      upsert: true,
      contentType: file.type
    });

  if (error) throw error;

  return db.storage
    .from("store-images")
    .getPublicUrl(path)
    .data.publicUrl;

}

/* ==========================================
   INITIALIZE ADMIN
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  if (!db) {

    say("Konfigurasi Supabase tidak ditemukan. Periksa config.js.");

    return;

  }

  /* ========================================
     LOGIN BUTTON
     ======================================== */

  $("loginBtn").onclick = async () => {

    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
      say("Email dan password wajib diisi.");
      return;
    }

    const button = $("loginBtn");

    button.disabled = true;

    say("Sedang memeriksa akun...");

    try {

      const { error } = await db.auth
        .signInWithPassword({
          email,
          password
        });

      if (error) {

        say("Login gagal: " + error.message);

        return;

      }

      await start();

    } catch (error) {

      say("Terjadi kesalahan: " + error.message);

    } finally {

      button.disabled = false;

    }

  };

  /* ========================================
     LOGOUT BUTTON
     ======================================== */

  $("logout").onclick = async () => {

    await db.auth.signOut();

    location.reload();

  };

  /* ========================================
     RESTORE SESSION
     ======================================== */

  db.auth.getSession().then(({ data, error }) => {

    if (error) {
      say("Gagal memeriksa sesi: " + error.message);
      return;
    }

    if (data.session) {
      start();
    }

  });

  /* ========================================
     DASHBOARD TABS
     ======================================== */

  document.querySelectorAll("[data-tab]")
    .forEach(button => {

      button.onclick = () => {

        document.querySelectorAll("[data-tab]")
          .forEach(x => {
            x.classList.toggle("active", x === button);
          });

        [
          "products",
          "categories",
          "brands",
          "orders"
        ].forEach(tab => {

          $("tab-" + tab).hidden =
            tab !== button.dataset.tab;

        });

      };

    });

  /* ========================================
     SAVE PRODUCT
     ======================================== */

  $("saveProduct").onclick = async () => {

    try {

      const id =
        $("pId").value || ("P-" + Date.now());

      const photo = await uploadPhoto(
        $("pImage").files[0]
      );

      const old = products.find(x => x.id === id);

      const row = {

        id,

        slug:
          $("pSlug").value.trim() ||
          slug($("pName").value),

        name:
          $("pName").value.trim(),

        price:
          Number($("pPrice").value || 0),

        promo_price:
          $("pPromo").value
            ? Number($("pPromo").value)
            : null,

        brand_id:
          $("pBrand").value || null,

        category_id:
          $("pCategory").value || null,

        image_url:
          photo || old?.image_url || "",

        status:
          $("pStatus").value,

        stock:
          $("pStock").value
            ? Number($("pStock").value)
            : null,

        bonus:
          $("pBonus").value,

        specs:
          $("pSpecs").value,

        is_active: true

      };

      if (!row.name) {
        throw new Error("Nama produk wajib diisi.");
      }

      const { error } = await db
        .from("products")
        .upsert(row);

      if (error) throw error;

      alert("Produk berhasil disimpan.");

      $("pId").value = "";

      $("pImage").value = "";

      await refresh();

    } catch (error) {

      alert("Gagal menyimpan produk: " + error.message);

      console.error(error);

    }

  };

  /* ========================================
     CLEAR PRODUCT FORM
     ======================================== */

  $("clearProduct").onclick = () => {

    document.querySelectorAll(
      "#tab-products input, #tab-products textarea"
    ).forEach(el => {

      el.value = "";

    });

  };

  /* ========================================
     SAVE CATEGORY
     ======================================== */

  $("saveCategory").onclick = async () => {

    try {

      const row = {

        id: $("cId").value.trim(),

        name: $("cName").value.trim(),

        description: $("cDesc").value,

        image_url: $("cImage").value,

        is_active: true

      };

      if (!row.id || !row.name) {
        throw new Error("ID dan nama kategori wajib diisi.");
      }

      const { error } = await db
        .from("categories")
        .upsert(row);

      if (error) throw error;

      alert("Kategori berhasil disimpan.");

      await refresh();

    } catch (error) {

      alert(error.message);

    }

  };

  /* ========================================
     SAVE BRAND
     ======================================== */

  $("saveBrand").onclick = async () => {

    try {

      const row = {

        id: $("bId").value.trim(),

        name: $("bName").value.trim(),

        category_id:
          $("bCategory").value || null,

        image_url:
          $("bImage").value,

        is_active: true

      };

      if (!row.id || !row.name) {
        throw new Error("ID dan nama brand wajib diisi.");
      }

      const { error } = await db
        .from("brands")
        .upsert(row);

      if (error) throw error;

      alert("Brand berhasil disimpan.");

      await refresh();

    } catch (error) {

      alert(error.message);

    }

  };

});
