'use strict';

/* ============================================================
   1. SUPABASE INITIALISATION
   ============================================================ */
const SUPABASE_URL    = 'https://wlgytgwmmefwpljstque.supabase.co';
const SUPABASE_KEY    = 'sb_publishable_fFampYvNGSn7TE0TOy56dQ_xXrer_P8';
const RAZORPAY_KEY    = 'rzp_live_SRZMbmo0aTi8xs';
const IMGBB_KEY       = '3949e4873d8510691ee63026d22eeb75';
const SUPPORT_WA      = '918982296773';
const SUPPORT_EMAIL   = 'outfitkartpremiumfashion@gmail.com';
const SAFE_DELIVERY_URL = 'https://ltl.sh/y_nZrAV3';
const INSTAGRAM_URL   = 'https://www.instagram.com/outfitkart_ecommers?igsh=MWUwNTNzczI4YjZsdw==';
const TELEGRAM_CHANNEL = 'https://t.me/outfitkart';
const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VbCiSs06GcGJpToxKd3z';

const AUTHORIZED_ADMINS = [
    { mobile: '9343988416', name: 'Shailesh Kumar Chauhan', email: 'shailu@gmail.com' },
    { mobile: '7879245954', name: 'Aman Kumar Chauhan',    email: 'udaipurihacg@gmail.com' },
];
function isAuthorizedAdmin(user) {
    if (!user) return false;
    return AUTHORIZED_ADMINS.some(a => a.mobile === String(user.mobile).trim());
}
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
dbClient.from('products').select('count').limit(1)
    .then(({ error }) => updateNetworkStatus(error ? 'error' : 'connected', error?.message || ''))
    .catch(() => updateNetworkStatus('offline'));
function updateNetworkStatus(status, details = '') {
    const dot = document.getElementById('supabase-status-dot');
    if (!dot) return;
    dot.className = `w-2.5 h-2.5 rounded-full ml-1 animate-pulse ${status==='connected'?'bg-green-500':status==='connecting'?'bg-yellow-500':'bg-red-500'}`;
    dot.title = `Supabase: ${status}${details?' – '+details:''}`;
}

/* ============================================================
   2. GLOBAL STATE
   ============================================================ */
let products=[], cart=[], currentView='home', wishlist=[], ordersDb=[], currentUser=null;
let globalSortOrder='default', currentCategoryFilter=null, currentSubFilter=null;
let currentCheckoutItems=[], viewingProductId=null, selectedSize='M', currentCheckoutStep=1;
let selectedPaymentMethod='upi', addressFormData={}, quickSizeModalProduct=null, quickSelectedSize=null;
let realtimeChannel=null, currentTrackingOrder=null, currentRating=5, deferredPrompt=null;
let walletBalance=0, isAdminLoggedIn=false, isExchangeProcess=false, exchangeSourceOrder=null;
let exchangeOldPrice=0, _pendingCancelOrderId=null, activeReferralCode=null, adminPressTimer=null;
// Promo code state
let activePromoCode=null, promoDiscount=0;
// Gold state
let goldCurrentGender='Men', goldCurrentSub=null, _goldRotateTimer=null;
let goldProducts=[];

/* ============================================================
   3. CONSTANTS
   ============================================================ */
const CATEGORIES = [
    {
        id:'men', name:'Men',
        photo:'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=120&h=120&fit=crop&q=80',
        subs:['T-Shirts','Casual Shirts','Formal Shirts','Oversized Tees','Oversized Shirts','Hoodies','Denim Jacket','Baggy Jeans','Straight Fit Jeans','Slim Fit Jeans','Cotton Trousers','Joggers','Cargo Pants','Formal Pant','Trousers','Sneakers','Formal Shoes','Sports Shoes','Sandals','Slippers','Watches','Earbuds','Wallets','Sunglasses','Belts','Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)','Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)','Ethnic Combo (Kurta+Pant Set)','Sherwani Set (Sherwani+Pant Set)','Nehru Jacket Combo'],
        groups:[
            {label:'👕 Topwear',items:['T-Shirts','Casual Shirts','Formal Shirts','Oversized Tees','Oversized Shirts','Hoodies','Denim Jacket']},
            {label:'👖 Bottomwear',items:['Baggy Jeans','Straight Fit Jeans','Slim Fit Jeans','Cotton Trousers','Joggers','Cargo Pants','Formal Pant','Trousers']},
            {label:'👟 Footwear',items:['Sneakers','Formal Shoes','Sports Shoes','Sandals','Slippers']},
            {label:'⌚ Accessories',items:['Watches','Earbuds','Wallets','Sunglasses','Belts']},
            {label:'🎁 Full Combos',items:['Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)','Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)','Ethnic Combo (Kurta+Pant+Dupatta)','Sherwani Set (Sherwani+Pant+Dupatta)','Nehru Jacket Combo']},
        ]
    },
    {
        id:'women', name:'Women',
        photo:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop&q=80',
        subs:['Sarees','Kurtis','Salwar Suits','Lehengas','Tops','Straight Fit Jeans','Baggy Jeans','Cargo Jeans','Skinny Fit Jeans','Slim Fit Jeans','Palazzo','Tops & Tunics','Dresses','Skirts','Heels','Flats','Sandals','Sneakers','Wedges','Jewellery Sets','Earrings','Bangles','Handbags','Sunglasses','Watches','Necklace Sets','Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)','Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)'],
        groups:[
            {label:'🥻 Ethnic',items:['Sarees','Kurtis','Salwar Suits','Lehengas']},
            {label:'👖 Jeans',items:['Straight Fit Jeans','Baggy Jeans','Cargo Jeans','Skinny Fit Jeans','Slim Fit Jeans']},
            {label:'👗 Western',items:['Tops','Palazzo','Tops & Tunics','Dresses','Skirts']},
            {label:'👠 Footwear',items:['Heels','Flats','Sandals','Sneakers','Wedges']},
            {label:'💍 Jewellery',items:['Necklace Sets','Earrings','Bangles']},
            {label:'👜 Accessories',items:['Jewellery Sets','Handbags','Sunglasses','Watches']},
            {label:'🎁 Full Combos',items:['Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)','Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)']},
        ]
    },
    {
        id:'Perfumes', name:'Perfumes',
        photo:'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=120&h=120&fit=crop&q=80',
        subs:["Men's Perfume","Women's Perfume","Unisex Perfume","Luxury Perfume","Budget Perfume","Attar / Ittar","Body Mist","Deodorant Spray","Gift Set"],
        groups:[
            {label:'🌸 For Her',items:["Women's Perfume","Body Mist","Gift Set"]},
            {label:'💼 For Him',items:["Men's Perfume","Attar / Ittar","Deodorant Spray"]},
            {label:'✨ Unisex',items:["Unisex Perfume","Luxury Perfume","Budget Perfume"]},
        ],
        sizesType:'ml', mlSizes:['10ml','20ml','30ml','50ml','75ml','100ml','150ml','200ml','250ml'],
    },
    {
        id:'accessories', name:'Accessories',
        photo:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120&h=120&fit=crop&q=80',
        subs:['Sunglasses','Watches','Wallets','Bags','Belts','Caps','Chains','Bracelets','Socks','Handbags','Clutches','Earrings','Necklace Sets','Bangles','Hair Accessories','Scrunchies','Unisex Sunglasses','Earbuds','Power Banks','Phone Cases','Backpacks'],
        groups:[
            {label:"👨 Men's Accessories",items:['Sunglasses','Watches','Wallets','Bags','Belts','Caps','Chains','Bracelets','Socks']},
            {label:"👩 Women's Accessories",items:['Handbags','Clutches','Earrings','Necklace Sets','Bangles','Bracelets','Hair Accessories','Scrunchies','Socks','Belts']},
            {label:'✨ Unisex & Tech',items:['Unisex Sunglasses','Earbuds','Power Banks','Phone Cases','Backpacks']},
        ]
    },
];

const GOLD_SUBCATS = {
    Men:   ['Topwear','Bottomwear','Footwear'],
    Women: ['Topwear','Bottomwear','Footwear'],
};

function isPerfumeCategory(cat){return String(cat||'').toLowerCase()==='perfumes';}
const PERFUME_ML_SIZES=['5ml','10ml','15ml','20ml','25ml','30ml','50ml','75ml','100ml','150ml','200ml','250ml','500ml'];
const COMBO_SUBS=new Set(['Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)','Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)','Ethnic Combo (Kurta+Pant+Dupatta)','Sherwani Set (Sherwani+Pant+Dupatta)','Nehru Jacket Combo','Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)','Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)']);
const STATUS_MAP={'Processing':['ordered'],'Packed':['ordered','packed'],'Shipped':['ordered','packed','shipped'],'Delivered':['ordered','packed','shipped','delivered'],'Exchange Requested':['ex-requested'],'Exchange Processing':['ex-requested','ex-processing'],'Exchange Shipped':['ex-requested','ex-processing','ex-shipped'],'Exchanged':['ex-requested','ex-processing','ex-shipped','ex-done'],'Cancelled':[]};
const ALL_ORDER_STATUSES=['Processing','Packed','Shipped','Delivered','Cancelled','Exchange Requested','Exchange Processing','Exchange Shipped','Exchanged'];
const STATUS_BADGE={'Processing':'bg-yellow-100 text-yellow-700','Packed':'bg-blue-100 text-blue-700','Shipped':'bg-purple-100 text-purple-700','Delivered':'bg-green-100 text-green-700','Cancelled':'bg-red-100 text-red-600','Exchange Requested':'bg-orange-100 text-orange-600','Exchange Processing':'bg-orange-200 text-orange-700','Exchanged':'bg-teal-100 text-teal-700'};

function getReferralTableSQL(){return `-- Run in Supabase SQL Editor:\nCREATE TABLE IF NOT EXISTS public.referrals (\n  id              BIGSERIAL PRIMARY KEY,\n  referrer_mobile TEXT NOT NULL,\n  buyer_mobile    TEXT NOT NULL,\n  order_id        TEXT NOT NULL,\n  order_total     NUMERIC DEFAULT 0,\n  commission      NUMERIC DEFAULT 0,\n  status          TEXT DEFAULT 'pending',\n  date            TEXT,\n  referral_code   TEXT,\n  confirmed_at    TIMESTAMPTZ\n);\nALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "allow_all" ON public.referrals USING (true) WITH CHECK (true);`;}

function getGoldTableSQL(){return `-- OutfitKart Gold SQL (Run in Supabase SQL Editor):
CREATE TABLE IF NOT EXISTS public.gold_products (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  price           NUMERIC NOT NULL,
  oldprice        NUMERIC,
  category        TEXT DEFAULT 'Men',
  sub             TEXT DEFAULT 'Topwear',
  brand           TEXT,
  description     TEXT,
  imgs            JSONB DEFAULT '[]',
  img             TEXT,
  available_sizes JSONB DEFAULT '[]',
  stock_qty       INTEGER DEFAULT 50,
  supplier_price  NUMERIC,
  supplier_url    TEXT,
  margin_amt      NUMERIC DEFAULT 0,
  istrending      BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.gold_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON public.gold_products FOR SELECT USING (true);
CREATE POLICY "admin_write" ON public.gold_products FOR ALL USING (true) WITH CHECK (true);

-- Promo codes table:
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  discount    NUMERIC NOT NULL,
  type        TEXT DEFAULT 'flat',
  min_order   NUMERIC DEFAULT 0,
  max_uses    INTEGER DEFAULT 100,
  used_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.promo_codes USING (true) WITH CHECK (true);`;}

const TRANSLATIONS = {
    hi: { home:'होम', shop:'खरीदारी', cart:'कार्ट', login:'लॉगिन', gold:'गोल्ड', add_to_cart:'कार्ट में डालें', buy_now:'अभी खरीदें', size_select:'साइज़ चुनें', volume_select:'मात्रा चुनें (ML)', cod_available:'कैश ऑन डिलीवरी', safe_delivery:'सुरक्षित डिलीवरी!', safe_delivery_sub:'डिलीवरी मानक देखें →', safe_delivery_btn:'देखें', off:'% की छूट', in_stock:'स्टॉक में', your_cart:'आपका कार्ट', checkout_now:'चेकआउट करें', cart_empty:'कार्ट खाली है', continue_shopping:'जारी रखें', referral_code:'आपका रेफरल कोड', earn_5pct:'हर रेफरल पर 5% कमाएं!', pending_for_referrer:'रेफरर के लिए पेंडिंग', new_referral_commission:'नया कमीशन जुड़ा!', referral_confirmed:'रेफरल कन्फर्म!', track_order:'ऑर्डर ट्रैक करें', cancel_order:'ऑर्डर रद्द करें', exchange:'एक्सचेंज', order_placed:'ऑर्डर हो गया! 🎉', address:'पता', order_summary:'ऑर्डर सारांश', payment:'भुगतान', place_order:'ऑर्डर दें', upi_payment:'UPI भुगतान', cod:'कैश ऑन डिलीवरी', wallet:'वॉलेट', welcome:'स्वागत है!', logout:'लॉगआउट', search_placeholder:'कपड़े, परफ्यूम खोजें...', trending:'ट्रेंडिंग फिट्स', shop_by_cat:'केटेगरी से खरीदें', recently_viewed:'हाल में देखा', similar_products:'मिलते-जुलते प्रोडक्ट', write_review:'रिव्यू लिखें', submit:'सबमिट करें' },
    en: { home:'Home', shop:'Shop', cart:'Cart', login:'Login', gold:'Gold', add_to_cart:'Add to Cart', buy_now:'Buy Now', size_select:'Select Size', volume_select:'Select Volume (ML)', cod_available:'Cash on Delivery', safe_delivery:'Safe Delivery Proof!', safe_delivery_sub:'Click to know Delivery Safety →', safe_delivery_btn:'View', off:'% Off', in_stock:'In Stock', your_cart:'Your Cart', checkout_now:'Checkout Now', cart_empty:'Your cart is empty', continue_shopping:'Continue Shopping', referral_code:'Your Referral Code', earn_5pct:'Earn 5% on every referral!', pending_for_referrer:'pending for referrer', new_referral_commission:'New referral commission added!', referral_confirmed:'Referral confirmed & added to wallet!', track_order:'Track Order', cancel_order:'Cancel Order', exchange:'Exchange', order_placed:'Order Placed! 🎉', address:'Address', order_summary:'Order Summary', payment:'Payment', place_order:'Place Order', upi_payment:'UPI Payment', cod:'Cash on Delivery', wallet:'OutfitKart Wallet', welcome:'Welcome!', logout:'Logout', search_placeholder:'Search clothes, perfumes...', trending:'Trending Fits', shop_by_cat:'Shop by Category', recently_viewed:'Recently Viewed', similar_products:'Similar Products', write_review:'Write a Review', submit:'Submit' }
};
let _currentLang = localStorage.getItem('outfitkart_lang') || 'en';
function i18n(key){return(TRANSLATIONS[_currentLang]||TRANSLATIONS['en'])[key]||key;}
function setLanguage(lang){_currentLang=lang;localStorage.setItem('outfitkart_lang',lang);applyLanguage();const btn=document.getElementById('lang-toggle-btn');if(btn)btn.textContent=lang==='hi'?'EN':'हि';showToast(lang==='hi'?'🇮🇳 हिंदी मोड चालू':'🇬🇧 English Mode On');}
function applyLanguage(){const t=TRANSLATIONS[_currentLang]||TRANSLATIONS['en'];document.querySelectorAll('#mobile-search,#desktop-search').forEach(el=>{if(el)el.placeholder=t.search_placeholder;});const navText=document.getElementById('nav-profile-text');if(navText&&!currentUser)navText.textContent=t.login;}
function _injectLangToggle(){if(document.getElementById('lang-toggle-btn'))return;const headerRight=document.querySelector('header .flex.items-center.gap-3');if(!headerRight)return;const btn=document.createElement('button');btn.id='lang-toggle-btn';btn.title='Switch Language';btn.textContent=_currentLang==='hi'?'EN':'हि';btn.style.cssText='width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#FF6B35,#C8102E);color:white;border:none;font-weight:900;font-size:11px;cursor:pointer;flex-shrink:0;box-shadow:0 2px 8px rgba(200,16,46,0.3);display:flex;align-items:center;justify-content:center;';btn.onclick=()=>setLanguage(_currentLang==='hi'?'en':'hi');headerRight.insertBefore(btn,headerRight.firstChild);}

function _injectSafeDeliveryButton(){const pdp=document.getElementById('pdp-container');if(!pdp||pdp.querySelector('.safe-delivery-section'))return;const actionGrid=pdp.querySelector('.grid.grid-cols-2.gap-3.mt-auto');if(!actionGrid)return;const section=document.createElement('div');section.className='safe-delivery-section';section.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border:1.5px solid #86EFAC;border-radius:12px;padding:10px 14px;margin-top:10px;';section.innerHTML=`<div style="flex:1"><p style="font-size:11px;font-weight:700;color:#15803D;margin:0;"><i class="fas fa-shield-check" style="margin-right:5px"></i>${i18n('safe_delivery')}</p><span style="font-size:10px;color:#166534;opacity:0.85">${i18n('safe_delivery_sub')}</span></div><a href="${SAFE_DELIVERY_URL}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#0a5c36,#0d7a47);color:white;font-size:11px;font-weight:700;padding:6px 12px;border-radius:999px;text-decoration:none;white-space:nowrap;">${i18n('safe_delivery_btn')}</a>`;actionGrid.insertAdjacentElement('afterend',section);}
function _enforceRedMrp(){document.querySelectorAll('.line-through').forEach(el=>{el.style.color='#C8102E';el.style.opacity='0.75';el.style.fontWeight='600';});}
const _mrpObserver=new MutationObserver(()=>requestAnimationFrame(_enforceRedMrp));
function _animateProductCards(){document.querySelectorAll('.product-card:not([data-anim])').forEach((card,i)=>{card.setAttribute('data-anim','1');card.style.opacity='0';card.style.transform='translateY(18px)';card.style.transition='none';requestAnimationFrame(()=>{setTimeout(()=>{card.style.transition='opacity 0.38s ease, transform 0.38s cubic-bezier(0.4,0,0.2,1)';card.style.opacity='1';card.style.transform='translateY(0)';},Math.min(i*35,400));});});}
const _cardObserver=new MutationObserver(()=>requestAnimationFrame(_animateProductCards));

document.addEventListener('DOMContentLoaded', async () => {
    captureReferralFromUrl();
    const saved=localStorage.getItem('outfitkart_session');
    if(saved){try{currentUser=JSON.parse(saved);await fetchUserData();}catch(e){localStorage.removeItem('outfitkart_session');currentUser=null;}}
    initCart();
    const adminSession=localStorage.getItem('outfitkart_admin_session');
    if(adminSession==='true'){isAdminLoggedIn=true;setTimeout(()=>navigate('admin'),500);}
    updateDropdownSubs('ap-category','ap-sub');
    renderCategoryBubbles();renderProductGrid('trending-grid',[],true);
    await fetchProducts();await fetchGoldProducts();checkAuthUI();
    const params=new URLSearchParams(window.location.search);const pid=params.get('pid');
    const isBackNav=performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward';
    if(pid&&!isBackNav)openProductPage(parseInt(pid));
    _setOgTags();setTimeout(_bannerInit,300);_initPwaInstall();_injectLangToggle();applyLanguage();
    _mrpObserver.observe(document.body,{childList:true,subtree:true});_enforceRedMrp();
    ['trending-grid','shop-grid','wishlist-container','recommended-products-grid','recently-viewed-grid'].forEach(id=>{const el=document.getElementById(id);if(el)_cardObserver.observe(el,{childList:true});});
    _animateProductCards();_startGoldRotation();
    console.log('%cOutfitKart ✅','color:#C8102E;font-weight:900;font-size:14px');
});

let _bannerCurrent=0;const _bannerTotal=4;let _bannerInterval=null,_bannerTouchX=0;
function _bannerInit(){_bannerApply(0);_bannerInterval=setInterval(nextBannerSlide,3500);const el=document.getElementById('banner-carousel');if(!el)return;el.addEventListener('touchstart',e=>{_bannerTouchX=e.touches[0].clientX;},{passive:true});el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-_bannerTouchX;if(Math.abs(dx)>45)dx<0?nextBannerSlide():prevBannerSlide();},{passive:true});}
function _bannerApply(idx){const slides=document.querySelectorAll('#banner-carousel .banner-slide');const dots=document.querySelectorAll('.banner-dot');if(!slides.length)return;slides.forEach((s,i)=>{s.style.opacity=i===idx?'1':'0';s.style.zIndex=i===idx?'1':'0';});dots.forEach((d,i)=>{if(!d)return;d.style.width=i===idx?'1.5rem':'0.5rem';d.style.opacity=i===idx?'1':'0.4';});_bannerCurrent=idx;}
function goBannerSlide(idx){_bannerApply(idx);clearInterval(_bannerInterval);_bannerInterval=setInterval(nextBannerSlide,3500);}
function nextBannerSlide(){_bannerApply((_bannerCurrent+1)%_bannerTotal);}
function prevBannerSlide(){_bannerApply((_bannerCurrent-1+_bannerTotal)%_bannerTotal);}

const ADMIN_AUTHORIZED_MOBILES=['9343988416','7879245954'];
function startAdminTimer(){adminPressTimer=setTimeout(()=>{if(isAdminLoggedIn){navigate('admin');return;}showAdminLogin();},3000);}
function cancelAdminTimer(){clearTimeout(adminPressTimer);}
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='a'){e.preventDefault();if(isAdminLoggedIn){navigate('admin');return;}showAdminLogin();}});

/* ============================================================
   PROMO CODE SYSTEM
   ============================================================ */
async function applyPromoCode(codeVal) {
    const code = (codeVal || document.getElementById('promo-code-input')?.value || '').trim().toUpperCase();
    if (!code) return showToast('Promo code enter karo');
    try {
        const { data, error } = await dbClient.from('promo_codes').select('*').eq('code', code).eq('is_active', true).maybeSingle();
        if (error) throw error;
        if (!data) { showToast('❌ Invalid promo code!'); return false; }
        const now = new Date();
        if (new Date(data.expires_at) < now) { showToast('❌ Promo code expired!'); return false; }
        if (data.used_count >= data.max_uses) { showToast('❌ Promo code limit reached!'); return false; }
        activePromoCode = data;
        promoDiscount = data.discount;
        showToast(`🎉 Promo applied! ₹${data.discount} discount!`);
        updateCheckoutTotals();
        // Re-render promo section
        const promoArea = document.getElementById('promo-section-container');
        if (promoArea) promoArea.innerHTML = _promoAppliedHtml();
        return true;
    } catch (err) { showToast('Error: ' + err.message); return false; }
}

function removePromoCode() {
    activePromoCode = null; promoDiscount = 0;
    const promoArea = document.getElementById('promo-section-container');
    if (promoArea) promoArea.innerHTML = _promoInputHtml();
    showToast('Promo code removed');
    updateCheckoutTotals();
}

async function _incrementPromoUsage() {
    if (!activePromoCode) return;
    try { await dbClient.from('promo_codes').update({ used_count: (activePromoCode.used_count || 0) + 1 }).eq('code', activePromoCode.code); } catch {}
}

function _promoInputHtml() {
    return `<div class="flex gap-2">
        <input type="text" id="promo-code-input" placeholder="Enter promo code" class="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold uppercase focus:ring-2 focus:ring-rose-400 outline-none" style="letter-spacing:0.06em;">
        <button onclick="applyPromoCode()" class="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-700 active:scale-95 transition-all whitespace-nowrap">Apply</button>
    </div>
    <div class="flex gap-2 mt-2">
        <a href="${TELEGRAM_CHANNEL}" target="_blank" rel="noopener" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white active:scale-95" style="background:linear-gradient(135deg,#0088cc,#00b0f4)"><i class="fab fa-telegram text-sm"></i> Get Code on Telegram</a>
        <a href="${WHATSAPP_CHANNEL}" target="_blank" rel="noopener" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white active:scale-95" style="background:linear-gradient(135deg,#25D366,#128C7E)"><i class="fab fa-whatsapp text-sm"></i> Get Code on WhatsApp</a>
    </div>`;
}

function _promoAppliedHtml() {
    if (!activePromoCode) return _promoInputHtml();
    return `<div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><i class="fas fa-tag text-green-600 text-xs"></i></div>
            <div><div class="font-black text-sm text-green-800 tracking-wider">${activePromoCode.code}</div><div class="text-xs text-green-600">₹${promoDiscount} discount applied! 🎉</div></div>
        </div>
        <button onclick="removePromoCode()" class="text-red-500 text-xs font-bold hover:text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg"><i class="fas fa-times mr-1"></i>Remove</button>
    </div>`;
}

function _renderPromoSection() {
    return `<div class="bg-white p-4 rounded-xl shadow-sm border mb-3">
        <h4 class="font-bold text-sm mb-3 flex items-center gap-2"><i class="fas fa-tag text-rose-500"></i> Promo Code</h4>
        <div id="promo-section-container">${activePromoCode ? _promoAppliedHtml() : _promoInputHtml()}</div>
    </div>`;
}

/* ============================================================
   REFERRAL
   ============================================================ */
function captureReferralFromUrl(){const params=new URLSearchParams(window.location.search);const ref=params.get('ref');if(ref&&ref.length>=4){activeReferralCode=ref.toUpperCase();localStorage.setItem('outfitkart_active_referral',activeReferralCode);}else{const stored=localStorage.getItem('outfitkart_active_referral');if(stored)activeReferralCode=stored;}}
function generateReferralCode(name,mobile){const u=(name||'USER').toUpperCase().replace(/[^A-Z]/g,'');return u.substring(0,4).padEnd(4,'X')+String(mobile).slice(-3);}
async function loadUserReferralCode(){if(!currentUser)return;const codeEl=document.getElementById('user-referral-code');try{const{data,error}=await dbClient.from('users').select('referral_code, name').eq('mobile',currentUser.mobile).single();if(error)throw error;let refCode=data?.referral_code;if(!refCode){refCode=generateReferralCode(data?.name||currentUser.name,currentUser.mobile);await dbClient.from('users').update({referral_code:refCode}).eq('mobile',currentUser.mobile);}if(codeEl)codeEl.textContent=refCode;currentUser.referral_code=refCode;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));}catch(err){const fallback=generateReferralCode(currentUser.name,currentUser.mobile);if(codeEl)codeEl.textContent=fallback;}renderSidebarReferralWidget();}
async function copyReferralCode(){const codeEl=document.getElementById('user-referral-code'),sidebarEl=document.getElementById('sidebar-referral-code');let code=(codeEl?.textContent||sidebarEl?.textContent||'').trim();if(!code||code==='LOADING...'){if(currentUser){code=currentUser.referral_code||generateReferralCode(currentUser.name,currentUser.mobile);}else{showToast('Login karein pehle!');return;}}try{await navigator.clipboard.writeText(code);}catch{const ta=document.createElement('textarea');ta.value=code;ta.style.cssText='position:fixed;opacity:0;top:0;left:0;';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch{}document.body.removeChild(ta);}showToast(`✅ Code copied: ${code}`);}
async function shareWithReferral(productId,productName,price){if(!currentUser){showToast('Login to share!');return;}const code=currentUser.referral_code||generateReferralCode(currentUser.name,currentUser.mobile);const baseUrl=window.location.origin+window.location.pathname;const url=productId?`${baseUrl}?pid=${productId}&ref=${code}`:`${baseUrl}?ref=${code}`;const text=productId?`🛍️ Check out ${productName} for ₹${price} on OutfitKart! COD available.`:`🛍️ Shop premium fashion on OutfitKart! Amazing deals, COD available.`;if(navigator.share){try{await navigator.share({title:'OutfitKart',text,url});}catch{}}else{try{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('Referral link copied! 📋');}catch{window.open(`https://wa.me/?text=${encodeURIComponent(text+'\n'+url)}`,'_blank');}}}
async function recordReferralPurchase(orderId,orderTotal){if(!activeReferralCode||!currentUser)return;if(activeReferralCode.toUpperCase()===(currentUser.referral_code||'').toUpperCase()){localStorage.removeItem('outfitkart_active_referral');activeReferralCode=null;return;}try{const{data:referrer}=await dbClient.from('users').select('mobile,name,referral_code').eq('referral_code',activeReferralCode.toUpperCase()).maybeSingle();if(!referrer||referrer.mobile===currentUser.mobile)return;const commission=Math.round(orderTotal*0.05);if(commission<1)return;const payload1={referrer_mobile:referrer.mobile,buyer_mobile:currentUser.mobile,order_id:String(orderId),order_total:orderTotal,commission_amount:commission,status:'pending',created_at:new Date().toISOString(),referral_code:activeReferralCode.toUpperCase()};const{error:e1}=await dbClient.from('referrals').insert([payload1]);if(e1){const payload2={referrer_mobile:referrer.mobile,buyer_mobile:currentUser.mobile,order_id:String(orderId),order_total:orderTotal,commission,status:'pending',date:new Date().toLocaleDateString('en-IN'),referral_code:activeReferralCode.toUpperCase()};await dbClient.from('referrals').insert([payload2]);}showToast(`🎁 Referral recorded! ₹${commission} ${i18n('pending_for_referrer')}`);localStorage.removeItem('outfitkart_active_referral');activeReferralCode=null;}catch(err){console.error('[Referral Error]:',err.message);}}
async function cancelReferralForOrder(orderId){if(!orderId)return;try{await dbClient.from('referrals').update({status:'cancelled'}).eq('order_id',String(orderId)).eq('status','pending');}catch{}}
async function loadReferrals(){if(!currentUser)return;const listIds=['referrals-pending-list','referrals-confirmed-list','referrals-cancelled-list'];listIds.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<div class="text-center py-6 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';});try{const{data:referrals,error}=await dbClient.from('referrals').select('*').eq('referrer_mobile',currentUser.mobile).order('id',{ascending:false});if(error)throw error;const all=referrals||[];const getC=(r)=>r.commission_amount||r.commission||0;const pending=all.filter(r=>r.status==='pending'),confirmed=all.filter(r=>r.status==='confirmed'),cancelled=all.filter(r=>r.status==='cancelled');const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};set('pending-earnings',`₹${pending.reduce((s,r)=>s+getC(r),0)}`);set('confirmed-earnings',`₹${confirmed.reduce((s,r)=>s+getC(r),0)}`);set('cancelled-earnings',`₹${cancelled.reduce((s,r)=>s+getC(r),0)}`);set('pending-count',pending.length);set('confirmed-count',confirmed.length);set('cancelled-count',cancelled.length);set('referral-earnings-badge',`₹${pending.reduce((s,r)=>s+getC(r),0)+confirmed.reduce((s,r)=>s+getC(r),0)}`);renderReferralList('referrals-pending-list',pending,'pending');renderReferralList('referrals-confirmed-list',confirmed,'confirmed');renderReferralList('referrals-cancelled-list',cancelled,'cancelled');_subscribeReferralRealtime();}catch(err){listIds.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=`<div class="text-center py-6 text-red-400 text-sm">${err.message}</div>`;});}}
let _referralChannel=null;
function _subscribeReferralRealtime(){if(!currentUser||_referralChannel)return;try{_referralChannel=dbClient.channel(`ref-${currentUser.mobile}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'referrals',filter:`referrer_mobile=eq.${currentUser.mobile}`},()=>{loadReferrals();showToast(`🎁 ${i18n('new_referral_commission')}`);}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'referrals',filter:`referrer_mobile=eq.${currentUser.mobile}`},payload=>{if(payload.new?.status==='confirmed')showToast(`✅ ₹${payload.new.commission_amount||payload.new.commission} ${i18n('referral_confirmed')}`);loadReferrals();}).subscribe();}catch{}}
function renderReferralList(containerId,items,type){const el=document.getElementById(containerId);if(!el)return;const getC=(r)=>r.commission_amount||r.commission||0;const EMPTY={pending:{icon:'fa-hourglass-half',msg:'No pending referrals',sub:'Share products to start earning!'},confirmed:{icon:'fa-check-circle',msg:'No confirmed earnings',sub:'Earnings appear after 30 days'},cancelled:{icon:'fa-times-circle',msg:'No cancelled referrals',sub:''}};const STYLE={pending:{badge:'bg-amber-100 text-amber-700',icon:'⏳',label:'Pending',amount:'text-amber-500'},confirmed:{badge:'bg-green-100 text-green-700',icon:'✅',label:'Confirmed',amount:'text-green-600'},cancelled:{badge:'bg-red-100 text-red-600',icon:'❌',label:'Cancelled',amount:'text-red-400 line-through'}};if(!items.length){const e=EMPTY[type];el.innerHTML=`<div class="text-center py-10 text-gray-400"><i class="fas ${e.icon} text-5xl mb-3"></i><p class="font-semibold">${e.msg}</p><p class="text-sm mt-1">${e.sub}</p></div>`;return;}const s=STYLE[type];el.innerHTML=items.map(r=>{const comm=getC(r),dateStr=r.date||r.created_at?.split('T')[0]||'—',buyerMobile=r.buyer_mobile||r.referee_mobile||'—';let daysInfo='';if(type==='pending')daysInfo=`<div class="text-xs text-blue-600 mt-1"><i class="fas fa-clock mr-1"></i>Confirms after 30 days</div>`;if(type==='confirmed'&&r.confirmed_at)daysInfo=`<div class="text-xs text-green-600 mt-1"><i class="fas fa-check mr-1"></i>Credited on ${new Date(r.confirmed_at).toLocaleDateString('en-IN')}</div>`;if(type==='cancelled')daysInfo=`<div class="text-xs text-red-500 mt-1"><i class="fas fa-ban mr-1"></i>Order cancelled</div>`;return `<div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all"><div class="flex justify-between items-start"><div class="flex-1 min-w-0"><div class="font-bold text-sm text-gray-800">Order #${r.order_id}</div><div class="text-xs text-gray-500 mt-0.5">Buyer: +91 ${buyerMobile}</div><div class="text-xs text-gray-500">Date: ${dateStr}</div><div class="text-xs text-gray-600 mt-1">Order Total: ₹${(r.order_total||0).toLocaleString()}</div>${daysInfo}</div><div class="text-right ml-3 flex-shrink-0"><div class="text-xl font-black ${s.amount}">${type==='cancelled'?'':'+'}₹${comm}</div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}">${s.icon} ${s.label}</span></div></div></div>`;}).join('');}
function switchReferralTab(tab){['pending','confirmed','cancelled'].forEach(t=>{const btn=document.getElementById(`btn-ref-${t}`),list=document.getElementById(`referrals-${t}-list`),isActive=t===tab;if(btn)btn.className=isActive?'pb-2 px-4 text-sm font-bold text-green-600 border-b-2 border-green-600 whitespace-nowrap':'pb-2 px-4 text-sm font-bold text-gray-500 hover:text-gray-700 whitespace-nowrap';if(list)list.classList.toggle('hidden',!isActive);});}
function renderSidebarReferralWidget(){const container=document.getElementById('sidebar-referral-widget');if(!container||!currentUser)return;const code=currentUser.referral_code||generateReferralCode(currentUser.name,currentUser.mobile);container.innerHTML=`<div class="px-3 pb-3 bg-gradient-to-br from-green-50 to-emerald-50 border-t border-green-100"><div class="mt-2 bg-white rounded-lg p-2.5 border border-dashed border-green-300"><p class="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">${i18n('referral_code')}</p><div class="flex items-center justify-between gap-2"><span class="text-lg font-black text-green-600 tracking-widest" id="sidebar-referral-code">${code}</span><button onclick="copyReferralCode()" class="bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg hover:bg-green-600 active:scale-95 transition-all whitespace-nowrap"><i class="fas fa-copy mr-0.5"></i> Copy</button></div><p class="text-[9px] text-gray-400 mt-1">${i18n('earn_5pct')}</p></div><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener" class="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg font-bold text-xs text-white active:scale-95 transition-all" style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)"><i class="fab fa-instagram text-sm"></i> Follow @OutfitKart</a></div>`;}
function updateHeaderWallet(balance){const el=document.getElementById('header-wallet-display'),pill=document.getElementById('header-wallet-pill');if(!el)return;if(balance>0){el.textContent='₹'+balance.toLocaleString();if(pill){pill.classList.remove('hidden');pill.classList.add('flex');}}else{if(pill){pill.classList.add('hidden');pill.classList.remove('flex');}}}

/* ============================================================
   CART
   ============================================================ */
function initCart(){loadCartLocal();updateCartCount();if(currentUser)syncCartFromDB();}
function loadCartLocal(){try{const saved=localStorage.getItem('outfitkart_cart');cart=saved?JSON.parse(saved):[];cart.forEach(i=>{if(!i.size)i.size='M';});}catch{cart=[];}}
function saveCartLocal(){localStorage.setItem('outfitkart_cart',JSON.stringify(cart.map(i=>({productId:i.productId,size:i.size,qty:i.qty}))));}
async function syncCartFromDB(){if(!currentUser)return;try{const{data}=await dbClient.from('cart').select('*').eq('mobile',currentUser.mobile);if(!data?.length)return;data.map(row=>({productId:row.product_id,qty:row.qty||1,size:row.size||'M'})).forEach(dbItem=>{const key=`${dbItem.productId}-${dbItem.size}`;const idx=cart.findIndex(i=>`${i.productId}-${i.size}`===key);if(idx===-1)cart.push(dbItem);else cart[idx].qty=dbItem.qty;});saveCartLocal();updateCartCount();}catch{}}
async function loadCartFromDB(){if(!currentUser){loadCartLocal();return;}try{const{data}=await dbClient.from('cart').select('*').eq('mobile',currentUser.mobile);cart=(data||[]).map(row=>({productId:row.product_id,qty:row.qty||1,size:row.size||'M'}));saveCartLocal();updateCartCount();}catch{loadCartLocal();}}
async function migrateLocalCartToDB(){if(!currentUser)return;let localCart=[];try{localCart=JSON.parse(localStorage.getItem('outfitkart_cart')||'[]');}catch{}if(!localCart.length){await loadCartFromDB();return;}for(const item of localCart){await _upsertCartItem(item.productId,item.size,item.qty);}await loadCartFromDB();}
async function _upsertCartItem(productId,size,qty){if(!currentUser)return;try{const{data:existing}=await dbClient.from('cart').select('id,qty').eq('mobile',currentUser.mobile).eq('product_id',productId).eq('size',size).maybeSingle();const pName=products.find(x=>x.id===productId)?.name||'';if(existing){await dbClient.from('cart').update({qty}).eq('id',existing.id);}else{await dbClient.from('cart').insert([{mobile:currentUser.mobile,product_id:productId,qty,size,name:pName}]);}}catch{}}
async function _removeCartItemDB(productId,size){if(!currentUser)return;try{await dbClient.from('cart').delete().eq('mobile',currentUser.mobile).eq('product_id',productId).eq('size',size);}catch{}}
async function clearCartDB(){if(!currentUser)return;try{await dbClient.from('cart').delete().eq('mobile',currentUser.mobile);}catch{}}
function saveCart(){saveCartLocal();}
window.addToCart=async function(productId,size){size=size||'M';const key=`${productId}-${size}`;const idx=cart.findIndex(i=>`${i.productId}-${i.size}`===key);if(idx>-1){cart[idx].qty+=1;showToast(`+1 ${size} added 🛒`);}else{cart.push({productId,size,qty:1});showToast(`${size} ${i18n('add_to_cart')} ✅`);}saveCartLocal();updateCartCount();if(currentUser)_upsertCartItem(productId,size,cart.find(i=>`${i.productId}-${i.size}`===key)?.qty||1);const sidebar=document.getElementById('cart-sidebar');if(sidebar&&!sidebar.classList.contains('translate-x-full'))renderCart();};
async function updateQty(productId,size,delta){const key=`${productId}-${size}`,idx=cart.findIndex(i=>`${i.productId}-${i.size}`===key);if(idx===-1)return;cart[idx].qty+=delta;if(cart[idx].qty<=0){cart.splice(idx,1);showToast('Removed 🗑️');if(currentUser)_removeCartItemDB(productId,size);}else{if(currentUser)_upsertCartItem(productId,size,cart[idx].qty);}saveCartLocal();updateCartCount();renderCart();}
async function removeFromCart(productId,size){cart=cart.filter(i=>`${i.productId}-${i.size}`!==`${productId}-${size}`);saveCartLocal();if(currentUser)_removeCartItemDB(productId,size);updateCartCount();renderCart();showToast('Removed 🗑️');}
function updateCartCount(){const total=cart.reduce((s,i)=>s+i.qty,0);['cart-count','mobile-cart-badge','tab-cart-count'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=total;});const badge=document.getElementById('mobile-cart-badge');if(badge)badge.classList.toggle('hidden',total===0);}
function renderCart(){
    const container=document.getElementById('cart-items'),totalEl=document.getElementById('cart-total-price');if(!container)return;
    if(!cart.length){container.innerHTML=`<div class="flex flex-col items-center justify-center py-20 text-center h-full"><div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-shopping-bag text-3xl text-gray-400"></i></div><h3 class="text-lg font-bold text-gray-800 mb-2">${i18n('cart_empty')}</h3><button onclick="toggleCart(); navigate('shop')" class="bg-rose-600 text-white px-8 py-2 rounded-lg font-bold text-sm">${i18n('continue_shopping')}</button></div>`;if(totalEl)totalEl.textContent='₹0';return;}
    let subtotal=0;
    container.innerHTML=cart.map(item=>{
        const p=products.find(x=>x.id===item.productId)||goldProducts.find(x=>x.id===item.productId);if(!p)return '';
        const img=p.imgs?.[0]||p.img||'https://placehold.co/80x80/eee/666?text=?';subtotal+=p.price*item.qty;
        const sizeLabel=isPerfumeCategory(p.category)?`Volume: ${item.size}`:`Size: ${item.size}`;
        return `<div class="bg-white rounded-xl shadow-sm border p-4"><div class="flex gap-3"><div class="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50"><img src="${img}" class="w-full h-full object-cover" alt="${p.name}" loading="lazy"></div><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm text-gray-900 truncate mb-1">${p.name}</h4><p class="text-xs text-blue-600 font-semibold mb-1">${sizeLabel}</p><div class="flex items-baseline gap-2 mb-2"><span class="text-lg font-black text-gray-900">₹${p.price}</span>${p.oldprice?`<span class="text-xs line-through font-semibold" style="color:#C8102E;opacity:0.7">₹${p.oldprice}</span>`:''}</div><div class="flex items-center justify-between"><div class="flex items-center bg-gray-100 rounded-lg p-1"><button onclick="updateQty(${item.productId},'${item.size}',-1)" class="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-rose-600 rounded font-bold text-sm">-</button><span class="w-8 text-center font-bold text-sm">${item.qty}</span><button onclick="updateQty(${item.productId},'${item.size}',1)" class="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-rose-600 rounded font-bold text-sm">+</button></div><button onclick="removeFromCart(${item.productId},'${item.size}')" class="text-rose-500 font-bold text-sm px-2 py-1 rounded hover:bg-rose-50"><i class="fas fa-trash-alt text-xs"></i></button></div></div></div></div>`;
    }).join('');
    if(totalEl)totalEl.textContent=`₹${subtotal.toLocaleString()}`;
}
function toggleCart(){const sidebar=document.getElementById('cart-sidebar'),overlay=document.getElementById('cart-overlay');const isOpen=!sidebar.classList.contains('translate-x-full');if(isOpen){sidebar.classList.add('translate-x-full');overlay.classList.add('hidden');}else{sidebar.classList.remove('translate-x-full');overlay.classList.remove('hidden');renderCart();}}

/* ============================================================
   QUICK SIZE MODAL
   ============================================================ */
function showQuickSizeModal(productId){
    const product=products.find(p=>p.id===productId)||goldProducts.find(p=>p.id===productId);if(!product)return showToast('Product not found');
    quickSizeModalProduct=productId;
    const isPerf=isPerfumeCategory(product.category);
    const sizes=isPerf?(product.available_sizes?.length?product.available_sizes:PERFUME_ML_SIZES):(product.available_sizes?.length?product.available_sizes:getDefaultSizes(product.sub||product.category));
    quickSelectedSize=sizes[0];
    const titleEl=document.querySelector('#quick-size-modal h3');if(titleEl)titleEl.textContent=isPerf?i18n('volume_select'):i18n('size_select');
    const grid=document.getElementById('quick-size-grid');
    if(isPerf){
        grid.innerHTML=`<div class="w-full space-y-3"><div class="flex flex-wrap gap-2" id="quick-vol-pills">${sizes.map(s=>`<button onclick="selectQuickSize('${s}')" class="size-btn px-4 py-1.5 rounded-full border-2 font-bold text-sm transition-all ${quickSelectedSize===s?'border-purple-600 bg-purple-600 text-white':'border-gray-200 text-gray-700'}">${s}</button>`).join('')}</div><div class="flex items-center border-2 border-purple-200 rounded-xl overflow-hidden focus-within:border-purple-500 bg-white"><span class="bg-purple-100 px-3 py-2.5 text-purple-700 font-black text-sm border-r border-purple-200 whitespace-nowrap">ml</span><input type="number" id="quick-custom-ml" placeholder="e.g. 45" min="1" max="2000" class="flex-1 px-3 py-2.5 text-sm font-bold outline-none" style="font-size:16px;" oninput="_onQuickMlInput(this.value)"></div></div>`;
    }else{
        grid.innerHTML=sizes.map(s=>`<button onclick="selectQuickSize('${s}')" class="size-btn px-5 py-2 rounded-xl border-2 font-bold text-sm transition-all ${quickSelectedSize===s?'border-rose-600 bg-rose-600 text-white':'border-gray-300'}">${s}</button>`).join('');
    }
    const modal=document.getElementById('quick-size-modal');modal.classList.remove('hidden');modal.classList.add('flex');
}
function _onQuickMlInput(val){if(!val||isNaN(val))return;quickSelectedSize=val+'ml';document.querySelectorAll('#quick-vol-pills .size-btn').forEach(btn=>{btn.classList.remove('border-purple-600','bg-purple-600','text-white');btn.classList.add('border-gray-200','text-gray-700');});}
function selectQuickSize(size){quickSelectedSize=size;const inp=document.getElementById('quick-custom-ml');if(inp)inp.value='';const isPerfPills=!!document.getElementById('quick-vol-pills');document.querySelectorAll('#quick-size-grid .size-btn, #quick-vol-pills .size-btn').forEach(btn=>{const m=btn.textContent.trim()===size;if(isPerfPills){btn.classList.toggle('border-purple-600',m);btn.classList.toggle('bg-purple-600',m);btn.classList.toggle('text-white',m);btn.classList.toggle('border-gray-200',!m);btn.classList.toggle('text-gray-700',!m);}else{btn.classList.toggle('border-rose-600',m);btn.classList.toggle('bg-rose-600',m);btn.classList.toggle('text-white',m);btn.classList.toggle('border-gray-300',!m);}});}
function addFromQuickModal(){if(quickSizeModalProduct&&quickSelectedSize){addToCart(quickSizeModalProduct,quickSelectedSize);hideQuickSizeModal();}}
function hideQuickSizeModal(){const modal=document.getElementById('quick-size-modal');modal.classList.add('hidden');modal.classList.remove('flex');quickSizeModalProduct=null;quickSelectedSize=null;}
function getDefaultSizes(subOrCat=''){const l=subOrCat.toLowerCase();if(l.includes('jean')||l.includes('pant')||l.includes('cargo')||l.includes('trouser'))return['24','26','28','30','32','34','36','38','40'];if(l.includes('sneak')||l.includes('heel')||l.includes('flat')||l.includes('shoe'))return['4','5','6','7','8','9','10','11','12'];return['XS','S','M','L','XL','XXL','3XL','4XL'];}

/* ============================================================
   GOLD PRODUCTS
   ============================================================ */
async function fetchGoldProducts(){
    try{
        const{data,error}=await dbClient.from('gold_products').select('*').eq('is_active',true).order('id',{ascending:false});
        if(error)throw error;
        // Map 'description' field to 'desc' for compatibility
        goldProducts=(data||[]).map(p=>({...p,desc:p.description||p.desc||''}));
        if(currentView==='gold')renderGoldGrid();
    }catch(err){console.error('[Gold fetch error]',err.message);}
}

async function fetchProducts(retry=0){try{const{data,error}=await dbClient.from('products').select('*');if(error)throw error;if(data&&data.length>0){products=data;updateProductCountBadge(products.length);renderProductGrid('trending-grid',products.filter(p=>p.istrending));if(!document.getElementById('view-shop').classList.contains('hidden'))renderShopProducts();if(currentView==='gold')renderGoldGrid();const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;}else{products=[];goldProducts=[];renderProductGrid('trending-grid',[]);updateProductCountBadge(0,'empty');}}catch(err){if(retry<3){await new Promise(r=>setTimeout(r,2000));return fetchProducts(retry+1);}updateProductCountBadge(0,'error');}}
function updateProductCountBadge(count,status='live'){const el=document.getElementById('products-count');if(!el)return;if(status==='error'){el.textContent='!';el.className='absolute -top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm';}else if(status==='empty'){el.textContent='0';el.className='absolute -top-1 right-1 bg-gray-400 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm';}else{el.textContent=count>99?'99+':count;el.className='absolute -top-1 right-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm';}}

function createProductCard(p,forceGold=false){
    try{
        const inWishlist=wishlist.includes(p.id);
        const img=p.imgs?.[0]||p.img||'https://placehold.co/300x400/e11d48/ffffff?text=OutfitKart';
        const hasDiscount=p.oldprice&&p.oldprice>p.price;
        const discPct=hasDiscount?Math.round(((p.oldprice-p.price)/p.oldprice)*100):0;
        const isPerf=isPerfumeCategory(p.category);
        const sizes=isPerf?(p.available_sizes?.length?p.available_sizes:PERFUME_ML_SIZES):(p.available_sizes||getDefaultSizes(p.sub||p.category));
        const isCombo=COMBO_SUBS.has(p.sub||'');
        const isGold=p.is_gold||forceGold;
        const sizeLabel=isPerf?`Vol: ${sizes.slice(0,3).join(' · ')}${sizes.length>3?' +more':''}`:`Sizes: ${sizes.slice(0,3).join(' · ')}${sizes.length>3?' +more':''}`;
        let topLeftBadge='';
        if(isGold){topLeftBadge=`<div class="absolute top-2 left-2 z-20 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md" style="background:linear-gradient(135deg,#C9A84C,#F5E6C0);color:#3d2c00;border:1px solid rgba(201,168,76,0.5);">⭐ GOLD</div>`;}
        else if(hasDiscount){topLeftBadge=`<div class="absolute top-2 left-2 z-20 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">${discPct}${i18n('off')}</div>`;}
        return `<div class="product-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col cursor-pointer hover:shadow-md transition-shadow" onclick="openProductPage(${p.id},${!!isGold})">
        <button class="absolute top-2 right-2 z-20 ${inWishlist?'text-rose-500':'text-gray-300'} hover:text-rose-600 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center shadow border transition-all" onclick="event.stopPropagation(); toggleWishlist(${p.id})"><i class="${inWishlist?'fas':'far'} fa-heart text-sm"></i></button>
        <button class="absolute top-12 right-2 z-20 text-gray-400 hover:text-rose-600 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center shadow border transition-all" onclick="event.stopPropagation(); showQuickSizeModal(${p.id})"><i class="fas fa-cart-plus text-sm"></i></button>
        ${topLeftBadge}
        ${isCombo&&!isGold?'<div class="absolute z-20 bg-amber-400 text-gray-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-md" style="bottom:76px;left:8px">🎁 Full Combo</div>':''}
        ${isPerf&&!isGold?'<div class="absolute z-20 bg-purple-100 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-full" style="bottom:76px;left:8px">🌸 Perfume</div>':''}
        <div class="overflow-hidden bg-gray-50"><img src="${img}" loading="lazy" class="w-full h-48 md:h-52 object-cover hover:scale-[1.05] transition-transform duration-500" alt="${p.name}" onerror="this.src='https://placehold.co/300x400/f8fafc/94a3b8?text=OutfitKart'"></div>
        <div class="p-3 flex flex-col flex-grow">
            ${p.brand?`<div class="text-[10px] font-black uppercase tracking-wider mb-0.5" style="color:${isGold?'#B8860B':'#e11d48'}">${p.brand}</div>`:''}
            <h4 class="text-sm font-semibold leading-snug line-clamp-2 text-gray-900 mb-1" style="min-height:2.4rem">${p.name}</h4>
            ${sizes.length?`<p class="text-[10px] text-blue-500 font-semibold mb-1">${sizeLabel}</p>`:''}
            <div class="mt-auto pt-2 border-t border-gray-100">
                <div class="flex items-baseline gap-1.5 mb-1.5">
                    <span class="font-black text-base text-gray-900">₹${p.price?.toLocaleString('en-IN')}</span>
                    ${hasDiscount&&!isGold?`<span class="text-xs line-through font-semibold" style="color:#C8102E;opacity:0.75">₹${p.oldprice}</span><span class="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">${discPct}% off</span>`:''}
                    ${isGold&&hasDiscount?`<span class="text-xs line-through font-semibold" style="color:#C8102E;opacity:0.75">₹${p.oldprice}</span>`:''}
                </div>
                <span class="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fas fa-truck text-[8px]"></i> ${i18n('cod_available')}</span>
            </div>
        </div>
        </div>`;
    }catch(e){return '';}
}

function renderProductGrid(containerId,list,loading=false){
    const el=document.getElementById(containerId);if(!el)return;
    if(loading){el.innerHTML=`<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-rose-500 mb-4"></i><p class="text-lg font-semibold text-gray-700">Loading...</p></div>`;return;}
    if(!list||list.length===0){el.innerHTML=`<div class="col-span-full text-center py-12 bg-blue-50 border-2 border-blue-200 rounded-xl"><i class="fas fa-inbox text-5xl text-blue-500 mb-4"></i><h3 class="text-xl font-bold text-blue-800 mb-2">No Products Found</h3><button onclick="fetchProducts()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold mr-2">🔄 Refresh</button></div>`;return;}
    el.innerHTML=list.map(p=>createProductCard(p)).join('');
    requestAnimationFrame(_animateProductCards);requestAnimationFrame(_enforceRedMrp);
}

function renderCategoryBubbles(){
    const container=document.getElementById('category-bubbles');if(!container)return;
    let html=CATEGORIES.map(c=>`<div class="flex flex-col items-center gap-2 cursor-pointer min-w-[72px] active:scale-95 transition-transform" onclick="openCategoryPage('${c.name}')">
        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md hover:scale-110 transition-transform flex-shrink-0" style="box-shadow:0 4px 12px rgba(0,0,0,0.15)">
            <img src="${c.photo}" alt="${c.name}" class="w-full h-full object-cover" loading="lazy" onerror="this.parentNode.innerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e11d48,#be123c);color:white;font-size:1.5rem;\'>👗</div>'">
        </div>
        <span class="text-xs font-semibold text-gray-700 whitespace-nowrap">${c.name}</span>
    </div>`).join('');
    html+=`<div class="flex flex-col items-center gap-2 cursor-pointer min-w-[72px] active:scale-95 transition-transform" onclick="navigate('gold')">
        <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl hover:scale-110 transition-transform flex-shrink-0" style="background:linear-gradient(135deg,#1a0800,#3d2c00,#C9A84C);border:2.5px solid #C9A84C;box-shadow:0 4px 16px rgba(201,168,76,0.5);">⭐</div>
        <span class="text-xs font-bold whitespace-nowrap" style="color:#B8860B;">Gold</span>
    </div>`;
    container.innerHTML=html;
}

/* ============================================================
   OUTFITKART GOLD VIEW
   Gold sticky filter bar sits just below the fixed main header (top:64px)
   ============================================================ */
function _startGoldRotation(){
    if(_goldRotateTimer)clearInterval(_goldRotateTimer);
    _goldRotateTimer=setInterval(async()=>{await fetchGoldProducts();if(currentView==='gold')renderGoldGrid();},2*60*60*1000);
}

function _getGoldBatch(gender,sub){
    return goldProducts.filter(p=>p.category===gender&&(!sub||p.sub===sub));
}

function renderGoldView(){
    const view=document.getElementById('view-gold');if(!view)return;
    _applyGoldHeaderTheme(true);
    // view-gold ko -mt-16 do taaki main ka pt-16 cancel ho — header ke bilkul neeche aaye
    view.style.marginTop='-64px';
    view.innerHTML=`
    <!-- Gold filter bar — sticky below main header (top:64px = fixed header height) -->
    <div id="gold-filter-bar" style="position:sticky;top:64px;z-index:30;background:linear-gradient(135deg,#1a0800 0%,#3d2c00 50%,#1a0800 100%);border-bottom:2px solid #C9A84C;padding:12px 16px 0;">
        <div class="flex items-center gap-3 mb-3">
            <button onclick="navigate('home')" class="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0" style="background:rgba(201,168,76,0.2);border:1px solid #C9A84C;">
                <i class="fas fa-arrow-left" style="color:#C9A84C;font-size:14px;"></i>
            </button>
            <div class="flex-1 min-w-0">
                <h2 style="font-size:1.25rem;font-weight:900;background:linear-gradient(135deg,#C9A84C,#F5E6C0,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1;margin:0;">⭐ OutfitKart Gold</h2>
                <p style="color:rgba(245,230,192,0.65);font-size:10px;font-weight:600;margin:2px 0 0;">Premium Curated Collection</p>
            </div>
        </div>
        <div class="flex gap-3 mb-3">
            <button id="gold-tab-men" onclick="switchGoldGender('Men')" class="flex-1 py-2.5 rounded-xl font-black text-sm transition-all" style="background:linear-gradient(135deg,#C9A84C,#B8860B);color:#1a0800;box-shadow:0 3px 12px rgba(201,168,76,0.4);">👔 Men</button>
            <button id="gold-tab-women" onclick="switchGoldGender('Women')" class="flex-1 py-2.5 rounded-xl font-black text-sm transition-all" style="background:rgba(201,168,76,0.12);color:#C9A84C;border:1px solid rgba(201,168,76,0.3);">👗 Women</button>
        </div>
        <div id="gold-subcat-pills" class="flex gap-2 pb-3 overflow-x-auto hide-scrollbar"></div>
    </div>
    <div style="background:linear-gradient(180deg,#f5e6c0 0%,#fdfcfa 80px);padding:12px 16px 100px;">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="gold-grid">
            <div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-3xl" style="color:#C9A84C;"></i></div>
        </div>
    </div>`;
    goldCurrentGender='Men';goldCurrentSub=null;
    renderGoldSubcatPills('Men');
    renderGoldGrid();
}

function _applyGoldHeaderTheme(on){
    const header=document.querySelector('header');const logo=document.querySelector('header h1');
    if(on){
        if(header){header.style.background='linear-gradient(135deg,#1a0800,#3d2c00)';header.style.borderBottom='1.5px solid #C9A84C';header.style.boxShadow='0 4px 20px rgba(201,168,76,0.25)';}
        if(logo){logo.style.background='linear-gradient(135deg,#C9A84C,#F5E6C0,#C9A84C)';logo.style.webkitBackgroundClip='text';logo.style.webkitTextFillColor='transparent';logo.style.backgroundClip='text';}
    }else{
        if(header){header.style.background='';header.style.borderBottom='';header.style.boxShadow='';}
        if(logo){logo.style.background='';logo.style.webkitBackgroundClip='';logo.style.webkitTextFillColor='';logo.style.backgroundClip='';}
    }
}

function switchGoldGender(gender){
    goldCurrentGender=gender;goldCurrentSub=null;
    ['Men','Women'].forEach(g=>{
        const btn=document.getElementById(`gold-tab-${g.toLowerCase()}`);if(!btn)return;
        if(g===gender){btn.style.background='linear-gradient(135deg,#C9A84C,#B8860B)';btn.style.color='#1a0800';btn.style.boxShadow='0 3px 12px rgba(201,168,76,0.4)';btn.style.border='none';}
        else{btn.style.background='rgba(201,168,76,0.12)';btn.style.color='#C9A84C';btn.style.border='1px solid rgba(201,168,76,0.3)';btn.style.boxShadow='none';}
    });
    renderGoldSubcatPills(gender);renderGoldGrid();
}

function renderGoldSubcatPills(gender){
    const container=document.getElementById('gold-subcat-pills');if(!container)return;
    const subs=GOLD_SUBCATS[gender]||[];
    let html=`<button onclick="filterGoldSubcat(null)" id="gold-pill-all" style="flex-shrink:0;padding:5px 16px;border-radius:999px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#C9A84C,#B8860B);color:#1a0800;border:none;cursor:pointer;white-space:nowrap;">All</button>`;
    html+=subs.map(sub=>`<button onclick="filterGoldSubcat('${sub}')" class="gold-sub-pill" data-sub="${sub}" style="flex-shrink:0;padding:5px 16px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(201,168,76,0.12);color:#C9A84C;border:1px solid rgba(201,168,76,0.3);cursor:pointer;white-space:nowrap;transition:all 0.2s;">${sub}</button>`).join('');
    container.innerHTML=html;
}

function filterGoldSubcat(sub){
    goldCurrentSub=sub;
    document.querySelectorAll('.gold-sub-pill').forEach(btn=>{const active=btn.dataset.sub===sub;btn.style.background=active?'linear-gradient(135deg,#C9A84C,#B8860B)':'rgba(201,168,76,0.12)';btn.style.color=active?'#1a0800':'#C9A84C';btn.style.border=active?'none':'1px solid rgba(201,168,76,0.3)';});
    const allBtn=document.getElementById('gold-pill-all');if(allBtn){allBtn.style.background=sub?'rgba(201,168,76,0.12)':'linear-gradient(135deg,#C9A84C,#B8860B)';allBtn.style.color=sub?'#C9A84C':'#1a0800';}
    renderGoldGrid();
}

function renderGoldGrid(){
    const grid=document.getElementById('gold-grid');if(!grid)return;
    const list=_getGoldBatch(goldCurrentGender,goldCurrentSub);
    if(!list.length){grid.innerHTML=`<div class="col-span-full text-center py-16" style="color:#B8860B;"><i class="fas fa-crown text-5xl mb-4 opacity-40"></i><p class="font-bold text-lg">No Gold products yet</p><p class="text-sm opacity-60 mt-1">Admin Panel → OutfitKart Gold → Add Gold Product</p></div>`;return;}
    grid.innerHTML=list.map(p=>createProductCard(p,true)).join('');
    requestAnimationFrame(_animateProductCards);
}

/* ============================================================
   CATEGORY / SHOP
   ============================================================ */
function openCategoryPage(categoryName){
    const cData=CATEGORIES.find(c=>c.name===categoryName);if(!cData)return;
    document.querySelectorAll('.view-section').forEach(el=>el.classList.add('hidden'));
    currentView='category';document.getElementById('view-category').classList.remove('hidden');
    document.getElementById('cat-page-title').textContent=`${categoryName} Collection`;
    const viewAllBtn=document.getElementById('cat-view-all-btn');if(viewAllBtn)viewAllBtn.dataset.cat=categoryName;
    const grid=document.getElementById('cat-page-subcat-grid');let html='';
    if(cData.groups){cData.groups.forEach(group=>{html+=`<div class="col-span-2 md:col-span-3 text-xs font-black text-gray-400 uppercase tracking-widest pt-2 pb-1 border-b border-gray-100">${group.label}</div>`;html+=group.items.map(sub=>{const safe=sub.replace(/'/g,"\\'");const isCombo=COMBO_SUBS.has(sub);return `<div onclick="openSubcatProducts('${categoryName}','${safe}')" class="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 hover:shadow-md hover:border-rose-200 transition-all min-h-[90px] text-center">${isCombo?'<span class="absolute top-2 right-2 bg-amber-400 text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">🎁</span>':''}<span class="text-sm font-bold text-gray-800 leading-snug">${sub}</span></div>`;}).join('');});}
    else{html+=cData.subs.map(sub=>{const safe=sub.replace(/'/g,"\\'");return `<div onclick="openSubcatProducts('${categoryName}','${safe}')" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-center cursor-pointer active:scale-95 hover:shadow-md hover:border-rose-200 transition-all min-h-[80px] text-center"><span class="text-sm font-bold text-gray-800">${sub}</span></div>`;}).join('');}
    grid.innerHTML=html;window.scrollTo(0,0);updateBottomNav();
}
function openSubcatProducts(categoryName,sub){
    currentCategoryFilter=categoryName;currentSubFilter=sub||null;
    document.querySelectorAll('.view-section').forEach(el=>el.classList.add('hidden'));
    currentView='shop';document.getElementById('view-shop').classList.remove('hidden');
    const titleEl=document.getElementById('shop-title');if(titleEl)titleEl.textContent=sub?sub:`${categoryName} Collection`;
    const filtersEl=document.getElementById('subcategory-filters');if(filtersEl)filtersEl.innerHTML='';
    renderShopProducts();window.scrollTo(0,0);updateBottomNav();_initShopScrollHide();
}
function renderShopSubcategories(){
    try{
        const el=document.getElementById('subcategory-filters');if(!el)return;
        el.classList.remove('subcat-hidden');if(!currentCategoryFilter){el.innerHTML='';return;}
        const cData=CATEGORIES.find(c=>c.name===currentCategoryFilter);if(!cData)return;
        let html=`<button class="flex-shrink-0 px-4 py-1.5 text-xs border rounded-full whitespace-nowrap font-semibold transition-all ${!currentSubFilter?'bg-rose-600 text-white border-rose-600':'bg-white text-gray-600 border-gray-300'}" onclick="filterSub(null)">All</button>`;
        if(cData.groups){cData.groups.forEach(group=>{html+=`<span class="flex-shrink-0 text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center px-1 whitespace-nowrap">${group.label}</span>`;html+=group.items.map(s=>{const isCombo=COMBO_SUBS.has(s);const active=currentSubFilter===s;const safe=s.replace(/'/g,"\\'");return `<button class="flex-shrink-0 px-4 py-1.5 text-xs border rounded-full whitespace-nowrap font-semibold transition-all ${active?'bg-rose-600 text-white border-rose-600':'bg-white text-gray-600 border-gray-300'} ${isCombo?'ring-1 ring-yellow-400 ring-offset-1':''}" onclick="filterSub('${safe}')">${isCombo?'🎁 ':''}${s}</button>`;}).join('');});}
        else{html+=cData.subs.map(s=>{const safe=s.replace(/'/g,"\\'");return `<button class="flex-shrink-0 px-4 py-1.5 text-xs border rounded-full whitespace-nowrap font-semibold transition-all ${currentSubFilter===s?'bg-rose-600 text-white border-rose-600':'bg-white text-gray-600 border-gray-300'}" onclick="filterSub('${safe}')">${s}</button>`;}).join('');}
        el.innerHTML=html;
    }catch(e){}
}
function filterSub(sub){currentSubFilter=sub;renderShopSubcategories();renderShopProducts();}
let _shopScrollY=0,_shopScrollTimer=null;
function _initShopScrollHide(){const subEl=document.getElementById('subcategory-filters');if(subEl)subEl.classList.remove('subcat-hidden');_shopScrollY=window.scrollY;window.removeEventListener('scroll',_shopScrollHandler);window.addEventListener('scroll',_shopScrollHandler,{passive:true});}
function _shopScrollHandler(){if(currentView!=='shop'){window.removeEventListener('scroll',_shopScrollHandler);return;}const subEl=document.getElementById('subcategory-filters');if(!subEl)return;const diff=window.scrollY-_shopScrollY;if(diff>40)subEl.classList.add('subcat-hidden');else if(diff<-20)subEl.classList.remove('subcat-hidden');clearTimeout(_shopScrollTimer);_shopScrollTimer=setTimeout(()=>{_shopScrollY=window.scrollY;},150);}
function renderShopProducts(){
    let list=products.filter(p=>(!currentCategoryFilter||p.category===currentCategoryFilter)&&(!currentSubFilter||p.sub===currentSubFilter));
    const sortVal=document.getElementById('shop-sort')?.value||globalSortOrder;
    if(sortVal==='low')list.sort((a,b)=>a.price-b.price);else if(sortVal==='high')list.sort((a,b)=>b.price-a.price);else if(sortVal==='trending')list=list.filter(p=>p.istrending);
    renderProductGrid('shop-grid',list);renderShopSubcategories();
}
function shopSortProducts(val){globalSortOrder=val;renderShopProducts();}
function sortProducts(val){globalSortOrder=val;['price-sort-desktop','price-sort-mobile'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=val;});if(!document.getElementById('view-shop').classList.contains('hidden'))renderShopProducts();else navigate('shop');}

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigate(view,cat=null){
    if(currentView==='gold'&&view!=='gold'){_applyGoldHeaderTheme(false);const vg=document.getElementById('view-gold');if(vg)vg.style.marginTop='';}
    document.querySelectorAll('.view-section').forEach(el=>el.classList.add('hidden'));
    currentView=view;
    if(view==='profile'&&cat){document.getElementById('view-profile').classList.remove('hidden');if(currentUser){let matchBtn=null;document.querySelectorAll('.tab-btn').forEach(b=>{if(b.getAttribute('onclick')?.includes(`'${cat}'`))matchBtn=b;});switchProfileTab(cat,matchBtn);}updateBottomNav();return;}
    if(view==='gold'){document.getElementById('view-gold').classList.remove('hidden');renderGoldView();window.scrollTo(0,0);updateBottomNav();return;}
    const viewEl=document.getElementById(`view-${view}`);if(viewEl)viewEl.classList.remove('hidden');
    if(view==='shop'){
        if(cat){currentCategoryFilter=cat;currentSubFilter=null;const titleEl=document.getElementById('shop-title');if(titleEl)titleEl.textContent=`${cat} Collection`;}
        else{currentCategoryFilter=null;currentSubFilter=null;const titleEl=document.getElementById('shop-title');if(titleEl)titleEl.textContent='Shop All Products';}
        const filtersEl=document.getElementById('subcategory-filters');if(filtersEl)filtersEl.innerHTML='';renderShopProducts();_initShopScrollHide();
    }
    if(view==='checkout'){
        currentCheckoutStep=1;activePromoCode=null;promoDiscount=0;
        if(currentUser){preFillUserAddress().then(filled=>{if(filled){goToStep(2);showToast('Saved address loaded! 📍');}else renderCheckoutStep();}).catch(()=>renderCheckoutStep());}else renderCheckoutStep();
    }
    if(view==='profile'){if(currentUser)fetchUserData().then(()=>checkAuthUI());else checkAuthUI();}
    if(view==='admin'){if(!isAdminLoggedIn){showAdminLogin();return;}document.body.classList.add('admin-active');updateAdminNameInHeader();loadAdminDashboard();}
    else{document.body.classList.remove('admin-active');}
    window.scrollTo(0,0);updateBottomNav();
}
function updateBottomNav(){
    const navItems=document.querySelectorAll('nav.fixed.bottom-0 > div');
    const views=['home','shop','gold','cart','profile'];
    navItems.forEach((item,i)=>{
        const isActive=currentView===views[i]||(currentView==='category'&&i===0);
        if(views[i]==='gold'){
            // Gold nav — circle ke andar star ka glow active hone pe
            item.style.color=isActive?'#C9A84C':'#B8860B';
            const circle=item.querySelector('div[style*="border-radius:50%"]');
            if(circle){circle.style.boxShadow=isActive?'0 0 12px rgba(201,168,76,0.8)':'0 2px 8px rgba(201,168,76,0.5)';}
        }else{item.style.color=isActive?'#e11d48':'#6b7280';}
    });
}
function switchProfileTab(tabId,btnEl){
    document.querySelectorAll('.profile-tab').forEach(el=>el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');if(btnEl)btnEl.classList.add('active');
    if(tabId==='orders')renderOrdersList();if(tabId==='wallet')loadWalletTransactions();if(tabId==='wishlist')renderWishlist();if(tabId==='referrals')loadReferrals();if(tabId==='influencer')loadInfluencerRequests();
}

/* ============================================================
   SEARCH
   ============================================================ */
function handleSearch(q){
    q=q.toLowerCase().trim();const dRes=document.getElementById('desktop-search-results'),mRes=document.getElementById('mobile-search-results');
    if(q.length<2){[dRes,mRes].forEach(el=>el?.classList.add('hidden'));return;}
    const hits=products.filter(p=>p.name.toLowerCase().includes(q));
    const html=hits.length?hits.map(p=>{const img=p.imgs?.[0]||p.img||'';return `<div class="p-2 border-b flex gap-3 hover:bg-gray-50 cursor-pointer items-center" onclick="openProductPage(${p.id}); document.getElementById('desktop-search-results').classList.add('hidden'); document.getElementById('mobile-search-results').classList.add('hidden')"><img src="${img}" class="w-10 h-10 rounded object-cover" loading="lazy"><div><div class="text-sm font-semibold">${p.name}</div><div class="text-xs text-gray-500">₹${p.price}</div></div></div>`;}).join(''):'<div class="p-3 text-sm text-gray-500">No results found</div>';
    [dRes,mRes].forEach(el=>{if(el){el.innerHTML=html;el.classList.remove('hidden');}});
}
function startVoiceSearch(){
    if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){showToast('Voice search not supported');return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const recognition=new SR();recognition.lang='hi-IN';recognition.start();showToast('🎙️ Bol rahe hain...');
    recognition.onresult=e=>{const q=e.results[0][0].transcript;const mSearch=document.getElementById('mobile-search');if(mSearch){mSearch.value=q;handleSearch(q);}};recognition.onerror=()=>showToast('Voice search failed.');
}
function addToRecentlyViewed(productId){const today=new Date().toDateString();if(localStorage.getItem('outfitkart_rv_date')!==today){localStorage.removeItem('outfitkart_rv');localStorage.setItem('outfitkart_rv_date',today);}let rv=JSON.parse(localStorage.getItem('outfitkart_rv')||'[]');rv=rv.filter(id=>id!==productId);rv.unshift(productId);rv=rv.slice(0,20);localStorage.setItem('outfitkart_rv',JSON.stringify(rv));renderRecentlyViewed();}
function renderRecentlyViewed(showAll=false){const section=document.getElementById('recently-viewed-section'),grid=document.getElementById('recently-viewed-grid');if(!section||!grid)return;const rv=JSON.parse(localStorage.getItem('outfitkart_rv')||'[]');const allItems=rv.map(id=>products.find(p=>p.id===id)).filter(Boolean);if(!allItems.length){section.classList.add('hidden');return;}section.classList.remove('hidden');const displayItems=showAll?allItems:allItems.slice(0,6);grid.innerHTML=displayItems.map(p=>createProductCard(p)).join('');let viewBtn=document.getElementById('rv-view-all-btn');if(!viewBtn){viewBtn=document.createElement('button');viewBtn.id='rv-view-all-btn';viewBtn.className='mt-3 w-full text-center text-sm font-bold text-rose-600 py-2 border border-rose-200 rounded-xl hover:bg-rose-50 transition-all';grid.insertAdjacentElement('afterend',viewBtn);}if(allItems.length>6){viewBtn.style.display='';viewBtn.textContent=showAll?'▲ Show Less':`View All Recently Viewed (${allItems.length}) →`;viewBtn.onclick=()=>renderRecentlyViewed(!showAll);}else{viewBtn.style.display='none';}}
function _getDonationAmount(){const cb=document.getElementById('donation-checkbox'),sel=document.getElementById('donation-custom-amt');if(!cb?.checked)return 0;return parseInt(sel?.value)||10;}
function selectComboSize(size){selectedSize=size;}

/* ============================================================
   AUTH
   ============================================================ */
function checkAuthUI(){
    const authForms=document.getElementById('auth-forms'),userDash=document.getElementById('user-dashboard'),navText=document.getElementById('nav-profile-text');
    if(currentUser){
        authForms?.classList.add('hidden');userDash?.classList.remove('hidden');
        const set=(id,val)=>{const el=document.getElementById(id);if(!el)return;(el.tagName==='INPUT'||el.tagName==='TEXTAREA')?el.value=val:el.innerText=val;};
        set('user-greeting',currentUser.name||'User');set('user-mobile-display',`+91 ${currentUser.mobile}`);set('prof-name',currentUser.name||'');set('prof-email',currentUser.email||'');set('prof-address',currentUser.address||'');set('prof-wallet',`₹${currentUser.wallet||0}`);
        const avatar=document.getElementById('user-avatar-img');if(avatar)avatar.src=currentUser.profile_pic||`https://placehold.co/100x100/e11d48/ffffff?text=${(currentUser.name||'U').charAt(0).toUpperCase()}`;
        if(navText)navText.innerText=(currentUser.name||'User').split(' ')[0];updateHeaderWallet(currentUser.wallet||0);loadUserReferralCode();renderSidebarReferralWidget();setTimeout(checkNotifStatus,500);
    }else{authForms?.classList.remove('hidden');userDash?.classList.add('hidden');if(navText)navText.innerText=i18n('login');updateHeaderWallet(0);}
}
function switchAuthTab(tab){document.getElementById('form-login').classList.toggle('hidden',tab!=='login');document.getElementById('form-signup').classList.toggle('hidden',tab==='login');document.getElementById('tab-login').className=tab==='login'?'px-6 py-2 border-b-2 border-rose-600 font-bold text-rose-600':'px-6 py-2 text-gray-500 font-semibold hover:text-rose-600';document.getElementById('tab-signup').className=tab==='signup'?'px-6 py-2 border-b-2 border-rose-600 font-bold text-rose-600':'px-6 py-2 text-gray-500 font-semibold hover:text-rose-600';}
async function handleSignup(e){e.preventDefault();const mobile=document.getElementById('signup-mobile').value.trim(),name=document.getElementById('signup-name').value.trim(),pass=document.getElementById('signup-password').value;if(mobile.length!==10)return showToast('Enter valid 10-digit mobile number');if(!name)return showToast('Enter your full name');try{const{data:exist}=await dbClient.from('users').select('mobile').eq('mobile',mobile).maybeSingle();if(exist)return showToast('Mobile already registered! Please login. 📱');const refCode=generateReferralCode(name,mobile);const{data,error}=await dbClient.from('users').insert([{mobile,name,email:document.getElementById('signup-email').value.trim(),password:pass,wallet:0,referral_code:refCode}]).select().single();if(error)throw error;currentUser=data;localStorage.setItem('outfitkart_session',JSON.stringify(data));e.target.reset();showToast(`${i18n('welcome')} Account Created! 🎉`);await fetchUserData();await migrateLocalCartToDB();checkAuthUI();}catch(err){showToast('Error: '+(err.message||'Try again'));}}
async function handleLogin(e){e.preventDefault();const mobile=document.getElementById('login-mobile').value.trim(),pass=document.getElementById('login-password').value;if(mobile.length!==10)return showToast('Enter valid 10-digit mobile number');try{const{data,error}=await dbClient.from('users').select('*').eq('mobile',mobile).eq('password',pass).maybeSingle();if(error)throw error;if(data){currentUser=data;localStorage.setItem('outfitkart_session',JSON.stringify(data));showToast(`${i18n('welcome')} 🚀`);e.target.reset();await fetchUserData();await migrateLocalCartToDB();checkAuthUI();}else showToast('Invalid Mobile Number or Password ❌');}catch(err){showToast('Login error: '+err.message);}}
async function saveProfile(){if(!currentUser)return;try{const updates={name:document.getElementById('prof-name').value,email:document.getElementById('prof-email').value,address:document.getElementById('prof-address').value};const{data}=await dbClient.from('users').update(updates).eq('mobile',currentUser.mobile).select().single();if(data){currentUser=data;localStorage.setItem('outfitkart_session',JSON.stringify(data));showToast('Profile Updated! ✅');checkAuthUI();}}catch(err){showToast('Error: '+err.message);}}
async function changePassword(){const oldP=document.getElementById('sec-old-pass').value,newP=document.getElementById('sec-new-pass').value;if(oldP!==currentUser.password)return showToast('Incorrect Current Password');if(newP.length<6)return showToast('New password must be at least 6 characters');try{const{data}=await dbClient.from('users').update({password:newP}).eq('mobile',currentUser.mobile).select().single();if(data){currentUser=data;localStorage.setItem('outfitkart_session',JSON.stringify(data));showToast('Password Changed! 🔒');document.getElementById('sec-old-pass').value='';document.getElementById('sec-new-pass').value='';}}catch(err){showToast('Error: '+err.message);}}
async function uploadProfilePic(event){if(!currentUser)return showToast('Please login first');const file=event.target.files[0];if(!file)return;if(file.size>32e6)return showToast('File too large (max 32MB)');showToast('Uploading... 📸');const fd=new FormData();fd.append('image',file);try{const res=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd});const json=await res.json();if(json.success&&json.data?.url){const{data,error}=await dbClient.from('users').update({profile_pic:json.data.url}).eq('mobile',currentUser.mobile).select().single();if(error)return showToast('Save failed ❌');currentUser=data;localStorage.setItem('outfitkart_session',JSON.stringify(data));document.getElementById('user-avatar-img').src=json.data.url;showToast('Profile picture updated! ✅');}else showToast('Upload failed ❌');}catch(err){showToast('Upload error: '+err.message);}event.target.value='';}
function handleLogout(){saveCart();cleanupRealtime();currentUser=null;wishlist=[];ordersDb=[];localStorage.removeItem('outfitkart_session');localStorage.removeItem('outfitkart_admin_session');localStorage.removeItem('outfitkart_admin_name');isAdminLoggedIn=false;showToast(`${i18n('logout')} successfully.`);navigate('home');checkAuthUI();switchAuthTab('login');}

async function fetchUserData(){if(!currentUser)return;try{const{data:freshUser}=await dbClient.from('users').select('*').eq('mobile',currentUser.mobile).maybeSingle();if(freshUser){currentUser=freshUser;walletBalance=freshUser.wallet||0;localStorage.setItem('outfitkart_session',JSON.stringify(freshUser));updateHeaderWallet(walletBalance);}}catch{}try{const{data:wData}=await dbClient.from('wishlist').select('*').eq('mobile',currentUser.mobile);wishlist=wData?wData.map(w=>w.product_id):[];updateWishlistCount();}catch{}try{const{data:oData}=await dbClient.from('orders').select('*').eq('mobile',currentUser.mobile).order('date',{ascending:false});ordersDb=oData||[];}catch{}initRealtimeTracking();loadUserReferralCode();}

async function toggleWishlist(id){if(!currentUser){showToast('Please login to save favorites ❤️');navigate('profile');return;}const idx=wishlist.indexOf(id);try{if(idx===-1){wishlist.push(id);showToast('Added to Wishlist ❤️');await dbClient.from('wishlist').insert([{mobile:currentUser.mobile,product_id:id}]);}else{wishlist.splice(idx,1);showToast('Removed from Wishlist 💔');await dbClient.from('wishlist').delete().eq('mobile',currentUser.mobile).eq('product_id',id);}}catch{}updateWishlistCount();if(!document.getElementById('view-shop').classList.contains('hidden'))renderShopProducts();if(!document.getElementById('tab-wishlist').classList.contains('hidden'))renderWishlist();}
function updateWishlistCount(){const badge=document.getElementById('wishlist-count');if(badge){badge.innerText=wishlist.length;badge.classList.toggle('hidden',wishlist.length===0);}}
function renderWishlist(){const container=document.getElementById('wishlist-container');const items=products.filter(p=>wishlist.includes(p.id));container.innerHTML=items.length?items.map(p=>createProductCard(p)).join(''):'<div class="col-span-full text-center text-gray-500 py-10"><i class="far fa-heart text-4xl mb-3 block"></i>Wishlist is empty</div>';}

/* ============================================================
   PRODUCT DETAIL
   ============================================================ */
async function openProductPage(id, isGoldProduct=false){
    let p=products.find(x=>x.id===id);
    if(!p)p=goldProducts.find(x=>x.id===id);
    if(!p)return;
    viewingProductId=p.id;addToRecentlyViewed(id);
    const isPerf=isPerfumeCategory(p.category);
    const sizeArray=isPerf?(p.available_sizes?.length?p.available_sizes:PERFUME_ML_SIZES):(p.available_sizes?.length?p.available_sizes:getDefaultSizes(p.sub||p.category));
    selectedSize=sizeArray[1]||sizeArray[0];
    const imgList=p.imgs?.length?p.imgs:(p.img?[p.img]:['https://placehold.co/600x420/eee/333?text=No+Image']);
    const sizeLabel=isPerf?i18n('volume_select'):i18n('size_select');
    const isGold=p.is_gold||isGoldProduct||false;
    const desc=p.description||p.desc||'Premium quality product.';
    let sliderHtml;
    if(imgList.length===1){sliderHtml=`<div class="rounded-lg overflow-hidden border shadow-sm"><img src="${imgList[0]}" class="w-full h-[420px] object-cover" alt="${p.name}"></div>`;}
    else{sliderHtml=`<div><div class="pdp-img-slider hide-scrollbar" id="pdp-slider-${id}">${imgList.map((src,i)=>`<img src="${src}" alt="${p.name} ${i+1}" data-index="${i}">`).join('')}</div><div class="pdp-thumb-strip mt-2" id="pdp-thumbs-${id}">${imgList.map((src,i)=>`<img src="${src}" alt="thumb ${i+1}" class="pdp-thumb ${i===0?'active':''}" data-index="${i}" onclick="pdpScrollToSlide(${i})">`).join('')}</div></div>`;}
    document.getElementById('pdp-container').innerHTML=`${sliderHtml}
      <div class="flex flex-col justify-center">
        <div class="text-xs font-bold uppercase mb-1" style="color:${isGold?'#B8860B':'#e11d48'}">${isGold?'⭐ Gold · ':''}${p.category}${p.sub?' › '+p.sub:''}</div>
        ${p.stock_qty?`<div class="text-xs text-green-600 font-semibold mb-2">📦 ${i18n('in_stock')}: ${p.stock_qty}</div>`:''}
        <div class="flex justify-between items-start mb-2">
          <h1 class="text-3xl font-black text-gray-800">${p.name}</h1>
          <div class="flex gap-2">
            <button onclick="shareWithReferral(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price})" class="bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-full w-10 h-10 flex items-center justify-center shadow-sm"><i class="fas fa-share-alt"></i></button>
            <button onclick="nativeShareProduct(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price})" class="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-sm"><i class="fas fa-link"></i></button>
          </div>
        </div>
        <div class="flex items-baseline gap-3 mb-4"><span class="text-3xl font-bold">₹${p.price}</span>${p.oldprice?`<span class="text-lg line-through font-semibold" style="color:#C8102E;opacity:0.72">₹${p.oldprice}</span>`:''}</div>
        <p class="text-gray-600 text-sm mb-6">${desc}</p>
        <div class="mb-6">
          <div class="font-bold text-sm mb-2">${sizeLabel}</div>
          ${isPerf?`<div>
            <div class="flex flex-wrap gap-2 mb-3" id="size-selector">
              ${sizeArray.map(s=>`<button onclick="selectSize('${s}')" class="size-btn ${s===selectedSize?'selected':''} w-fit px-4 py-1.5 rounded-full border-2 font-bold text-sm transition-colors">${s}</button>`).join('')}
            </div>
            <div class="flex items-center border-2 border-purple-200 rounded-xl overflow-hidden focus-within:border-purple-500 bg-white max-w-[220px]">
              <span class="bg-purple-100 px-3 py-2.5 text-purple-700 font-black text-sm border-r border-purple-200 whitespace-nowrap">ml</span>
              <input type="number" id="pdp-custom-ml" placeholder="e.g. 45" min="1" max="2000" class="flex-1 px-3 py-2.5 text-sm font-bold outline-none" style="font-size:16px;" oninput="if(this.value&&!isNaN(this.value)){selectSize(this.value+'ml');document.querySelectorAll('#size-selector .size-btn').forEach(b=>b.classList.remove('selected'));}">
            </div>
          </div>`
          :`<div class="flex flex-wrap gap-3" id="size-selector">
            ${sizeArray.map(s=>`<button onclick="selectSize('${s}')" class="size-btn ${s===selectedSize?'selected':''} w-fit px-4 py-2 min-w-[3rem] rounded-full border border-gray-300 font-bold transition-colors">${s}</button>`).join('')}
          </div>`}
        </div>
        <div class="grid grid-cols-2 gap-3 mt-auto">
          <button onclick="addToCartPDP()" class="border-2 border-gray-800 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-50 active:scale-95 transition-all">${i18n('add_to_cart')}</button>
          <button onclick="buyNowPDP()" class="bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-md">${i18n('buy_now')}</button>
        </div>
      </div>`;
    navigate('product');
    requestAnimationFrame(()=>setTimeout(_injectSafeDeliveryButton,80));
    if(imgList.length>1){requestAnimationFrame(()=>{const slider=document.getElementById(`pdp-slider-${id}`);if(slider)slider.addEventListener('scroll',()=>{const idx=Math.round(slider.scrollLeft/slider.offsetWidth);updatePdpActiveThumbnail(id,idx);},{passive:true});});}
    await loadReviews(p.id);renderRecommendedProducts(p.category,p.id);
}
window.pdpScrollToSlide=function(idx){const slider=document.getElementById(`pdp-slider-${viewingProductId}`);if(!slider)return;slider.scrollTo({left:idx*slider.offsetWidth,behavior:'smooth'});updatePdpActiveThumbnail(viewingProductId,idx);};
function updatePdpActiveThumbnail(productId,activeIdx){document.getElementById(`pdp-thumbs-${productId}`)?.querySelectorAll('.pdp-thumb').forEach((t,i)=>t.classList.toggle('active',i===activeIdx));}
function selectSize(size){selectedSize=size;const s=String(size||'').trim();document.querySelectorAll('#size-selector .size-btn').forEach(btn=>btn.classList.toggle('selected',btn.innerText.trim()===s));const inp=document.getElementById('pdp-custom-ml');if(inp&&!s.match(/^[0-9]+ml$/i))inp.value='';}
async function addToCartPDP(){if(!currentUser){showToast('Login to add to cart 🛒');return navigate('profile');}addToCart(viewingProductId,selectedSize);}
function buyNowPDP(){
    if(!currentUser){showToast('Login to Buy!');return navigate('profile');}
    const p=products.find(x=>x.id===viewingProductId)||goldProducts.find(x=>x.id===viewingProductId);if(!p)return;
    currentCheckoutItems=[{...p,qty:1,size:selectedSize}];navigate('checkout');
}
function renderRecommendedProducts(category,excludeId){const section=document.getElementById('recommended-section');const gridEl=document.getElementById('recommended-products-grid');const recs=products.filter(p=>p.category===category&&p.id!==excludeId).slice(0,8);if(recs.length===0){if(section)section.style.display='none';return;}if(section)section.style.display='';if(gridEl)gridEl.innerHTML=recs.map(p=>createProductCard(p)).join('');}

/* REVIEWS */
async function loadReviews(prodId){const container=document.getElementById('pdp-reviews-list');try{const{data}=await dbClient.from('reviews').select('*').eq('product_id',prodId);container.innerHTML=data?.length?data.map(r=>`<div class="border-b pb-3"><div class="flex justify-between mb-1"><span class="font-bold text-sm">${r.user_name}</span><span class="text-xs text-gray-400">${r.date}</span></div><div class="text-yellow-400 text-xs mb-1">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5-r.rating)}</div><p class="text-sm text-gray-600">${r.comment}</p></div>`).join(''):'<p class="text-sm text-gray-500">No reviews yet. Be the first!</p>';}catch{container.innerHTML='<p class="text-sm text-gray-500">Could not load reviews.</p>';}}
function setRating(r){currentRating=r;const stars=document.getElementById('star-rating').children;for(let i=0;i<5;i++)stars[i].className=i<r?'fas fa-star':'far fa-star';}
async function submitReview(){if(!currentUser)return showToast('Login required!');const txt=document.getElementById('review-text').value.trim();if(!txt)return showToast('Write something first!');try{const{data}=await dbClient.from('reviews').insert([{product_id:viewingProductId,user_name:currentUser.name,rating:currentRating,comment:txt,date:new Date().toLocaleDateString()}]).select().single();if(data){document.getElementById('review-text').value='';loadReviews(viewingProductId);showToast('Review Added! ⭐');}}catch(err){showToast('Error: '+err.message);}}

/* ============================================================
   CHECKOUT — with Promo Code section
   ============================================================ */
function proceedToCheckout(){if(!cart.length)return showToast('Cart is empty!');if(!currentUser){showToast('Please Login to continue!');toggleCart();navigate('profile');return;}toggleCart();currentCheckoutItems=cart.map(c=>{const p=products.find(x=>x.id===c.productId)||goldProducts.find(x=>x.id===c.productId);return p?{...p,qty:c.qty,size:c.size}:null;}).filter(Boolean);navigate('checkout');}
function buyNow(productId){if(!currentUser){showToast('Please Login to Buy!');navigate('profile');return;}const p=products.find(x=>x.id===productId)||goldProducts.find(x=>x.id===productId);if(!p)return;currentCheckoutItems=[{...p,qty:1,size:selectedSize||'M'}];navigate('checkout');}
function renderCheckoutStep(){
    const s1=document.getElementById('checkout-step-1'),s2=document.getElementById('checkout-step-2'),s3=document.getElementById('checkout-step-3');if(!s1||!s2||!s3)return;
    document.querySelectorAll('.progress-step').forEach((step,i)=>{const n=i+1;const circle=step.querySelector('.step-circle');const label=step.querySelector('span');if(n<currentCheckoutStep){circle.innerHTML='✓';circle.className='step-circle bg-[#fb641b] text-white border-[#fb641b]';label.className='text-xs mt-1 font-medium text-[#fb641b]';}else if(n===currentCheckoutStep){circle.innerHTML=n;circle.className='step-circle bg-[#fb641b] text-white border-[#fb641b]';label.className='text-xs mt-1 font-medium text-[#fb641b]';}else{circle.innerHTML=n;circle.className='step-circle border-gray-300 text-gray-500';label.className='text-xs mt-1 font-medium text-gray-500';}});
    s1.classList.toggle('hidden',currentCheckoutStep!==1);s2.classList.toggle('hidden',currentCheckoutStep!==2);s3.classList.toggle('hidden',currentCheckoutStep!==3);
    if(currentCheckoutStep>=2&&addressFormData.fullname){const nameStr=`${addressFormData.fullname} • +91 ${addressFormData.mobile}`;const addrStr=(addressFormData.fullAddress||'').replace(/\n/g,'<br>');['checkout-user-name','checkout-user-name-step3'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=nameStr;});['delivery-address-display','delivery-address-display-step3'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=addrStr;});updateCheckoutTotals();}

    // Inject promo section in step 2
    if(currentCheckoutStep===2){
        const step2=document.getElementById('checkout-step-2');
        let promoContainer=step2.querySelector('#checkout-promo-wrapper');
        if(!promoContainer){
            const placeAfter=step2.querySelector('#checkout-items-list')?.closest('.bg-white');
            if(placeAfter){
                promoContainer=document.createElement('div');
                promoContainer.id='checkout-promo-wrapper';
                promoContainer.innerHTML=_renderPromoSection();
                placeAfter.insertAdjacentElement('afterend',promoContainer);
            }
        }
    }
    // Inject promo section in step 3
    if(currentCheckoutStep===3){
        const step3=document.getElementById('checkout-step-3');
        let promoContainer=step3.querySelector('#checkout-promo-wrapper-3');
        if(!promoContainer){
            const paymentBox=step3.querySelector('.bg-white.p-5.rounded-xl.shadow-sm.border');
            if(paymentBox){
                promoContainer=document.createElement('div');
                promoContainer.id='checkout-promo-wrapper-3';
                promoContainer.innerHTML=_renderPromoSection().replace('promo-section-container','promo-section-container-3').replace('promo-code-input','promo-code-input-3').replace("applyPromoCode()",'applyPromoCodeStep3()');
                paymentBox.insertAdjacentElement('beforebegin',promoContainer);
            }
        }
    }
}

window.applyPromoCodeStep3 = function(){
    const inp=document.getElementById('promo-code-input-3');
    if(inp)applyPromoCode(inp.value);
};

function goToStep(step){currentCheckoutStep=step;renderCheckoutStep();if(step>=2&&currentCheckoutItems.length>0)updateCheckoutTotals();if(step===3&&currentUser){dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle().then(({data})=>{if(data){walletBalance=data.wallet||0;const cb=document.getElementById('checkout-wallet-balance');if(cb)cb.textContent=`₹${walletBalance.toLocaleString()}`;if(selectedPaymentMethod==='wallet')updatePaymentSelection('wallet');}}).catch(()=>{});}}
async function saveAddressForm(event){
    event.preventDefault();
    const name=document.getElementById('addr-fullname').value.trim(),mobile=document.getElementById('addr-mobile').value.trim(),pin=document.getElementById('addr-pincode').value.trim(),house=document.getElementById('addr-house').value.trim(),road=document.getElementById('addr-road').value.trim(),city=document.getElementById('addr-city').value.trim(),state=document.getElementById('addr-state').value.trim(),landmark=document.getElementById('addr-landmark').value.trim();
    if(currentUser){try{const{data:u}=await dbClient.from('users').update({name,pincode:pin,city,state,address:road}).eq('mobile',currentUser.mobile).select().single();if(u){currentUser=u;localStorage.setItem('outfitkart_session',JSON.stringify(u));}}catch{}}
    const parts=[house,road,landmark?`Near ${landmark}`:'',city,state?`${state} - ${pin}`:pin];
    addressFormData={fullname:name,mobile,pincode:pin,city,state,fullAddress:parts.filter(Boolean).join(', ')};goToStep(2);
}

function updateCheckoutTotals(){
    let mrpTotal=0,priceTotal=0,discountTotal=0;
    currentCheckoutItems.forEach(item=>{const mrp=item.oldprice||Math.round(item.price*1.3);mrpTotal+=mrp*item.qty;priceTotal+=item.price*item.qty;discountTotal+=(mrp-item.price)*item.qty;});
    const platformFee=7,handlingFee=selectedPaymentMethod==='cod'?9:0,donationAmt=_getDonationAmount();
    // Apply promo discount
    const promoDis=promoDiscount||0;
    let finalTotal=Math.max(0,priceTotal+platformFee+handlingFee+donationAmt-promoDis);
    const exRow=document.getElementById('exchange-value-row'),exDisp=document.getElementById('exchange-value-display'),refRow=document.getElementById('refund-upi-row');
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=priceTotal-exchangeOldPrice;if(exRow)exRow.style.display='flex';if(exDisp)exDisp.textContent=`-₹${exchangeOldPrice.toLocaleString()}`;if(diff>0){finalTotal=Math.max(0,diff+platformFee+handlingFee+donationAmt-promoDis);if(refRow)refRow.style.display='none';}else if(diff<0){finalTotal=0;if(refRow)refRow.style.display='block';}else{finalTotal=platformFee;if(refRow)refRow.style.display='none';}}else{if(exRow)exRow.style.display='none';if(refRow)refRow.style.display='none';}
    const donRowDisp=document.getElementById('donation-row-display'),donDisp=document.getElementById('donation-display-amt');if(donRowDisp)donRowDisp.classList.toggle('hidden',donationAmt===0);if(donDisp)donDisp.textContent=`+₹${donationAmt}`;

    // Show promo discount row
    let promoRow=document.getElementById('promo-discount-row');
    if(!promoRow&&document.getElementById('handling-fee-row')){
        promoRow=document.createElement('div');promoRow.id='promo-discount-row';
        promoRow.className='flex justify-between text-rose-600 font-bold hidden';
        document.getElementById('handling-fee-row').insertAdjacentElement('afterend',promoRow);
    }
    if(promoRow){promoRow.classList.toggle('hidden',promoDis===0);promoRow.innerHTML=`<span><i class="fas fa-tag mr-1"></i>Promo Discount</span><span>-₹${promoDis}</span>`;}

    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('price-mrp',`₹${mrpTotal.toLocaleString()}`);set('price-discount',`- ₹${discountTotal.toLocaleString()}`);set('total-save',discountTotal.toLocaleString());set('final-total-step2',`₹${finalTotal.toLocaleString()}`);set('final-total-step3',`₹${finalTotal.toLocaleString()}`);set('place-order-amount',finalTotal.toLocaleString());
    document.getElementById('handling-fee-row')?.classList.toggle('hidden',handlingFee===0);
    const itemsList=document.getElementById('checkout-items-list');
    if(itemsList){itemsList.innerHTML=currentCheckoutItems.map(item=>{const img=item.imgs?.[0]||item.img||'https://placehold.co/56x72/eee/666';const sLabel=isPerfumeCategory(item.category)?`Vol: ${item.size||'100ml'}`:`Size: ${item.size||'M'}`;return `<div class="flex items-center gap-3 py-2 border-b last:border-b-0"><img src="${img}" loading="lazy" class="w-14 rounded flex-shrink-0 object-cover" style="height:4.5rem" alt="${item.name}"><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm truncate">${item.name}</h4><p class="text-xs text-gray-500">${sLabel} | Qty: ${item.qty}</p><div class="text-sm font-bold mt-1">₹${(item.price*item.qty).toLocaleString()}</div></div></div>`;}).join('');}
}

function updatePaymentSelection(method){
    selectedPaymentMethod=method;
    const styles={upi:{active:'border-orange-400 bg-orange-50',inactive:'border-gray-200 bg-white'},cod:{active:'border-gray-700 bg-gray-50',inactive:'border-gray-200 bg-white'},wallet:{active:'border-blue-500 bg-blue-50',inactive:'border-gray-200 bg-white'}};
    ['upi','cod','wallet'].forEach(m=>{const lbl=document.getElementById(`label-${m}`);if(!lbl)return;const isActive=m===method;lbl.className=lbl.className.replace(/border-orange-400|border-gray-700|border-blue-500|border-gray-200/g,'').replace(/bg-orange-50|bg-gray-50|bg-blue-50|bg-white/g,'').trim();styles[m][isActive?'active':'inactive'].split(' ').forEach(c=>{if(c)lbl.classList.add(c);});});
    const codRow=document.getElementById('cod-fee-row'),walletRow=document.getElementById('wallet-balance-row'),walletWarn=document.getElementById('wallet-insufficient-warning');
    if(codRow)codRow.classList.toggle('hidden',method!=='cod');if(walletRow)walletRow.classList.toggle('hidden',method!=='wallet');
    if(method==='wallet'){const bal=walletBalance||0;const cb=document.getElementById('checkout-wallet-balance'),el2=document.getElementById('wallet-balance-display');if(cb)cb.textContent=`₹${bal.toLocaleString()}`;if(el2)el2.textContent=`₹${bal.toLocaleString()}`;const needed=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0)+7-promoDiscount;if(walletWarn){if(bal<needed){walletWarn.classList.remove('hidden');const wt=document.getElementById('wallet-warning-text');if(wt)wt.textContent=`Wallet ₹${bal} insufficient. Need ₹${needed}.`;}else walletWarn.classList.add('hidden');}const btn=document.getElementById('place-order-btn');if(btn){if(bal<needed){btn.disabled=true;btn.classList.add('opacity-50','cursor-not-allowed');}else{btn.disabled=false;btn.classList.remove('opacity-50','cursor-not-allowed');}}}else{walletWarn?.classList.add('hidden');const btn=document.getElementById('place-order-btn');if(btn){btn.disabled=false;btn.classList.remove('opacity-50','cursor-not-allowed');}}
    updateCheckoutTotals();
}
function selectPaymentLabel(method){const radio=document.getElementById(`payment-${method}`);if(radio){radio.checked=true;updatePaymentSelection(method);}}
async function preFillUserAddress(){if(!currentUser)return false;try{const{data:user}=await dbClient.from('users').select('*').eq('mobile',currentUser.mobile).maybeSingle();if(user?.pincode&&user?.city&&user?.state){const setVal=(id,val)=>{const el=document.getElementById(id);if(el&&val)el.value=val;};setVal('addr-fullname',user.name||'');setVal('addr-mobile',user.mobile||'');setVal('addr-pincode',user.pincode||'');setVal('addr-city',user.city||'');setVal('addr-state',user.state||'');setVal('addr-road',user.address||'');addressFormData={fullname:user.name||'',mobile:user.mobile||'',pincode:user.pincode||'',city:user.city||'',state:user.state||'',fullAddress:[user.address||'',user.city,`${user.state} - ${user.pincode}`].filter(Boolean).join(', ')};return true;}}catch{}return false;}
async function fetchPincodeDetails(pin){if(pin.length!==6)return;const loader=document.getElementById('pincode-loader');if(loader)loader.classList.remove('hidden');try{const res=await fetch(`https://api.postalpincode.in/pincode/${pin}`);const data=await res.json();if(data?.[0]?.Status==='Success'){const d=data[0].PostOffice[0];const c=document.getElementById('addr-city'),s=document.getElementById('addr-state');if(c)c.value=d.District;if(s)s.value=d.State;showToast('Location detected! 📍');}}catch{}finally{if(loader)loader.classList.add('hidden');}}
function useCurrentLocation(){if(!navigator.geolocation)return showToast('Geolocation not supported');showToast('Getting location...');navigator.geolocation.getCurrentPosition(async pos=>{try{const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);const data=await res.json();const a=data.address;const c=document.getElementById('addr-city'),s=document.getElementById('addr-state'),pin=document.getElementById('addr-pincode');if(c)c.value=a.city||a.town||a.village||a.district||'';if(s)s.value=a.state||'';if(pin&&a.postcode)pin.value=a.postcode;showToast('Location fetched! ✅');}catch{showToast('Could not fetch location.');}},()=>showToast('Location access denied'));}

/* PAYMENT & ORDER */
async function initiatePayment(){
    if(!addressFormData.fullname){showToast('Please fill address first!');goToStep(1);return;}
    if(!currentCheckoutItems?.length){showToast('Cart is empty!');return;}
    const priceTotal=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0),platformFee=7,handlingFee=selectedPaymentMethod==='cod'?9:0,donationAmt=_getDonationAmount();
    const promoDis=promoDiscount||0;
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=priceTotal-exchangeOldPrice;if(diff>0){_openRazorpay(Math.max(0,diff+platformFee+handlingFee-promoDis),'OutfitKart Exchange',async(payId)=>{await placeOrder(payId);});}else if(diff<0){const upiId=document.getElementById('refund-upi-input')?.value.trim();if(!upiId)return showToast('Please enter your UPI ID for refund');await placeOrder(`EXCHANGE-REFUND-${exchangeSourceOrder.id}`,upiId);}else await placeOrder(`EXCHANGE-SAME-${exchangeSourceOrder.id}`);return;}
    const finalAmount=Math.max(0,priceTotal+platformFee+handlingFee+donationAmt-promoDis);
    if(selectedPaymentMethod==='wallet'){try{const{data:freshUser}=await dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle();if(freshUser)walletBalance=freshUser.wallet||0;}catch{}if(walletBalance<finalAmount){showToast(`❌ Wallet ₹${walletBalance} insufficient. Need ₹${finalAmount}`);return;}showToast('💰 Paying via Wallet...');await placeOrder('WALLET-PAY');}
    else if(selectedPaymentMethod==='upi'||selectedPaymentMethod==='card'){_openRazorpay(finalAmount,'OutfitKart Premium Fashion',async(payId)=>{showToast('Payment Successful! 🚀');await placeOrder(payId);});}
    else{await placeOrder('COD');}
}
function _openRazorpay(amount,description,onSuccess){const options={key:RAZORPAY_KEY,amount:amount*100,currency:'INR',name:'OutfitKart',description,prefill:{name:addressFormData.fullname,contact:'+91'+addressFormData.mobile},theme:{color:'#e11d48'},handler:response=>onSuccess(response.razorpay_payment_id),modal:{ondismiss:()=>showToast('Payment Cancelled! ❌')}};try{const rzp=new Razorpay(options);rzp.on('payment.failed',resp=>showToast('Payment failed: '+(resp.error.description||'')));rzp.open();}catch{showToast('Could not open payment gateway');}}
async function placeOrder(txId='COD',refundUpiId=''){
    const subtotal=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0),handlingFee=selectedPaymentMethod==='cod'?9:0,donationAmt=_getDonationAmount();
    const promoDis=promoDiscount||0;
    let finalTotal=Math.max(0,subtotal+7+handlingFee+donationAmt-promoDis);
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=subtotal-exchangeOldPrice;if(diff>0)finalTotal=Math.max(0,diff+7+handlingFee+donationAmt-promoDis);else if(diff<0)finalTotal=0;else finalTotal=7;}
    if(selectedPaymentMethod==='wallet'){try{const{data:fu}=await dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle();if(fu)walletBalance=fu.wallet||0;}catch{}if(walletBalance<finalTotal){showToast(`❌ Wallet insufficient`);return;}txId='WALLET-PAY';}
    const orderMarginTotal=currentCheckoutItems.reduce((sum,i)=>{const prod=products.find(p=>p.id===i.id)||goldProducts.find(p=>p.id===i.id);return sum+((prod?.margin_amt||0)*i.qty);},0);
    const itemsToSave=currentCheckoutItems.map(i=>{const prod=products.find(p=>p.id===i.id)||goldProducts.find(p=>p.id===i.id);return{id:i.id,name:i.name,img:i.imgs?.[0]||i.img||'',qty:i.qty,price:i.price,size:i.size||'M',margin_amt:prod?.margin_amt||0};});
    const orderId='ORD'+Math.floor(Math.random()*1000000);
    const newOrder={id:orderId,mobile:currentUser.mobile,customer_name:addressFormData.fullname||currentUser.name||'',items:itemsToSave,total:finalTotal,margin_total:orderMarginTotal,paymentmode:selectedPaymentMethod.toUpperCase(),status:'Processing',transaction_id:txId,date:new Date().toLocaleDateString('en-IN'),address:addressFormData.fullAddress||'',pincode:addressFormData.pincode||'',city:addressFormData.city||'',state:addressFormData.state||'',refund_upi:refundUpiId||null,referral_code:activeReferralCode||null,donation:donationAmt||null,promo_code:activePromoCode?.code||null,promo_discount:promoDis||null};
    try{
        if(selectedPaymentMethod==='wallet'){const newBal=walletBalance-finalTotal;const walletRes=await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:newBal})});if(!walletRes.ok)throw new Error('Wallet deduction failed');walletBalance=newBal;if(currentUser)currentUser.wallet=newBal;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));updateHeaderWallet(newBal);}
        const{data:savedOrder,error}=await dbClient.from('orders').insert([newOrder]).select().single();if(error)throw error;
        // Increment promo usage
        if(activePromoCode)await _incrementPromoUsage();
        await recordReferralPurchase(orderId,finalTotal);
        if(isExchangeProcess&&exchangeSourceOrder){try{await dbClient.from('orders').update({status:'Exchanged'}).eq('id',String(exchangeSourceOrder.id));}catch{}resetExchangeProcess();}
        // Reset promo
        activePromoCode=null;promoDiscount=0;
        cart=[];if(currentUser)await clearCartDB();else saveCartLocal();updateCartCount();ordersDb.push(savedOrder||newOrder);
        const modal=document.getElementById('order-success-modal'),idEl=document.getElementById('success-order-id');if(idEl)idEl.innerText=orderId;if(modal){modal.classList.remove('hidden');modal.classList.add('flex');}
    }catch(err){
        if(selectedPaymentMethod==='wallet'){const revertBal=walletBalance+finalTotal;walletBalance=revertBal;try{await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:revertBal})});if(currentUser)currentUser.wallet=revertBal;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));updateHeaderWallet(revertBal);}catch{}}
        showToast('❌ Error placing order: '+err.message);
    }
}
async function _updateWalletBalance(newBalance){try{await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:newBalance})});if(currentUser)currentUser.wallet=newBalance;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));const walletEl=document.getElementById('prof-wallet');if(walletEl)walletEl.textContent=`₹${newBalance}`;updateHeaderWallet(newBalance);}catch{}}
function closeSuccessModal(){const m=document.getElementById('order-success-modal');m?.classList.add('hidden');m?.classList.remove('flex');}
function closeSuccessAndGoToOrders(){closeSuccessModal();navigate('profile','orders');}
function closeCancelModal(){const m=document.getElementById('order-cancel-modal');m?.classList.add('hidden');m?.classList.remove('flex');}

/* CANCEL / EXCHANGE */
async function cancelOrder(orderId){orderId=String(orderId||'').trim();if(!orderId){showToast('❌ Invalid order');return;}if(!confirm(`Cancel order #${orderId}?`))return;const order=ordersDb.find(o=>String(o.id)===orderId);if(!order)return showToast('Order not found.');if(order.status!=='Processing')return showToast('Only Processing orders can be cancelled.');const paymode=(order.paymentmode||'').toUpperCase();if(paymode==='UPI'||paymode==='CARD'){_pendingCancelOrderId=orderId;const input=document.getElementById('cancel-refund-upi-input');if(input)input.value='';const modal=document.getElementById('refund-upi-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');return;}await _executeCancelOrder(orderId,null);}
function closeRefundUpiModal(){_pendingCancelOrderId=null;const modal=document.getElementById('refund-upi-modal');modal?.classList.add('hidden');modal?.classList.remove('flex');}
async function finaliseCancelWithRefund(){const upiId=document.getElementById('cancel-refund-upi-input')?.value.trim();if(!upiId)return showToast('Please enter your UPI ID');if(!_pendingCancelOrderId){closeRefundUpiModal();return;}const oid=_pendingCancelOrderId;closeRefundUpiModal();await _executeCancelOrder(oid,upiId);}
async function _executeCancelOrder(orderId,refundUpiId){
    orderId=String(orderId||'').trim();if(!orderId)return;const order=ordersDb.find(o=>String(o.id)===orderId);if(!order)return showToast('Order not found.');showToast('⏳ Cancelling...');
    try{const payload={status:'Cancelled'};if(refundUpiId)payload.refund_upi=refundUpiId;const res=await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify(payload)});if(!res.ok)throw new Error(`HTTP ${res.status}`);const rows=await res.json();let updated=rows?.[0]||{...order,...payload};const idx=ordersDb.findIndex(o=>String(o.id)===orderId);if(idx>-1)ordersDb[idx]={...ordersDb[idx],...updated};await cancelReferralForOrder(orderId);const paymode=(order.paymentmode||'').toUpperCase();if(paymode==='WALLET'||paymode==='WALLET-PAY'){const newBal=walletBalance+order.total;walletBalance=newBal;await _updateWalletBalance(newBal);showToast(`💰 ₹${order.total} refunded to Wallet!`);}const cancelModal=document.getElementById('order-cancel-modal'),refundEl=document.getElementById('cancel-refund-msg');if(refundEl){if(paymode==='WALLET'||paymode==='WALLET-PAY'){refundEl.textContent=`💰 ₹${order.total} added to your Wallet!`;refundEl.classList.remove('hidden');}else if((paymode==='UPI'||paymode==='CARD')&&refundUpiId){refundEl.textContent=`💰 ₹${order.total} will be refunded to ${refundUpiId} within 24-48 hours.`;refundEl.classList.remove('hidden');}else refundEl.classList.add('hidden');}cancelModal?.classList.remove('hidden');cancelModal?.classList.add('flex');if(!document.getElementById('tab-orders')?.classList.contains('hidden'))renderOrdersList();}catch(err){showToast('❌ Error: '+err.message);}
}
function startExchange(orderId){orderId=String(orderId||'').trim();const order=ordersDb.find(o=>String(o.id)===orderId);if(!order||order.status!=='Delivered')return showToast('Exchange only for delivered orders.');const oldPrice=order.total||0;const infoEl=document.getElementById('exchange-confirm-info');if(infoEl)infoEl.textContent=`Order #${orderId} • Exchange Value: ₹${oldPrice}`;window._pendingExchangeOrder=order;window._pendingExchangeOldPrice=oldPrice;const modal=document.getElementById('exchange-confirm-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');}
function closeExchangeModal(){document.getElementById('exchange-confirm-modal')?.classList.add('hidden');document.getElementById('exchange-confirm-modal')?.classList.remove('flex');}
function confirmExchange(){closeExchangeModal();isExchangeProcess=true;exchangeSourceOrder=window._pendingExchangeOrder;exchangeOldPrice=window._pendingExchangeOldPrice;showToast(`Exchange started 🔄 Old value: ₹${exchangeOldPrice}`);navigate('shop');}
function resetExchangeProcess(){isExchangeProcess=false;exchangeSourceOrder=null;exchangeOldPrice=0;}

/* ORDERS LIST */
function renderOrdersList(){
    const container=document.getElementById('orders-list-container');if(!container)return;
    if(!ordersDb.length){container.innerHTML='<div class="text-center text-gray-500 py-10">No orders placed yet.</div>';return;}
    container.innerHTML=[...ordersDb].reverse().map(order=>{
        const badge=STATUS_BADGE[order.status]||'bg-gray-100 text-gray-600';const oidStr=String(order.id).replace(/'/g,"\\'");
        const cancelBtn=order.status==='Processing'?`<button onclick="cancelOrder('${oidStr}')" class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100">${i18n('cancel_order')}</button>`:'';
        const exchangeBtn=order.status==='Delivered'?`<button onclick="startExchange('${oidStr}')" class="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg font-bold shadow">${i18n('exchange')}</button>`:'';
        const refundNote=(order.status==='Cancelled'&&order.refund_upi)?`<p class="text-xs text-green-600 mt-1"><i class="fas fa-check-circle mr-1"></i>Refund to: ${order.refund_upi}</p>`:'';
        const promoNote=order.promo_code?`<p class="text-xs text-rose-600 mt-0.5"><i class="fas fa-tag mr-1"></i>Promo: ${order.promo_code} (-₹${order.promo_discount||0})</p>`:'';
        return `<div class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"><div class="flex justify-between border-b pb-3 mb-3"><div><span class="font-bold text-gray-800">Order #${order.id}</span><br><span class="text-xs text-gray-500">${order.date} • ${order.paymentmode}</span>${refundNote}${promoNote}</div><div class="text-right"><span class="${badge} text-xs font-bold px-2 py-1 rounded-full">${order.status}</span><br><span class="font-bold text-sm mt-1 block">₹${order.total}</span></div></div><div class="space-y-3">${(order.items||[]).map(item=>`<div class="flex gap-3 items-center text-sm"><img src="${item.img}" class="w-12 h-16 rounded object-cover border flex-shrink-0" onerror="this.src='https://placehold.co/48x64/eee/999?text=?'" loading="lazy"><div class="flex-1 min-w-0"><div class="font-semibold text-gray-800 truncate">${item.name}</div><div class="text-gray-500 text-xs">Qty: ${item.qty} • Size: ${item.size||'M'}</div></div><div class="flex flex-col gap-1 items-end"><button onclick="openTrackingModal('${oidStr}')" class="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-md font-bold shadow whitespace-nowrap">${i18n('track_order')}</button>${cancelBtn}${exchangeBtn}</div></div>`).join('')}</div></div>`;
    }).join('');
}

/* ORDER TRACKING */
async function openTrackingModal(orderId){orderId=String(orderId||'').trim();let order=ordersDb.find(o=>String(o.id)===orderId);if(!order){try{const{data}=await dbClient.from('orders').select('*').eq('id',orderId).maybeSingle();if(data){ordersDb.push(data);order=data;}}catch{}}if(!order)return showToast('Order not found');currentTrackingOrder=order;renderTrackingContent(order);const modal=document.getElementById('tracking-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');document.body.style.overflow='hidden';}
function closeTrackingModal(event){if(event&&event.target!==document.getElementById('tracking-modal'))return;document.getElementById('tracking-modal')?.classList.add('hidden');document.getElementById('tracking-modal')?.classList.remove('flex');document.body.style.overflow='';currentTrackingOrder=null;}
function renderTrackingContent(order){
    const titleEl=document.getElementById('tracking-modal-title');if(titleEl){if(order.status==='Cancelled')titleEl.innerHTML='<i class="fas fa-times-circle text-rose-500"></i> Order Cancelled';else if(_isExchangeStatus(order.status))titleEl.innerHTML='<i class="fas fa-exchange-alt text-orange-500"></i> Exchange Tracking';else titleEl.innerHTML=`<i class="fas fa-map-marker-alt text-green-500"></i> Track Order`;}
    document.getElementById('tracking-order-id').textContent=`Order #${order.id}  •  ${order.status}`;
    const item=order.items?.[0]||{img:'',name:'Item',qty:1,price:0,size:'M'};
    document.getElementById('tracking-product-card').innerHTML=`<div class="flex items-center gap-4"><img src="${item.img}" alt="${item.name}" class="w-20 h-24 rounded-lg object-cover flex-shrink-0 shadow-md" onerror="this.style.display='none'" loading="lazy"><div class="flex-1 min-w-0"><h3 class="font-bold text-gray-900 text-base truncate">${item.name}</h3><p class="text-sm text-gray-600">Qty: ${item.qty} • Size: ${item.size||'M'}</p><p class="text-lg font-black text-gray-900 mt-1">₹${item.price*item.qty}</p></div></div>`;
    document.getElementById('tracking-address').innerHTML=`<div class="text-center"><div class="flex items-center justify-center gap-2 mb-3"><i class="fas fa-map-marker-alt text-blue-500 text-xl"></i><h4 class="font-bold text-gray-800 text-sm">Shipping Address</h4></div><div class="text-left text-sm"><p class="font-semibold text-gray-900">${order.address||'N/A'}</p><p class="text-gray-600">${order.city||''}, ${order.state||''} - ${order.pincode||''}</p></div></div>`;
    const wrapper=document.getElementById('tracking-timeline-wrapper');
    if(order.status==='Cancelled'){wrapper.innerHTML=`<div class="px-6 py-8 flex flex-col items-center text-center"><div class="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-times text-rose-600 text-4xl"></i></div><h3 class="font-black text-xl text-rose-600 mb-2">Order Cancelled</h3>${order.refund_upi?`<p class="text-sm text-green-600 font-semibold mt-2">💰 ₹${order.total} refunded to ${order.refund_upi} within 24-48 hrs.</p>`:''}</div>`;return;}
    if(_isExchangeStatus(order.status)){wrapper.innerHTML=_buildTimeline([{key:'ex-requested',icon:'fa-exchange-alt',label:'Exchange Requested',sub:'Request submitted'},{key:'ex-processing',icon:'fa-cogs',label:'Exchange Processing',sub:'Being reviewed'},{key:'ex-shipped',icon:'fa-truck',label:'Exchange Shipped',sub:'New item dispatched'},{key:'ex-done',icon:'fa-check-circle',label:'Exchanged',sub:'Exchange complete!'}],STATUS_MAP[order.status]||[],'orange');return;}
    wrapper.innerHTML=_buildTimeline([{key:'ordered',icon:'fa-file-invoice-dollar',label:'Ordered',sub:'Order confirmed'},{key:'packed',icon:'fa-box',label:'Packed',sub:'Ready to ship'},{key:'shipped',icon:'fa-truck',label:'Shipped',sub:'Out for delivery'},{key:'delivered',icon:'fa-home',label:'Delivered',sub:'Order completed'}],STATUS_MAP[order.status]||[],'green');
}
function _isExchangeStatus(status){return status&&(status.toLowerCase().includes('exchange')||status==='Exchanged');}
function _buildTimeline(steps,completedKeys,accentColor){const dotDone=accentColor==='orange'?'border-orange-400 bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg scale-110':'border-emerald-400 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg scale-110';const lineDone=accentColor==='orange'?'bg-orange-400':'bg-emerald-400';return `<div class="px-6 py-6"><div class="flex flex-col items-center space-y-0 relative">${steps.map((step,idx)=>{const done=completedKeys.includes(step.key),isLast=idx===steps.length-1;return `<div class="flex flex-col items-center text-center w-full relative" style="min-height:80px"><div class="w-12 h-12 rounded-full border-4 ${done?dotDone:'border-gray-300 bg-white text-gray-400'} flex items-center justify-center shadow-md relative z-10 transition-all duration-500"><i class="fas ${step.icon} text-lg"></i></div><div class="mt-3 px-4"><h3 class="font-bold text-sm ${done?'text-gray-900':'text-gray-400'}">${step.label}</h3><p class="text-xs ${done?'text-gray-600':'text-gray-400'} mt-0.5">${step.sub}</p></div>${!isLast?`<div class="w-0.5 flex-1 mt-2 ${done?lineDone:'bg-gray-200'} min-h-[2rem]"></div>`:''}</div>`;}).join('')}</div></div>`;}
function initRealtimeTracking(){
    if(!currentUser)return;if(realtimeChannel){dbClient.removeChannel(realtimeChannel);realtimeChannel=null;}
    realtimeChannel=dbClient.channel(`orders-user-${currentUser.mobile}-${Date.now()}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`mobile=eq.${currentUser.mobile}`},payload=>{const updated=payload.new;if(!updated?.id)return;const idx=ordersDb.findIndex(o=>String(o.id)===String(updated.id));if(idx>-1){ordersDb[idx]={...ordersDb[idx],...updated,items:updated.items||ordersDb[idx].items};}else{ordersDb.push(updated);}const finalOrder=idx>-1?ordersDb[idx]:updated;showToast(`📦 Order #${updated.id}: "${updated.status}"`);const modal=document.getElementById('tracking-modal');if(modal&&!modal.classList.contains('hidden')&&String(currentTrackingOrder?.id)===String(updated.id)){currentTrackingOrder=finalOrder;renderTrackingContent(finalOrder);}if(!document.getElementById('tab-orders')?.classList.contains('hidden'))renderOrdersList();}).subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setTimeout(()=>initRealtimeTracking(),5000);});
}
function cleanupRealtime(){if(realtimeChannel){dbClient.removeChannel(realtimeChannel);realtimeChannel=null;}if(_referralChannel){dbClient.removeChannel(_referralChannel);_referralChannel=null;}}

/* IMAGE UPLOAD */
window.uploadToImgBB=async(event,textareaId)=>{const files=event.target.files;if(!files?.length)return;const input=event.target;const statusEl=input.nextElementSibling?.classList.contains('upload-status')?input.nextElementSibling:null;const textarea=document.getElementById(textareaId);if(!textarea)return;const existing=textarea.value?textarea.value.split('\n').filter(Boolean):[];if(statusEl){statusEl.classList.remove('hidden');statusEl.innerHTML='<i class="fas fa-spinner fa-spin mr-1"></i>Uploading…';}for(const file of Array.from(files)){if(file.size>32e6)continue;const fd=new FormData();fd.append('image',file);try{const res=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd});const json=await res.json();if(json.success&&json.data?.url){existing.push(json.data.url);if(statusEl)statusEl.innerHTML=`<i class="fas fa-check mr-1 text-green-500"></i>${existing.length} images ready`;}}catch{if(statusEl)statusEl.innerHTML='<i class="fas fa-times text-red-500 mr-1"></i>Upload error';}}textarea.value=existing.join('\n');showToast('✅ Images uploaded!');setTimeout(()=>statusEl?.classList.add('hidden'),2500);input.value='';};

/* SHARE */
async function nativeShareProduct(id,name,price){const url=`${window.location.origin}${window.location.pathname}?pid=${id}`;const text=`Check out ${name} for just ₹${price} on OutfitKart! COD available.`;if(navigator.share){try{await navigator.share({title:`${name} | OutfitKart`,text,url});}catch{}}else{await navigator.clipboard.writeText(`${text}\n${url}`).catch(()=>{});showToast('Link copied! 📋');}}
async function shareOutfitKart(){const code=currentUser?.referral_code||'';const url=code?`${window.location.origin}${window.location.pathname}?ref=${code}`:window.location.origin+window.location.pathname;const text='🛍️ OutfitKart — Premium Fashion! COD available. Latest trends, amazing deals. 👇';if(navigator.share){try{await navigator.share({title:'OutfitKart',text,url});}catch{}}else{try{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('Link copied! 🔗');}catch{window.open(`https://wa.me/?text=${encodeURIComponent(text+'\n'+url)}`,'_blank');}}}
function _setOgTags({title,description,image,url}={}){const t=title||'OutfitKart — Premium Fashion at Best Prices',d=description||'Shop latest trends. COD available.';const img=image||'https://placehold.co/1200x630/e11d48/ffffff?text=OutfitKart+Fashion',u=url||window.location.href;const set=(prop,val)=>{let el=document.querySelector(`meta[property="${prop}"]`)||document.querySelector(`meta[name="${prop}"]`);if(!el){el=document.createElement('meta');el.setAttribute('property',prop);document.head.appendChild(el);}el.setAttribute('content',val);};set('og:title',t);set('og:description',d);set('og:image',img);set('og:url',u);document.title=t;}
function openWhatsAppSupport(){window.open(`https://wa.me/${SUPPORT_WA}`,'_blank');}
function openEmailSupport(){window.location.href=`mailto:${SUPPORT_EMAIL}?subject=OutfitKart Support&body=Hi, I need help with my order.`;}

/* TOAST */
function showToast(msg){const t=document.createElement('div');t.className='bg-gray-900 text-white px-5 py-3 rounded-full shadow-2xl text-sm fade-in pointer-events-auto';t.innerHTML=msg;document.getElementById('toast-container').appendChild(t);setTimeout(()=>t.parentNode?.removeChild(t),3000);}

/* PWA */
function _initPwaInstall(){window._showInstallBanner=function(){if(localStorage.getItem('ok_pwa_no'))return;const b=document.getElementById('pwa-install-banner');if(!b)return;b.classList.remove('hidden');b.style.cssText+='display:flex!important;transform:translateY(0)!important;';};window.hideInstallBanner=function(){const b=document.getElementById('pwa-install-banner');if(!b)return;b.style.transform='translateY(100%)';setTimeout(()=>{b.classList.add('hidden');b.style.display='';},350);localStorage.setItem('ok_pwa_no','1');};window.installApp=async function(){if(!window.deferredPrompt){showToast(/iphone|ipad|ipod/i.test(navigator.userAgent)?'📱 Safari → Share → "Add to Home Screen"':'App already installed');return;}window.deferredPrompt.prompt();const{outcome}=await window.deferredPrompt.userChoice;window.hideInstallBanner();if(outcome==='accepted'){showToast('✅ OutfitKart App installed!');window.deferredPrompt=null;localStorage.setItem('ok_pwa_no','1');}};window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.deferredPrompt=e;if(!localStorage.getItem('ok_pwa_no')){setTimeout(window._showInstallBanner,3000);}});window.addEventListener('appinstalled',()=>{window.hideInstallBanner();window.deferredPrompt=null;localStorage.setItem('ok_pwa_no','1');showToast('🎉 App installed!');});}

/* PUSH NOTIFICATIONS */
const VAPID_PUBLIC_KEY='BDj8O97OwIFvhVPaBKlABWwbq2-BHjXYP-RkKFJYDKqGzaT9LH2oPuKrJ4MNdSwqB1XvDqiTCb_Y5_Qfqq6iEWk';
function _urlBase64ToUint8Array(base64String){const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
async function requestPushPermission(){if(!('Notification' in window)||!('serviceWorker' in navigator)){showToast('❌ Not supported');return false;}let permission=Notification.permission;if(permission==='default'){permission=await Notification.requestPermission();}if(permission!=='granted'){showToast('❌ Notification permission denied');return false;}try{const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:_urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});}await _savePushSubscription(sub);showToast('✅ Notifications ON! 🔔');_updateNotifButton(true);return true;}catch(err){showToast('❌ Subscription failed: '+err.message);return false;}}
async function _savePushSubscription(subscription){if(!currentUser)return;try{await dbClient.from('users').update({push_subscription:JSON.stringify(subscription)}).eq('mobile',currentUser.mobile);if(currentUser)currentUser.push_subscription=JSON.stringify(subscription);localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));}catch{}}
async function unsubscribePush(){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();if(currentUser){await dbClient.from('users').update({push_subscription:null}).eq('mobile',currentUser.mobile);}showToast('🔕 Notifications OFF');_updateNotifButton(false);}catch(err){showToast('Error: '+err.message);}}
function _updateNotifButton(enabled){const btn=document.getElementById('notif-toggle-btn');if(!btn)return;if(enabled){btn.innerHTML='<i class="fas fa-bell text-green-600 mr-2"></i><span>Notifications ON ✅</span>';btn.style.background='#f0fdf4';}else{btn.innerHTML='<i class="fas fa-bell-slash text-gray-500 mr-2"></i><span>Enable Notifications</span>';btn.style.background='';}}
async function checkNotifStatus(){const btn=document.getElementById('notif-toggle-btn');if(!btn)return;if(!('Notification' in window)||!('serviceWorker' in navigator)){btn.style.display='none';return;}if(Notification.permission==='granted'){const reg=await navigator.serviceWorker.ready.catch(()=>null);if(reg){const sub=await reg.pushManager.getSubscription().catch(()=>null);_updateNotifButton(!!sub);}}}
async function toggleNotification(){if(!currentUser){showToast('Pehle login karein! 👤');navigate('profile');return;}if(Notification.permission==='granted'){const reg=await navigator.serviceWorker.ready.catch(()=>null);const sub=reg?await reg.pushManager.getSubscription().catch(()=>null):null;if(sub)await unsubscribePush();else await requestPushPermission();}else{await requestPushPermission();}}

/* WALLET */
function showWithdrawForm(){const section=document.getElementById('withdraw-form-section');if(!section)return;section.classList.remove('hidden');const nameInput=document.getElementById('withdraw-name');if(nameInput&&currentUser?.name)nameInput.value=currentUser.name;section.scrollIntoView({behavior:'smooth',block:'center'});}
function hideWithdrawForm(){document.getElementById('withdraw-form-section')?.classList.add('hidden');}
async function submitWithdrawRequest(){if(!currentUser)return showToast('Please login first');const amount=parseInt(document.getElementById('withdraw-amount')?.value)||0,upiId=document.getElementById('withdraw-upi')?.value.trim(),name=document.getElementById('withdraw-name')?.value.trim();if(!amount||amount<120)return showToast('Minimum withdrawal amount is ₹120');if(!upiId)return showToast('Please enter your UPI ID');if(!name)return showToast('Please enter account holder name');if(amount>walletBalance)return showToast(`Insufficient balance. Available: ₹${walletBalance}`);if(!confirm(`Withdraw ₹${amount} to ${upiId}?`))return;showToast('⏳ Submitting...');try{const{data,error}=await dbClient.from('withdrawals').insert([{mobile:currentUser.mobile,name,upi_id:upiId,amount,status:'Pending',date:new Date().toLocaleDateString('en-IN')}]).select().single();if(error)throw error;const newBal=walletBalance-amount;await _updateWalletBalance(newBal);walletBalance=newBal;['withdraw-amount','withdraw-upi'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});hideWithdrawForm();showToast(`✅ Withdrawal request of ₹${amount} submitted!`);loadWalletTransactions();}catch(err){showToast('❌ Error: '+err.message);}}
async function loadWalletTransactions(){if(!currentUser)return;const container=document.getElementById('wallet-tx-list');if(!container)return;container.innerHTML='<div class="text-center py-4 text-gray-400"><i class="fas fa-spinner fa-spin text-xl"></i></div>';try{const{data}=await dbClient.from('withdrawals').select('*').eq('mobile',currentUser.mobile).order('id',{ascending:false}).limit(20);if(!data?.length){container.innerHTML='<div class="text-center py-6 text-gray-400"><i class="fas fa-receipt text-3xl mb-2 block"></i><p class="text-sm">No transactions yet</p></div>';return;}const STATUS_COLOR={'Pending':'bg-amber-100 text-amber-700','Paid':'bg-green-100 text-green-700','Rejected':'bg-red-100 text-red-600'};const STATUS_ICON={'Pending':'fa-hourglass-half text-amber-500','Paid':'fa-check-circle text-green-600','Rejected':'fa-times-circle text-red-500'};container.innerHTML=data.map(tx=>`<div class="flex items-center justify-between py-3 px-3 bg-white rounded-xl border border-gray-100 shadow-sm"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status==='Paid'?'bg-green-100':tx.status==='Rejected'?'bg-red-100':'bg-amber-100'}"><i class="fas ${STATUS_ICON[tx.status]||'fa-paper-plane text-gray-500'} text-sm"></i></div><div><div class="font-semibold text-sm text-gray-800">To: <span class="font-mono">${tx.upi_id}</span></div><div class="text-xs text-gray-400">${tx.date||'—'}</div></div></div><div class="text-right flex-shrink-0"><div class="font-black text-base text-red-500">-₹${tx.amount}</div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[tx.status]||'bg-gray-100 text-gray-500'}">${tx.status}</span></div></div>`).join('');}catch{container.innerHTML='<div class="text-center py-4 text-gray-400 text-sm">Could not load history</div>';}}

/* INFLUENCER */
async function submitInfluencerRequest(){if(!currentUser)return showToast('Login karein pehle!');const name=document.getElementById('inf-name')?.value.trim(),platform=document.getElementById('inf-platform')?.value;const profUrl=document.getElementById('inf-profile-url')?.value.trim(),videoUrl=document.getElementById('inf-video-url')?.value.trim();const views=parseInt(document.getElementById('inf-views')?.value)||0,desc=document.getElementById('inf-description')?.value.trim();if(!name||!platform||!videoUrl||!views)return showToast('Saare required fields bharein!');if(views<1000)return showToast('Minimum 1000 views chahiye!');const earning=Math.floor(views/1000)*50;try{const{error}=await dbClient.from('influencer_requests').insert([{mobile:currentUser.mobile,name,platform,profile_url:profUrl,video_url:videoUrl,views,description:desc,status:'Pending',earnings:earning,submitted_at:new Date().toISOString()}]);if(error)throw error;showToast(`✅ Request submitted! Potential earning: ₹${earning}`);['inf-name','inf-profile-url','inf-video-url','inf-views','inf-description'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const platEl=document.getElementById('inf-platform');if(platEl)platEl.value='';loadInfluencerRequests();}catch(err){showToast('❌ '+err.message);}}
async function loadInfluencerRequests(){if(!currentUser)return;const container=document.getElementById('inf-requests-list'),totalEl=document.getElementById('inf-total-earned'),countEl=document.getElementById('inf-submissions-count');if(!container)return;try{const{data}=await dbClient.from('influencer_requests').select('*').eq('mobile',currentUser.mobile).order('id',{ascending:false});const all=data||[],approved=all.filter(r=>r.status==='Approved');const totalEarned=approved.reduce((s,r)=>s+(r.earnings||0),0);if(totalEl)totalEl.textContent=`₹${totalEarned}`;if(countEl)countEl.textContent=all.length;const BADGE={Pending:'bg-amber-100 text-amber-700',Approved:'bg-green-100 text-green-700',Rejected:'bg-red-100 text-red-600'};container.innerHTML=all.length?all.map(r=>`<div class="bg-white border rounded-xl p-3 mb-2 shadow-sm"><div class="flex justify-between items-start"><div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">${r.platform} — ${r.views?.toLocaleString()} views</div><a href="${r.video_url}" target="_blank" class="text-xs text-blue-600 hover:underline truncate block">${r.video_url}</a></div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${BADGE[r.status]||'bg-gray-100 text-gray-500'}">${r.status}</span></div>${r.status==='Approved'?`<div class="text-xs text-green-600 font-bold mt-1">✅ ₹${r.earnings} credited to wallet</div>`:''}${r.status==='Rejected'&&r.reject_reason?`<div class="text-xs text-red-500 mt-1">❌ ${r.reject_reason}</div>`:''}</div>`).join(''):'<div class="text-center text-gray-400 py-6 text-sm">Abhi tak koi submission nahi</div>';}catch{if(container)container.innerHTML='<div class="text-xs text-red-500">Error loading</div>';}}

/* GLOBAL EXPORTS */
Object.assign(window,{
    i18n,setLanguage,applyLanguage,getReferralTableSQL,getGoldTableSQL,
    navigate,toggleCart,handleSearch,sortProducts,shopSortProducts,filterSub,_initShopScrollHide,
    loadCartFromDB,migrateLocalCartToDB,clearCartDB,updateQty,removeFromCart,updateCartCount,saveCart,
    openCategoryPage,openSubcatProducts,showQuickSizeModal,hideQuickSizeModal,selectQuickSize,addFromQuickModal,
    toggleWishlist,openProductPage,pdpScrollToSlide,selectSize,selectComboSize,addToCartPDP,buyNowPDP,buyNow,
    submitReview,setRating,
    switchAuthTab,handleLogin,handleSignup,saveProfile,changePassword,
    uploadProfilePic,switchProfileTab,handleLogout,shareOutfitKart,nativeShareProduct,shareWithReferral,
    cancelOrder,closeRefundUpiModal,finaliseCancelWithRefund,startExchange,closeExchangeModal,confirmExchange,
    openTrackingModal,closeTrackingModal,renderOrdersList,
    proceedToCheckout,goToStep,initiatePayment,saveAddressForm,
    fetchPincodeDetails,useCurrentLocation,updatePaymentSelection,selectPaymentLabel,_getDonationAmount,
    closeSuccessModal,closeSuccessAndGoToOrders,closeCancelModal,
    copyReferralCode,switchReferralTab,loadReferrals,renderSidebarReferralWidget,cancelReferralForOrder,recordReferralPurchase,
    requestPushPermission,unsubscribePush,toggleNotification,checkNotifStatus,
    showWithdrawForm,hideWithdrawForm,submitWithdrawRequest,loadWalletTransactions,
    submitInfluencerRequest,loadInfluencerRequests,
    goBannerSlide,nextBannerSlide,prevBannerSlide,
    installApp,hideInstallBanner,
    openWhatsAppSupport,openEmailSupport,startVoiceSearch,
    addToRecentlyViewed,renderRecentlyViewed,
    startAdminTimer,cancelAdminTimer,
    // Gold
    switchGoldGender,filterGoldSubcat,renderGoldGrid,renderGoldView,fetchGoldProducts,
    // Promo
    applyPromoCode,removePromoCode,
    // Perfume ml
    _onQuickMlInput,
    // Legacy
    openGoldSection: ()=>navigate('gold'),
});
