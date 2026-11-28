const C=window.STORE_CONFIG||{},db=window.supabase?.createClient(C.SUPABASE_URL||"",C.SUPABASE_ANON_KEY||"");
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),slug=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
let cats=[],brands=[],products=[],orders=[],settings={},banners=[];
const productIdOrder=id=>{let m=String(id||"").match(/^P0*(\d+)$/i);return m?Number(m[1]):Number.MAX_SAFE_INTEGER};
const good=()=>db&&C.SUPABASE_URL&&!C.SUPABASE_URL.includes("PROJECT-REF")&&C.SUPABASE_ANON_KEY&&!C.SUPABASE_ANON_KEY.startsWith("ISI_");
function msg(s){$("loginMsg").textContent=s}
async function compressImage(file){if(!file)return null;if(!file.type.startsWith("image/"))throw Error("File harus berupa gambar");if(file.size>15*1024*1024)throw Error("Ukuran foto maksimal 15 MB");let bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.86))}
async function upload(file,folder){if(!file)return "";let blob=await compressImage(file),path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`,{error}=await db.storage.from("store-images").upload(path,blob,{upsert:false,contentType:"image/webp"});if(error)throw error;return db.storage.from("store-images").getPublicUrl(path).data.publicUrl}
async function fetchAllProducts(){let out=[],from=0,batch=1000;while(true){let {data,error}=await db.from("products").select("*,brands(name)").order("id").range(from,from+batch-1);if(error)throw error;out.push(...(data||[]));if(!data||data.length<batch)break;from+=batch}return out}
async function refresh(){let [c,b,p,o,s,ad]=await Promise.all([db.from("categories").select("*").order("name"),db.from("brands").select("*").order("name"),fetchAllProducts(),db.from("orders").select("*").order("created_at",{ascending:false}).limit(500),db.from("store_settings").select("*"),db.from("banners").select("*").order("sort_order")]);let err=c.error||b.error||o.error||s.error;if(err){msg("Database belum siap: "+err.message);return}cats=c.data||[];brands=b.data||[];products=(p||[]).sort((a,b)=>productIdOrder(a.id)-productIdOrder(b.id));orders=o.data||[];banners=ad.error?[]:(ad.data||[]);settings={};(s.data||[]).forEach(x=>settings[x.key]=x.value);fillSelects();renderBannerProducts();renderTables();$("statCats").textContent=cats.length;$("statBrands").textContent=brands.length;$("statProducts").textContent=products.length;$("statSelling").textContent=products.filter(x=>x.status!=="tidak dijual").length;$("statNotSelling").textContent=products.filter(x=>x.status==="tidak dijual").length;$("statOrders").textContent=orders.filter(x=>["baru","menunggu pembayaran"].includes(x.status)).length;$("recentOrders").innerHTML=orderTable(orders.slice(0,5));$("trackingUrl").value=settings.tracking_url||"";$("tiktokUrl").value=settings.tiktok_url||"";$("instagramUrl").value=settings.instagram_url||"";$("facebookUrl").value=settings.facebook_url||"";$("mapUrl").value=settings.map_url||""}
function fillSelects(){let c='<option value="">Pilih kategori</option>'+cats.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(""),b='<option value="">Pilih brand</option>'+brands.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");$("bCategory").innerHTML=c;$("pCategory").innerHTML=c;$("pBrand").innerHTML=b;if($("adBrand"))$("adBrand").innerHTML=b}
function table(rows,cols){return `<table><thead><tr>${cols.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows||'<tr><td colspan="5">Belum ada data.</td></tr>'}</tbody></table>`}
function renderBannerProducts(filter=""){let box=$("adProductList");if(!box)return;let q=filter.toLowerCase();box.innerHTML=products.filter(p=>!q||`${p.name} ${p.id}`.toLowerCase().includes(q)).map(p=>`<label><input type="checkbox" value="${esc(p.id)}" data-ad-product> ${esc(p.name)} <small>(${esc(p.id)})</small></label>`).join("")||'<small>Produk tidak ditemukan.</small>'}
function renderTables(){$("bannerRows").innerHTML=table(banners.map(x=>`<tr><td><img src="${esc(x.image_url)}" style="width:110px;aspect-ratio:2161/800;object-fit:cover;border-radius:5px"></td><td>${esc(x.title||"Iklan")}<br><small>Urutan ${x.sort_order} · ${x.is_active?"Aktif":"Nonaktif"}</small></td><td>${x.target_type==="brand"?`Brand: ${esc(brands.find(b=>b.id===x.target_brand_id)?.name||"—")}`:x.target_type==="products"?`${(x.target_product_ids||[]).length} produk`:"Tidak diarahkan"}</td><td><button data-ad-edit="${x.id}">Edit</button><button data-ad-del="${x.id}">Hapus</button></td></tr>`).join(""),["Banner","Iklan","Tujuan","Aksi"]);
document.querySelectorAll("[data-ad-edit]").forEach(b=>b.onclick=()=>editBanner(b.dataset.adEdit));document.querySelectorAll("[data-ad-del]").forEach(b=>b.onclick=()=>remove("banners",b.dataset.adDel));
$("categoryRows").innerHTML=table(cats.map(x=>`<tr><td>${x.image_url?`<img src="${esc(x.image_url)}" style="width:38px;height:38px;object-fit:contain">`:"—"}</td><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>${esc(x.description)}</td><td><button data-cedit="${esc(x.id)}">Edit</button><button data-cdel="${esc(x.id)}">Hapus</button></td></tr>`).join(""),["Foto","Kategori","Deskripsi","Aksi"]);
$("brandRows").innerHTML=table(brands.filter(x=>(!$("brandSearch")?.value||`${x.name} ${x.id}`.toLowerCase().includes($("brandSearch").value.toLowerCase()))).map(x=>`<tr><td>${x.image_url?`<img src="${esc(x.image_url)}" style="width:38px;height:38px;object-fit:contain">`:"—"}</td><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>${esc(cats.find(c=>c.id===x.category_id)?.name||"—")}</td><td><button data-bedit="${esc(x.id)}">Edit</button><button data-bdel="${esc(x.id)}">Hapus</button></td></tr>`).join(""),["Foto","Brand","Kategori","Aksi"]);
$("productRows").innerHTML=table(products.filter(x=>(!$("productSearch")?.value||`${x.name} ${x.id}`.toLowerCase().includes($("productSearch").value.toLowerCase()))&&(!$("productStatusFilter")?.value||x.status===$("productStatusFilter").value)).map(x=>`<tr><td>${x.image_url?`<img src="${esc(x.image_url)}" style="width:48px;height:48px;object-fit:contain">`:"—"}</td><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>${esc(x.brands?.name||"—")}</td><td>${x.is_service?"Konsultasi Admin":"Rp"+Number(x.price).toLocaleString("id-ID")}</td><td>${esc(x.status)}</td><td><button data-pedit="${esc(x.id)}">Edit</button><button data-pdel="${esc(x.id)}">Hapus</button></td></tr>`).join(""),["Foto","Produk","Brand","Harga","Status","Aksi"]);
$("orderRows").innerHTML=orderTable(orders);
document.querySelectorAll("[data-cedit]").forEach(b=>b.onclick=()=>editCategory(b.dataset.cedit));document.querySelectorAll("[data-bedit]").forEach(b=>b.onclick=()=>editBrand(b.dataset.bedit));document.querySelectorAll("[data-pedit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.pedit));
document.querySelectorAll("[data-cdel]").forEach(b=>b.onclick=()=>remove("categories",b.dataset.cdel));document.querySelectorAll("[data-bdel]").forEach(b=>b.onclick=()=>remove("brands",b.dataset.bdel));document.querySelectorAll("[data-pdel]").forEach(b=>b.onclick=()=>remove("products",b.dataset.pdel));document.querySelectorAll("[data-orderstatus]").forEach(s=>s.onchange=()=>updateOrder(s.dataset.orderstatus,s.value))}
function orderTable(list){return table(list.map(o=>`<tr><td><b>${esc(o.order_code)}</b><br><small>${new Date(o.created_at).toLocaleString("id-ID")}</small></td><td>${esc(o.customer_name)}<br>${esc(o.customer_phone)}<br><small>${esc(o.customer_address)}</small></td><td>${(o.items||[]).map(i=>`${esc(i.name)} ×${i.qty}`).join("<br>")}<br><b>Rp${Number(o.subtotal).toLocaleString("id-ID")}</b></td><td>${esc(o.checkout_method)}</td><td><select data-orderstatus="${o.id}">${["baru","menunggu pembayaran","pembayaran terverifikasi","disetujui / diproses","selesai","dibatalkan"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join(""),["No. pesanan","Pelanggan","Rincian / total","Metode","Status"])}
async function updateOrder(id,status){if(["pembayaran terverifikasi","disetujui / diproses"].includes(status)&&!confirm("Pastikan dana sudah benar-benar diterima dan nominal cocok. Lanjutkan?")){refresh();return}let {error}=await db.from("orders").update({status}).eq("id",id);if(error)alert(error.message);else refresh()}
async function remove(t,id){if(!confirm("Yakin ingin menghapus data ini?"))return;let {error}=await db.from(t).delete().eq("id",id);if(error)alert(error.message);else refresh()}
function editCategory(id){let x=cats.find(y=>y.id===id);$("cId").value=x.id;$("cCode").value=x.id;$("cName").value=x.name;$("cDesc").value=x.description||"";$("categoryFormTitle").textContent="Revisi kategori · "+x.name;window.scrollTo({top:0,behavior:"smooth"})}
function editBrand(id){let x=brands.find(y=>y.id===id);$("bId").value=x.id;$("bCode").value=x.id;$("bName").value=x.name;$("bCategory").value=x.category_id||"";$("brandFormTitle").textContent="Revisi brand · "+x.name;window.scrollTo({top:0,behavior:"smooth"})}
function syncServicePriceFields(){const disabled=$("pIsService").checked;$("pPrice").disabled=disabled;$("pPromo").disabled=disabled}
function editProduct(id){let x=products.find(y=>y.id===id);$("pId").value=x.id;$("pAutoId").value=x.id;$("pName").value=x.name;$("pSlug").value=x.slug;$("pPrice").value=x.price||"";$("pPromo").value=x.promo_price||"";$("pIsService").checked=!!x.is_service;syncServicePriceFields();$("pBrand").value=x.brand_id||"";$("pCategory").value=x.category_id||"";$("pStatus").value=x.status;$("pStock").value=x.stock??"";$("pBonus").value=x.bonus||"";$("pSpecs").value=x.specs||"";$("productFormTitle").textContent="Revisi produk · "+x.name;window.scrollTo({top:0,behavior:"smooth"})}
function editBanner(id){let x=banners.find(y=>y.id===id);if(!x)return;$("adProductSearch").value="";renderBannerProducts();$("adId").value=x.id;$("adTitle").value=x.title||"";$("adOrder").value=x.sort_order||0;$("adActive").value=String(x.is_active);$("adTarget").value=x.target_type||"none";$("adBrand").value=x.target_brand_id||"";$("adBrandWrap").hidden=x.target_type!=="brand";$("adProductsWrap").hidden=x.target_type!=="products";document.querySelectorAll("[data-ad-product]").forEach(c=>c.checked=(x.target_product_ids||[]).includes(c.value));$("adPreview").src=x.image_url;$("adPreview").hidden=false;$("bannerFormTitle").textContent="Revisi iklan · "+(x.title||"Banner");window.scrollTo({top:0,behavior:"smooth"})}
function clearBanner(){$("adId").value=$("adTitle").value=$("adImage").value="";$("adOrder").value="0";$("adActive").value="true";$("adTarget").value="none";$("adBrand").value="";$("adBrandWrap").hidden=true;$("adProductsWrap").hidden=true;$("adPreview").hidden=true;$("bannerFormTitle").textContent="Tambah iklan baru";document.querySelectorAll("[data-ad-product]").forEach(c=>c.checked=false)}
async function saveSetting(key,value){let {error}=await db.from("store_settings").upsert({key,value},{onConflict:"key"});if(error)alert(error.message);else{settings[key]=value;alert("Pengaturan berhasil disimpan.")}}

// Update produk massal melalui CSV (ID menjadi kunci pencocokan).
function csvCell(value){let s=String(value??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function parseCsv(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(quoted){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
  else if(c==='"'&&cell==="")quoted=true;
  else if(c===","){row.push(cell);cell=""}
  else if(c==="\n"){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell=""}
  else if(c!=="\r")cell+=c;
 }
 if(quoted)throw Error("Format CSV tidak valid: tanda kutip belum ditutup.");
 row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);
 if(!rows.length)throw Error("CSV kosong.");
 const headers=rows.shift().map(x=>x.trim().toLowerCase());
 if(!headers.includes("id"))throw Error("CSV wajib memiliki kolom id.");
 return rows.map((values,i)=>{const obj={};headers.forEach((h,j)=>obj[h]=(values[j]??"").trim());obj.__line=i+2;return obj});
}
function downloadProductsCsv(){
 const headers=["id","name","price","promo_price","bonus","status"];
 const lines=[headers.join(",")].concat(products.map(p=>headers.map(h=>csvCell(p[h])).join(",")));
 const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="template-update-produk.csv";a.click();URL.revokeObjectURL(url);
}
let pendingCsvRows=[];
function previewProductsCsv(file){
 const info=$("csvImportInfo");pendingCsvRows=[];
 if(!file){info.textContent="Belum ada file CSV dipilih.";$("runProductsCsv").disabled=true;return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const rows=parseCsv(String(reader.result||"").replace(/^\uFEFF/,""));
   const known=new Map(products.map(p=>[String(p.id),p])),errors=[],valid=[];
   rows.forEach(r=>{
    const p=known.get(r.id);
    if(!r.id||!p){errors.push(`Baris ${r.__line}: ID "${r.id||"(kosong)"}" tidak ditemukan.`);return}
    if(r.price!==undefined&&r.price!==""&&(!Number.isFinite(Number(r.price))||Number(r.price)<0)){errors.push(`Baris ${r.__line}: harga normal tidak valid.`);return}
    if(r.promo_price!==undefined&&r.promo_price!==""&&(!Number.isFinite(Number(r.promo_price))||Number(r.promo_price)<0)){errors.push(`Baris ${r.__line}: harga promo tidak valid.`);return}
    if(r.status!==undefined&&r.status!==""&&!["dijual","habis","tidak dijual"].includes(r.status.toLowerCase())){errors.push(`Baris ${r.__line}: status harus dijual, habis, atau tidak dijual.`);return}
    valid.push(r);
   });
   if(!rows.length)errors.push("Tidak ada baris produk di CSV.");
   pendingCsvRows=errors.length?[]:valid;
   info.textContent=errors.length?`Ditemukan ${errors.length} kesalahan:\n${errors.slice(0,8).join("\n")}`:`${valid.length} produk siap di-update. Kolom harga normal kosong = tidak diubah; harga promo/bonus kosong = dikosongkan; status kosong = tidak diubah.`;
   $("runProductsCsv").disabled=!valid.length||!!errors.length;
  }catch(e){info.textContent=e.message;$("runProductsCsv").disabled=true}
 };
 reader.onerror=()=>{info.textContent="Gagal membaca file CSV.";$("runProductsCsv").disabled=true};
 reader.readAsText(file,"UTF-8");
}
async function applyProductsCsv(){
 if(!pendingCsvRows.length)return;
 if(!confirm(`Yakin update ${pendingCsvRows.length} produk dari CSV? Perubahan akan langsung tersimpan ke Supabase.`))return;
 const btn=$("runProductsCsv");btn.disabled=true;btn.textContent="Memproses...";
 try{
  let done=0;
  for(const r of pendingCsvRows){
   const patch={};
   if(r.price!==undefined&&r.price!=="")patch.price=Number(r.price);
   if(r.promo_price!==undefined)patch.promo_price=r.promo_price===""?null:Number(r.promo_price);
   if(r.bonus!==undefined)patch.bonus=r.bonus;
   if(r.status!==undefined&&r.status!=="")patch.status=r.status.toLowerCase();
   if(Object.keys(patch).length){const {error}=await db.from("products").update(patch).eq("id",r.id);if(error)throw Error(`Produk ${r.id}: ${error.message}`)}
   done++;
  }
  alert(`Berhasil memproses ${done} produk.`);
  pendingCsvRows=[];$("importProductsCsv").value="";$("csvImportInfo").textContent="Impor selesai.";
  await refresh();
 }catch(e){alert("Impor berhenti: "+e.message+" Produk yang sudah diproses sebelumnya mungkin sudah tersimpan.");await refresh()}
 finally{btn.textContent="Impor & update massal";btn.disabled=!pendingCsvRows.length}
}



// INPUT PRODUK BARU MASSAL VIA CSV — terpisah dari fitur update CSV.
let pendingNewProductsCsv=[];
function csvDownloadFile(filename,headers,example){
 const lines=[headers.join(","),example.map(csvCell).join(",")];
 const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadNewProductsTemplate(){
 const h=["name","price","promo_price","brand","category","image_url","specs","bonus","stock","status","is_service","slug"];
 const e=["CONTOH NAMA PRODUK","1500000","","APPLE","SMARTPHONE","https://contoh.com/foto-produk.jpg","Prosesor: A-series | RAM: 8GB | Penyimpanan: 256GB","Bonus casing", "10","dijual","false",""];
 csvDownloadFile("template-input-produk-baru.csv",h,e);
}
function parseNewProductsCsv(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(quoted){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
  else if(c==='"'&&cell==="")quoted=true;
  else if(c===","){row.push(cell);cell=""}
  else if(c==="\n"){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell=""}
  else if(c!=="\r")cell+=c;
 }
 if(quoted)throw Error("Format CSV tidak valid: tanda kutip belum ditutup.");
 row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);
 if(rows.length<2)throw Error("CSV belum memiliki data produk.");
 const headers=rows.shift().map(x=>x.trim().toLowerCase());
 const required=["name","price","brand","category"];
 const missing=required.filter(h=>!headers.includes(h));
 if(missing.length)throw Error("Kolom wajib tidak ditemukan: "+missing.join(", "));
 const allowed=["name","price","promo_price","brand","category","image_url","specs","bonus","stock","status","is_service","slug"];
 const unknown=headers.filter(h=>!allowed.includes(h));
 if(unknown.length)throw Error("Kolom tidak dikenal: "+unknown.join(", "));
 return rows.map((values,i)=>{const o={};headers.forEach((h,j)=>o[h]=(values[j]??"").trim());o.__line=i+2;return o});
}
function findCatalogItem(value,list){
 const q=String(value||"").trim().toLowerCase();
 if(!q)return null;
 return list.find(x=>String(x.id).toLowerCase()===q)||list.find(x=>String(x.name||"").trim().toLowerCase()===q)||null;
}
function previewNewProductsCsv(file){
 const info=$("newProductsCsvInfo");pendingNewProductsCsv=[];
 if(!file){info.textContent="Belum ada file CSV dipilih.";$("runNewProductsCsv").disabled=true;return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const rows=parseNewProductsCsv(String(reader.result||"").replace(/^\uFEFF/,""));
   const errors=[],valid=[],seenNames=new Set(),seenSlugs=new Set();
   rows.forEach(r=>{
    const line=r.__line,name=(r.name||"").trim(),brand=findCatalogItem(r.brand,brands),category=findCatalogItem(r.category,cats);
    const price=Number(r.price);
    if(!name){errors.push(`Baris ${line}: nama produk wajib diisi.`);return}
    if(r.price===""||!Number.isFinite(price)||price<0){errors.push(`Baris ${line}: harga normal wajib berupa angka 0 atau lebih.`);return}
    if(!brand){errors.push(`Baris ${line}: brand "${r.brand}" tidak ditemukan. Gunakan ID/nama brand yang sudah terdaftar.`);return}
    if(!category){errors.push(`Baris ${line}: kategori "${r.category}" tidak ditemukan. Gunakan ID/nama kategori yang sudah terdaftar.`);return}
    const service=["true","1","ya","yes"].includes((r.is_service||"false").toLowerCase());
    const promo=r.promo_price===""?null:Number(r.promo_price);
    if(r.promo_price!==""&&(!Number.isFinite(promo)||promo<0)){errors.push(`Baris ${line}: harga promo tidak valid.`);return}
    const stock=r.stock===""?null:Number(r.stock);
    if(r.stock!==""&&(!Number.isInteger(stock)||stock<0)){errors.push(`Baris ${line}: stok harus bilangan bulat 0 atau lebih.`);return}
    const status=(r.status||"dijual").toLowerCase();
    if(!["dijual","habis","tidak dijual"].includes(status)){errors.push(`Baris ${line}: status harus dijual, habis, atau tidak dijual.`);return}
    if(r.is_service&&!["true","false","1","0","ya","tidak","yes","no"].includes(r.is_service.toLowerCase())){errors.push(`Baris ${line}: is_service harus true atau false.`);return}
    const productSlug=(r.slug||slug(name)).trim();
    const nameKey=name.toLowerCase(),slugKey=productSlug.toLowerCase();
    if(seenNames.has(nameKey)||products.some(p=>(p.name||"").trim().toLowerCase()===nameKey)){errors.push(`Baris ${line}: nama produk sudah ada/duplikat (${name}).`);return}
    if(seenSlugs.has(slugKey)||products.some(p=>(p.slug||"").toLowerCase()===slugKey)){errors.push(`Baris ${line}: slug sudah ada/duplikat (${productSlug}).`);return}
    seenNames.add(nameKey);seenSlugs.add(slugKey);
    valid.push({name,slug:productSlug,price:service?0:price,promo_price:service?null:promo,is_service:service,brand_id:brand.id,category_id:category.id,image_url:r.image_url||"",specs:(r.specs||"").replace(/\s*\|\s*/g,"\n"),bonus:r.bonus||"",stock,status,is_active:true});
   });
   if(!valid.length&&!errors.length)errors.push("Tidak ada data produk yang bisa diimpor.");
   pendingNewProductsCsv=errors.length?[]:valid;
   info.textContent=errors.length?`Ditemukan ${errors.length} kesalahan. Tidak ada produk yang disimpan:\n${errors.slice(0,12).join("\n")}`:`${valid.length} produk baru lolos pemeriksaan. Belum disimpan ke database. Link foto diambil dari kolom image_url.`;
   $("runNewProductsCsv").disabled=!valid.length||!!errors.length;
  }catch(e){info.textContent=e.message;$("runNewProductsCsv").disabled=true}
 };
 reader.onerror=()=>{info.textContent="Gagal membaca file CSV.";$("runNewProductsCsv").disabled=true};
 reader.readAsText(file,"UTF-8");
}
async function applyNewProductsCsv(){
 if(!pendingNewProductsCsv.length)return;
 if(!confirm(`Simpan ${pendingNewProductsCsv.length} produk BARU ke Supabase? Produk lama tidak akan diubah.`))return;
 const btn=$("runNewProductsCsv");btn.disabled=true;btn.textContent="Menyimpan...";
 try{
  let next=products.reduce((n,p)=>{const v=productIdOrder(p.id);return Math.max(n,v===Number.MAX_SAFE_INTEGER?0:v)},0)+1;
  const rows=pendingNewProductsCsv.map(p=>({...p,id:"P"+String(next++).padStart(2,"0")}));
  const {error}=await db.from("products").insert(rows);
  if(error)throw error;
  const count=rows.length;pendingNewProductsCsv=[];$("importNewProductsCsv").value="";
  $("newProductsCsvInfo").textContent=`Berhasil menambahkan ${count} produk baru.`;
  await refresh();alert(`Berhasil menambahkan ${count} produk baru.`);
 }catch(e){alert("Gagal menyimpan produk baru: "+e.message);$("newProductsCsvInfo").textContent="Impor gagal: "+e.message}
 finally{btn.textContent="Import produk baru";btn.disabled=!pendingNewProductsCsv.length}
}

// Notifikasi pesanan: suara lokal per perangkat + PWA + langganan Web Push.
const NOTIFY_STORE_KEY="fendy_order_notify_v1";
let orderNotify={enabled:true,mode:"builtin",volume:80,customAudio:"",customName:""};
function loadOrderNotify(){
 try{orderNotify={...orderNotify,...JSON.parse(localStorage.getItem(NOTIFY_STORE_KEY)||"{}")}}catch(e){}
 const set=(id,v)=>{const el=$(id);if(el)el.value=v};
 if($("orderSoundEnabled"))$("orderSoundEnabled").checked=orderNotify.enabled!==false;
 set("orderSoundMode",orderNotify.mode||"builtin");set("orderSoundVolume",orderNotify.volume??80);
 if($("notifyStatus"))$("notifyStatus").textContent=orderNotify.customName?"Suara khusus tersimpan: "+orderNotify.customName:"Gunakan suara bawaan atau upload suara sendiri.";
}
function persistOrderNotify(){localStorage.setItem(NOTIFY_STORE_KEY,JSON.stringify(orderNotify))}
async function playOrderSound(){
 if(orderNotify.enabled===false)return;
 const volume=Math.max(0,Math.min(1,Number(orderNotify.volume??80)/100));
 if(orderNotify.mode==="custom"&&orderNotify.customAudio){
  try{const a=new Audio(orderNotify.customAudio);a.volume=volume;await a.play();return}catch(e){console.warn("Suara khusus gagal diputar",e)}
 }
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const ctx=new AC();if(ctx.state==="suspended")await ctx.resume();
  [880,1174].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="sine";osc.frequency.value=freq;gain.gain.setValueAtTime(0,ctx.currentTime+i*.19);gain.gain.linearRampToValueAtTime(.22*volume,ctx.currentTime+i*.19+.025);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.19+.22);osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+i*.19);osc.stop(ctx.currentTime+i*.19+.24)});setTimeout(()=>ctx.close(),900);
 }catch(e){console.warn("Audio not available",e)}
}
async function showOrderNotification(order){
 await playOrderSound();
 if("Notification"in window&&Notification.permission==="granted"){
  try{new Notification("Pesanan baru masuk!",{body:`${order.order_code||"Order baru"} · ${order.customer_name||"Pelanggan"}`,icon:"logo-fendy.png",tag:"order-"+(order.id||Date.now()),renotify:false})}catch(e){}
 }
}
async function registerStoreWorker(){
 if(!("serviceWorker"in navigator))return;
 try{await navigator.serviceWorker.register("./service-worker.js");}catch(e){console.warn("PWA service worker:",e)}
}
function urlBase64ToUint8Array(base64){const padding="=".repeat((4-base64.length%4)%4),raw=atob((base64+padding).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function enableStorePush(){
 if(!("Notification"in window)||!("serviceWorker"in navigator)||!("PushManager"in window)){alert("Browser ini belum mendukung Push Notification.");return}
 const key=C.VAPID_PUBLIC_KEY||"";
 if(!key||key.includes("ISI_VAPID")){alert("Push saat aplikasi ditutup belum siap: isi VAPID_PUBLIC_KEY di config.js dan selesaikan setup Edge Function sesuai file NOTIFIKASI-PUSH-SETUP.txt.");return}
 const permission=await Notification.requestPermission();if(permission!=="granted"){alert("Izin notifikasi belum diberikan.");return}
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)});
 const {data:{user}}=await db.auth.getUser();if(!user)throw Error("Sesi admin tidak ditemukan.");
 const {error}=await db.from("admin_push_subscriptions").upsert({user_id:user.id,endpoint:sub.endpoint,subscription:sub.toJSON(),updated_at:new Date().toISOString()},{onConflict:"user_id,endpoint"});
 if(error)throw error;
 $("notifyStatus").textContent="Izin aktif dan perangkat berhasil didaftarkan untuk Push Notification.";
 alert("Notifikasi browser aktif dan perangkat sudah didaftarkan. Pastikan SQL dan Edge Function Push sudah dipasang agar order tetap terkirim saat dashboard ditutup.");
}
function initNotificationControls(){
 loadOrderNotify();
 $("saveOrderSound")?.addEventListener("click",()=>{
  orderNotify.enabled=$("orderSoundEnabled").checked;orderNotify.mode=$("orderSoundMode").value;orderNotify.volume=Number($("orderSoundVolume").value);
  persistOrderNotify();$("notifyStatus").textContent="Pengaturan suara tersimpan di perangkat ini.";
 });
 $("testOrderSound")?.addEventListener("click",async()=>{
  orderNotify.enabled=$("orderSoundEnabled").checked;orderNotify.mode=$("orderSoundMode").value;orderNotify.volume=Number($("orderSoundVolume").value);
  if(orderNotify.mode==="custom"&&!orderNotify.customAudio){alert("Upload file suara terlebih dahulu.");return}await playOrderSound();
 });
 $("orderSoundFile")?.addEventListener("change",e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>2*1024*1024){alert("Ukuran suara maksimal 2 MB.");e.target.value="";return}
  if(!/^audio\//.test(f.type)){alert("Pilih file audio MP3, OGG, atau WAV.");e.target.value="";return}
  const r=new FileReader();r.onload=()=>{orderNotify.customAudio=String(r.result);orderNotify.customName=f.name;orderNotify.mode="custom";$("orderSoundMode").value="custom";$("notifyStatus").textContent="File suara siap: "+f.name+". Klik Simpan pengaturan suara.";};r.readAsDataURL(f);
 });
 $("enablePushNotifications")?.addEventListener("click",()=>enableStorePush().catch(e=>{console.error(e);alert("Gagal mengaktifkan Push: "+e.message)}));
}
let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;if($("installPwa"))$("installPwa").hidden=false});
window.addEventListener("appinstalled",()=>{if($("installPwa"))$("installPwa").hidden=true});

document.addEventListener("DOMContentLoaded",()=>{registerStoreWorker();initNotificationControls();$("installPwa")?.addEventListener("click",async()=>{if(!deferredInstallPrompt){alert("Gunakan menu browser: Tambahkan ke layar utama / Install app.");return}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null});if(!good()){msg("Lengkapi koneksi Supabase di config.js.");return}$("exportProductsCsv").onclick=downloadProductsCsv;$("importProductsCsv").onchange=e=>previewProductsCsv(e.target.files[0]);$("runProductsCsv").onclick=applyProductsCsv;$("downloadNewProductsTemplate").onclick=downloadNewProductsTemplate;$("importNewProductsCsv").onchange=e=>previewNewProductsCsv(e.target.files[0]);$("runNewProductsCsv").onclick=applyNewProductsCsv;
async function start(){let {data:{user}}=await db.auth.getUser();if(!user)return;let {data,error}=await db.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();if(error||!data){msg("Akun belum terdaftar sebagai admin. Tambahkan User UID ke tabel admin_users sesuai SETUP.md.");await db.auth.signOut();return}$("login").hidden=true;$("dashboard").hidden=false;await refresh();clearProduct();subscribeOrders()}
$("loginForm").onsubmit=async e=>{e.preventDefault();let {error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){msg(error.message);return}await start()};$("enableOrderNotifications").onclick=async()=>{if(!("Notification"in window)){alert("Browser ini tidak mendukung notifikasi desktop.");return}let permission=await Notification.requestPermission();alert(permission==="granted"?"Notifikasi pesanan berhasil diaktifkan.":"Izin notifikasi belum diberikan.")};$("logout").onclick=async()=>{await db.auth.signOut();location.reload()};db.auth.getSession().then(({data})=>{if(data.session)start()});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));["overview","categories","brands","products","banners","orders","tracking","social","map"].forEach(t=>$("tab-"+t).hidden=t!==b.dataset.tab);$("pageTitle").textContent=b.textContent.trim().replace(/^[^A-Za-z]+/,"")});
["brandSearch","productSearch","productStatusFilter"].forEach(id=>$(id)?.addEventListener(id==="productStatusFilter"?"change":"input",renderTables));
function subscribeOrders(){if(!db)return;try{db.channel("admin-order-alerts").on("postgres_changes",{event:"INSERT",schema:"public",table:"orders"},payload=>{const a=$("orderAlert");a.hidden=false;a.textContent="🔔 Pesanan baru masuk: "+(payload.new.order_code||"Pesanan baru");showOrderNotification(payload.new);refresh()}).subscribe()}catch(e){console.warn("Realtime pesanan tidak aktif",e)}}
$("adTarget").onchange=()=>{$("adBrandWrap").hidden=$("adTarget").value!=="brand";$("adProductsWrap").hidden=$("adTarget").value!=="products"};
$("adProductSearch").oninput=()=>{let selected=[...document.querySelectorAll("[data-ad-product]:checked")].map(x=>x.value);renderBannerProducts($("adProductSearch").value);document.querySelectorAll("[data-ad-product]").forEach(c=>c.checked=selected.includes(c.value))};
$("adImage").onchange=()=>{let f=$("adImage").files[0];if(f){$("adPreview").src=URL.createObjectURL(f);$("adPreview").hidden=false}};
$("clearBanner").onclick=clearBanner;
$("saveBanner").onclick=async()=>{try{let id=$("adId").value,old=banners.find(x=>x.id===id),photo=await upload($("adImage").files[0],"banners"),target=$("adTarget").value,selected=[...document.querySelectorAll("[data-ad-product]:checked")].map(x=>x.value);if(!photo&&!old?.image_url)throw Error("Foto banner wajib diupload");if(target==="brand"&&!$("adBrand").value)throw Error("Pilih brand tujuan");if(target==="products"&&!selected.length)throw Error("Pilih minimal satu produk");let row={...(id?{id}:{}),title:$("adTitle").value.trim(),image_url:photo||old.image_url,sort_order:Number($("adOrder").value||0),is_active:$("adActive").value==="true",target_type:target,target_brand_id:target==="brand"?$("adBrand").value:null,target_product_ids:target==="products"?selected:[]};let {error}=await db.from("banners").upsert(row);if(error)throw error;alert("Iklan berhasil disimpan");clearBanner();await refresh()}catch(e){alert(e.message)}};
$("saveCategory").onclick=async()=>{try{let id=$("cId").value||$("cCode").value.trim()||slug($("cName").value),old=cats.find(x=>x.id===id),photo=await upload($("cImage").files[0],"categories"),row={id,name:$("cName").value.trim(),description:$("cDesc").value.trim(),image_url:photo||old?.image_url||"",is_active:true};if(!row.name)throw Error("Nama kategori wajib diisi");let {error}=await db.from("categories").upsert(row);if(error)throw error;alert("Kategori tersimpan");clearCategory();refresh()}catch(e){alert(e.message)}};
$("saveBrand").onclick=async()=>{try{let id=$("bId").value||$("bCode").value.trim()||slug($("bName").value),old=brands.find(x=>x.id===id),photo=await upload($("bImage").files[0],"brands"),row={id,name:$("bName").value.trim(),category_id:$("bCategory").value||null,image_url:photo||old?.image_url||"",is_active:true};if(!row.name)throw Error("Nama brand wajib diisi");let {error}=await db.from("brands").upsert(row);if(error)throw error;alert("Brand tersimpan");clearBrand();refresh()}catch(e){alert(e.message)}};
$("saveProduct").onclick=async()=>{try{let id=$("pId").value||nextProductId(),old=products.find(x=>x.id===id),photo=await upload($("pImage").files[0],"products"),name=$("pName").value.trim(),row={id,name,slug:$("pSlug").value.trim()||slug(name),price:$("pIsService").checked?0:Number($("pPrice").value||0),promo_price:$("pIsService").checked?null:($("pPromo").value?Number($("pPromo").value):null),is_service:$("pIsService").checked,brand_id:$("pBrand").value||null,category_id:$("pCategory").value||null,image_url:photo||old?.image_url||"",status:$("pStatus").value,stock:$("pStock").value?Number($("pStock").value):null,bonus:$("pBonus").value,specs:$("pSpecs").value,is_active:true};if(!name)throw Error("Nama produk wajib diisi");if(!row.is_service&&row.price<=0)throw Error("Harga normal wajib diisi untuk produk biasa");let {error}=await db.from("products").upsert(row);if(error)throw error;alert("Produk tersimpan");await refresh();clearProduct()}catch(e){alert(e.message)}};
function clearCategory(){$("cId").value=$("cCode").value=$("cName").value=$("cDesc").value=$("cImage").value="";$("categoryFormTitle").textContent="Input kategori baru"}
function clearBrand(){$("bId").value=$("bCode").value=$("bName").value=$("bImage").value="";$("bCategory").value="";$("brandFormTitle").textContent="Input brand baru"}
function nextProductId(){let max=products.reduce((n,p)=>{let v=productIdOrder(p.id);return Math.max(n,v===Number.MAX_SAFE_INTEGER?0:v)},0);return "P"+String(max+1).padStart(2,"0")}
function clearProduct(){["pId","pName","pSlug","pPrice","pPromo","pStock","pBonus","pSpecs","pImage"].forEach(id=>$(id).value="");$("pIsService").checked=false;syncServicePriceFields();$("pStatus").value="dijual";$("pAutoId").value=nextProductId();$("productFormTitle").textContent="Input produk baru"}
$("pIsService").onchange=syncServicePriceFields;syncServicePriceFields();$("clearCategory").onclick=clearCategory;$("clearBrand").onclick=clearBrand;$("clearProduct").onclick=clearProduct;
$("saveTracking").onclick=()=>saveSetting("tracking_url",$("trackingUrl").value.trim());$("saveSocial").onclick=async()=>{let rows=[["tiktok_url","tiktokUrl"],["instagram_url","instagramUrl"],["facebook_url","facebookUrl"]].map(([key,id])=>({key,value:$(id).value.trim()}));let {error}=await db.from("store_settings").upsert(rows,{onConflict:"key"});if(error)alert(error.message);else{rows.forEach(x=>settings[x.key]=x.value);alert("Link media sosial berhasil disimpan.")}};$("saveMap").onclick=()=>saveSetting("map_url",$("mapUrl").value.trim());
});
