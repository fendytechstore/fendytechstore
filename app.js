const C=window.STORE_CONFIG||{}, db=window.supabase?.createClient(C.SUPABASE_URL||"",C.SUPABASE_ANON_KEY||"");
const $=id=>document.getElementById(id), rupiah=n=>"Rp"+Number(n||0).toLocaleString("id-ID");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const price=p=>p.promo_price&&Number(p.promo_price)>0&&Number(p.promo_price)<Number(p.price)?Number(p.promo_price):Number(p.price);
let cats=[],brands=[],items=[],basket=[],catFilter="",textFilter="",kind="all";
function toast(s){let t=$("toast");if(!t)return;t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function ready(){return db&&C.SUPABASE_URL&&!C.SUPABASE_URL.includes("PROJECT-REF")&&C.SUPABASE_ANON_KEY&&!C.SUPABASE_ANON_KEY.startsWith("ISI_")}
async function load(){
 if(!ready()){$("products").innerHTML='<div class="notice">Koneksi Supabase belum diisi. Lengkapi config.js sesuai panduan SETUP.md.</div>';return}
 const [a,b,p]=await Promise.all([db.from("categories").select("*").eq("is_active",true).order("sort_order"),db.from("brands").select("*").eq("is_active",true),db.from("products").select("*,brands(name)").eq("is_active",true).neq("status","tidak dijual").order("created_at",{ascending:false}).limit(1000)]);
 if(a.error||b.error||p.error){$("products").innerHTML='<div class="notice">'+esc((a.error||b.error||p.error).message)+'</div>';return}
 cats=a.data||[];brands=b.data||[];items=p.data||[];renderCats();renderProducts();
 const slug=new URLSearchParams(location.search).get("produk");if(slug){const x=items.find(p=>p.slug===slug);if(x)showDetail(x,false)}
}
function renderCats(){
 $("catCount").textContent=cats.length+" kategori";
 $("categories").innerHTML=cats.slice(0,24).map(c=>`<button class="cat ${catFilter===c.id?"selected":""}" data-cat="${esc(c.id)}"><b>${esc(c.name)}</b><small>${items.filter(p=>p.category_id===c.id).length} produk</small></button>`).join("");
 document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{catFilter=b.dataset.cat;renderCats();$("productTitle").textContent=cats.find(c=>c.id===catFilter)?.name||"Produk";renderProducts();$("produk").scrollIntoView({behavior:"smooth"})})
}
function renderProducts(){
 let list=items.filter(p=>(!catFilter||p.category_id===catFilter)&&(!textFilter||(p.name+" "+(p.brands?.name||"")+" "+(p.specs||"")).toLowerCase().includes(textFilter))&&(kind==="all"||(kind==="promo"&&p.promo_price&&Number(p.promo_price)<Number(p.price))||(kind==="featured"&&p.is_featured)));
 let sort=$("sort")?.value;if(sort==="low")list.sort((a,b)=>price(a)-price(b));if(sort==="high")list.sort((a,b)=>price(b)-price(a));if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));
 $("products").innerHTML=list.map(p=>`<article class="card" data-open="${esc(p.slug)}"><div class="photo">${p.promo_price&&Number(p.promo_price)<Number(p.price)?'<span class="promo">PROMO</span>':""}${p.image_url?`<img loading="lazy" src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.style.display='none'">`:'<b>FENDY</b>'}</div><div class="info"><small>${esc(p.brands?.name||"FENDY STORE")}</small><h3>${esc(p.name)}</h3>${p.promo_price&&Number(p.promo_price)<Number(p.price)?`<div class="old">${rupiah(p.price)}</div>`:""}<div class="price">${rupiah(price(p))}</div><div class="actions"><button class="detailBtn" data-detail="${esc(p.slug)}">Detail</button><button class="addBtn" data-add="${esc(p.id)}">+ Keranjang</button></div></div></article>`).join("");
 $("empty").hidden=!!list.length;
 document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=e=>{e.stopPropagation();let p=items.find(x=>x.slug===b.dataset.detail);if(p)showDetail(p)});
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();add(b.dataset.add)});
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{let p=items.find(x=>x.slug===b.dataset.open);if(p)showDetail(p)})
}
function showDetail(p,push=true){
 $("detail").innerHTML=`<div class="detailLayout"><div class="detailPhoto">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:"FENDY STORE"}</div><div class="detailText"><label>${esc(p.brands?.name||"FENDY STORE")}</label><h2>${esc(p.name)}</h2><b class="price">${rupiah(price(p))}</b><p>${esc(p.specs||"Silakan hubungi admin untuk informasi produk.")}</p>${p.bonus?`<p><b>Bonus:</b> ${esc(p.bonus)}</p>`:""}<button class="primary" id="detailAdd">Tambah keranjang</button> <button class="secondary" id="shareLink">Salin link</button></div></div>`;
 $("detailModal").hidden=false;$("detailAdd").onclick=()=>add(p.id);
 $("shareLink").onclick=async()=>{let u=location.origin+location.pathname+"?produk="+encodeURIComponent(p.slug);try{await navigator.clipboard.writeText(u);toast("Link produk disalin")}catch{prompt("Salin link ini",u)}};
 if(push)history.pushState({}, "", "?produk="+encodeURIComponent(p.slug))
}
function add(id){let p=items.find(x=>x.id===id);if(!p)return;let row=basket.find(x=>x.id===id);if(row)row.qty++;else basket.push({id:p.id,name:p.name,price:price(p),qty:1});renderBasket();toast("Produk masuk keranjang")}
function renderBasket(){
 $("cartCount").textContent=basket.reduce((a,b)=>a+b.qty,0);
 $("cartItems").innerHTML=basket.length?basket.map(x=>`<div class="line"><span>${esc(x.name)}<br>${rupiah(x.price)} × ${x.qty}</span><span><b>${rupiah(x.price*x.qty)}</b><br><button data-remove="${esc(x.id)}">Hapus</button></span></div>`).join(""):"<p>Keranjang masih kosong.</p>";
 $("total").textContent="Subtotal: "+rupiah(basket.reduce((a,b)=>a+b.price*b.qty,0));
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{basket=basket.filter(x=>x.id!==b.dataset.remove);renderBasket()})
}
async function checkout(method){
 if(!basket.length)return toast("Keranjang masih kosong");
 let name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),address=$("customerAddress").value.trim(),note=$("customerNote").value.trim();
 if(!name||!phone)return toast("Isi nama dan nomor WhatsApp");
 if(method==="website"&&!address)return toast("Isi alamat untuk checkout website");
 if(!ready())return toast("Database belum tersambung");
 let subtotal=basket.reduce((a,b)=>a+b.price*b.qty,0),code="FFS-"+Date.now().toString().slice(-9);
 let message=`Pesanan ${code}\nNama: ${name}\nWA: ${phone}\nAlamat: ${address||"-"}\n\n${basket.map(x=>`- ${x.name} x${x.qty} = ${rupiah(x.price*x.qty)}`).join("\n")}\n\nSubtotal: ${rupiah(subtotal)}\nCatatan: ${note||"-"}`;
 let {error}=await db.from("orders").insert({order_code:code,customer_name:name,customer_phone:phone,customer_address:address,customer_note:note,checkout_method:method,items:basket,subtotal});
 if(error)return toast("Pesanan gagal disimpan: "+error.message);
 if(method==="whatsapp")window.open("https://wa.me/"+(C.WHATSAPP_ADMIN||"6282153719616")+"?text="+encodeURIComponent(message),"_blank");
 else alert("Pesanan berhasil dikirim. Nomor pesanan: "+code+". Admin akan menghubungi Anda untuk konfirmasi.");
 basket=[];renderBasket();$("cartModal").hidden=true;toast("Pesanan tersimpan: "+code)
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("products"))return;$("year").textContent=new Date().getFullYear();
 $("cartOpen").onclick=()=>$("cartModal").hidden=false;
 $("waCheckout").onclick=()=>checkout("whatsapp");$("webCheckout").onclick=()=>checkout("website");
 $("search").oninput=e=>{textFilter=e.target.value.toLowerCase().trim();renderProducts()};
 $("sort").onchange=renderProducts;$("reset").onclick=()=>{catFilter="";renderCats();$("productTitle").textContent="Produk pilihan";renderProducts()};
 document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{kind=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});
 document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$ (b.dataset.close).hidden=true);
 document.querySelectorAll(".overlay").forEach(m=>m.onclick=e=>{if(e.target===m)m.hidden=true});
 renderBasket();const mt=$("menuToggle");if(mt)mt.onclick=e=>{e.preventDefault();$("menuDrop").classList.toggle("open")};load()
});
