const C=window.STORE_CONFIG||{},db=window.supabase?.createClient(C.SUPABASE_URL||"",C.SUPABASE_ANON_KEY||"");
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
let cats=[],brands=[],products=[];
function say(s){$("loginMsg").textContent=s}
async function refresh(){
 const [c,b,p,o]=await Promise.all([db.from("categories").select("*").order("name"),db.from("brands").select("*").order("name"),db.from("products").select("*,brands(name)").order("created_at",{ascending:false}).limit(500),db.from("orders").select("*").order("created_at",{ascending:false}).limit(200)]);
 if(c.error||b.error||p.error||o.error){say((c.error||b.error||p.error||o.error).message);return}
 cats=c.data||[];brands=b.data||[];products=p.data||[];
 $("pBrand").innerHTML=brands.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
 $("pCategory").innerHTML=cats.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
 $("bCategory").innerHTML=cats.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
 $("productRows").innerHTML=`<table><tr><th>Produk</th><th>Harga</th><th>Status</th><th>Aksi</th></tr>${products.map(x=>`<tr><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>Rp${Number(x.price).toLocaleString("id-ID")}</td><td>${esc(x.status)}</td><td><button data-edit="${esc(x.id)}">Edit</button> <button data-del="${esc(x.id)}">Hapus</button></td></tr>`).join("")}</table>`;
 $("categoryRows").innerHTML=`<table>${cats.map(x=>`<tr><td>${esc(x.name)}</td><td><button data-cdel="${esc(x.id)}">Hapus</button></td></tr>`).join("")}</table>`;
 $("brandRows").innerHTML=`<table>${brands.map(x=>`<tr><td>${esc(x.name)}</td><td><button data-bdel="${esc(x.id)}">Hapus</button></td></tr>`).join("")}</table>`;
 $("orderRows").innerHTML=`<table><tr><th>No. pesanan</th><th>Pelanggan</th><th>Total</th><th>Metode</th><th>Status</th></tr>${o.data.map(x=>`<tr><td>${esc(x.order_code)}</td><td>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</td><td>Rp${Number(x.subtotal).toLocaleString("id-ID")}</td><td>${esc(x.checkout_method)}</td><td><select data-order="${x.id}">${["baru","diproses","menunggu pembayaran","selesai","dibatalkan"].map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</table>`;
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.del));
 document.querySelectorAll("[data-cdel]").forEach(b=>b.onclick=()=>deleteRow("categories",b.dataset.cdel));
 document.querySelectorAll("[data-bdel]").forEach(b=>b.onclick=()=>deleteRow("brands",b.dataset.bdel));
 document.querySelectorAll("[data-order]").forEach(s=>s.onchange=async()=>{let {error}=await db.from("orders").update({status:s.value}).eq("id",s.dataset.order);if(error)alert(error.message)});
}
async function deleteRow(table,id){if(!confirm("Hapus data ini?"))return;let {error}=await db.from(table).delete().eq("id",id);if(error)alert(error.message);else refresh()}
async function deleteProduct(id){if(!confirm("Hapus produk ini?"))return;let {error}=await db.from("products").delete().eq("id",id);if(error)alert(error.message);else refresh()}
function editProduct(id){let p=products.find(x=>x.id===id);if(!p)return;$("pId").value=p.id;$("pName").value=p.name;$("pSlug").value=p.slug;$("pPrice").value=p.price;$("pPromo").value=p.promo_price||"";$("pBrand").value=p.brand_id||"";$("pCategory").value=p.category_id||"";$("pStatus").value=p.status;$("pStock").value=p.stock??"";$("pBonus").value=p.bonus||"";$("pSpecs").value=p.specs||"";window.scrollTo({top:0,behavior:"smooth"})}
async function uploadPhoto(file){if(!file)return "";let ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`products/${Date.now()}-${slug(file.name)}.${ext}`;let {error}=await db.storage.from("store-images").upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;return db.storage.from("store-images").getPublicUrl(path).data.publicUrl}
document.addEventListener("DOMContentLoaded",()=>{
 if(!db){say("Isi config.js terlebih dahulu.");return}
 $("loginBtn").onclick=async()=>{let {error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){say(error.message);return}await start()};
 $("logout").onclick=async()=>{await db.auth.signOut();location.reload()};
 async function start(){let {data:{user}}=await db.auth.getUser();if(!user)return;let {data}=await db.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();if(!data){say("Akun berhasil login tetapi belum terdaftar sebagai admin. Tambahkan UUID akun ke tabel admin_users melalui SQL Editor.");await db.auth.signOut();return}$("login").hidden=true;$("dashboard").hidden=false;refresh()}
 db.auth.getSession().then(({data})=>{if(data.session)start()});
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));["products","categories","brands","orders"].forEach(t=>$("tab-"+t).hidden=t!==b.dataset.tab)});
 $("saveProduct").onclick=async()=>{try{let id=$("pId").value||("P-"+Date.now()),photo=await uploadPhoto($("pImage").files[0]),old=products.find(x=>x.id===id);let row={id,slug:$("pSlug").value.trim()||slug($("pName").value),name:$("pName").value.trim(),price:Number($("pPrice").value||0),promo_price:$("pPromo").value?Number($("pPromo").value):null,brand_id:$("pBrand").value||null,category_id:$("pCategory").value||null,image_url:photo||old?.image_url||"",status:$("pStatus").value,stock:$("pStock").value?Number($("pStock").value):null,bonus:$("pBonus").value,specs:$("pSpecs").value,is_active:true};if(!row.name)throw Error("Nama produk wajib diisi");let {error}=await db.from("products").upsert(row);if(error)throw error;alert("Produk tersimpan");$("pId").value="";refresh()}catch(e){alert(e.message)}};
 $("clearProduct").onclick=()=>document.querySelectorAll("#tab-products input,#tab-products textarea").forEach(x=>x.value="");
 $("saveCategory").onclick=async()=>{let row={id:$("cId").value.trim(),name:$("cName").value.trim(),description:$("cDesc").value,image_url:$("cImage").value,is_active:true};let {error}=await db.from("categories").upsert(row);if(error)alert(error.message);else refresh()};
 $("saveBrand").onclick=async()=>{let row={id:$("bId").value.trim(),name:$("bName").value.trim(),category_id:$("bCategory").value||null,image_url:$("bImage").value,is_active:true};let {error}=await db.from("brands").upsert(row);if(error)alert(error.message);else refresh()};
});
