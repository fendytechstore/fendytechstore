const C=window.STORE_CONFIG||{},db=window.supabase?.createClient(C.SUPABASE_URL||"",C.SUPABASE_ANON_KEY||"");
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),rupiah=n=>"Rp"+Number(n||0).toLocaleString("id-ID"),price=p=>p.promo_price&&+p.promo_price>0&&+p.promo_price<+p.price?+p.promo_price:+p.price;
let cats=[],brands=[],items=[],settings={},banners=[],bannerIndex=0,bannerTimer=null,bannerIndicatorTimer=null,basket=[],activeCat=null,activeBrand=null,activeProduct=null,query="",sort="new",categoryGridScroll=0,searchHistoryActive=false;
// Biarkan browser dan aplikasi mengelola riwayat scroll secara konsisten.
if("scrollRestoration" in history) history.scrollRestoration="manual";
const valid=()=>db&&C.SUPABASE_URL&&!C.SUPABASE_URL.includes("PROJECT-REF")&&C.SUPABASE_ANON_KEY&&!C.SUPABASE_ANON_KEY.startsWith("ISI_");
function toast(s){let t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function setting(k){return settings[k]||""}
async function fetchAllStoreProducts(){let out=[],from=0,batch=1000;while(true){let {data,error}=await db.from("products").select("*,brands(name)").eq("is_active",true).neq("status","tidak dijual").order("id").range(from,from+batch-1);if(error)throw error;out.push(...(data||[]));if(!data||data.length<batch)break;from+=batch}return out}
async function load(){if(!valid()){$("categories").innerHTML='<p class="notice">Koneksi database belum diatur. Lengkapi config.js dan ikuti SETUP.md.</p>';return}
const [a,b,c,s,ad]=await Promise.all([db.from("categories").select("*").eq("is_active",true).order("sort_order"),db.from("brands").select("*").eq("is_active",true).order("name"),fetchAllStoreProducts(),db.from("store_settings").select("key,value"),db.from("banners").select("*").eq("is_active",true).order("sort_order")]);
if(a.error||b.error){$("categories").innerHTML='<p class="empty">Gagal memuat katalog. Pastikan SQL setup terbaru sudah dijalankan.</p>';return}
cats=a.data||[];brands=b.data||[];items=c.sort((a,b)=>{const na=Number(String(a.id).match(/^P0*(\\d+)$/i)?.[1]||99999999),nb=Number(String(b.id).match(/^P0*(\\d+)$/i)?.[1]||99999999);return na-nb});(s.data||[]).forEach(x=>settings[x.key]=x.value);banners=ad.error?[]:(ad.data||[]);renderAdSlider();
$("catCount").textContent=cats.length+" kategori";renderCategories();renderMenu();bindInfo();
const u=new URL(location.href),slug=u.searchParams.get("produk"),cat=u.searchParams.get("kategori"),brand=u.searchParams.get("brand");
if(slug){let product=items.find(x=>x.slug===slug);if(product)renderDetail(product,false);else routeHome(false)}
else if(cat){let c=cats.find(x=>x.id===cat);if(c){chooseCategory(cat,false);if(brand){let b=brands.find(x=>x.id===brand);if(b)renderProductsForBrand(b,false)}}}
else routeHome(false);
}

function renderAdSlider(){
 const root=$("adSlider"),track=$("adTrack"),ind=$("adIndicators");if(!root||!track||!ind)return;
 clearInterval(bannerTimer);clearTimeout(bannerIndicatorTimer);
 if(!banners.length){root.hidden=true;return}root.hidden=false;bannerIndex=0;
 const slideHTML=(b,i,clone=false)=>`<button class="ad-slide" type="button" data-ad-index="${i}" aria-label="Iklan ${i+1}" ${clone?'data-ad-clone="true"':''}><img src="${esc(storageUrl(b.image_url))}" alt="${esc(b.title||"Iklan promosi")}" loading="${i===0?"eager":"lazy"}"></button>`;
 track.innerHTML=slideHTML(banners[banners.length-1],banners.length-1,true)+banners.map((b,i)=>slideHTML(b,i)).join("")+slideHTML(banners[0],0,true);
 ind.innerHTML=`<span class="ad-dots">${banners.map((_,i)=>`<i class="ad-dot ${i===0?"active":""}"></i>`).join("")}</span>`;
 let physicalIndex=1,animating=false,unlockTimer=null;
 const update=()=>ind.querySelectorAll(".ad-dot").forEach((d,n)=>d.classList.toggle("active",n===bannerIndex));
 const setPosition=(index,animate=true)=>{track.style.transition=animate?"":"none";track.style.transform=`translate3d(-${index*100}%,0,0)`;physicalIndex=index;if(!animate){void track.offsetWidth;track.style.transition=""}};
 const go=(logical,animate=true)=>{if(animating&&animate)return;bannerIndex=(logical+banners.length)%banners.length;const target=logical<0?0:logical>=banners.length?banners.length+1:bannerIndex+1;animating=!!(animate&&target!==physicalIndex);setPosition(target,animate);update();clearTimeout(unlockTimer);if(animating)unlockTimer=setTimeout(()=>{if(physicalIndex===0)setPosition(banners.length,false);else if(physicalIndex===banners.length+1)setPosition(1,false);animating=false},650)};
 track.ontransitionend=e=>{if(e.target!==track||e.propertyName!=="transform")return;if(physicalIndex===0)setPosition(banners.length,false);else if(physicalIndex===banners.length+1)setPosition(1,false);animating=false;clearTimeout(unlockTimer)};
 const reveal=()=>{root.classList.add("show-indicators");clearTimeout(bannerIndicatorTimer);bannerIndicatorTimer=setTimeout(()=>root.classList.remove("show-indicators"),1800)};
 const openBanner=b=>{if(!b)return;saveCurrentScroll();if(b.target_type==="brand"&&b.target_brand_id){const brand=brands.find(x=>x.id===b.target_brand_id);if(brand){activeCat=null;chooseBrand(brand.id);return}}if(b.target_type==="products"&&b.target_product_ids?.length){const selected=items.filter(p=>b.target_product_ids.includes(p.id));activeCat=null;activeBrand=null;query="";$("search").value="";showSections("search");$("searchHeading").textContent=b.title||"Produk pilihan";renderProductCards(selected,"searchResults");history.pushState({view:"ad",adId:b.id,scroll:window.scrollY,scrollX:window.scrollX},"","?iklan="+encodeURIComponent(b.id));requestAnimationFrame(()=>window.scrollTo({top:root.offsetTop,behavior:"smooth"}));return}};
 track.querySelectorAll("[data-ad-index]:not([data-ad-clone])").forEach(el=>el.addEventListener("click",e=>{if(dragged){e.preventDefault();return}openBanner(banners[Number(el.dataset.adIndex)])}));
 $("adPrev").onclick=e=>{e.stopPropagation();go(bannerIndex-1);reveal();restart()};$("adNext").onclick=e=>{e.stopPropagation();go(bannerIndex+1);reveal();restart()};
 let startX=0,delta=0,dragging=false,dragged=false;
 root.onpointerdown=e=>{if(e.pointerType==="mouse"&&e.target.closest(".ad-arrow"))return;if(e.pointerType==="mouse"){startX=e.clientX;delta=0;dragging=true;dragged=false;clearInterval(bannerTimer)}};
 root.onpointermove=e=>{if(dragging){delta=e.clientX-startX;if(Math.abs(delta)>8)dragged=true}};
 root.onpointerup=e=>{if(e.pointerType==="mouse"&&dragging){delta=e.clientX-startX;dragging=false;if(Math.abs(delta)>35){go(bannerIndex+(delta<0?1:-1));reveal()}restart();setTimeout(()=>dragged=false,0)}};
 root.onpointercancel=()=>{dragging=false;restart()};
 let touchStart=0,touchDelta=0;root.ontouchstart=e=>{touchStart=e.touches[0].clientX;touchDelta=0;clearInterval(bannerTimer)};root.ontouchmove=e=>{touchDelta=e.touches[0].clientX-touchStart};root.ontouchend=()=>{if(Math.abs(touchDelta)>35){go(bannerIndex+(touchDelta<0?1:-1));reveal()}restart()};
 function restart(){clearInterval(bannerTimer);bannerTimer=setInterval(()=>go(bannerIndex+1),10000)}
 setPosition(1,false);update();restart();
}
function storageUrl(path){
  const raw=String(path||"").trim(); if(!raw)return "";
  if(/^https?:\/\//i.test(raw)||raw.startsWith("data:"))return raw;
  const clean=raw.replace(/^\/+/,"").replace(/^store-images\//i,"");
  try{return db.storage.from("store-images").getPublicUrl(clean).data.publicUrl}catch(e){return raw}
}
function imageCandidates(path){
  const raw=String(path||"").trim().replace(/^\/+/,""); if(!raw)return [];
  if(/^https?:\/\//i.test(raw)){
    try{
      const u=new URL(raw), marker="/storage/v1/object/public/store-images/";
      const at=u.pathname.indexOf(marker);
      if(at>=0){const key=decodeURIComponent(u.pathname.slice(at+marker.length));return imageCandidates(key)}
    }catch(e){}
    return [raw];
  }
  const clean=raw.replace(/^store-images\//i,"");
  const base=clean.split("/").pop();
  const variants=[clean];
  let folders=null;
  const lower=clean.toLowerCase();
  if(lower.startsWith("img/kategori/")) folders=["img/kategori/","kategori/","categories/","category/","img/categories/","img/category/",""];
  else if(lower.startsWith("img/brand/")) folders=["img/brand/","brand/","brands/","img/brands/",""];
  else if(lower.startsWith("img/produk/")||lower.startsWith("img/products/")) folders=["img/produk/","img/products/","produk/","products/","product/",""];
  if(folders) for(const folder of folders) variants.push(folder+base);
  else if(base!==clean) variants.push(base);
  return [...new Set(variants.filter(Boolean))];
}
window.__fendyImgFallback=function(el){let paths=[];try{paths=JSON.parse(el.dataset.fallback||"[]")}catch(e){}let next=paths.shift();if(next){el.dataset.fallback=JSON.stringify(paths);el.src=storageUrl(next)}else{const fallback=document.createElement("span");fallback.className="image-fallback";fallback.textContent="F";fallback.setAttribute("aria-label","Foto belum tersedia di Storage");el.replaceWith(fallback);}};
function img(url,alt,cls=""){const paths=imageCandidates(url);if(!paths.length)return `<span class="image-fallback">F</span>`;const first=storageUrl(paths.shift());return `<img class="${cls}" src="${esc(first)}" data-fallback='${esc(JSON.stringify(paths))}' alt="${esc(alt)}" loading="lazy" onerror="window.__fendyImgFallback(this)">`}
function isAppleProduct(p){return String(p.brands?.name||"").toLowerCase().includes("apple")||String(p.name||"").toLowerCase().includes("apple")}
function promoBadge(p){const sale=p.promo_price&&+p.promo_price>0&&+p.promo_price<+p.price;const bonus=String(p.bonus||"").trim();return `${sale?'<span class="promo">🔥 PROMO</span>':""}${bonus?'<span class="bonus-badge" title="Produk dengan bonus">🎁 BONUS</span>':""}`}
function discountPercent(p){return p.promo_price&&+p.promo_price>0&&+p.promo_price<+p.price?Math.round((1-(+p.promo_price/+p.price))*100):0}
function specsMarkup(value){const lines=String(value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return '<p>Hubungi admin untuk informasi spesifikasi dan ketersediaan produk.</p>';const pairs=lines.map(line=>{const at=line.indexOf(":");return at>0?[line.slice(0,at).trim(),line.slice(at+1).trim()]:[line,""]});if(pairs.some(x=>!x[1]))return `<div class="spec-description">${lines.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`;return `<div class="spec-panel"><h3>Spesifikasi Produk</h3><dl>${pairs.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`}
function tamMark(p){return isAppleProduct(p)?'<img class="tam-logo" src="https://erajaya.com/files/Erajaya%20Website%20Picture/Era-Subsidiaries/Logo/TAM.png" alt="TAM" loading="lazy">':""}
function renderCategories(){ $("categories").innerHTML=cats.map(c=>`<button class="category-card" data-category="${esc(c.id)}">${img(c.image_url,c.name)}<span><b>${esc(c.name)}</b><small>${items.filter(p=>p.category_id===c.id).length} produk</small></span></button>`).join("")||"<p>Belum ada kategori.</p>";document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>chooseCategory(b.dataset.category))}
function renderMenu(){$("menuCategories").innerHTML=cats.map(c=>`<button data-menucat="${esc(c.id)}">${esc(c.name)}</button>`).join("");document.querySelectorAll("[data-menucat]").forEach(b=>b.onclick=()=>{$("menuPanel").hidden=true;chooseCategory(b.dataset.menucat)})}
function saveCurrentScroll(){const st=history.state&&typeof history.state==="object"?history.state:{view:"home"};history.replaceState({...st,scroll:window.scrollY,scrollX:window.scrollX},"",location.href)}
function crumb(parts){$("breadcrumb").innerHTML=parts.map((x,i)=>i?` / <button data-crumb="${i}">${esc(x.name)}</button>`:esc(x.name)).join("");document.querySelectorAll("[data-crumb]").forEach(b=>b.onclick=()=>{if(+b.dataset.crumb===1)routeHome();else if(+b.dataset.crumb===2&&activeCat)chooseCategory(activeCat.id)})}
function showSections(which){$("categorySection").hidden=which!=="cats";$("brandSection").hidden=which!=="brands";$("productSection").hidden=which!=="products";$("searchSection").hidden=which!=="search";$("detailView").hidden=true;$("shop").hidden=false;$("home").hidden=false}
function routeHome(push=true,restore=false){activeCat=null;activeBrand=null;activeProduct=null;showSections("cats");crumb([{name:"Home"}]);if(push)history.pushState({view:"home"},"",location.pathname);requestAnimationFrame(()=>window.scrollTo({top:restore?categoryGridScroll:0,behavior:"instant"}))}
function returnToCategories(){routeHome(true,true)}
function chooseCategory(id,push=true){if(push){saveCurrentScroll();if($("categorySection")&&!$("categorySection").hidden)categoryGridScroll=window.scrollY;}activeCat=cats.find(c=>c.id===id);if(!activeCat)return;activeBrand=null;showSections("brands");$("brandHeading").textContent="Brand "+activeCat.name;let list=brands.filter(b=>b.category_id===id||items.some(p=>p.category_id===id&&p.brand_id===b.id));$("brands").innerHTML=list.map(b=>`<button class="brand-card" data-brand="${esc(b.id)}">${img(b.image_url,b.name)}<span><b>${esc(b.name)}</b><small>${items.filter(p=>p.category_id===id&&p.brand_id===b.id).length} produk</small></span></button>`).join("")||'<p class="empty">Brand untuk kategori ini belum tersedia.</p>';document.querySelectorAll("[data-brand]").forEach(b=>b.onclick=()=>chooseBrand(b.dataset.brand));crumb([{name:"Home"},{name:activeCat.name}]);if(push)history.pushState({view:"category",cat:id,scroll:0},"","?kategori="+encodeURIComponent(id));requestAnimationFrame(()=>window.scrollTo({left:0,top:0,behavior:"instant"}))}
function chooseBrand(id,push=true){let b=brands.find(x=>x.id===id);if(b)renderProductsForBrand(b,push)}
function renderProductsForBrand(b,push=true){if(push)saveCurrentScroll();activeBrand=b;showSections("products");$("productHeading").textContent=b.name;renderProductCards(items.filter(p=>p.brand_id===b.id&&(!activeCat||p.category_id===activeCat.id||!p.category_id)));crumb([{name:"Home"},{name:activeCat?.name||"Kategori"},{name:b.name}]);if(push)history.pushState({view:"brand",cat:activeCat?.id,brand:b.id,scroll:0},"","?kategori="+encodeURIComponent(activeCat?.id||"")+"&brand="+encodeURIComponent(b.id));requestAnimationFrame(()=>window.scrollTo({left:0,top:0,behavior:"instant"}))}
function renderProductCards(list,target="products"){if(sort==="low")list.sort((a,b)=>price(a)-price(b));if(sort==="high")list.sort((a,b)=>price(b)-price(a));if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));$(target).innerHTML=list.map(p=>`<article class="product-card" data-product="${esc(p.slug)}"><div class="product-photo">${promoBadge(p)}${tamMark(p)}${img(p.image_url,p.name)}</div><div class="product-info"><small>${esc(p.brands?.name||"FENDY FREELANCE STORE")}</small><h3>${esc(p.name)}</h3>${!p.is_service&&p.promo_price&&+p.promo_price<+p.price?`<div class="old">${rupiah(p.price)}</div>`:""}${p.is_service?`<div class="service-price">Konsultasi Admin</div>`:`<div class="price">${rupiah(price(p))}</div>`}${!p.is_service&&discountPercent(p)?`<div class="promo-saving">🔥 PROMO HEMAT ${discountPercent(p)}%</div>`:""}<div class="product-actions"><button class="detail-action" data-detail="${esc(p.slug)}">Detail</button>${p.is_service?`<button class="add-action" data-service="${esc(p.id)}">Chat Admin</button>`:`<button class="add-action" data-add="${esc(p.id)}">+ Keranjang</button>`}</div></div></article>`).join("");if(target==="products")$("empty").hidden=!!list.length;document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=e=>{e.stopPropagation();let p=items.find(x=>x.slug===b.dataset.detail);if(p)renderDetail(p)});document.querySelectorAll("[data-product]").forEach(b=>b.onclick=e=>{if(e.target.closest("button"))return;let p=items.find(x=>x.slug===b.dataset.product);if(p)renderDetail(p)});document.querySelectorAll("[data-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();add(b.dataset.add)});document.querySelectorAll("[data-service]").forEach(b=>b.onclick=e=>{e.stopPropagation();chatService(b.dataset.service)})}
function renderDetail(p,push=true){
 const returnState=push?{view:history.state?.view==="ad"?"ad":query?"search":activeBrand?"brand":activeCat?"category":"home",query:$("search").value||query,cat:activeCat?.id,brand:activeBrand?.id,adId:history.state?.adId,scroll:window.scrollY,scrollX:window.scrollX}:null;
 activeProduct=p;$("shop").hidden=true;$("home").hidden=true;$("detailView").hidden=false;
 $("detailContent").innerHTML=`<div class="detail-layout"><div class="product-photo detail-photo" data-zoom="${esc(p.image_url)}" role="button" tabindex="0" aria-label="Perbesar foto produk">${tamMark(p)}${img(p.image_url,p.name)}<small class="zoom-hint">Klik foto untuk memperbesar</small></div><div class="detail-copy"><span class="eyebrow">${esc(p.brands?.name||"FENDY FREELANCE STORE")}</span><h1>${esc(p.name)}</h1>${!p.is_service&&p.promo_price&&+p.promo_price<+p.price?`<div class="old">${rupiah(p.price)}</div>`:""}${p.is_service?`<div class="service-price service-price-detail">Harga ditentukan setelah pemeriksaan unit</div>`:`<div class="price">${rupiah(price(p))}</div>`}${!p.is_service&&discountPercent(p)?`<div class="promo-saving promo-saving-detail">🔥 PROMO HEMAT ${discountPercent(p)}%</div>`:""}<div class="stock">Status: ${esc(p.status||"Tersedia")}${p.stock!=null?" · Stok: "+esc(p.stock):""}</div>${specsMarkup(p.specs)}${p.bonus?`<div class="detail-bonus"><b>🎁 BONUS PRODUK</b><p>${esc(p.bonus)}</p></div>`:""}${p.is_service?`<button id="detailService" class="btn-red">Konsultasi Admin via WhatsApp</button>`:`<button id="detailAdd" class="btn-red">Tambah ke keranjang</button>`}<button id="detailShare" class="btn-light">Bagikan link</button></div></div>`;
 if(p.is_service){$("detailService").onclick=()=>chatService(p.id)}else{$("detailAdd").onclick=()=>add(p.id)}$("detailShare").onclick=shareProduct;
 const zoomBox=document.querySelector(".detail-photo[data-zoom]");if(zoomBox){const open=()=>openImageZoom(p.image_url,p.name);zoomBox.onclick=open;zoomBox.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}}}
 if(push){history.replaceState(returnState,"",location.href);history.pushState({view:"product",slug:p.slug},"","?produk="+encodeURIComponent(p.slug));window.scrollTo({left:0,top:0,behavior:"instant"})}
}
function chatService(id){const p=items.find(x=>x.id===id);if(!p)return;const phone=String(C.WHATSAPP_ADMIN||"").replace(/\D/g,"");if(!phone){toast("Nomor WhatsApp admin belum diatur di config.js");return}const msg=`Halo Admin, saya ingin konsultasi servis:\n${p.name}\nMohon info estimasi biaya dan pengerjaannya. Terima kasih.`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank","noopener")}

async function shareProduct(){let url=location.href;try{if(navigator.share)await navigator.share({title:activeProduct.name,url});else{await navigator.clipboard.writeText(url);toast("Link produk disalin")}}catch(e){if(e.name!=="AbortError")prompt("Salin link produk",url)}}
function openImageZoom(url,name){const modal=$("imageZoom"),image=$("zoomImage");if(!modal||!url)return;const candidates=imageCandidates(url);image.dataset.fallback=JSON.stringify(candidates.slice(1));image.onerror=()=>window.__fendyImgFallback(image);image.src=storageUrl(candidates[0]||url);image.alt=name||"Foto produk";modal.hidden=false;document.body.classList.add("zoom-open");history.pushState({view:"imageZoom"},"",location.href)}
function closeImageZoom(fromPop=false){const modal=$("imageZoom");if(modal)modal.hidden=true;document.body.classList.remove("zoom-open");if(!fromPop&&history.state?.view==="imageZoom")history.back()}
function mapEmbedUrl(raw){const u=String(raw||"").trim();if(!u)return "";if(/\/maps\/embed|output=embed/i.test(u))return u;let query=u;try{const parsed=new URL(u);const q=parsed.searchParams.get("q")||parsed.searchParams.get("query");if(q)query=q;else{const place=parsed.pathname.match(/\/place\/([^/]+)/);if(place)query=decodeURIComponent(place[1].replace(/\+/g," "));const coord=parsed.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);if(coord)query=coord[1]+","+coord[2]}}catch(e){}return "https://www.google.com/maps?q="+encodeURIComponent(query)+"&output=embed"}
function bindInfo(){$("trackingLink").href=setting("tracking_url")||"#";$("trackingLink").onclick=e=>{if(!setting("tracking_url")){e.preventDefault();toast("Link tracking belum tersedia")}};$("socialBtn").onclick=()=>{let links=[["TikTok","tiktok_url","https://cdn.simpleicons.org/tiktok/111111"],["Instagram","instagram_url","https://cdn.simpleicons.org/instagram/E4405F"],["Facebook","facebook_url","https://cdn.simpleicons.org/facebook/1877F2"]].filter(x=>setting(x[1]));$("infoTitle").textContent="Media sosial Fendy Freelance Store";$("infoContent").innerHTML=links.length?`<div class="info-links">${links.map(x=>`<a target="_blank" rel="noopener" href="${esc(setting(x[1]))}"><img src="${x[2]}" alt="">${x[0]}</a>`).join("")}</div>`:"<p>Link media sosial belum ditambahkan.</p>";$("infoModal").hidden=false};$("locationBtn").onclick=()=>{$("infoTitle").textContent="Lokasi toko";let u=setting("map_url");$("infoContent").innerHTML=u?`<a class="map-preview-link" target="_blank" rel="noopener" href="${esc(u)}" aria-label="Buka lokasi di Google Maps"><iframe class="info-map" src="${esc(mapEmbedUrl(u))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta lokasi toko"></iframe></a><p><a target="_blank" rel="noopener" href="${esc(u)}">Buka Google Maps</a></p>`:"<p>Lokasi toko belum ditambahkan admin.</p>";$("infoModal").hidden=false}}
function add(id){let p=items.find(x=>x.id===id);if(!p)return;let r=basket.find(x=>x.id===id);if(r)r.qty++;else basket.push({id:p.id,name:p.name,price:price(p),qty:1});renderBasket();toast("Produk masuk keranjang")}
function renderBasket(){$("cartCount").textContent=basket.reduce((n,x)=>n+x.qty,0);$("cartItems").innerHTML=basket.length?basket.map(x=>`<div class="line"><span>${esc(x.name)}<br>${rupiah(x.price)} × ${x.qty}</span><span><b>${rupiah(x.price*x.qty)}</b><br><button data-remove="${esc(x.id)}">Hapus</button></span></div>`).join(""):"<p>Keranjang masih kosong.</p>";$("total").textContent="Subtotal: "+rupiah(basket.reduce((n,x)=>n+x.price*x.qty,0));document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{basket=basket.filter(x=>x.id!==b.dataset.remove);renderBasket()})}
async function checkout(method){if(!basket.length)return toast("Keranjang masih kosong");let name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),address=$("customerAddress").value.trim(),note=$("customerNote").value.trim();if(!name||!phone)return toast("Isi nama dan nomor WhatsApp");if(!valid())return toast("Database belum tersambung");let subtotal=basket.reduce((n,x)=>n+x.price*x.qty,0),code="FTS-"+Date.now().toString().slice(-9),message=`Pesanan ${code}\nNama: ${name}\nWA: ${phone}\nAlamat: ${address||"-"}\n${basket.map(x=>`- ${x.name} x${x.qty} = ${rupiah(x.price*x.qty)}`).join("\n")}\nSubtotal: ${rupiah(subtotal)}\nCatatan: ${note||"-"}`;let {error}=await db.from("orders").insert({order_code:code,customer_name:name,customer_phone:phone,customer_address:address,customer_note:note,checkout_method:method,items:basket,subtotal,status:"menunggu pembayaran"});if(error)return toast("Pesanan gagal: "+error.message);if(method==="whatsapp")window.open("https://wa.me/"+(C.WHATSAPP_ADMIN||"")+"?text="+encodeURIComponent(message),"_blank");else alert("Pesanan "+code+" berhasil dibuat. Admin akan menghubungi untuk verifikasi pembayaran.");basket=[];renderBasket();$("cartModal").hidden=true}
function syncSearchClear(){const b=$("clearSearch");if(b)b.hidden=!String($("search").value||"").trim()}
function search(q){
 const next=String(q||"").toLowerCase().trim();
 if(next&&!query&&!searchHistoryActive){
  searchHistoryActive=true;
  history.pushState({view:"search",query:next,scroll:window.scrollY,scrollX:window.scrollX},"",location.href);
 } else if(next&&searchHistoryActive&&history.state?.view==="search"){
  history.replaceState({...history.state,query:next,scroll:window.scrollY,scrollX:window.scrollX},"",location.href);
 }
 query=next;syncSearchClear();
 if(!query){$("searchSection").hidden=true;if(activeBrand)showSections("products");else if(activeCat)showSections("brands");else showSections("cats");return}
 showSections("search");let found=items.filter(p=>[p.name,p.brands?.name,p.specs,p.bonus].join(" ").toLowerCase().includes(query));$("searchHeading").textContent=`Hasil untuk "${q}" (${found.length})`;renderProductCards(found,"searchResults")
}
if("scrollRestoration" in history)history.scrollRestoration="manual";
window.addEventListener("popstate",e=>{
 if($("imageZoom")&&!$("imageZoom").hidden){closeImageZoom(true);return}
 const st=e.state||{};
 // Satu Back dari hasil pencarian menutup pencarian seperti tombol X.
 // Saat kembali dari detail, detailView masih terlihat sehingga hasil pencarian dipulihkan.
 if($("detailView").hidden && String($("search").value||"").trim() && st.view!=="search"){
  searchHistoryActive=false;
  $("search").value="";
  query="";
  syncSearchClear();
  if(activeBrand)showSections("products");else if(activeCat)showSections("brands");else showSections("cats");
  return;
 }
 if(st.view==="search")searchHistoryActive=true;
 if(st.view==="imageZoom"){closeImageZoom(true);return}
 if(st.view==="category"||st.view==="brand"){
  activeProduct=null;query="";$("search").value="";
  if(st.cat)chooseCategory(st.cat,false);
  if(st.view==="brand"&&st.brand)chooseBrand(st.brand,false);
  const savedTop=Math.max(0,Number(st.scroll)||0),savedLeft=Math.max(0,Number(st.scrollX)||0);
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({left:savedLeft,top:savedTop,behavior:"instant"})));
  return
 }
 if(st.view==="ad"){
  activeCat=null;activeBrand=null;activeProduct=null;query="";$("search").value="";syncSearchClear();const ad=banners.find(x=>String(x.id)===String(st.adId));const selected=ad?.target_product_ids?.length?items.filter(p=>ad.target_product_ids.includes(p.id)):[];showSections("search");$("searchHeading").textContent=ad?.title||"Produk pilihan";renderProductCards(selected,"searchResults");const savedTop=Math.max(0,Number(st.scroll)||0),savedLeft=Math.max(0,Number(st.scrollX)||0);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({left:savedLeft,top:savedTop,behavior:"instant"})));return
 }
 if(st.view==="search"){
  activeCat=null;activeBrand=null;activeProduct=null;
  query=String(st.query||"").toLowerCase().trim();
  $("search").value=st.query||"";
  syncSearchClear();
  // Keep the exact existing search-result DOM; do not run search() again.
  showSections("search");
  const savedTop=Math.max(0,Number(st.scroll)||0);
  const savedLeft=Math.max(0,Number(st.scrollX)||0);
  const restoreExactPosition=()=>{
   window.scrollTo({left:savedLeft,top:savedTop,behavior:"instant"});
  };
  requestAnimationFrame(()=>requestAnimationFrame(restoreExactPosition));
  return
 }
 if(st.view==="product"){
  let p=items.find(x=>x.slug===st.slug);
  if(p)renderDetail(p,false);
  return
 }
 $("search").value="";query="";
 let u=new URL(location.href),slug=u.searchParams.get("produk"),cat=u.searchParams.get("kategori"),brand=u.searchParams.get("brand");
 if(slug){let p=items.find(x=>x.slug===slug);if(p)renderDetail(p,false)}
 else if(cat){chooseCategory(cat,false);if(brand)chooseBrand(brand,false)}
 else {
  routeHome(false,true);
  const savedTop=Math.max(0,Number(st.scroll)||0),savedLeft=Math.max(0,Number(st.scrollX)||0);
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({left:savedLeft,top:savedTop,behavior:"instant"})));
 }
});
document.addEventListener("DOMContentLoaded",()=>{if(!$("categories"))return;$("year").textContent=new Date().getFullYear();document.querySelectorAll("[data-home]").forEach(a=>a.onclick=e=>{e.preventDefault();routeHome();$("shop").scrollIntoView({behavior:"smooth"})});$("menuBtn").onclick=()=>$("menuPanel").hidden=!$("menuPanel").hidden;$("menuClose").onclick=()=>$("menuPanel").hidden=true;$("loginToggle").onclick=()=>$("loginInline").hidden=!$("loginInline").hidden;$("loginInline").onsubmit=async e=>{e.preventDefault();if(!valid())return toast("Database belum dikonfigurasi");let {error}=await db.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});if(error)return toast(error.message);location.href="admin.html"};$("cartOpen").onclick=()=>$("cartModal").hidden=false;$("search").oninput=e=>search(e.target.value);$("search").onsearch=e=>search(e.target.value);$("clearSearch").onclick=()=>{if(searchHistoryActive&&history.state?.view==="search"){history.back();return;}$("search").value="";query="";searchHistoryActive=false;search("");syncSearchClear();};syncSearchClear();$("sort").onchange=e=>{sort=e.target.value;if(activeBrand)renderProductCards(items.filter(p=>p.brand_id===activeBrand.id&&(p.category_id===activeCat?.id||!p.category_id)));};$("backCategory").onclick=()=>history.state?.view==="brand"?history.back():returnToCategories();$("backBrand").onclick=()=>history.back();$("detailBack").onclick=()=>history.back();$("zoomClose").onclick=closeImageZoom;$("imageZoom").onclick=e=>{if(e.target===$("imageZoom"))closeImageZoom()};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeImageZoom()});$("shareDetail").onclick=shareProduct;$("waCheckout").onclick=()=>checkout("whatsapp");$("webCheckout").onclick=()=>checkout("website");document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).hidden=true);document.querySelectorAll(".overlay").forEach(m=>m.onclick=e=>{if(e.target===m)m.hidden=true});renderBasket();load()});
