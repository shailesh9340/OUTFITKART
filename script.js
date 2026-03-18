'use strict';

/* ============================================================
   1. SUPABASE INITIALISATION
   ============================================================ */
const SUPABASE_URL    = 'https://wlgytgwmmefwpljstque.supabase.co';
const SUPABASE_KEY    = 'sb_publishable_fFampYvNGSn7TE0TOy56dQ_xXrer_P8';
const RAZORPAY_KEY    = 'rzp_live_SRZMbmo0aTi8xs';
const IMGBB_KEY       = '3949e4873d8510691ee63026d22eeb75';
const SCRAPINGBEE_KEY = 'BCR4ZMY5YAQGN1PM8HGEWBV52QGL1R4YRX58YTCP52G23H89YSVVE6S65PO2D5T56RVBITJQKCDBK4ZN';
const SUPPORT_WA      = '918982296773';
const SUPPORT_EMAIL   = 'shaileshkumarchauhan9340@gmail.com';

/* ============================================================
   AUTHORIZED ADMIN USERS — sirf yahi log admin panel khol sakte hain
   ============================================================ */
const AUTHORIZED_ADMINS = [
    { mobile: '9343988416', name: 'Shailesh Kumar Chauhan', email: 'shailu@gmail.com' },
    { mobile: '7879245954', name: 'Aman Kumar Chauhan',    email: 'udaipurihacg@gmail.com' },
];

function isAuthorizedAdmin(user) {
    if (!user) return false;
    return AUTHORIZED_ADMINS.some(a =>
        a.mobile === String(user.mobile).trim()
    );
}

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

dbClient.from('products').select('count').limit(1)
    .then(({ error }) => updateNetworkStatus(error ? 'error' : 'connected', error?.message || ''))
    .catch(() => updateNetworkStatus('offline'));

function updateNetworkStatus(status, details = '') {
    const dot = document.getElementById('supabase-status-dot');
    if (!dot) return;
    dot.className = `w-2.5 h-2.5 rounded-full ml-1 animate-pulse ${
        status === 'connected' ? 'bg-green-500' :
        status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
    }`;
    dot.title = `Supabase: ${status}${details ? ' – ' + details : ''}`;
}

/* ============================================================
   2. GLOBAL STATE
   ============================================================ */
let products              = [];
let cart                  = [];
let currentView           = 'home';
let wishlist              = [];
let ordersDb              = [];
let currentUser           = null;
let globalSortOrder       = 'default';
let currentCategoryFilter = null;
let currentSubFilter      = null;
let currentCheckoutItems  = [];
let viewingProductId      = null;
let selectedSize          = 'M';
let currentCheckoutStep   = 1;
let selectedPaymentMethod = 'upi';
let addressFormData       = {};
let quickSizeModalProduct = null;
let quickSelectedSize     = null;
let realtimeChannel       = null;
let currentTrackingOrder  = null;
let currentRating         = 5;
let deferredPrompt        = null;
let walletBalance         = 0;
let isAdminLoggedIn       = false;
let isExchangeProcess     = false;
let exchangeSourceOrder   = null;
let exchangeOldPrice      = 0;
let _pendingCancelOrderId = null;
let activeReferralCode    = null;
let adminPressTimer       = null;

/* ============================================================
   3. CONSTANTS — CATEGORIES (Perfumes with ML sizes)
   ============================================================ */
const CATEGORIES = [
   {
        id: 'men', name: 'Men', icon: 'fa-male',
        subs: ['T-Shirts','Casual Shirts','Formal Shirts','Oversized Tees','Oversized Shirts','Hoodies','Denim Jacket',
               'Baggy Jeans','Straight Fit Jeans','Slim Fit Jeans','Cotton Trousers','Joggers','Cargo Pants','Formal Pant','Trousers',
               'Sneakers','Formal Shoes','Sports Shoes','Sandals','Slippers',
               'Watches','Earbuds','Wallets','Sunglasses','Belts',
               'Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)',
               'Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)',
               'Ethnic Combo (Kurta+Pant Set)','Sherwani Set (Sherwani+Pant Set)','Nehru Jacket Combo'],
        groups: [
            { label: '👕 Topwear',     items: ['T-Shirts','Casual Shirts','Formal Shirts','Oversized Tees','Oversized Shirts','Hoodies','Denim Jacket'] },
            { label: '👖 Bottomwear',  items: ['Baggy Jeans','Straight Fit Jeans','Slim Fit Jeans','Cotton Trousers','Joggers','Cargo Pants','Formal Pant','Trousers'] },
            { label: '👟 Footwear',    items: ['Sneakers','Formal Shoes','Sports Shoes','Sandals','Slippers'] },
            { label: '⌚ Accessories', items: ['Watches','Earbuds','Wallets','Sunglasses','Belts'] },
            { label: '🎁 Full Combos', items: ['Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)','Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)','Ethnic Combo (Kurta+Pant+Dupatta)','Sherwani Set (Sherwani+Pant+Dupatta)','Nehru Jacket Combo'] },
        ]
    },
    {
         id: 'women', name: 'Women', icon: 'fa-female',
        subs: ['Sarees','Kurtis','Salwar Suits','Lehengas',
               'Tops','Straight Fit Jeans','Baggy Jeans','Cargo Jeans','Skinny Fit Jeans','Slim Fit Jeans','Palazzo','Tops & Tunics','Dresses','Skirts',
               'Heels','Flats','Sandals','Sneakers','Wedges',
               'Jewellery Sets','Earrings','Bangles','Handbags','Sunglasses','Watches','Necklace Sets',
               'Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)',
               'Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)'],
        groups: [
            { label: '🥻 Ethnic',      items: ['Sarees','Kurtis','Salwar Suits','Lehengas'] },
            { label: '👖 Jeans',       items: ['Straight Fit Jeans','Baggy Jeans','Cargo Jeans','Skinny Fit Jeans','Slim Fit Jeans'] },
            { label: '👗 Western',     items: ['Tops','Palazzo','Tops & Tunics','Dresses','Skirts'] },
            { label: '👠 Footwear',    items: ['Heels','Flats','Sandals','Sneakers','Wedges'] },
            { label: '💍 Jewellery',   items: ['Necklace Sets','Earrings','Bangles'] },
            { label: '👜 Accessories', items: ['Jewellery Sets','Handbags','Sunglasses','Watches'] },
            { label: '🎁 Full Combos', items: ['Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)','Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)'] },
        ]
    },
    {
        id: 'Perfumes', name: 'Perfumes', icon: 'fa-spray-can',
        color: 'from-pink-400 to-purple-500',
        subs: ["Men's Perfume","Women's Perfume","Unisex Perfume","Luxury Perfume","Budget Perfume",
               "Attar / Ittar","Body Mist","Deodorant Spray","Gift Set"],
        groups: [
            { label: '🌸 For Her',    items: ["Women's Perfume","Body Mist","Gift Set"] },
            { label: '💼 For Him',    items: ["Men's Perfume","Attar / Ittar","Deodorant Spray"] },
            { label: '✨ Unisex',     items: ["Unisex Perfume","Luxury Perfume","Budget Perfume"] },
        ],
        /* Perfumes use ML sizes instead of S/M/L */
        sizesType: 'ml',
        mlSizes: ['10ml','20ml','30ml','50ml','75ml','100ml','150ml','200ml','250ml'],
    },
    {
        id: 'kids', name: 'Kids', icon: 'fa-child',
        color: 'from-yellow-400 to-orange-400',
        subs: ['Boys T-Shirts','Boys Shirts','Boys Hoodies','Boys Jackets',
               'Girls Frocks','Girls Tops','Girls Kurtis','Girls Lehenga',
               'Kids Jeans','Kids Shorts','Kids Trackpants','Baby Bodysuits',
               'Kids Sneakers','Kids Sandals','Kids School Shoes','Kids Slippers',
               'School Bags','Kids Caps','Kids Socks','Kids Belts',
               'Boys Party Set (Coat+Pant+Shirt)','Girls Lehenga Choli Full Set',
               'Dungaree Combo (Top+Dungaree)','Baba Suit Set','Kids Ethnic Set'],
        groups: [
            { label: '👦 Boys Topwear',   items: ['Boys T-Shirts','Boys Shirts','Boys Hoodies','Boys Jackets'] },
            { label: '👧 Girls Clothing', items: ['Girls Frocks','Girls Tops','Girls Kurtis','Girls Lehenga'] },
            { label: '👖 Bottomwear',     items: ['Kids Jeans','Kids Shorts','Kids Trackpants','Baby Bodysuits'] },
            { label: '👟 Footwear',       items: ['Kids Sneakers','Kids Sandals','Kids School Shoes','Kids Slippers'] },
            { label: '🎒 Accessories',    items: ['School Bags','Kids Caps','Kids Socks','Kids Belts'] },
            { label: '🎁 Full Combos',    items: ['Boys Party Set (Coat+Pant+Shirt)','Girls Lehenga Choli Full Set','Dungaree Combo (Top+Dungaree)','Baba Suit Set','Kids Ethnic Set'] },
        ]
    },
];

/* Helper: check if a category/sub is Perfume type (use ML instead of sizes) */
function isPerfumeCategory(cat) {
    return String(cat || '').toLowerCase() === 'perfumes';
}

const PERFUME_ML_SIZES = ['10ml','20ml','30ml','50ml','75ml','100ml','150ml','200ml','250ml'];

const COMBO_SUBS = new Set([
    'Formal Combo (Shirt+Trouser+Belt+Tie)','Casual Combo (Tee+Baggy Jeans+Locket)',
    'Streetwear Combo (Oversized Tee+Cargo+Chain)','Tracksuit (Full Upper & Lower)',
    'Ethnic Combo (Kurta+Pant+Dupatta)','Sherwani Set (Sherwani+Pant+Dupatta)','Nehru Jacket Combo',
    'Ethnic Set (Kurti+Pant+Dupatta)','Western Combo (Top+Straight Jeans+Belt)',
    'Party Combo (Saree+Blouse+Belt)','Indo-Western (Top+Palazzo+Shrug)',
    'Boys Party Set (Coat+Pant+Shirt)','Girls Lehenga Choli Full Set',
    'Dungaree Combo (Top+Dungaree)','Baba Suit Set','Kids Ethnic Set',
]);

const STATUS_MAP = {
    'Processing':          ['ordered'],
    'Packed':              ['ordered','packed'],
    'Shipped':             ['ordered','packed','shipped'],
    'Delivered':           ['ordered','packed','shipped','delivered'],
    'Exchange Requested':  ['ex-requested'],
    'Exchange Processing': ['ex-requested','ex-processing'],
    'Exchange Shipped':    ['ex-requested','ex-processing','ex-shipped'],
    'Exchanged':           ['ex-requested','ex-processing','ex-shipped','ex-done'],
    'Cancelled':           [],
};

const ALL_ORDER_STATUSES = [
    'Processing','Packed','Shipped','Delivered','Cancelled',
    'Exchange Requested','Exchange Processing','Exchange Shipped','Exchanged'
];

const STATUS_BADGE = {
    'Processing':          'bg-yellow-100 text-yellow-700',
    'Packed':              'bg-blue-100 text-blue-700',
    'Shipped':             'bg-purple-100 text-purple-700',
    'Delivered':           'bg-green-100 text-green-700',
    'Cancelled':           'bg-red-100 text-red-600',
    'Exchange Requested':  'bg-orange-100 text-orange-600',
    'Exchange Processing': 'bg-orange-200 text-orange-700',
    'Exchange Shipped':    'bg-amber-100 text-amber-700',
    'Exchanged':           'bg-teal-100 text-teal-700',
};

/* ============================================================
   4. DOM READY — INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
    captureReferralFromUrl();
    initCart();

    const saved = localStorage.getItem('outfitkart_session');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            await fetchUserData();
        } catch (e) {
            localStorage.removeItem('outfitkart_session');
            currentUser = null;
        }
    }

    const adminSession = localStorage.getItem('outfitkart_admin_session');
    if (adminSession === 'true' && currentUser && isAuthorizedAdmin(currentUser)) {
        isAdminLoggedIn = true;
        setTimeout(() => navigate('admin'), 500);
    } else if (adminSession === 'true') {
        // Clear invalid admin session
        localStorage.removeItem('outfitkart_admin_session');
        isAdminLoggedIn = false;
    }

    toggleProductMode('auto');
    updateDropdownSubs('ap-category', 'ap-sub');
    renderCategoryBubbles();
    renderProductGrid('trending-grid', [], true);
    await fetchProducts();
    checkAuthUI();

    const pid = new URLSearchParams(window.location.search).get('pid');
    if (pid) openProductPage(parseInt(pid));
    _setOgTags();
    // Start banner carousel
    setTimeout(_bannerInit, 300);
});


/* ============================================================
   BANNER CAROUSEL — 3 slides, auto every 3s, touch swipe
   ============================================================ */
let _bannerCurrent  = 0;
const _bannerTotal  = 3;
let _bannerInterval = null;
let _bannerTouchX   = 0;

function _bannerInit() {
    _bannerApply(0);                              // set initial state
    _bannerInterval = setInterval(nextBannerSlide, 3000);

    const el = document.getElementById('banner-carousel');
    if (!el) return;
    el.addEventListener('touchstart', e => { _bannerTouchX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - _bannerTouchX;
        if (Math.abs(dx) > 45) dx < 0 ? nextBannerSlide() : prevBannerSlide();
    }, { passive: true });
}

function _bannerApply(idx) {
    const slides = document.querySelectorAll('#banner-carousel .banner-slide');
    const dots   = [
        document.getElementById('banner-dot-0'),
        document.getElementById('banner-dot-1'),
        document.getElementById('banner-dot-2'),
    ];
    if (!slides.length) return;

    slides.forEach((s, i) => {
        s.style.opacity = i === idx ? '1' : '0';
        s.style.zIndex  = i === idx ? '1' : '0';
    });

    dots.forEach((d, i) => {
        if (!d) return;
        d.style.width   = i === idx ? '1.5rem' : '0.5rem';
        d.style.opacity = i === idx ? '1'      : '0.4';
    });

    _bannerCurrent = idx;
}

function goBannerSlide(idx) {
    _bannerApply(idx);
    clearInterval(_bannerInterval);
    _bannerInterval = setInterval(nextBannerSlide, 3000);
}

function nextBannerSlide() { _bannerApply((_bannerCurrent + 1) % _bannerTotal); }
function prevBannerSlide() { _bannerApply((_bannerCurrent - 1 + _bannerTotal) % _bannerTotal); }

/* ============================================================
   5. ADMIN ACCESS CONTROL
   Long-press logo: only opens if currentUser is an authorized admin
   ============================================================ */
function startAdminTimer() {
    adminPressTimer = setTimeout(() => {
        if (!isAdminLoggedIn) {
            showAdminLogin();
        } else {
            navigate('admin');
        }
    }, 3000);
}

function cancelAdminTimer() { clearTimeout(adminPressTimer); }

document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdminLoggedIn) { showAdminLogin(); } else { navigate('admin'); }
    }
});

/* ============================================================
   6. REFERRAL SYSTEM
   ============================================================ */
function captureReferralFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.length >= 4) {
        activeReferralCode = ref.toUpperCase();
        localStorage.setItem('outfitkart_active_referral', activeReferralCode);
    } else {
        const stored = localStorage.getItem('outfitkart_active_referral');
        if (stored) activeReferralCode = stored;
    }
}

function generateReferralCode(name, mobile) {
    const userName = (name || 'USER').toUpperCase().replace(/[^A-Z]/g, '');
    const namePart = userName.substring(0, 4).padEnd(4, 'X');
    const mobilePart = String(mobile).slice(-3);
    return namePart + mobilePart;
}

async function loadUserReferralCode() {
    if (!currentUser) return;
    const codeEl = document.getElementById('user-referral-code');
    try {
        const { data, error } = await dbClient.from('users').select('referral_code, name').eq('mobile', currentUser.mobile).single();
        if (error) throw error;
        let refCode = data?.referral_code;
        if (!refCode) {
            refCode = generateReferralCode(data?.name || currentUser.name, currentUser.mobile);
            await dbClient.from('users').update({ referral_code: refCode }).eq('mobile', currentUser.mobile);
        }
        if (codeEl) codeEl.textContent = refCode;
        currentUser.referral_code = refCode;
        localStorage.setItem('outfitkart_session', JSON.stringify(currentUser));
    } catch (err) {
        const fallback = generateReferralCode(currentUser.name, currentUser.mobile);
        if (codeEl) codeEl.textContent = fallback;
    }
    renderSidebarReferralWidget();
}

async function copyReferralCode() {
    const codeEl = document.getElementById('user-referral-code');
    const sidebarCodeEl = document.getElementById('sidebar-referral-code');
    const code = (codeEl?.textContent || sidebarCodeEl?.textContent || '').trim();
    if (!code || code === 'LOADING...') {
        if (currentUser) {
            const fallback = currentUser.referral_code || generateReferralCode(currentUser.name, currentUser.mobile);
            try { await navigator.clipboard.writeText(fallback); } catch {}
            showToast(`✅ Code copied: ${fallback}`);
        } else showToast('Please login first!');
        return;
    }
    try { await navigator.clipboard.writeText(code); } catch {}
    showToast(`✅ Referral code copied: ${code}`);
}

async function shareWithReferral(productId, productName, price) {
    if (!currentUser) { showToast('Login to share your referral link!'); return; }
    const code = currentUser.referral_code || generateReferralCode(currentUser.name, currentUser.mobile);
    const baseUrl = window.location.origin + window.location.pathname;
    const url = productId ? `${baseUrl}?pid=${productId}&ref=${code}` : `${baseUrl}?ref=${code}`;
    const text = productId
        ? `🛍️ Check out ${productName} for ₹${price} on OutfitKart! Use my code and get great deals. COD available.`
        : `🛍️ Shop premium fashion on OutfitKart! Amazing deals, COD available.`;
    if (navigator.share) {
        try { await navigator.share({ title: 'OutfitKart', text, url }); } catch {}
    } else {
        try { await navigator.clipboard.writeText(`${text}\n${url}`); showToast('Referral link copied! 📋'); }
        catch { window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank'); }
    }
}

async function recordReferralPurchase(orderId, orderTotal) {
    if (!activeReferralCode) return;
    try {
        const { data: referrer, error } = await dbClient.from('users').select('mobile, name, referral_code').eq('referral_code', activeReferralCode).maybeSingle();
        if (error || !referrer) return;
        if (currentUser && referrer.mobile === currentUser.mobile) return;
        const commission = Math.round(orderTotal * 0.05);
        if (commission <= 0) return;
        await dbClient.from('referrals').insert([{
            referrer_mobile: referrer.mobile,
            buyer_mobile:    currentUser?.mobile || 'guest',
            order_id:        String(orderId),
            order_total:     orderTotal,
            commission:      commission,
            status:          'pending',
            date:            new Date().toLocaleDateString('en-IN'),
            referral_code:   activeReferralCode,
            created_at:      new Date().toISOString(),
        }]);
        localStorage.removeItem('outfitkart_active_referral');
        activeReferralCode = null;
    } catch (err) { console.error('[Referral] recordReferralPurchase:', err); }
}

async function cancelReferralForOrder(orderId) {
    if (!orderId) return;
    try {
        await dbClient.from('referrals').update({ status: 'cancelled' }).eq('order_id', String(orderId)).eq('status', 'pending');
    } catch (err) { console.error('[Referral] cancelReferralForOrder:', err); }
}

async function loadReferrals() {
    if (!currentUser) return;
    ['referrals-pending-list','referrals-confirmed-list','referrals-cancelled-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="text-center py-6 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';
    });
    try {
        const { data: referrals, error } = await dbClient.from('referrals').select('*').eq('referrer_mobile', currentUser.mobile).order('created_at', { ascending: false });
        if (error) throw error;
        const pending   = referrals?.filter(r => r.status === 'pending')   || [];
        const confirmed = referrals?.filter(r => r.status === 'confirmed') || [];
        const cancelled = referrals?.filter(r => r.status === 'cancelled') || [];
        const pendingTotal   = pending.reduce((s, r)   => s + (r.commission || 0), 0);
        const confirmedTotal = confirmed.reduce((s, r) => s + (r.commission || 0), 0);
        const cancelledTotal = cancelled.reduce((s, r) => s + (r.commission || 0), 0);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('pending-earnings', `₹${pendingTotal}`); set('confirmed-earnings', `₹${confirmedTotal}`);
        set('cancelled-earnings', `₹${cancelledTotal}`); set('pending-count', pending.length);
        set('confirmed-count', confirmed.length); set('cancelled-count', cancelled.length);
        set('referral-earnings-badge', `₹${pendingTotal + confirmedTotal}`);
        renderReferralList('referrals-pending-list',   pending,   'pending');
        renderReferralList('referrals-confirmed-list', confirmed, 'confirmed');
        renderReferralList('referrals-cancelled-list', cancelled, 'cancelled');
    } catch (err) { showToast('⚠️ Make sure the "referrals" table exists in Supabase.'); }
}

function renderReferralList(containerId, items, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const EMPTY = {
        pending:   { icon: 'fa-hourglass-half', msg: 'No pending referrals',  sub: 'Share products to start earning!' },
        confirmed: { icon: 'fa-check-circle',   msg: 'No confirmed earnings', sub: 'Earnings appear here after 30 days' },
        cancelled: { icon: 'fa-times-circle',   msg: 'No cancelled referrals',sub: 'Cancelled orders appear here' },
    };
    const STYLE = {
        pending:   { badge: 'bg-amber-100 text-amber-700', icon: '⏳', label: 'Pending',   amount: 'text-amber-500' },
        confirmed: { badge: 'bg-green-100 text-green-700', icon: '✅', label: 'Confirmed', amount: 'text-green-600' },
        cancelled: { badge: 'bg-red-100 text-red-600',     icon: '❌', label: 'Cancelled', amount: 'text-red-400 line-through' },
    };
    if (!items.length) {
        const e = EMPTY[type];
        el.innerHTML = `<div class="text-center py-10 text-gray-400"><i class="fas ${e.icon} text-5xl mb-3"></i><p class="font-semibold">${e.msg}</p><p class="text-sm mt-1">${e.sub}</p></div>`;
        return;
    }
    const s = STYLE[type];
    el.innerHTML = items.map(r => {
        let daysInfo = '';
        if (type === 'pending' && r.created_at) {
            const confirmAt = new Date(new Date(r.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
            const daysLeft  = Math.max(0, Math.ceil((confirmAt - Date.now()) / (1000 * 60 * 60 * 24)));
            daysInfo = `<div class="text-xs text-blue-600 mt-1 font-medium"><i class="fas fa-clock mr-1"></i>Confirms in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</div>`;
        }
        if (type === 'confirmed' && r.confirmed_at) daysInfo = `<div class="text-xs text-green-600 mt-1"><i class="fas fa-check mr-1"></i>Credited on ${new Date(r.confirmed_at).toLocaleDateString('en-IN')}</div>`;
        if (type === 'cancelled') daysInfo = `<div class="text-xs text-red-500 mt-1"><i class="fas fa-ban mr-1"></i>Order cancelled — no commission</div>`;
        return `<div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm text-gray-800">Order #${r.order_id}</div>
                    <div class="text-xs text-gray-500 mt-0.5">Buyer: +91 ${r.buyer_mobile}</div>
                    <div class="text-xs text-gray-500">Date: ${r.date || '—'}</div>
                    <div class="text-xs text-gray-600 mt-1">Order Total: ₹${(r.order_total||0).toLocaleString()}</div>
                    <div class="text-xs text-gray-400">5% of ₹${(r.order_total||0).toLocaleString()}</div>
                    ${daysInfo}
                </div>
                <div class="text-right ml-3 flex-shrink-0">
                    <div class="text-xl font-black ${s.amount}">${type==='cancelled'?'':'+'}₹${r.commission}</div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}">${s.icon} ${s.label}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function switchReferralTab(tab) {
    ['pending','confirmed','cancelled'].forEach(t => {
        const btn  = document.getElementById(`btn-ref-${t}`);
        const list = document.getElementById(`referrals-${t}-list`);
        const isActive = t === tab;
        if (btn)  btn.className  = isActive ? 'pb-2 px-4 text-sm font-bold text-green-600 border-b-2 border-green-600 whitespace-nowrap' : 'pb-2 px-4 text-sm font-bold text-gray-500 hover:text-gray-700 whitespace-nowrap';
        if (list) list.classList.toggle('hidden', !isActive);
    });
}

function renderSidebarReferralWidget() {
    const container = document.getElementById('sidebar-referral-widget');
    if (!container || !currentUser) return;
    const code = currentUser.referral_code || generateReferralCode(currentUser.name, currentUser.mobile);
    container.innerHTML = `
        <div class="px-3 pb-3 bg-gradient-to-br from-green-50 to-emerald-50 border-t border-green-100">
            <div class="mt-2 bg-white rounded-lg p-2.5 border border-dashed border-green-300">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Your Referral Code</p>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-lg font-black text-green-600 tracking-widest" id="sidebar-referral-code">${code}</span>
                    <button onclick="copyReferralCode()" class="bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg hover:bg-green-600 active:scale-95 transition-all whitespace-nowrap"><i class="fas fa-copy mr-0.5"></i> Copy</button>
                </div>
                <p class="text-[9px] text-gray-400 mt-1">Earn 5% on every referral purchase!</p>
            </div>
        </div>`;
}

function updateHeaderWallet(balance) {
    const el   = document.getElementById('header-wallet-display');
    const pill = document.getElementById('header-wallet-pill');
    if (!el) return;
    if (balance > 0) {
        el.textContent = '₹' + balance.toLocaleString();
        if (pill) { pill.classList.remove('hidden'); pill.classList.add('flex'); }
    } else {
        if (pill) { pill.classList.add('hidden'); pill.classList.remove('flex'); }
    }
}

/* ============================================================
   7. CART
   ============================================================ */
function initCart() { loadCart(); updateCartCount(); }

function loadCart() {
    try {
        const saved = localStorage.getItem('outfitkart_cart');
        cart = saved ? JSON.parse(saved) : [];
        cart.forEach(i => { if (!i.size) i.size = 'M'; });
    } catch (e) { cart = []; localStorage.removeItem('outfitkart_cart'); }
}

function saveCart() { localStorage.setItem('outfitkart_cart', JSON.stringify(cart)); }

window.addToCart = function (productId, size) {
    size = size || 'M';
    const key = `${productId}-${size}`;
    const idx = cart.findIndex(i => `${i.productId}-${i.size}` === key);
    if (idx > -1) { cart[idx].qty += 1; showToast(`+1 ${size} added (Total: ${cart[idx].qty}) 🛒`); }
    else { cart.push({ productId, size, qty: 1 }); showToast(`${size} added to cart 🛒`); }
    saveCart(); updateCartCount();
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar && !sidebar.classList.contains('translate-x-full')) renderCart();
};

function updateQty(productId, size, delta) {
    const key = `${productId}-${size}`;
    const idx = cart.findIndex(i => `${i.productId}-${i.size}` === key);
    if (idx === -1) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) { cart.splice(idx, 1); showToast('Item removed 🗑️'); }
    saveCart(); updateCartCount(); renderCart();
}

function removeFromCart(productId, size) {
    cart = cart.filter(i => `${i.productId}-${i.size}` !== `${productId}-${size}`);
    saveCart(); updateCartCount(); renderCart();
    showToast('Removed from cart 🗑️');
}

function updateCartCount() {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    ['cart-count','mobile-cart-badge','tab-cart-count'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = total; });
    const badge = document.getElementById('mobile-cart-badge');
    if (badge) badge.classList.toggle('hidden', total === 0);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total-price');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-center h-full"><div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-shopping-bag text-3xl text-gray-400"></i></div><h3 class="text-lg font-bold text-gray-800 mb-2">Your cart feels lonely</h3><p class="text-sm text-gray-500 mb-6">Nothing added yet.</p><button onclick="toggleCart(); navigate('shop')" class="bg-rose-600 text-white px-8 py-2 rounded-lg font-bold text-sm hover:bg-rose-700">Continue Shopping</button></div>`;
        if (totalEl) totalEl.textContent = '₹0';
        return;
    }
    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const p = products.find(x => x.id === item.productId);
        if (!p) return '';
        const img = p.imgs?.[0] || p.img || 'https://placehold.co/80x80/eee/666?text=?';
        subtotal += p.price * item.qty;
        const sizeLabel = isPerfumeCategory(p.category) ? `Volume: ${item.size}` : `Size: ${item.size}`;
        return `<div class="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all"><div class="flex gap-3"><div class="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50"><img src="${img}" class="w-full h-full object-cover" alt="${p.name}" loading="lazy"></div><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm text-gray-900 truncate mb-1">${p.name}</h4><p class="text-xs text-blue-600 font-semibold mb-1">${sizeLabel}</p><div class="flex items-baseline gap-2 mb-2"><span class="text-lg font-black text-gray-900">₹${p.price}</span>${p.oldprice?`<span class="text-xs text-gray-400 line-through">₹${p.oldprice}</span>`:''}</div><div class="flex items-center justify-between"><div class="flex items-center bg-gray-100 rounded-lg p-1"><button onclick="updateQty(${item.productId},'${item.size}',-1)" class="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-rose-600 hover:bg-gray-200 rounded font-bold text-sm">-</button><span class="w-8 text-center font-bold text-sm">${item.qty}</span><button onclick="updateQty(${item.productId},'${item.size}',1)" class="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-rose-600 hover:bg-gray-200 rounded font-bold text-sm">+</button></div><button onclick="removeFromCart(${item.productId},'${item.size}')" class="text-rose-500 hover:text-rose-600 font-bold text-sm px-2 py-1 rounded hover:bg-rose-50"><i class="fas fa-trash-alt text-xs"></i></button></div></div></div></div>`;
    }).join('');
    if (totalEl) totalEl.textContent = `₹${subtotal.toLocaleString()}`;
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    const isOpen  = !sidebar.classList.contains('translate-x-full');
    if (isOpen) { sidebar.classList.add('translate-x-full'); overlay.classList.add('hidden'); }
    else { sidebar.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); renderCart(); }
}

/* ============================================================
   8. QUICK SIZE MODAL — Perfumes show ML
   ============================================================ */
function showQuickSizeModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return showToast('Product not found');
    quickSizeModalProduct = productId;
    const isPerf = isPerfumeCategory(product.category);
    const sizes  = isPerf
        ? (product.available_sizes?.length ? product.available_sizes : PERFUME_ML_SIZES)
        : (product.available_sizes?.length ? product.available_sizes : getDefaultSizes(product.sub || product.category));
    quickSelectedSize = sizes[0];
    const label  = isPerf ? 'Select Volume (ML)' : 'Select Size';
    document.querySelector('#quick-size-modal h3').textContent = label;
    document.getElementById('quick-size-grid').innerHTML = sizes.map(s =>
        `<button onclick="selectQuickSize('${s}')" class="size-btn px-5 py-2 rounded-xl border-2 font-bold text-sm transition-all ${quickSelectedSize === s ? 'border-rose-600 bg-rose-600 text-white shadow-lg' : 'border-gray-300'}">${s}</button>`
    ).join('');
    const modal = document.getElementById('quick-size-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function selectQuickSize(size) {
    quickSelectedSize = size;
    document.querySelectorAll('#quick-size-grid .size-btn').forEach(btn => {
        const m = btn.textContent.trim() === size;
        btn.classList.toggle('border-rose-600', m); btn.classList.toggle('bg-rose-600', m);
        btn.classList.toggle('text-white', m); btn.classList.toggle('shadow-lg', m);
        btn.classList.toggle('border-gray-300', !m);
    });
}

function addFromQuickModal() {
    if (quickSizeModalProduct && quickSelectedSize) { addToCart(quickSizeModalProduct, quickSelectedSize); hideQuickSizeModal(); }
}

function hideQuickSizeModal() {
    const modal = document.getElementById('quick-size-modal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
    quickSizeModalProduct = null; quickSelectedSize = null;
}

function getDefaultSizes(subOrCat = '') {
    const l = subOrCat.toLowerCase();
    if (l.includes('jean') || l.includes('pant') || l.includes('cargo') || l.includes('trouser') || l.includes('short')) return ['28','30','32','34','36'];
    if (l.includes('sneak') || l.includes('heel') || l.includes('flat') || l.includes('shoe')) return ['6','7','8','9','10'];
    return ['XS','S','M','L','XL','XXL'];
}

/* ============================================================
   9. PRODUCTS
   ============================================================ */
async function fetchProducts(retry = 0) {
    try {
        const { data, error } = await dbClient.from('products').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            products = data;
            updateProductCountBadge(products.length);
            renderProductGrid('trending-grid', products.filter(p => p.istrending));
            if (!document.getElementById('view-shop').classList.contains('hidden')) renderShopProducts();
        } else {
            products = [{ id: 1, name: '👑 No Products Yet — Use Admin Panel!', price: 999, oldprice: 1999, category: 'Admin', sub: 'Empty', img: 'https://placehold.co/300x400/e11d48/ffffff?text=Add+Products', istrending: true, desc: 'Login to Admin Panel → Add products!' }];
            renderProductGrid('trending-grid', products);
            updateProductCountBadge(0, 'empty');
        }
    } catch (err) {
        if (retry < 3) { await new Promise(r => setTimeout(r, 2000)); return fetchProducts(retry + 1); }
        updateProductCountBadge(0, 'error');
    }
}

function updateProductCountBadge(count, status = 'live') {
    const el = document.getElementById('products-count');
    if (!el) return;
    if (status === 'error')      { el.textContent = '!'; el.className = 'absolute -top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm'; }
    else if (status === 'empty') { el.textContent = '0'; el.className = 'absolute -top-1 right-1 bg-gray-400 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm'; }
    else { el.textContent = count > 99 ? '99+' : count; el.className = 'absolute -top-1 right-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm'; }
}

function createProductCard(p) {
    try {
        const inWishlist  = wishlist.includes(p.id);
        const img         = p.imgs?.[0] || p.img || 'https://placehold.co/300x400/e11d48/ffffff?text=OutfitKart';
        const hasDiscount = p.oldprice && p.oldprice > p.price;
        const discPct     = hasDiscount ? Math.round(((p.oldprice - p.price) / p.oldprice) * 100) : 0;
        const isPerf      = isPerfumeCategory(p.category);
        const sizes       = isPerf
            ? (p.available_sizes?.length ? p.available_sizes : PERFUME_ML_SIZES)
            : (p.available_sizes || getDefaultSizes(p.sub || p.category));
        const isCombo     = COMBO_SUBS.has(p.sub || '');
        const sizeLabel   = isPerf ? `Vol: ${sizes.slice(0,3).join(' · ')}${sizes.length>3?' +more':''}` : `Sizes: ${sizes.slice(0,3).join(' · ')}${sizes.length>3?' +more':''}`;
        return `<div class="product-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col cursor-pointer hover:shadow-md transition-shadow" onclick="openProductPage(${p.id})">
        <button class="absolute top-2 right-2 z-20 ${inWishlist?'text-rose-500 scale-110':'text-gray-300'} hover:text-rose-600 bg-white/90 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center shadow border transition-all" onclick="event.stopPropagation(); toggleWishlist(${p.id})"><i class="${inWishlist?'fas':'far'} fa-heart text-sm"></i></button>
        <button class="absolute top-12 right-2 z-20 text-gray-400 hover:text-rose-600 bg-white/90 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center shadow border transition-all" onclick="event.stopPropagation(); showQuickSizeModal(${p.id})"><i class="fas fa-cart-plus text-sm"></i></button>
        ${hasDiscount?`<div class="absolute top-2 left-2 z-20 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">${discPct}% OFF</div>`:''}
        ${isCombo?'<div class="absolute z-20 bg-amber-400 text-gray-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-md" style="bottom:76px;left:8px">🎁 Full Combo</div>':''}
        ${isPerf?'<div class="absolute z-20 bg-purple-100 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-full" style="bottom:76px;left:8px">🌸 Perfume</div>':''}
        <div class="overflow-hidden bg-gray-50"><img src="${img}" loading="lazy" class="w-full h-48 md:h-52 object-cover hover:scale-[1.05] transition-transform duration-500" alt="${p.name}" onerror="this.src='https://placehold.co/300x400/f8fafc/94a3b8?text=OutfitKart'"></div>
        <div class="p-3 flex flex-col flex-grow">
            ${p.brand?`<div class="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-0.5">${p.brand}</div>`:''}
            <h4 class="text-sm font-semibold leading-snug line-clamp-2 text-gray-900 mb-1" style="min-height:2.4rem">${p.name}</h4>
            ${sizes.length?`<p class="text-[10px] text-blue-500 font-semibold mb-1">${sizeLabel}</p>`:''}
            <div class="mt-auto pt-2 border-t border-gray-100">
                <div class="flex items-baseline gap-1.5 mb-1.5"><span class="font-black text-base text-gray-900">₹${p.price?.toLocaleString('en-IN')}</span>${hasDiscount?`<span class="text-xs text-gray-400 line-through">₹${p.oldprice}</span><span class="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">${discPct}% off</span>`:''}</div>
                <span class="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fas fa-truck text-[8px]"></i> Cash on Delivery</span>
            </div>
        </div>
        </div>`;
    } catch (e) { return ''; }
}

function renderProductGrid(containerId, list, loading = false) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (loading) { el.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-rose-500 mb-4"></i><p class="text-lg font-semibold text-gray-700">Loading Products...</p></div>`; return; }
    if (!list || list.length === 0) { el.innerHTML = `<div class="col-span-full text-center py-12 bg-blue-50 border-2 border-blue-200 rounded-xl"><i class="fas fa-inbox text-5xl text-blue-500 mb-4"></i><h3 class="text-xl font-bold text-blue-800 mb-2">No Products Found</h3><button onclick="fetchProducts()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold mr-2">🔄 Refresh</button><button onclick="navigate('shop')" class="bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold">Browse All</button></div>`; return; }
    el.innerHTML = list.map(p => createProductCard(p)).join('');
}

function renderCategoryBubbles() {
    const colors = { 'Men': 'from-blue-500 to-indigo-500', 'Women': 'from-rose-500 to-pink-500', 'Kids': 'from-yellow-400 to-orange-400', 'Perfumes': 'from-pink-400 to-purple-500' };
    document.getElementById('category-bubbles').innerHTML = CATEGORIES.map(c =>
        `<div class="flex flex-col items-center gap-2 cursor-pointer min-w-[72px] active:scale-95 transition-transform" onclick="openCategoryPage('${c.name}')">
           <div class="w-16 h-16 rounded-full bg-gradient-to-br ${colors[c.name]||'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-2xl shadow-md hover:scale-110 transition-transform"><i class="fas ${c.icon}"></i></div>
           <span class="text-xs font-semibold text-gray-700">${c.name}</span>
         </div>`
    ).join('');
}

/* ============================================================
   10. CATEGORY / SHOP
   ============================================================ */
function openCategoryPage(categoryName) {
    const cData = CATEGORIES.find(c => c.name === categoryName);
    if (!cData) return;
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    currentView = 'category';
    document.getElementById('view-category').classList.remove('hidden');
    document.getElementById('cat-page-title').textContent = `${categoryName} Collection`;
    const viewAllBtn = document.getElementById('cat-view-all-btn');
    if (viewAllBtn) viewAllBtn.dataset.cat = categoryName;
    const grid = document.getElementById('cat-page-subcat-grid');
    let html = '';
    if (cData.groups) {
        cData.groups.forEach(group => {
            html += `<div class="col-span-2 md:col-span-3 text-xs font-black text-gray-400 uppercase tracking-widest pt-2 pb-1 border-b border-gray-100">${group.label}</div>`;
            html += group.items.map(sub => {
                const safe = sub.replace(/'/g, "\\'"); const isCombo = COMBO_SUBS.has(sub);
                return `<div onclick="openSubcatProducts('${categoryName}','${safe}')" class="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 hover:shadow-md hover:border-rose-200 transition-all min-h-[90px] text-center">${isCombo?'<span class="absolute top-2 right-2 bg-amber-400 text-gray-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">🎁</span>':''}<span class="text-sm font-bold text-gray-800 leading-snug">${sub}</span></div>`;
            }).join('');
        });
    } else {
        html += cData.subs.map(sub => {
            const safe = sub.replace(/'/g, "\\'");
            return `<div onclick="openSubcatProducts('${categoryName}','${safe}')" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-center cursor-pointer active:scale-95 hover:shadow-md hover:border-rose-200 transition-all min-h-[80px] text-center"><span class="text-sm font-bold text-gray-800">${sub}</span></div>`;
        }).join('');
    }
    grid.innerHTML = html;
    window.scrollTo(0, 0); updateBottomNav();
}

function openSubcatProducts(categoryName, sub) {
    currentCategoryFilter = categoryName; currentSubFilter = sub || null;
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    currentView = 'shop'; document.getElementById('view-shop').classList.remove('hidden');
    const titleEl = document.getElementById('shop-title');
    if (titleEl) titleEl.textContent = sub ? sub : `${categoryName} Collection`;
    const filtersEl = document.getElementById('subcategory-filters'); if (filtersEl) filtersEl.innerHTML = '';
    renderShopProducts(); window.scrollTo(0, 0); updateBottomNav(); _initShopScrollHide();
}

function renderShopSubcategories() {
    try {
        const el = document.getElementById('subcategory-filters'); if (!el) return;
        el.classList.remove('subcat-hidden');
        if (!currentCategoryFilter) { el.innerHTML = ''; return; }
        const cData = CATEGORIES.find(c => c.name === currentCategoryFilter); if (!cData) return;
        let html = `<button class="px-3 py-1.5 text-xs border rounded-full whitespace-nowrap font-semibold transition-all ${!currentSubFilter?'bg-rose-600 text-white border-rose-600':'bg-white text-gray-600 border-gray-300 hover:border-rose-400'}" onclick="filterSub(null)">All</button>`;
        if (cData.groups) {
            cData.groups.forEach(group => {
                html += `<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center ml-2 mr-0.5 whitespace-nowrap">${group.label}</span>`;
                html += group.items.map(s => {
                    const isCombo=COMBO_SUBS.has(s); const active=currentSubFilter===s; const safe=s.replace(/'/g,"\\'");
                    return `<button class="px-3 py-1.5 text-xs border rounded-full whitespace-nowrap font-semibold transition-all ${active?'bg-rose-600 text-white border-rose-600':'bg-white text-gray-600 border-gray-300 hover:border-rose-400'} ${isCombo?'ring-1 ring-yellow-400 ring-offset-1':''}" onclick="filterSub('${safe}')">${isCombo?'🎁 ':''}${s}</button>`;
                }).join('');
            });
        } else {
            html += cData.subs.map(s => { const safe=s.replace(/'/g,"\\'"); return `<button class="px-3 py-1.5 text-xs border rounded-full whitespace-nowrap ${currentSubFilter===s?'bg-rose-600 text-white':'bg-white text-gray-600'}" onclick="filterSub('${safe}')">${s}</button>`; }).join('');
        }
        el.innerHTML = html;
    } catch (e) {}
}

function filterSub(sub) { currentSubFilter = sub; renderShopSubcategories(); renderShopProducts(); }

let _shopScrollY = 0, _shopScrollTimer = null;
function _initShopScrollHide() {
    const subEl = document.getElementById('subcategory-filters'); if (subEl) subEl.classList.remove('subcat-hidden');
    _shopScrollY = window.scrollY;
    window.removeEventListener('scroll', _shopScrollHandler);
    window.addEventListener('scroll', _shopScrollHandler, { passive: true });
}
function _shopScrollHandler() {
    if (currentView !== 'shop') { window.removeEventListener('scroll', _shopScrollHandler); return; }
    const subEl = document.getElementById('subcategory-filters'); if (!subEl) return;
    const currentY = window.scrollY; const diff = currentY - _shopScrollY;
    if (diff > 40) subEl.classList.add('subcat-hidden'); else if (diff < -20) subEl.classList.remove('subcat-hidden');
    clearTimeout(_shopScrollTimer); _shopScrollTimer = setTimeout(() => { _shopScrollY = window.scrollY; }, 150);
}

function renderShopProducts() {
    let list = products.filter(p => (!currentCategoryFilter||p.category===currentCategoryFilter) && (!currentSubFilter||p.sub===currentSubFilter));
    const sortVal = document.getElementById('shop-sort')?.value || globalSortOrder;
    if (sortVal === 'low') list.sort((a,b) => a.price-b.price);
    else if (sortVal === 'high') list.sort((a,b) => b.price-a.price);
    else if (sortVal === 'trending') list = list.filter(p => p.istrending);
    renderProductGrid('shop-grid', list);
}

function shopSortProducts(val) { globalSortOrder = val; renderShopProducts(); }
function sortProducts(val) {
    globalSortOrder = val;
    ['price-sort-desktop','price-sort-mobile'].forEach(id => { const el=document.getElementById(id); if(el) el.value=val; });
    if (!document.getElementById('view-shop').classList.contains('hidden')) renderShopProducts();
    else navigate('shop');
}

/* ============================================================
   11. SEARCH
   ============================================================ */
function handleSearch(q) {
    q = q.toLowerCase().trim();
    const dRes = document.getElementById('desktop-search-results');
    const mRes = document.getElementById('mobile-search-results');
    if (q.length < 2) { [dRes,mRes].forEach(el => el?.classList.add('hidden')); return; }
    const hits = products.filter(p => p.name.toLowerCase().includes(q));
    const html = hits.length ? hits.map(p => { const img=p.imgs?.[0]||p.img||''; return `<div class="p-2 border-b flex gap-3 hover:bg-gray-50 cursor-pointer items-center" onclick="openProductPage(${p.id}); document.getElementById('desktop-search-results').classList.add('hidden'); document.getElementById('mobile-search-results').classList.add('hidden')"><img src="${img}" class="w-10 h-10 rounded object-cover" loading="lazy"><div><div class="text-sm font-semibold">${p.name}</div><div class="text-xs text-gray-500">₹${p.price}</div></div></div>`; }).join('') : '<div class="p-3 text-sm text-gray-500">No results found</div>';
    [dRes,mRes].forEach(el => { if(el) { el.innerHTML=html; el.classList.remove('hidden'); } });
}

/* ============================================================
   12. NAVIGATION
   ============================================================ */
function navigate(view, cat = null) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    currentView = view;
    if (view === 'profile' && cat) {
        document.getElementById('view-profile').classList.remove('hidden');
        if (currentUser) { let matchBtn=null; document.querySelectorAll('.tab-btn').forEach(b => { if (b.getAttribute('onclick')?.includes(`'${cat}'`)) matchBtn=b; }); switchProfileTab(cat, matchBtn); }
        updateBottomNav(); return;
    }
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.remove('hidden');
    if (view === 'shop') {
        if (cat) { currentCategoryFilter=cat; currentSubFilter=null; document.getElementById('shop-title').textContent=`${cat} Collection`; }
        else { currentCategoryFilter=null; currentSubFilter=null; document.getElementById('shop-title').textContent='Shop All Products'; }
        const filtersEl=document.getElementById('subcategory-filters'); if(filtersEl) filtersEl.innerHTML='';
        renderShopProducts(); _initShopScrollHide();
    }
    if (view === 'checkout') {
        currentCheckoutStep = 1;
        if (currentUser) { preFillUserAddress().then(filled => { if(filled){goToStep(2);showToast('Saved address loaded! 📍');}else renderCheckoutStep(); }).catch(()=>renderCheckoutStep()); }
        else renderCheckoutStep();
    }
    if (view === 'profile') { if(currentUser) fetchUserData().then(()=>checkAuthUI()); else checkAuthUI(); }
    if (view === 'admin') {
        if (!isAdminLoggedIn) { showAdminLogin(); return; }
        document.body.classList.add('admin-active');
        loadAdminDashboard();
    } else {
        document.body.classList.remove('admin-active');
    }
    window.scrollTo(0, 0); updateBottomNav();
}

function updateBottomNav() {
    const views = ['home','shop','cart','profile'];
    const activeView = currentView === 'category' ? 'home' : currentView;
    document.querySelectorAll('nav div').forEach((item,i) => { item.style.color = activeView===views[i]?'#e11d48':'#6b7280'; });
}

function switchProfileTab(tabId, btnEl) {
    document.querySelectorAll('.profile-tab').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
    if (btnEl) btnEl.classList.add('active');
    if (tabId==='orders')    renderOrdersList();
    if (tabId==='wallet')    loadWalletTransactions();
    if (tabId==='wishlist')  renderWishlist();
    if (tabId==='referrals') loadReferrals();
}

/* ============================================================
   13. AUTH
   ============================================================ */
function checkAuthUI() {
    const authForms = document.getElementById('auth-forms');
    const userDash  = document.getElementById('user-dashboard');
    const navText   = document.getElementById('nav-profile-text');
    if (currentUser) {
        authForms?.classList.add('hidden'); userDash?.classList.remove('hidden');
        const set = (id,val) => { const el=document.getElementById(id); if(!el) return; (el.tagName==='INPUT'||el.tagName==='TEXTAREA')?el.value=val:el.innerText=val; };
        set('user-greeting', currentUser.name||'User'); set('user-mobile-display', `+91 ${currentUser.mobile}`);
        set('prof-name', currentUser.name||''); set('prof-email', currentUser.email||'');
        set('prof-address', currentUser.address||''); set('prof-wallet', `₹${currentUser.wallet||0}`);
        const avatar=document.getElementById('user-avatar-img');
        if (avatar) avatar.src=currentUser.profile_pic||`https://placehold.co/100x100/e11d48/ffffff?text=${(currentUser.name||'U').charAt(0).toUpperCase()}`;
        if (navText) navText.innerText=(currentUser.name||'User').split(' ')[0];
        updateHeaderWallet(currentUser.wallet||0);
        loadUserReferralCode(); renderSidebarReferralWidget();
    } else {
        authForms?.classList.remove('hidden'); userDash?.classList.add('hidden');
        if (navText) navText.innerText='Login';
        updateHeaderWallet(0);
    }
}

function switchAuthTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab!=='login');
    document.getElementById('form-signup').classList.toggle('hidden', tab==='login');
    document.getElementById('tab-login').className  = tab==='login'  ? 'px-6 py-2 border-b-2 border-rose-600 font-bold text-rose-600' : 'px-6 py-2 text-gray-500 font-semibold hover:text-rose-600';
    document.getElementById('tab-signup').className = tab==='signup' ? 'px-6 py-2 border-b-2 border-rose-600 font-bold text-rose-600' : 'px-6 py-2 text-gray-500 font-semibold hover:text-rose-600';
}

async function handleSignup(e) {
    e.preventDefault();
    const mobile=document.getElementById('signup-mobile').value.trim();
    const name=document.getElementById('signup-name').value.trim();
    const pass=document.getElementById('signup-password').value;
    if (mobile.length!==10) return showToast('Enter valid 10-digit mobile number');
    if (!name) return showToast('Enter your full name');
    try {
        const {data:exist}=await dbClient.from('users').select('mobile').eq('mobile',mobile).maybeSingle();
        if (exist) return showToast('Mobile already registered! Please login. 📱');
        const refCode=generateReferralCode(name,mobile);
        const {data,error}=await dbClient.from('users').insert([{mobile,name,email:document.getElementById('signup-email').value.trim(),password:pass,wallet:0,referral_code:refCode}]).select().single();
        if (error) throw error;
        currentUser=data; localStorage.setItem('outfitkart_session',JSON.stringify(data));
        e.target.reset(); showToast('Account Created! Welcome 🎉');
        await fetchUserData(); checkAuthUI();
    } catch (err) { showToast('Error: '+(err.message||'Try again')); }
}

async function handleLogin(e) {
    e.preventDefault();
    const mobile=document.getElementById('login-mobile').value.trim();
    const pass=document.getElementById('login-password').value;
    if (mobile.length!==10) return showToast('Enter valid 10-digit mobile number');
    try {
        const {data,error}=await dbClient.from('users').select('*').eq('mobile',mobile).eq('password',pass).maybeSingle();
        if (error) throw error;
        if (data) { currentUser=data; localStorage.setItem('outfitkart_session',JSON.stringify(data)); showToast('Login successful! 🚀'); e.target.reset(); await fetchUserData(); checkAuthUI(); }
        else showToast('Invalid Mobile Number or Password ❌');
    } catch (err) { showToast('Login error: '+err.message); }
}

async function saveProfile() {
    if (!currentUser) return;
    try {
        const updates={name:document.getElementById('prof-name').value,email:document.getElementById('prof-email').value,address:document.getElementById('prof-address').value};
        const {data}=await dbClient.from('users').update(updates).eq('mobile',currentUser.mobile).select().single();
        if (data) { currentUser=data; localStorage.setItem('outfitkart_session',JSON.stringify(data)); showToast('Profile Updated! ✅'); checkAuthUI(); }
    } catch (err) { showToast('Error saving profile: '+err.message); }
}

async function changePassword() {
    const oldP=document.getElementById('sec-old-pass').value;
    const newP=document.getElementById('sec-new-pass').value;
    if (oldP!==currentUser.password) return showToast('Incorrect Current Password');
    if (newP.length<6) return showToast('New password must be at least 6 characters');
    try {
        const {data}=await dbClient.from('users').update({password:newP}).eq('mobile',currentUser.mobile).select().single();
        if (data) { currentUser=data; localStorage.setItem('outfitkart_session',JSON.stringify(data)); showToast('Password Changed! 🔒'); document.getElementById('sec-old-pass').value=''; document.getElementById('sec-new-pass').value=''; }
    } catch (err) { showToast('Error: '+err.message); }
}

async function uploadProfilePic(event) {
    if (!currentUser) return showToast('Please login first');
    const file=event.target.files[0]; if(!file) return;
    if (file.size>32e6) return showToast('File too large (max 32MB)');
    showToast('Uploading profile picture... 📸');
    const fd=new FormData(); fd.append('image',file);
    try {
        const res=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd});
        const json=await res.json();
        if (json.success&&json.data?.url) {
            const {data,error}=await dbClient.from('users').update({profile_pic:json.data.url}).eq('mobile',currentUser.mobile).select().single();
            if (error) return showToast('Upload succeeded but save failed ❌');
            currentUser=data; localStorage.setItem('outfitkart_session',JSON.stringify(data));
            document.getElementById('user-avatar-img').src=json.data.url; showToast('Profile picture updated! ✅');
        } else showToast('ImgBB upload failed ❌');
    } catch (err) { showToast('Upload error: '+err.message); }
    event.target.value='';
}

function handleLogout() {
    saveCart(); cleanupRealtime();
    currentUser=null; wishlist=[]; ordersDb=[];
    localStorage.removeItem('outfitkart_session');
    localStorage.removeItem('outfitkart_admin_session');
    isAdminLoggedIn=false;
    showToast('Logged out successfully.');
    navigate('home'); checkAuthUI(); switchAuthTab('login');
}

/* ============================================================
   14. FETCH USER DATA
   ============================================================ */
async function fetchUserData() {
    if (!currentUser) return;
    try {
        const {data:freshUser}=await dbClient.from('users').select('*').eq('mobile',currentUser.mobile).maybeSingle();
        if (freshUser) { currentUser=freshUser; walletBalance=freshUser.wallet||0; localStorage.setItem('outfitkart_session',JSON.stringify(freshUser)); updateHeaderWallet(walletBalance); }
    } catch (e) {}
    try {
        const {data:wData}=await dbClient.from('wishlist').select('*').eq('mobile',currentUser.mobile);
        wishlist=wData?wData.map(w=>w.product_id):[]; updateWishlistCount();
    } catch (e) {}
    try {
        const {data:oData}=await dbClient.from('orders').select('*').eq('mobile',currentUser.mobile).order('date',{ascending:false});
        ordersDb=oData||[];
    } catch (e) {}
    initRealtimeTracking(); loadUserReferralCode();
}

/* ============================================================
   15. WISHLIST
   ============================================================ */
async function toggleWishlist(id) {
    if (!currentUser) { showToast('Please login to save favorites ❤️'); navigate('profile'); return; }
    const idx=wishlist.indexOf(id);
    try {
        if (idx===-1) { wishlist.push(id); showToast('Added to Wishlist ❤️'); await dbClient.from('wishlist').insert([{mobile:currentUser.mobile,product_id:id}]); }
        else { wishlist.splice(idx,1); showToast('Removed from Wishlist 💔'); await dbClient.from('wishlist').delete().eq('mobile',currentUser.mobile).eq('product_id',id); }
    } catch (e) {}
    updateWishlistCount();
    if (!document.getElementById('view-shop').classList.contains('hidden')) renderShopProducts();
    if (!document.getElementById('tab-wishlist').classList.contains('hidden')) renderWishlist();
}

function updateWishlistCount() {
    const badge=document.getElementById('wishlist-count');
    if (badge) { badge.innerText=wishlist.length; badge.classList.toggle('hidden',wishlist.length===0); }
}

function renderWishlist() {
    const container=document.getElementById('wishlist-container');
    const items=products.filter(p=>wishlist.includes(p.id));
    container.innerHTML=items.length?items.map(p=>createProductCard(p)).join(''):'<div class="col-span-full text-center text-gray-500 py-10"><i class="far fa-heart text-4xl mb-3 block"></i>Wishlist is empty</div>';
}

/* ============================================================
   16. PRODUCT DETAIL PAGE — Perfumes show ML selector
   ============================================================ */
async function openProductPage(id) {
    const p=products.find(x=>x.id===id); if(!p) return;
    viewingProductId=p.id;
    const isPerf     = isPerfumeCategory(p.category);
    const sizeArray  = isPerf
        ? (p.available_sizes?.length ? p.available_sizes : PERFUME_ML_SIZES)
        : (p.available_sizes?.length ? p.available_sizes : getDefaultSizes(p.sub||p.category));
    selectedSize     = sizeArray[1]||sizeArray[0];
    const imgList    = p.imgs?.length?p.imgs:(p.img?[p.img]:['https://placehold.co/600x420/eee/333?text=No+Image']);
    const sizeLabel  = isPerf ? 'Select Volume (ML)' : 'Select Size';
    const sizeTagLabel = isPerf ? 'Volume' : 'Size';

    let sliderHtml;
    if (imgList.length===1) {
        sliderHtml=`<div class="rounded-lg overflow-hidden border shadow-sm"><img src="${imgList[0]}" class="w-full h-[420px] object-cover" alt="${p.name}"></div>`;
    } else {
        sliderHtml=`<div><div class="pdp-img-slider hide-scrollbar" id="pdp-slider-${id}">${imgList.map((src,i)=>`<img src="${src}" alt="${p.name} ${i+1}" data-index="${i}">`).join('')}</div><div class="pdp-thumb-strip mt-2" id="pdp-thumbs-${id}">${imgList.map((src,i)=>`<img src="${src}" alt="thumb ${i+1}" class="pdp-thumb ${i===0?'active':''}" data-index="${i}" onclick="pdpScrollToSlide(${i})">`).join('')}</div></div>`;
    }

    document.getElementById('pdp-container').innerHTML=`${sliderHtml}
      <div class="flex flex-col justify-center">
        <div class="text-xs text-rose-500 font-bold uppercase mb-1">${p.category}${p.sub?' › '+p.sub:''}</div>
        ${p.stock_qty?`<div class="text-xs text-green-600 font-semibold mb-2">📦 Stock: ${p.stock_qty} available</div>`:''}
        <div class="flex justify-between items-start mb-2">
          <h1 class="text-3xl font-black text-gray-800">${p.name}</h1>
          <div class="flex gap-2">
            <button onclick="shareWithReferral(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price})" class="bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-sm" title="Share & Earn"><i class="fas fa-share-alt"></i></button>
            <button onclick="nativeShareProduct(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price})" class="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-sm"><i class="fas fa-link"></i></button>
          </div>
        </div>
        <div class="flex items-baseline gap-3 mb-4"><span class="text-3xl font-bold">₹${p.price}</span>${p.oldprice?`<span class="text-lg text-gray-400 line-through">₹${p.oldprice}</span>`:''}</div>
        <p class="text-gray-600 text-sm mb-6">${p.desc||'Premium quality product.'}</p>
        <div class="mb-6">
          <div class="font-bold text-sm mb-2">${sizeLabel}</div>
          <div class="flex flex-wrap gap-3" id="size-selector">
            ${sizeArray.map(s=>`<button onclick="selectSize('${s}')" class="size-btn ${s===selectedSize?'selected':''} w-fit px-4 py-2 min-w-[3rem] rounded-full border border-gray-300 font-bold transition-colors">${s}</button>`).join('')}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-auto">
          <button onclick="addToCartPDP()" class="border-2 border-gray-800 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-50 active:scale-95 transition-all">Add to Cart</button>
          <button onclick="buyNowPDP()" class="bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-md">Buy Now</button>
        </div>
      </div>`;

    navigate('product');
    if (imgList.length>1) {
        requestAnimationFrame(()=>{
            const slider=document.getElementById(`pdp-slider-${id}`);
            if(slider) slider.addEventListener('scroll',()=>{const idx=Math.round(slider.scrollLeft/slider.offsetWidth);updatePdpActiveThumbnail(id,idx);},{passive:true});
        });
    }
    await loadReviews(p.id); renderRecommendedProducts(p.category,p.id);
}

window.pdpScrollToSlide=function(idx){
    const slider=document.getElementById(`pdp-slider-${viewingProductId}`); if(!slider) return;
    slider.scrollTo({left:idx*slider.offsetWidth,behavior:'smooth'}); updatePdpActiveThumbnail(viewingProductId,idx);
};
function updatePdpActiveThumbnail(productId,activeIdx){document.getElementById(`pdp-thumbs-${productId}`)?.querySelectorAll('.pdp-thumb').forEach((t,i)=>t.classList.toggle('active',i===activeIdx));}
function selectSize(size){selectedSize=size;document.querySelectorAll('#size-selector .size-btn').forEach(btn=>btn.classList.toggle('selected',btn.innerText.trim()===size));}
async function addToCartPDP(){if(!currentUser){showToast('Login to add to cart 🛒');return navigate('profile');}addToCart(viewingProductId,selectedSize);}
function buyNowPDP(){if(!currentUser){showToast('Login to Buy!');return navigate('profile');}const p=products.find(x=>x.id===viewingProductId);if(!p)return;currentCheckoutItems=[{...p,qty:1,size:selectedSize}];navigate('checkout');}
function renderRecommendedProducts(category,excludeId){const section=document.getElementById('recommended-section');const gridEl=document.getElementById('recommended-products-grid');const recs=products.filter(p=>p.category===category&&p.id!==excludeId).slice(0,8);if(recs.length===0){if(section)section.style.display='none';return;}if(section)section.style.display='';if(gridEl)gridEl.innerHTML=recs.map(p=>createProductCard(p)).join('');}

/* ============================================================
   17. REVIEWS
   ============================================================ */
async function loadReviews(prodId){const container=document.getElementById('pdp-reviews-list');try{const{data}=await dbClient.from('reviews').select('*').eq('product_id',prodId);container.innerHTML=data?.length?data.map(r=>`<div class="border-b pb-3"><div class="flex justify-between mb-1"><span class="font-bold text-sm">${r.user_name}</span><span class="text-xs text-gray-400">${r.date}</span></div><div class="text-yellow-400 text-xs mb-1">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5-r.rating)}</div><p class="text-sm text-gray-600">${r.comment}</p></div>`).join(''):'<p class="text-sm text-gray-500">No reviews yet. Be the first!</p>';}catch{container.innerHTML='<p class="text-sm text-gray-500">Could not load reviews.</p>';}}
function setRating(r){currentRating=r;const stars=document.getElementById('star-rating').children;for(let i=0;i<5;i++)stars[i].className=i<r?'fas fa-star':'far fa-star';}
async function submitReview(){if(!currentUser)return showToast('Login required!');const txt=document.getElementById('review-text').value.trim();if(!txt)return showToast('Write something first!');try{const{data}=await dbClient.from('reviews').insert([{product_id:viewingProductId,user_name:currentUser.name,rating:currentRating,comment:txt,date:new Date().toLocaleDateString()}]).select().single();if(data){document.getElementById('review-text').value='';loadReviews(viewingProductId);showToast('Review Added! ⭐');}}catch(err){showToast('Error submitting review: '+err.message);}}

/* ============================================================
   18. CHECKOUT
   ============================================================ */
function proceedToCheckout(){if(cart.length===0)return showToast('Cart is empty!');if(!currentUser){showToast('Please Login to continue!');toggleCart();navigate('profile');return;}toggleCart();currentCheckoutItems=cart.map(c=>{const p=products.find(x=>x.id===c.productId);return p?{...p,qty:c.qty,size:c.size}:null;}).filter(Boolean);navigate('checkout');}
function buyNow(productId){if(!currentUser){showToast('Please Login to Buy!');navigate('profile');return;}const p=products.find(x=>x.id===productId);if(!p)return;currentCheckoutItems=[{...p,qty:1,size:selectedSize||'M'}];navigate('checkout');}

function renderCheckoutStep(){
    const s1=document.getElementById('checkout-step-1'),s2=document.getElementById('checkout-step-2'),s3=document.getElementById('checkout-step-3');
    if(!s1||!s2||!s3)return;
    document.querySelectorAll('.progress-step').forEach((step,i)=>{const n=i+1;const circle=step.querySelector('.step-circle');const label=step.querySelector('span');if(n<currentCheckoutStep){circle.innerHTML='✓';circle.className='step-circle bg-[#fb641b] text-white border-[#fb641b]';label.className='text-xs mt-1 font-medium text-[#fb641b]';}else if(n===currentCheckoutStep){circle.innerHTML=n;circle.className='step-circle bg-[#fb641b] text-white border-[#fb641b]';label.className='text-xs mt-1 font-medium text-[#fb641b]';}else{circle.innerHTML=n;circle.className='step-circle border-gray-300 text-gray-500';label.className='text-xs mt-1 font-medium text-gray-500';}});
    s1.classList.toggle('hidden',currentCheckoutStep!==1);s2.classList.toggle('hidden',currentCheckoutStep!==2);s3.classList.toggle('hidden',currentCheckoutStep!==3);
    if(currentCheckoutStep>=2&&addressFormData.fullname){const nameStr=`${addressFormData.fullname} • +91 ${addressFormData.mobile}`;const addrStr=(addressFormData.fullAddress||'').replace(/\n/g,'<br>');['checkout-user-name','checkout-user-name-step3'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=nameStr;});['delivery-address-display','delivery-address-display-step3'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=addrStr;});updateCheckoutTotals();}
}

function goToStep(step){currentCheckoutStep=step;renderCheckoutStep();if(step>=2&&currentCheckoutItems.length>0)updateCheckoutTotals();if(step===3&&currentUser){dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle().then(({data})=>{if(data){walletBalance=data.wallet||0;const cb=document.getElementById('checkout-wallet-balance');if(cb)cb.textContent=`₹${walletBalance.toLocaleString()}`;if(selectedPaymentMethod==='wallet')updatePaymentSelection('wallet');}}).catch(()=>{});}}

async function saveAddressForm(event){
    event.preventDefault();
    const name=document.getElementById('addr-fullname').value.trim(),mobile=document.getElementById('addr-mobile').value.trim(),pin=document.getElementById('addr-pincode').value.trim(),house=document.getElementById('addr-house').value.trim(),road=document.getElementById('addr-road').value.trim(),city=document.getElementById('addr-city').value.trim(),state=document.getElementById('addr-state').value.trim(),landmark=document.getElementById('addr-landmark').value.trim();
    if(currentUser){try{const{data:u}=await dbClient.from('users').update({name,pincode:pin,city,state,address:road}).eq('mobile',currentUser.mobile).select().single();if(u){currentUser=u;localStorage.setItem('outfitkart_session',JSON.stringify(u));}}catch(e){}}
    const parts=[house,road,landmark?`Near ${landmark}`:'',city,state?`${state} - ${pin}`:pin];
    addressFormData={fullname:name,mobile,pincode:pin,city,state,fullAddress:parts.filter(Boolean).join(', ')};
    goToStep(2);
}

function updateCheckoutTotals(){
    let mrpTotal=0,priceTotal=0,discountTotal=0;
    currentCheckoutItems.forEach(item=>{const mrp=item.oldprice||Math.round(item.price*1.3);mrpTotal+=mrp*item.qty;priceTotal+=item.price*item.qty;discountTotal+=(mrp-item.price)*item.qty;});
    const platformFee=7,handlingFee=selectedPaymentMethod==='cod'?9:0;
    let finalTotal=priceTotal+platformFee+handlingFee;
    const exRow=document.getElementById('exchange-value-row'),exDisp=document.getElementById('exchange-value-display'),refRow=document.getElementById('refund-upi-row');
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=priceTotal-exchangeOldPrice;if(exRow)exRow.style.display='flex';if(exDisp)exDisp.textContent=`-₹${exchangeOldPrice.toLocaleString()}`;if(diff>0){finalTotal=diff+platformFee+handlingFee;if(refRow)refRow.style.display='none';}else if(diff<0){finalTotal=0;if(refRow)refRow.style.display='block';}else{finalTotal=platformFee;if(refRow)refRow.style.display='none';}}else{if(exRow)exRow.style.display='none';if(refRow)refRow.style.display='none';}
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('price-mrp',`₹${mrpTotal.toLocaleString()}`);set('price-discount',`- ₹${discountTotal.toLocaleString()}`);set('total-save',discountTotal.toLocaleString());set('final-total-step2',`₹${finalTotal.toLocaleString()}`);set('final-total-step3',`₹${finalTotal.toLocaleString()}`);set('place-order-amount',finalTotal.toLocaleString());
    document.getElementById('handling-fee-row')?.classList.toggle('hidden',handlingFee===0);
    const itemsList=document.getElementById('checkout-items-list');
    if(itemsList){itemsList.innerHTML=currentCheckoutItems.map(item=>{const img=item.imgs?.[0]||item.img||'https://placehold.co/56x72/eee/666';const sLabel=isPerfumeCategory(item.category)?`Vol: ${item.size||'100ml'}`:`Size: ${item.size||'M'}`;return `<div class="flex items-center gap-3 py-2 border-b last:border-b-0"><img src="${img}" loading="lazy" class="w-14 rounded flex-shrink-0 object-cover" style="height:4.5rem" alt="${item.name}"><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm truncate">${item.name}</h4><p class="text-xs text-gray-500">${sLabel} | Qty: ${item.qty}</p><div class="text-sm font-bold mt-1">₹${(item.price*item.qty).toLocaleString()}</div></div></div>`;}).join('');}
}

function updatePaymentSelection(method){
    selectedPaymentMethod=method;
    const styles={upi:{active:'border-orange-400 bg-orange-50',inactive:'border-gray-200 bg-white hover:border-gray-400'},cod:{active:'border-gray-700 bg-gray-50',inactive:'border-gray-200 bg-white hover:border-gray-400'},wallet:{active:'border-blue-500 bg-blue-50',inactive:'border-gray-200 bg-white hover:border-blue-300'}};
    ['upi','cod','wallet'].forEach(m=>{const lbl=document.getElementById(`label-${m}`);if(!lbl)return;const isActive=m===method;lbl.className=lbl.className.replace(/border-orange-400|border-gray-700|border-blue-500|border-gray-200/g,'').replace(/bg-orange-50|bg-gray-50|bg-blue-50|bg-white/g,'').trim();styles[m][isActive?'active':'inactive'].split(' ').forEach(c=>{if(c)lbl.classList.add(c);});});
    const codRow=document.getElementById('cod-fee-row'),walletRow=document.getElementById('wallet-balance-row'),walletWarn=document.getElementById('wallet-insufficient-warning'),warnText=document.getElementById('wallet-warning-text');
    if(codRow)codRow.classList.toggle('hidden',method!=='cod');if(walletRow)walletRow.classList.toggle('hidden',method!=='wallet');
    if(method==='wallet'){const bal=walletBalance||0;const el=document.getElementById('wallet-balance-display'),cb=document.getElementById('checkout-wallet-balance');if(el)el.textContent=`₹${bal.toLocaleString()}`;if(cb)cb.textContent=`₹${bal.toLocaleString()}`;const priceTotal=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0),needed=priceTotal+7;if(walletWarn&&warnText){if(bal<needed){walletWarn.classList.remove('hidden');warnText.textContent=`Wallet balance ₹${bal} is insufficient. Need ₹${needed}.`;}else walletWarn.classList.add('hidden');}const btn=document.getElementById('place-order-btn');if(btn){if(bal<needed){btn.disabled=true;btn.classList.add('opacity-50','cursor-not-allowed');}else{btn.disabled=false;btn.classList.remove('opacity-50','cursor-not-allowed');}}}else{walletWarn?.classList.add('hidden');const btn=document.getElementById('place-order-btn');if(btn){btn.disabled=false;btn.classList.remove('opacity-50','cursor-not-allowed');}}
    updateCheckoutTotals();
}

function selectPaymentLabel(method){const radio=document.getElementById(`payment-${method}`);if(radio){radio.checked=true;updatePaymentSelection(method);}}

async function preFillUserAddress(){
    if(!currentUser)return false;
    try{const{data:user}=await dbClient.from('users').select('*').eq('mobile',currentUser.mobile).maybeSingle();if(user?.pincode&&user?.city&&user?.state){const setVal=(id,val)=>{const el=document.getElementById(id);if(el&&val)el.value=val;};setVal('addr-fullname',user.name||'');setVal('addr-mobile',user.mobile||'');setVal('addr-pincode',user.pincode||'');setVal('addr-city',user.city||'');setVal('addr-state',user.state||'');setVal('addr-road',user.address||'');const house=document.getElementById('addr-house')?.value.trim()||'',landmark=document.getElementById('addr-landmark')?.value.trim()||'';const parts=[house,user.address||'',landmark?`Near ${landmark}`:'',user.city,`${user.state} - ${user.pincode}`];addressFormData={fullname:user.name||'',mobile:user.mobile||'',pincode:user.pincode||'',city:user.city||'',state:user.state||'',fullAddress:parts.filter(Boolean).join(', ')};return true;}}catch(e){}return false;
}

async function fetchPincodeDetails(pin){if(pin.length!==6)return;const loader=document.getElementById('pincode-loader');if(loader)loader.classList.remove('hidden');try{const res=await fetch(`https://api.postalpincode.in/pincode/${pin}`);const data=await res.json();if(data?.[0]?.Status==='Success'){const d=data[0].PostOffice[0];const c=document.getElementById('addr-city'),s=document.getElementById('addr-state');if(c)c.value=d.District;if(s)s.value=d.State;showToast('Location detected! 📍');}}catch{}finally{if(loader)loader.classList.add('hidden');}}

function useCurrentLocation(){if(!navigator.geolocation)return showToast('Geolocation not supported');showToast('Getting your location...');navigator.geolocation.getCurrentPosition(async pos=>{try{const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);const data=await res.json();const a=data.address;const c=document.getElementById('addr-city'),s=document.getElementById('addr-state'),pin=document.getElementById('addr-pincode');if(c)c.value=a.city||a.town||a.village||a.district||'';if(s)s.value=a.state||'';if(pin&&a.postcode)pin.value=a.postcode;showToast('Location fetched! ✅');}catch{showToast('Could not fetch location details');}},()=>showToast('Location access denied'));}

/* ============================================================
   19. PAYMENT & ORDER PLACEMENT
   ============================================================ */
async function initiatePayment(){
    if(!addressFormData.fullname){showToast('Please fill address first!');goToStep(1);return;}
    if(!currentCheckoutItems?.length){showToast('Cart is empty!');return;}
    const priceTotal=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0),platformFee=7,handlingFee=selectedPaymentMethod==='cod'?9:0;
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=priceTotal-exchangeOldPrice;if(diff>0){_openRazorpay(diff+platformFee+handlingFee,'OutfitKart Exchange',async(payId)=>{showToast('Payment Successful! 🚀');await placeOrder(payId);});}else if(diff<0){const upiId=document.getElementById('refund-upi-input')?.value.trim();if(!upiId)return showToast('Please enter your UPI ID for refund');await placeOrder(`EXCHANGE-REFUND-${exchangeSourceOrder.id}`,upiId);}else await placeOrder(`EXCHANGE-SAME-${exchangeSourceOrder.id}`);return;}
    const finalAmount=priceTotal+platformFee+handlingFee;
    if(selectedPaymentMethod==='wallet'){try{const{data:freshUser}=await dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle();if(freshUser)walletBalance=freshUser.wallet||0;}catch{}if(walletBalance<finalAmount){showToast(`❌ Wallet balance ₹${walletBalance} is insufficient. Need ₹${finalAmount}`);return;}showToast('💰 Paying via Wallet...');await placeOrder('WALLET-PAY');}
    else if(selectedPaymentMethod==='upi'||selectedPaymentMethod==='card'){_openRazorpay(finalAmount,'OutfitKart Premium Fashion',async(payId)=>{showToast('Payment Successful! 🚀');await placeOrder(payId);});}
    else{await placeOrder('COD');}
}

function _openRazorpay(amount,description,onSuccess){
    const options={key:RAZORPAY_KEY,amount:amount*100,currency:'INR',name:'OutfitKart',description,prefill:{name:addressFormData.fullname,contact:'+91'+addressFormData.mobile},theme:{color:'#e11d48'},handler:response=>onSuccess(response.razorpay_payment_id),modal:{ondismiss:()=>showToast('Payment Cancelled! ❌')}};
    try{const rzp=new Razorpay(options);rzp.on('payment.failed',resp=>showToast('Payment failed: '+(resp.error.description||'Unknown error')));rzp.open();}catch{showToast('Could not open payment gateway');}
}

async function placeOrder(txId='COD',refundUpiId=''){
    const subtotal=currentCheckoutItems.reduce((t,i)=>t+(i.price*i.qty),0),handlingFee=selectedPaymentMethod==='cod'?9:0;
    let finalTotal=subtotal+7+handlingFee;
    if(isExchangeProcess&&exchangeOldPrice>0){const diff=subtotal-exchangeOldPrice;if(diff>0)finalTotal=diff+7+handlingFee;else if(diff<0)finalTotal=0;else finalTotal=7;}
    if(selectedPaymentMethod==='wallet'){try{const{data:freshUser}=await dbClient.from('users').select('wallet').eq('mobile',currentUser.mobile).maybeSingle();if(freshUser)walletBalance=freshUser.wallet||0;}catch{}if(walletBalance<finalTotal){showToast(`❌ Wallet balance ₹${walletBalance} is insufficient. Need ₹${finalTotal}`);return;}txId='WALLET-PAY';}
    const orderMarginTotal=currentCheckoutItems.reduce((sum,i)=>{const prod=products.find(p=>p.id===i.id);return sum+((prod?.margin_amt||0)*i.qty);},0);
    const itemsToSave=currentCheckoutItems.map(i=>{const prod=products.find(p=>p.id===i.id);return{id:i.id,name:i.name,img:i.imgs?.[0]||i.img||'',qty:i.qty,price:i.price,size:i.size||'M',margin_amt:prod?.margin_amt||0};});
    const orderId='ORD'+Math.floor(Math.random()*1000000);
    const newOrder={id:orderId,mobile:currentUser.mobile,customer_name:addressFormData.fullname||currentUser.name||'',items:itemsToSave,total:finalTotal,margin_total:orderMarginTotal,paymentmode:selectedPaymentMethod.toUpperCase(),status:'Processing',transaction_id:txId,date:new Date().toLocaleDateString('en-IN'),address:addressFormData.fullAddress||'',pincode:addressFormData.pincode||'',city:addressFormData.city||'',state:addressFormData.state||'',refund_upi:refundUpiId||null,referral_code:activeReferralCode||null};
    try{
        if(selectedPaymentMethod==='wallet'){const newBal=walletBalance-finalTotal;const walletRes=await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:newBal})});if(!walletRes.ok){const errText=await walletRes.text();throw new Error(`Wallet deduction failed: HTTP ${walletRes.status} — ${errText}`);}walletBalance=newBal;if(currentUser)currentUser.wallet=newBal;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));const walletEl=document.getElementById('prof-wallet');if(walletEl)walletEl.textContent=`₹${newBal}`;updateHeaderWallet(newBal);}
        const{data:savedOrder,error}=await dbClient.from('orders').insert([newOrder]).select().single();
        if(error)throw error;
        await recordReferralPurchase(orderId,finalTotal);
        if(isExchangeProcess&&exchangeSourceOrder){try{const{data:exchRows}=await dbClient.from('orders').update({status:'Exchanged'}).eq('id',String(exchangeSourceOrder.id)).select();if(exchRows?.length){const idx=ordersDb.findIndex(o=>String(o.id)===String(exchangeSourceOrder.id));if(idx>-1)ordersDb[idx]={...ordersDb[idx],...exchRows[0]};}}catch{}resetExchangeProcess();}
        cart=[];saveCart();updateCartCount();ordersDb.push(savedOrder||newOrder);
        const modal=document.getElementById('order-success-modal'),idEl=document.getElementById('success-order-id');
        if(idEl)idEl.innerText=orderId;if(modal){modal.classList.remove('hidden');modal.classList.add('flex');}
    }catch(err){
        console.error('[placeOrder]',err);
        if(selectedPaymentMethod==='wallet'){const revertBal=walletBalance+finalTotal;walletBalance=revertBal;try{await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:revertBal})});if(currentUser)currentUser.wallet=revertBal;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));updateHeaderWallet(revertBal);showToast('💰 Wallet balance restored.');}catch{}}
        showToast('❌ Error placing order: '+err.message);
    }
}

async function _updateWalletBalance(newBalance){try{const res=await fetch(`${SUPABASE_URL}/rest/v1/users?mobile=eq.${currentUser.mobile}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({wallet:newBalance})});if(res.ok){if(currentUser)currentUser.wallet=newBalance;localStorage.setItem('outfitkart_session',JSON.stringify(currentUser));const walletEl=document.getElementById('prof-wallet');if(walletEl)walletEl.textContent=`₹${newBalance}`;updateHeaderWallet(newBalance);}}catch(e){}}

function closeSuccessModal(){const m=document.getElementById('order-success-modal');m?.classList.add('hidden');m?.classList.remove('flex');}
function closeSuccessAndGoToOrders(){closeSuccessModal();navigate('profile','orders');}
function closeCancelModal(){const m=document.getElementById('order-cancel-modal');m?.classList.add('hidden');m?.classList.remove('flex');}

/* ============================================================
   20. CANCEL ORDER
   ============================================================ */
async function cancelOrder(orderId){
    orderId=String(orderId||'').trim();if(!orderId){showToast('❌ Invalid order');return;}
    if(!confirm(`Cancel order #${orderId}? This cannot be undone.`))return;
    const order=ordersDb.find(o=>String(o.id)===orderId);if(!order)return showToast('Order not found.');
    if(order.status!=='Processing')return showToast('Only Processing orders can be cancelled.');
    const paymode=(order.paymentmode||'').toUpperCase();
    if(paymode==='UPI'||paymode==='CARD'){_pendingCancelOrderId=orderId;const input=document.getElementById('cancel-refund-upi-input');if(input)input.value='';const modal=document.getElementById('refund-upi-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');return;}
    await _executeCancelOrder(orderId,null);
}

function closeRefundUpiModal(){_pendingCancelOrderId=null;const modal=document.getElementById('refund-upi-modal');modal?.classList.add('hidden');modal?.classList.remove('flex');}

async function finaliseCancelWithRefund(){
    const upiId=document.getElementById('cancel-refund-upi-input')?.value.trim();if(!upiId)return showToast('Please enter your UPI ID');if(!_pendingCancelOrderId){closeRefundUpiModal();return;}const oid=_pendingCancelOrderId;closeRefundUpiModal();await _executeCancelOrder(oid,upiId);
}

async function _executeCancelOrder(orderId,refundUpiId){
    orderId=String(orderId||'').trim();if(!orderId){showToast('❌ Invalid order');return;}
    const order=ordersDb.find(o=>String(o.id)===orderId);if(!order)return showToast('Order not found.');
    showToast('⏳ Cancelling order...');
    try{
        const payload={status:'Cancelled'};if(refundUpiId)payload.refund_upi=refundUpiId;
        const restUrl=`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`;
        const res=await fetch(restUrl,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify(payload)});
        if(!res.ok){const errText=await res.text();throw new Error(`HTTP ${res.status}: ${errText}`);}
        const rows=await res.json();let updated;
        if(rows&&rows.length>0){updated=rows[0];}else{const{data:rows2,error:err2}=await dbClient.from('orders').update(payload).eq('id',orderId).select();if(err2)throw new Error(err2.message);updated=rows2?.[0]||{...order,...payload};}
        const idx=ordersDb.findIndex(o=>String(o.id)===orderId);if(idx>-1)ordersDb[idx]={...ordersDb[idx],...updated};
        await cancelReferralForOrder(orderId);
        const paymode=(order.paymentmode||'').toUpperCase();
        if(paymode==='WALLET'||paymode==='WALLET-PAY'){const newBal=walletBalance+order.total;walletBalance=newBal;await _updateWalletBalance(newBal);showToast(`💰 ₹${order.total} refunded to your Wallet!`);}
        const cancelModal=document.getElementById('order-cancel-modal'),refundEl=document.getElementById('cancel-refund-msg');
        if(refundEl){if(paymode==='WALLET'||paymode==='WALLET-PAY'){refundEl.textContent=`💰 ₹${order.total} has been added to your OutfitKart Wallet instantly!`;refundEl.classList.remove('hidden');}else if((paymode==='UPI'||paymode==='CARD')&&refundUpiId){refundEl.textContent=`💰 ₹${order.total} will be refunded to ${refundUpiId} within 24-48 hours.`;refundEl.classList.remove('hidden');}else refundEl.classList.add('hidden');}
        cancelModal?.classList.remove('hidden');cancelModal?.classList.add('flex');
        if(!document.getElementById('tab-orders')?.classList.contains('hidden'))renderOrdersList();
    }catch(err){console.error('[_executeCancelOrder]',err);showToast('❌ Error cancelling order: '+err.message);}
}

/* ============================================================
   21. EXCHANGE
   ============================================================ */
function startExchange(orderId){orderId=String(orderId||'').trim();const order=ordersDb.find(o=>String(o.id)===orderId);if(!order||order.status!=='Delivered')return showToast('Exchange only available for delivered orders.');const oldPrice=order.total||0;const infoEl=document.getElementById('exchange-confirm-info');if(infoEl)infoEl.textContent=`Order #${orderId} • Exchange Value: ₹${oldPrice}`;window._pendingExchangeOrder=order;window._pendingExchangeOldPrice=oldPrice;const modal=document.getElementById('exchange-confirm-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');}
function closeExchangeModal(){const modal=document.getElementById('exchange-confirm-modal');modal?.classList.add('hidden');modal?.classList.remove('flex');}
function confirmExchange(){closeExchangeModal();isExchangeProcess=true;exchangeSourceOrder=window._pendingExchangeOrder;exchangeOldPrice=window._pendingExchangeOldPrice;showToast(`Exchange started 🔄 Old value: ₹${exchangeOldPrice} — choose a new product`);navigate('shop');}
function resetExchangeProcess(){isExchangeProcess=false;exchangeSourceOrder=null;exchangeOldPrice=0;}

/* ============================================================
   22. ORDERS LIST
   ============================================================ */
function renderOrdersList(){
    const container=document.getElementById('orders-list-container');if(!container)return;
    if(!ordersDb.length){container.innerHTML='<div class="text-center text-gray-500 py-10">No orders placed yet.</div>';return;}
    container.innerHTML=[...ordersDb].reverse().map(order=>{
        const badge=STATUS_BADGE[order.status]||'bg-gray-100 text-gray-600';
        const oidStr=String(order.id).replace(/'/g,"\\'");
        const cancelBtn=order.status==='Processing'?`<button onclick="cancelOrder('${oidStr}')" class="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 active:scale-95">Cancel</button>`:'';
        const exchangeBtn=order.status==='Delivered'?`<button onclick="startExchange('${oidStr}')" class="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg font-bold shadow hover:from-orange-600 hover:to-orange-700 active:scale-95">Exchange</button>`:'';
        const refundNote=(order.status==='Cancelled'&&order.refund_upi)?`<p class="text-xs text-green-600 mt-1"><i class="fas fa-check-circle mr-1"></i>Refund to: <span class="font-semibold">${order.refund_upi}</span></p>`:'';
        return `<div class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"><div class="flex justify-between border-b pb-3 mb-3"><div><span class="font-bold text-gray-800">Order #${order.id}</span><br><span class="text-xs text-gray-500">${order.date} • ${order.paymentmode}</span>${refundNote}</div><div class="text-right"><span class="${badge} text-xs font-bold px-2 py-1 rounded-full">${order.status}</span><br><span class="font-bold text-sm mt-1 block">₹${order.total}</span></div></div><div class="space-y-3">${(order.items||[]).map(item=>`<div class="flex gap-3 items-center text-sm"><img src="${item.img}" class="w-12 h-16 rounded object-cover border flex-shrink-0" onerror="this.src='https://placehold.co/48x64/eee/999?text=?'" loading="lazy"><div class="flex-1 min-w-0"><div class="font-semibold text-gray-800 truncate">${item.name}</div><div class="text-gray-500 text-xs">Qty: ${item.qty} • ${isPerfumeCategory(item.category||'')?'Vol':'Size'}: ${item.size||'M'}</div></div><div class="flex flex-col gap-1 items-end"><button onclick="openTrackingModal('${oidStr}')" class="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-md font-bold shadow hover:from-green-600 hover:to-green-700 active:scale-95 whitespace-nowrap">Track</button>${cancelBtn}${exchangeBtn}</div></div>`).join('')}</div></div>`;
    }).join('');
}

/* ============================================================
   23. ADMIN — AUTH (only authorized users)
   ============================================================ */
function showAdminLogin(){const modal=document.getElementById('admin-login-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');document.getElementById('admin-username')?.focus();}
function closeAdminLogin(goToHome=false){const modal=document.getElementById('admin-login-modal');modal?.classList.add('hidden');modal?.classList.remove('flex');if(goToHome)navigate('home');}

async function handleAdminLogin(e){
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim().toLowerCase();
    const password = document.getElementById('admin-password').value.trim();

    /* Fixed admin credentials */
    const ADMIN_CREDS = [
        { username: 'shailesh', password: 'shailesh@934' },
        { username: 'aman',     password: 'aman@787' },
    ];

    const match = ADMIN_CREDS.find(a => a.username === username && a.password === password);

    if (match) {
        isAdminLoggedIn = true;
        localStorage.setItem('outfitkart_admin_session', 'true');
        showToast('Admin access granted! Welcome ' + match.username + '.');
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        closeAdminLogin();
        setTimeout(() => navigate('admin'), 100);
    } else {
        showToast('Invalid username or password');
        document.getElementById('admin-password').value = '';
    }
}

function loadAdminDashboard(){switchAdminTab('dashboard');renderAdminDashboard();}

async function renderAdminDashboard(){
    const dashboardEl=document.getElementById('admin-dashboard-content');if(!dashboardEl)return;
    dashboardEl.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-purple-600"></i><p class="mt-2 text-gray-500">Loading dashboard...</p></div>';
    try{
        const{data:allOrders}=await dbClient.from('orders').select('*').order('date',{ascending:false});
        const{data:allUsers}=await dbClient.from('users').select('*');
        const totalOrders=allOrders?.length||0,activeOrders=allOrders?.filter(o=>o.status!=='Cancelled').length||0;
        const totalRevenue=allOrders?.filter(o=>o.status!=='Cancelled').reduce((sum,o)=>sum+(o.total||0),0)||0;
        const totalProfit=allOrders?.filter(o=>o.status!=='Cancelled').reduce((sum,o)=>sum+(o.margin_total||0),0)||0;
        const totalUsers=allUsers?.length||0,recentOrders=allOrders?.slice(0,5)||[];
        dashboardEl.innerHTML=`
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg"><div class="text-2xl font-black mb-1">₹${totalRevenue.toLocaleString()}</div><div class="text-xs opacity-90">Total Revenue</div></div>
                <div class="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg"><div class="text-2xl font-black mb-1">₹${totalProfit.toLocaleString()}</div><div class="text-xs opacity-90">Total Profit</div></div>
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg"><div class="text-2xl font-black mb-1">${activeOrders}</div><div class="text-xs opacity-90">Active Orders</div></div>
                <div class="bg-gradient-to-br from-rose-500 to-rose-600 p-4 rounded-xl text-white shadow-lg"><div class="text-2xl font-black mb-1">${totalUsers}</div><div class="text-xs opacity-90">Total Users</div></div>
            </div>
            <div class="grid md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg border shadow-sm"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><i class="fas fa-shopping-cart text-purple-600 text-xl"></i></div><div><div class="text-sm text-gray-500">Total Orders</div><div class="text-2xl font-bold text-gray-900">${totalOrders}</div></div></div></div>
                <div class="bg-white p-4 rounded-lg border shadow-sm"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-box text-blue-600 text-xl"></i></div><div><div class="text-sm text-gray-500">Total Products</div><div class="text-2xl font-bold text-gray-900">${products.length}</div></div></div></div>
                <div class="bg-white p-4 rounded-lg border shadow-sm"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><i class="fas fa-chart-line text-green-600 text-xl"></i></div><div><div class="text-sm text-gray-500">Avg Order Value</div><div class="text-2xl font-bold text-gray-900">₹${activeOrders?Math.round(totalRevenue/activeOrders):0}</div></div></div></div>
            </div>
            <div class="bg-white rounded-lg border shadow-sm p-4"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg flex items-center gap-2"><i class="fas fa-clock text-purple-600"></i> Recent Orders</h3><span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Latest 5</span></div>
            ${recentOrders.length?recentOrders.map(order=>{const badge=STATUS_BADGE[order.status]||'bg-gray-100 text-gray-600';return`<div class="flex justify-between items-center py-3 border-b last:border-b-0"><div><div class="font-semibold text-sm">#${order.id}</div><div class="text-xs text-gray-500">${order.customer_name||'N/A'} • ${order.date}</div></div><div class="text-right"><div class="font-bold text-sm">₹${order.total}</div><span class="${badge} text-xs px-2 py-0.5 rounded-full">${order.status}</span></div></div>`;}).join(''):'<div class="text-center text-gray-400 py-8">No orders yet</div>'}</div>`;
    }catch(err){dashboardEl.innerHTML='<div class="text-center text-red-500 py-10">Error loading dashboard</div>';}
}

/* ============================================================
   24. ADMIN — SWITCH TABS + SIDEBAR
   ============================================================ */
function switchAdminTab(tab){
    document.querySelectorAll('.admin-content-tab').forEach(el=>{el.classList.add('hidden');el.style.display='none';});
    const targetTab=document.getElementById(`admin-tab-${tab}`);if(targetTab){targetTab.classList.remove('hidden');targetTab.style.display='block';}
    document.querySelectorAll('.admin-nav-btn').forEach(btn=>btn.classList.remove('active'));
    const activeBtn=document.getElementById(`btn-admin-${tab}`);if(activeBtn)activeBtn.classList.add('active');
    /* Close edit modal if switching away from products/inventory */
    if(tab!=='products'&&tab!=='inventory') closeEditModal();
    if(window.innerWidth<768)toggleAdminSidebar();
    if(tab==='dashboard')  renderAdminDashboard();
    if(tab==='products')   renderAdminProducts();
    if(tab==='order')      loadAllOrdersAdmin();
    if(tab==='payout')     loadAllWithdrawalsAdmin();
    if(tab==='users')      loadAllUsersAdmin();
    if(tab==='referrals')  loadAdminReferrals();
}

function toggleAdminSidebar(){
    const sidebar=document.getElementById('admin-sidebar'),overlay=document.getElementById('admin-sidebar-overlay');if(!sidebar||!overlay)return;
    const isOpen=!sidebar.classList.contains('-translate-x-full');
    if(isOpen){sidebar.classList.add('-translate-x-full');overlay.classList.add('hidden');}
    else{sidebar.classList.remove('-translate-x-full');overlay.classList.remove('hidden');}
}

/* ============================================================
   25. ADMIN — REFERRALS SECTION
   ============================================================ */
async function loadAdminReferrals(){
    const container=document.getElementById('admin-referrals-content');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{
        const{data:referrals,error}=await dbClient.from('referrals').select('*').order('created_at',{ascending:false});
        if(error)throw error;
        const all=referrals||[];
        const pending=all.filter(r=>r.status==='pending');
        const confirmed=all.filter(r=>r.status==='confirmed');
        const cancelled=all.filter(r=>r.status==='cancelled');
        const pendingAmt=pending.reduce((s,r)=>s+(r.commission||0),0);
        const confirmedAmt=confirmed.reduce((s,r)=>s+(r.commission||0),0);
        const cancelledAmt=cancelled.reduce((s,r)=>s+(r.commission||0),0);
        container.innerHTML=`
        <!-- Summary Cards -->
        <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                <p class="text-xs text-amber-700 font-bold uppercase mb-1">Pending</p>
                <p class="text-2xl font-black text-amber-600">₹${pendingAmt.toLocaleString()}</p>
                <p class="text-xs text-amber-500 mt-1">${pending.length} referrals</p>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <p class="text-xs text-green-700 font-bold uppercase mb-1">Confirmed</p>
                <p class="text-2xl font-black text-green-600">₹${confirmedAmt.toLocaleString()}</p>
                <p class="text-xs text-green-500 mt-1">${confirmed.length} referrals</p>
            </div>
            <div class="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200">
                <p class="text-xs text-red-700 font-bold uppercase mb-1">Cancelled</p>
                <p class="text-2xl font-black text-red-400">₹${cancelledAmt.toLocaleString()}</p>
                <p class="text-xs text-red-400 mt-1">${cancelled.length} referrals</p>
            </div>
        </div>
        <!-- Filter Tabs -->
        <div class="flex gap-1 mb-4 border-b overflow-x-auto hide-scrollbar">
            <button onclick="adminFilterReferrals('all',this)" class="pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab">All (${all.length})</button>
            <button onclick="adminFilterReferrals('pending',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Pending (${pending.length})</button>
            <button onclick="adminFilterReferrals('confirmed',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Confirmed (${confirmed.length})</button>
            <button onclick="adminFilterReferrals('cancelled',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Cancelled (${cancelled.length})</button>
        </div>
        <!-- List -->
        <div id="admin-referrals-list" class="space-y-3"></div>`;
        window._allAdminReferrals=all;
        renderAdminReferralList(all);
    }catch(err){container.innerHTML=`<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`;}
}

function adminFilterReferrals(status,btn){
    document.querySelectorAll('.admin-ref-tab').forEach(b=>{b.className='pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab';});
    btn.className='pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab';
    const all=window._allAdminReferrals||[];
    renderAdminReferralList(status==='all'?all:all.filter(r=>r.status===status));
}

function renderAdminReferralList(items){
    const container=document.getElementById('admin-referrals-list');if(!container)return;
    if(!items.length){container.innerHTML='<div class="text-center py-10 text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>No referrals found</p></div>';return;}
    const BADGE={pending:'bg-amber-100 text-amber-700',confirmed:'bg-green-100 text-green-700',cancelled:'bg-red-100 text-red-600'};
    container.innerHTML=items.map(r=>`
        <div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start flex-wrap gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-sm text-gray-800">Order #${r.order_id}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status]||'bg-gray-100 text-gray-500'}">${r.status}</span>
                    </div>
                    <div class="text-xs text-gray-500">Referrer: <strong>+91 ${r.referrer_mobile}</strong></div>
                    <div class="text-xs text-gray-500">Buyer: +91 ${r.buyer_mobile}</div>
                    <div class="text-xs text-gray-500">Date: ${r.date||'—'} | Code: <span class="font-mono font-semibold text-purple-700">${r.referral_code||'—'}</span></div>
                    <div class="text-xs text-gray-600 mt-1">Order Total: ₹${(r.order_total||0).toLocaleString()} | Commission: <strong class="text-green-600">₹${r.commission}</strong> (5%)</div>
                    ${r.status==='pending'&&r.created_at?`<div class="text-xs text-blue-600 mt-1">Confirms: ${new Date(new Date(r.created_at).getTime()+30*24*60*60*1000).toLocaleDateString('en-IN')}</div>`:''}
                    ${r.confirmed_at?`<div class="text-xs text-green-600 mt-1">Credited: ${new Date(r.confirmed_at).toLocaleDateString('en-IN')}</div>`:''}
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${r.status==='pending'?`<button onclick="adminConfirmReferral(${r.id})" class="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600 active:scale-95">✅ Confirm Now</button>`:''}
                </div>
            </div>
        </div>`).join('');
}

async function adminConfirmReferral(referralId){
    if(!confirm('Manually confirm this referral and credit wallet?'))return;
    try{
        const{data:ref,error}=await dbClient.from('referrals').select('*').eq('id',referralId).single();
        if(error||!ref)return showToast('Referral not found');
        await dbClient.from('referrals').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('id',referralId);
        const{data:user}=await dbClient.from('users').select('wallet').eq('mobile',ref.referrer_mobile).maybeSingle();
        if(user){const newWallet=(user.wallet||0)+(ref.commission||0);await dbClient.from('users').update({wallet:newWallet}).eq('mobile',ref.referrer_mobile);}
        showToast(`✅ Referral confirmed! ₹${ref.commission} credited to +91 ${ref.referrer_mobile}`);
        loadAdminReferrals();
    }catch(err){showToast('Error: '+err.message);}
}

/* ============================================================
   26. ADMIN — PRODUCTS with Perfume ML support
   ============================================================ */
function updateDropdownSubs(catId,subId){
    try{
        const catEl=document.getElementById(catId),subEl=document.getElementById(subId);if(!catEl||!subEl)return;
        const cData=CATEGORIES.find(c=>c.name===catEl.value);subEl.innerHTML='<option value="">Select Subcategory</option>';if(!cData)return;
        if(cData.groups){cData.groups.forEach(group=>{const og=document.createElement('optgroup');og.label=group.label;group.items.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;og.appendChild(o);});subEl.appendChild(og);});}
        else{cData.subs.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;subEl.appendChild(o);});}
        /* Show/hide size vs ML section based on category */
        updateSizeSection(catEl.value);
    }catch(e){}
}

function updateSizeSection(categoryName){
    const sizeSection=document.getElementById('admin-size-section');
    const mlSection=document.getElementById('admin-ml-section');
    if(!sizeSection||!mlSection)return;
    if(isPerfumeCategory(categoryName)){sizeSection.classList.add('hidden');mlSection.classList.remove('hidden');}
    else{sizeSection.classList.remove('hidden');mlSection.classList.add('hidden');}
}

function toggleProductMode(mode){
    const manualFields=document.getElementById('manual-fields');if(!manualFields)return;
    if(mode==='manual'){manualFields.classList.remove('hidden');const modeManual=document.getElementById('mode-manual');if(modeManual)modeManual.checked=true;updateSellingPreview();}
    else{manualFields.classList.add('hidden');const modeAuto=document.getElementById('mode-auto');if(modeAuto)modeAuto.checked=true;['ap-supplier-price','ap-margin','selling-price-preview'].forEach(id=>{const el=document.getElementById(id);if(!el)return;if(id==='selling-price-preview')el.classList.add('hidden');else el.value=id==='ap-margin-pct'?'30':'';});}
}

function updateSellingPreview(){
    const supplier=parseInt(document.getElementById('ap-supplier-price')?.value)||0,marginPct=parseFloat(document.getElementById('ap-margin-pct')?.value)||0;
    const marginAmt=Math.round(supplier*marginPct/100),selling=supplier+marginAmt;
    const prev=document.getElementById('selling-price-preview'),val=document.getElementById('selling-price-value'),mVal=document.getElementById('margin-amt-preview'),pEl=document.getElementById('ap-price'),mEl=document.getElementById('ap-margin');
    if(prev)prev.classList.toggle('hidden',selling===0);if(val)val.textContent=`₹${selling.toLocaleString()}`;if(mVal)mVal.textContent=`₹${marginAmt.toLocaleString()}`;if(pEl)pEl.value=selling;if(mEl)mEl.value=marginAmt;
}

function autoGenerateDescription(){
    const name=document.getElementById('ap-name').value;if(!name)return showToast('Enter Product Name first');
    document.getElementById('ap-desc').value=`Elevate your style with our premium ${name}. Specially crafted for the modern wardrobe, offering unmatched comfort and lasting quality.`;
}

async function adminAddProduct(e){
    e.preventDefault();
    const imgLinks=document.getElementById('ap-imgs').value.split('\n').map(l=>l.trim()).filter(Boolean);
    const catVal=document.getElementById('ap-category').value;
    const isPerf=isPerfumeCategory(catVal);
    let sizes=[];
    if(isPerf){
        /* Get checked ML sizes */
        sizes=Array.from(document.querySelectorAll('.ml-admin-chk:checked')).map(cb=>cb.value);
        if(!sizes.length)sizes=PERFUME_ML_SIZES;
    }else{
        sizes=Array.from(document.querySelectorAll('.size-admin-chk:checked')).map(cb=>cb.value);
    }
    const supplierPrice=parseInt(document.getElementById('ap-supplier-price')?.value)||0;
    const marginPct=parseFloat(document.getElementById('ap-margin-pct')?.value)||0;
    const marginAmt=Math.round(supplierPrice*marginPct/100)||parseInt(document.getElementById('ap-margin')?.value)||0;
    const sellingPrice=supplierPrice+marginAmt;
    if(sellingPrice<=0)return showToast('Enter a valid Supplier/Cost Price');
    const newP={name:document.getElementById('ap-name').value.trim(),price:sellingPrice,supplier_price:supplierPrice,margin_amt:marginAmt,oldprice:parseInt(document.getElementById('ap-oldprice').value)||Math.round(sellingPrice*1.4),checkout_discount:parseInt(document.getElementById('ap-discount').value)||0,brand:document.getElementById('ap-brand').value.trim(),imgs:imgLinks,category:catVal,sub:document.getElementById('ap-sub').value,desc:document.getElementById('ap-desc').value.trim(),stock_qty:parseInt(document.getElementById('ap-stock').value)||50,available_sizes:sizes,istrending:true};
    try{
        const{data,error}=await dbClient.from('products').insert([newP]).select().single();if(error)throw error;
        if(data){products.push(data);e.target.reset();updateDropdownSubs('ap-category','ap-sub');renderAdminProducts();const sEl=document.getElementById('scrape-status');if(sEl)sEl.classList.add('hidden');showToast(`✅ Added! Sell: ₹${sellingPrice} | Cost: ₹${supplierPrice} | Profit: ₹${marginAmt}`);}
    }catch(err){showToast('Error: '+err.message);}
}

function renderAdminProducts(){
    const container=document.getElementById('admin-product-list');if(!container)return;
    if(products.length===0){container.innerHTML=`<div class="text-center py-20"><i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg font-semibold">No products yet</p></div>`;return;}
    container.innerHTML=`<div class="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b sticky top-0 z-10"><div class="flex items-center justify-between"><span class="text-sm font-bold text-purple-700"><i class="fas fa-boxes mr-2"></i>Total Products: ${products.length}</span><span class="text-xs text-gray-500">Latest first</span></div></div>`+
    [...products].reverse().map(p=>{const isPerf=isPerfumeCategory(p.category);return`<div class="flex justify-between items-center p-3 border-b text-sm hover:bg-gray-50 transition-colors"><div class="flex items-center gap-3 flex-1 min-w-0"><img src="${p.imgs?.[0]||p.img||'https://placehold.co/48x48/eee/666?text=?'}" class="w-12 h-12 rounded-lg object-cover border shadow-sm" loading="lazy"><div class="min-w-0 flex-1"><span class="truncate block font-semibold text-gray-800">${p.name}</span><span class="text-xs text-gray-500">${p.category} • ${p.sub||'N/A'}${isPerf?' 🌸':''}</span>${p.brand?`<span class="text-xs text-blue-600 block font-medium">${p.brand}</span>`:''}</div></div><div class="flex items-center gap-3"><div class="text-right"><div class="font-bold text-gray-900">₹${p.price}</div>${p.supplier_price?`<div class="text-[10px] text-gray-400">Cost: ₹${p.supplier_price}</div>`:''}${p.margin_amt?`<div class="text-[10px] text-green-600 font-bold">+₹${p.margin_amt}</div>`:''}</div><button onclick="openEditProduct(${p.id})" class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"><i class="fas fa-pen"></i></button><button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><i class="fas fa-trash"></i></button></div></div>`;}).join('');
}

async function openEditProduct(productId){
    const p=products.find(x=>x.id===productId);if(!p)return showToast('Product not found');
    const isPerf=isPerfumeCategory(p.category);
    document.getElementById('edit-product-id').value=p.id;document.getElementById('edit-product-title').textContent=`(ID: ${p.id})`;
    document.getElementById('ep-name').value=p.name||'';document.getElementById('ep-price').value=p.price||'';
    const epMarginEl=document.getElementById('ep-margin-amt');if(epMarginEl)epMarginEl.value=p.margin_amt||0;
    document.getElementById('ep-category').value=p.category||'Men';
    setTimeout(()=>{updateDropdownSubs('ep-category','ep-sub');document.getElementById('ep-sub').value=p.sub||'';},50);
    document.getElementById('edit-ap-brand').value=p.brand||'';document.getElementById('ep-desc').value=p.desc||'';
    document.getElementById('ep-oldprice').value=p.oldprice||'';document.getElementById('ep-discount').value=p.checkout_discount||0;
    document.getElementById('ep-stock').value=p.stock_qty||50;document.getElementById('ep-imgs').value=Array.isArray(p.imgs)?p.imgs.join('\n'):(p.imgs||'');
    const grid=document.getElementById('ep-sizes-grid');grid.innerHTML='';
    if(isPerf){
        const label=document.createElement('p');label.className='text-xs text-purple-600 font-bold mb-2 col-span-full';label.textContent='🌸 Select ML Volumes:';grid.appendChild(label);
        PERFUME_ML_SIZES.forEach(size=>{const label=document.createElement('label');label.className='flex items-center gap-1 cursor-pointer text-xs';label.innerHTML=`<input type="checkbox" value="${size}" class="ep-size-chk" ${p.available_sizes?.includes(size)?'checked':''}><span>${size}</span>`;grid.appendChild(label);});
    }else{
        ['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','5','6','7','8','9','10','11','12','Free Size'].forEach(size=>{const label=document.createElement('label');label.className='flex items-center gap-1 cursor-pointer text-xs';label.innerHTML=`<input type="checkbox" value="${size}" class="ep-size-chk" ${p.available_sizes?.includes(size)?'checked':''}><span>${size}</span>`;grid.appendChild(label);});
    }
    const modal=document.getElementById('edit-product-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');
}

function closeEditModal(){document.getElementById('edit-product-modal')?.classList.add('hidden');document.getElementById('edit-product-form')?.reset();}

async function updateProduct(event){
    event.preventDefault();const productId=document.getElementById('edit-product-id').value;
    const updates={name:document.getElementById('ep-name').value,price:parseInt(document.getElementById('ep-price').value),margin_amt:parseInt(document.getElementById('ep-margin-amt')?.value)||0,oldprice:parseInt(document.getElementById('ep-oldprice').value)||0,checkout_discount:parseInt(document.getElementById('ep-discount').value)||0,brand:document.getElementById('edit-ap-brand').value,category:document.getElementById('ep-category').value,sub:document.getElementById('ep-sub').value,desc:document.getElementById('ep-desc').value,stock_qty:parseInt(document.getElementById('ep-stock').value)||0,available_sizes:Array.from(document.querySelectorAll('.ep-size-chk:checked')).map(cb=>cb.value),imgs:document.getElementById('ep-imgs').value.split('\n').map(l=>l.trim()).filter(Boolean)};
    try{const{data,error}=await dbClient.from('products').update(updates).eq('id',productId).select().single();if(error)throw error;const idx=products.findIndex(p=>p.id==productId);if(idx>-1)products[idx]=data;closeEditModal();renderAdminProducts();showToast('✅ Product Updated!');}catch(err){showToast('❌ Update failed: '+err.message);}
}

async function deleteProduct(id){if(!confirm('Delete this product?'))return;try{await dbClient.from('products').delete().eq('id',id);products=products.filter(p=>p.id!==id);renderAdminProducts();showToast('Deleted from DB. 🗑️');}catch(err){showToast('Delete failed: '+err.message);}}

/* ============================================================
   27. SCRAPINGBEE
   ============================================================ */
async function uploadScrapedImageToImgBB(imageUrl){if(!imageUrl)return null;try{const fd1=new FormData();fd1.append('image',imageUrl);const res1=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd1});const json1=await res1.json();if(json1.success&&json1.data?.url)return json1.data.url;const imgRes=await fetch(imageUrl);const imgBlob=await imgRes.blob();const fd2=new FormData();fd2.append('image',imgBlob,'product.jpg');const res2=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd2});const json2=await res2.json();return json2.success?(json2.data?.url||null):null;}catch(e){return null;}}
const SUPPLIER_SELECTORS={meesho:{title:'h1, [class*="pdp-title"], [class*="product-name"]',price:'[class*="price"] span, h4',image:'[class*="pdp-image"] img, img[class*="product"]'},amazon:{title:'#productTitle',price:'.a-price-whole',image:'#imgBlkFront, #landingImage'},flipkart:{title:'span.B_NuCI, h1.yhB1nd',price:'div._30jeq3._16Jk6d',image:'img._396cs4'},myntra:{title:'h1.pdp-name',price:'.pdp-price strong',image:'.image-grid-col2 img'},default:{title:'h1, [class*="title"]',price:'[class*="price"] span',image:'[class*="product"] img, main img'}};
function detectSupplier(url){if(!url)return'default';if(url.includes('meesho'))return'meesho';if(url.includes('amazon'))return'amazon';if(url.includes('flipkart'))return'flipkart';if(url.includes('myntra'))return'myntra';return'default';}
async function scrapeProductFromUrl(){
    const urlInput=document.getElementById('scrape-url'),statusEl=document.getElementById('scrape-status'),url=urlInput?.value.trim();if(!url)return showToast('Enter a Supplier URL first');
    if(statusEl){statusEl.classList.remove('hidden');statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-blue-50 border-blue-200 text-blue-700';statusEl.innerHTML='<i class="fas fa-spinner fa-spin"></i> Scraping product data...';}showToast('🔍 Scraping product...');
    const sel=SUPPLIER_SELECTORS[detectSupplier(url)];
    try{
        const apiUrl=`https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=in`;
        const res=await fetch(apiUrl);if(!res.ok)throw new Error(`ScrapingBee: ${res.status} ${res.statusText}`);
        const html=await res.text(),doc=new DOMParser().parseFromString(html,'text/html');
        const titleEl=doc.querySelector(sel.title),title=titleEl?titleEl.textContent.trim().replace(/\s+/g,' ').substring(0,200):'';
        const priceEl=doc.querySelector(sel.price),priceNum=parseInt(((priceEl?.textContent||'').match(/[\d,]+/)||['0'])[0].replace(/,/g,''))||0;
        const imgEl=doc.querySelector(sel.image);let imgUrl=imgEl?(imgEl.getAttribute('src')||imgEl.getAttribute('data-src')||''):'';if(imgUrl.startsWith('//'))imgUrl='https:'+imgUrl;
        if(!title&&!priceNum){if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-red-50 border-red-200 text-red-700';statusEl.innerHTML='<i class="fas fa-times-circle"></i> Could not extract data — fill fields manually';}showToast('❌ Scrape failed — fill manually');return;}
        const nE=document.getElementById('ap-name'),sE=document.getElementById('ap-supplier-price'),oE=document.getElementById('ap-oldprice');if(nE&&title)nE.value=title;if(sE&&priceNum)sE.value=priceNum;if(oE&&priceNum)oE.value=Math.round(priceNum*1.5);updateSellingPreview();
        if(imgUrl){if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-blue-50 border-blue-200 text-blue-700';statusEl.innerHTML='<i class="fas fa-cloud-upload-alt fa-pulse"></i> Uploading image to ImgBB...';}const hostedUrl=await uploadScrapedImageToImgBB(imgUrl);const iE=document.getElementById('ap-imgs');if(hostedUrl){if(iE)iE.value=hostedUrl;if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-green-50 border-green-200 text-green-700';statusEl.innerHTML=`<i class="fas fa-check-circle"></i> Scraped & image hosted! "${title.substring(0,35)}..." — Cost: ₹${priceNum}`;}}else{if(iE)iE.value=imgUrl;if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-amber-50 border-amber-200 text-amber-700';statusEl.innerHTML=`<i class="fas fa-exclamation-triangle"></i> Scraped! (ImgBB failed — using direct URL) — Cost: ₹${priceNum}`;}}}else{if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-green-50 border-green-200 text-green-700';statusEl.innerHTML=`<i class="fas fa-check-circle"></i> Scraped! "${title.substring(0,40)}..." — Cost: ₹${priceNum} (no image found)`;}}
    }catch(err){if(statusEl){statusEl.className='flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-red-50 border-red-200 text-red-700';statusEl.innerHTML=`<i class="fas fa-times-circle"></i> ${err.message}`;}showToast('❌ Scrape failed: '+err.message);}
}

/* ============================================================
   28. ADMIN — ORDERS
   ============================================================ */
async function loadAllOrdersAdmin(){
    const container=document.getElementById('admin-full-order-list');if(!container)return;
    container.innerHTML=`<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>`;
    try{
        const{data,error}=await dbClient.from('orders').select('*').order('date',{ascending:false});if(error)throw error;
        window.allAdminOrders=data||[];renderFilteredOrders(document.getElementById('admin-order-filter')?.value||'all');
    }catch(err){container.innerHTML=`<div class="text-center py-6 text-red-500">Error: ${err.message}</div>`;}
}

function filterAdminOrders(status){renderFilteredOrders(status);}

function renderFilteredOrders(filterStatus){
    const container=document.getElementById('admin-full-order-list');if(!container)return;
    const allOrders=window.allAdminOrders||[],filteredData=filterStatus==='all'?allOrders:allOrders.filter(o=>o.status===filterStatus);
    if(!allOrders.length){container.innerHTML=`<div class="text-center py-20"><i class="fas fa-receipt text-6xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg font-semibold">No orders yet</p></div>`;document.getElementById('admin-order-count').innerText='0';document.getElementById('admin-total-sales').innerText='₹0';return;}
    const activeOrders=allOrders.filter(o=>o.status!=='Cancelled');
    document.getElementById('admin-order-count').innerText=activeOrders.length;
    document.getElementById('admin-total-sales').innerText=`₹${activeOrders.reduce((s,o)=>s+(o.total||0),0).toLocaleString()}`;
    if(!filteredData.length){container.innerHTML=`<div class="text-center py-16"><i class="fas fa-filter text-5xl text-gray-300 mb-3"></i><p class="text-gray-500 font-semibold">No ${filterStatus} orders found</p></div>`;return;}
    const headerHtml=`<div class="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200 mb-4 sticky top-0 z-10"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="fas fa-clock text-purple-600 text-xl"></i><div><span class="text-sm font-black text-purple-700">${filterStatus==='all'?`Total: ${allOrders.length}`:`${filterStatus}: ${filteredData.length}`}</span><p class="text-xs text-gray-500 mt-0.5">Newest first</p></div></div><span class="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200 font-bold">Active: ${activeOrders.length}</span></div></div>`;
    container.innerHTML=headerHtml+filteredData.map(o=>{
        const oidSafe=String(o.id||'').replace(/'/g,"\\'"),badge=STATUS_BADGE[o.status]||'bg-gray-100 text-gray-600';
        const itemsHtml=o.items?.length?o.items.map(item=>`<div class="admin-order-item"><img src="${item.img||'https://placehold.co/48x60/e11d48/fff?text=?'}" alt="${item.name}" onerror="this.src='https://placehold.co/48x60/eee/999?text=?'" loading="lazy"><div class="admin-order-item-info"><div class="admin-order-item-name" title="${item.name}">${item.name}</div><div class="admin-order-item-meta">${isPerfumeCategory(item.category||'')?'Vol':'Size'}: <strong>${item.size||'M'}</strong> &nbsp;•&nbsp; Qty: <strong>${item.qty||1}</strong></div><div class="admin-order-item-price">₹${((item.price||0)*(item.qty||1)).toLocaleString()}</div></div></div>`).join(''):'<div class="text-xs text-gray-400 italic py-2 px-1">No item details</div>';
        return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-3 hover:shadow-md transition-all">
            <div class="flex justify-between items-start pb-3 mb-3 border-b"><div><span class="font-bold text-purple-700 font-mono text-sm">#${o.id}</span><span class="${badge} text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">${o.status||'Processing'}</span><div class="text-xs text-gray-500 mt-1">${o.date||''} • ${o.paymentmode||''}</div></div><div class="font-black text-lg text-rose-600">₹${(o.total||0).toLocaleString()}</div></div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-3 bg-gray-50 rounded-lg p-3 border"><div><span class="font-bold text-gray-400 uppercase text-[10px]">Customer</span><div class="font-semibold text-gray-800 mt-0.5">${o.customer_name||'N/A'}</div></div><div><span class="font-bold text-gray-400 uppercase text-[10px]">Mobile</span><div class="font-semibold text-gray-800 mt-0.5">${o.mobile||'N/A'}</div></div><div class="col-span-2"><span class="font-bold text-gray-400 uppercase text-[10px]">TX ID</span><div class="font-mono text-gray-700 mt-0.5 truncate">${o.transaction_id||'N/A'}</div></div>${o.referral_code?`<div class="col-span-2 bg-green-50 rounded p-1.5 border border-green-200"><span class="font-bold text-green-700 uppercase text-[10px]">Referral Code</span><div class="font-mono font-semibold text-green-800 mt-0.5">${o.referral_code}</div></div>`:''}${o.refund_upi?`<div class="col-span-2 bg-rose-50 rounded p-1.5 border border-rose-200"><span class="font-bold text-rose-700 uppercase text-[10px]">Refund UPI</span><div class="font-mono font-semibold text-rose-800 mt-0.5 select-all">${o.refund_upi}</div></div>`:''}</div>
            <div class="mb-3"><div class="text-[10px] font-bold text-gray-400 uppercase mb-2">Items (${(o.items||[]).length})</div><div class="admin-order-items">${itemsHtml}</div></div>
            <div class="text-[10px] text-gray-500 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-3"><i class="fas fa-map-marker-alt text-blue-400 mr-1"></i>${[o.address,o.city,o.state,o.pincode?'- '+o.pincode:''].filter(Boolean).join(', ')||'N/A'}</div>
            <div class="flex items-center gap-2"><span class="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Update Status:</span><select onchange="updateOrderStatus('${oidSafe}',this.value)" class="flex-1 border border-gray-300 rounded-lg text-xs p-2 font-bold bg-white focus:ring-2 focus:ring-purple-300 outline-none cursor-pointer">${ALL_ORDER_STATUSES.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>`;
    }).join('');
}

async function updateOrderStatus(orderId,newStatus){
    orderId=String(orderId||'').trim();if(!orderId){showToast('❌ Invalid order ID');return;}
    showToast(`⏳ Updating order #${orderId}...`);
    try{const restUrl=`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`;const res=await fetch(restUrl,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({status:newStatus})});if(!res.ok){const errText=await res.text();throw new Error(`HTTP ${res.status}: ${errText}`);}showToast(`✅ Order #${orderId} → "${newStatus}"`);setTimeout(()=>loadAllOrdersAdmin(),600);}
    catch(err){showToast(`❌ Update failed: ${err.message}`);setTimeout(()=>loadAllOrdersAdmin(),500);}
}

async function loadAllUsersAdmin(){
    const container=document.getElementById('admin-users-list');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{
        const{data,error}=await dbClient.from('users').select('*').order('mobile',{ascending:false});if(error)throw error;
        container.innerHTML=data?.length?data.map(user=>`<div class="bg-white border rounded-lg p-4 hover:shadow-md transition"><div class="flex items-center gap-4"><img src="${user.profile_pic||`https://placehold.co/48x48/e11d48/ffffff?text=${(user.name||'U').charAt(0)}`}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-200"><div class="flex-1"><div class="flex items-center gap-2"><div class="font-bold text-gray-900">${user.name||'Unknown'}</div>${isAuthorizedAdmin(user)?'<span class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Admin</span>':''}</div><div class="text-sm text-gray-500">+91 ${user.mobile}</div>${user.email?`<div class="text-xs text-gray-400">${user.email}</div>`:''}</div><div class="text-right"><div class="text-lg font-bold text-purple-600">₹${user.wallet||0}</div><div class="text-xs text-gray-500">Wallet</div></div></div></div>`).join(''):'<div class="text-center text-gray-400 py-10">No users found</div>';
    }catch(err){container.innerHTML='<div class="text-center text-red-500 py-6">Error loading users</div>';}
}

async function loadAllWithdrawalsAdmin(){
    try{const{data}=await dbClient.from('withdrawals').select('*').eq('status','Pending');const container=document.getElementById('admin-withdraw-list');document.getElementById('admin-pending-withdraw').innerText=data?.length||0;if(data?.length){container.innerHTML=data.map(w=>`<div class="bg-green-50 border border-green-200 p-3 rounded-lg text-xs"><p><b>User:</b> ${w.mobile} | <b>Amount: ₹${w.amount}</b></p><p class="bg-white p-2 mt-2 border rounded font-mono select-all">UPI: ${w.upi_id}</p><button onclick="approvePayout(${w.id})" class="mt-2 w-full bg-green-600 text-white py-1.5 rounded font-bold">Mark as Paid ✅</button></div>`).join('');}else{container.innerHTML='<p class="text-center text-gray-400 py-5">No pending payouts.</p>';}}catch(e){}
}

async function approvePayout(id){if(!confirm('Confirm: Payment done via UPI?'))return;try{await dbClient.from('withdrawals').update({status:'Paid'}).eq('id',id);showToast('Payout Successful! 💰');loadAllWithdrawalsAdmin();}catch(err){showToast('Error: '+err.message);}}

function adminLogout(){isAdminLoggedIn=false;localStorage.removeItem('outfitkart_admin_session');document.body.classList.remove('admin-active');showToast('Admin Logged Out');navigate('home');}
function exitAdmin(){isAdminLoggedIn=false;localStorage.removeItem('outfitkart_admin_session');document.body.classList.remove('admin-active');navigate('home');}

/* ============================================================
   29. ORDER TRACKING
   ============================================================ */
async function openTrackingModal(orderId){
    orderId=String(orderId||'').trim();let order=ordersDb.find(o=>String(o.id)===orderId);
    if(!order){try{const{data}=await dbClient.from('orders').select('*').eq('id',orderId).maybeSingle();if(data){ordersDb.push(data);order=data;}}catch(e){}}
    if(!order)return showToast('Order not found');
    currentTrackingOrder=order;renderTrackingContent(order);
    const modal=document.getElementById('tracking-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');document.body.style.overflow='hidden';
}

function closeTrackingModal(event){
    if(event&&event.target!==document.getElementById('tracking-modal'))return;
    const modal=document.getElementById('tracking-modal');modal?.classList.add('hidden');modal?.classList.remove('flex');document.body.style.overflow='';currentTrackingOrder=null;
}

function renderTrackingContent(order){
    const titleEl=document.getElementById('tracking-modal-title');
    if(titleEl){if(order.status==='Cancelled')titleEl.innerHTML='<i class="fas fa-times-circle text-rose-500"></i> Order Cancelled';else if(_isExchangeStatus(order.status))titleEl.innerHTML='<i class="fas fa-exchange-alt text-orange-500"></i> Exchange Tracking';else titleEl.innerHTML='<i class="fas fa-map-marker-alt text-green-500"></i> Track Order';}
    document.getElementById('tracking-order-id').textContent=`Order #${order.id}  •  ${order.status}`;
    const item=order.items?.[0]||{img:'',name:'Item',qty:1,price:0,size:'M'};
    document.getElementById('tracking-product-card').innerHTML=`<div class="flex items-center gap-4"><img src="${item.img}" alt="${item.name}" class="w-20 h-24 rounded-lg object-cover flex-shrink-0 shadow-md" onerror="this.style.display='none'" loading="lazy"><div class="flex-1 min-w-0"><h3 class="font-bold text-gray-900 text-base truncate">${item.name}</h3><p class="text-sm text-gray-600">Qty: ${item.qty} • ${isPerfumeCategory(item.category||'')?'Vol':'Size'}: ${item.size||'M'}</p><p class="text-lg font-black text-gray-900 mt-1">₹${item.price*item.qty}</p></div></div>`;
    document.getElementById('tracking-address').innerHTML=`<div class="text-center"><div class="flex items-center justify-center gap-2 mb-3"><i class="fas fa-map-marker-alt text-blue-500 text-xl"></i><h4 class="font-bold text-gray-800 text-sm">Shipping Address</h4></div><div class="text-left text-sm"><p class="font-semibold text-gray-900">${order.address||'N/A'}</p><p class="text-gray-600">${order.city||''}, ${order.state||''} - ${order.pincode||''}</p><p class="text-gray-500 mt-1">+91 ${order.mobile}</p></div></div>`;
    const wrapper=document.getElementById('tracking-timeline-wrapper');
    if(order.status==='Cancelled'){const refundLine=order.refund_upi?`<p class="text-sm text-green-600 font-semibold mt-2">💰 ₹${order.total} will be refunded to ${order.refund_upi} within 24-48 hrs.</p>`:(order.paymentmode==='COD'?'<p class="text-sm text-gray-500 mt-2">COD — no refund needed.</p>':'');wrapper.innerHTML=`<div class="px-6 py-8 flex flex-col items-center text-center"><div class="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-times text-rose-600 text-4xl"></i></div><h3 class="font-black text-xl text-rose-600 mb-2">Order Cancelled</h3><p class="text-sm text-gray-500">This order has been cancelled.</p>${refundLine}</div>`;return;}
    if(_isExchangeStatus(order.status)){wrapper.innerHTML=_buildTimeline([{key:'ex-requested',icon:'fa-exchange-alt',label:'Exchange Requested',sub:'Request submitted'},{key:'ex-processing',icon:'fa-cogs',label:'Exchange Processing',sub:'Being reviewed'},{key:'ex-shipped',icon:'fa-truck',label:'Exchange Shipped',sub:'New item dispatched'},{key:'ex-done',icon:'fa-check-circle',label:'Exchanged',sub:'Exchange complete!'}],STATUS_MAP[order.status]||[],'orange');return;}
    wrapper.innerHTML=_buildTimeline([{key:'ordered',icon:'fa-file-invoice-dollar',label:'Ordered',sub:'Order confirmed'},{key:'packed',icon:'fa-box',label:'Packed',sub:'Ready to ship'},{key:'shipped',icon:'fa-truck',label:'Shipped',sub:'Out for delivery'},{key:'delivered',icon:'fa-home',label:'Delivered',sub:'Order completed'}],STATUS_MAP[order.status]||[],'green');
}

function _isExchangeStatus(status){return status&&(status.toLowerCase().includes('exchange')||status==='Exchanged');}

function _buildTimeline(steps,completedKeys,accentColor){
    const dotDone=accentColor==='orange'?'border-orange-400 bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg scale-110':'border-emerald-400 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg scale-110';
    const lineDone=accentColor==='orange'?'bg-orange-400':'bg-emerald-400';
    return `<div class="px-6 py-6"><div class="flex flex-col items-center space-y-0 relative">${steps.map((step,idx)=>{const done=completedKeys.includes(step.key),isLast=idx===steps.length-1;return`<div class="flex flex-col items-center text-center w-full relative" style="min-height:80px"><div class="w-12 h-12 rounded-full border-4 ${done?dotDone:'border-gray-300 bg-white text-gray-400'} flex items-center justify-center shadow-md relative z-10 transition-all duration-500"><i class="fas ${step.icon} text-lg"></i></div><div class="mt-3 px-4"><h3 class="font-bold text-sm ${done?'text-gray-900':'text-gray-400'}">${step.label}</h3><p class="text-xs ${done?'text-gray-600':'text-gray-400'} mt-0.5">${step.sub}</p></div>${!isLast?`<div class="w-0.5 flex-1 mt-2 ${done?lineDone:'bg-gray-200'} min-h-[2rem] transition-all duration-500"></div>`:''}</div>`;}).join('')}</div></div>`;
}

function initRealtimeTracking(){
    if(!currentUser)return;if(realtimeChannel){dbClient.removeChannel(realtimeChannel);realtimeChannel=null;}
    realtimeChannel=dbClient.channel(`orders-user-${currentUser.mobile}-${Date.now()}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`mobile=eq.${currentUser.mobile}`},payload=>{const updated=payload.new;if(!updated?.id)return;const idx=ordersDb.findIndex(o=>String(o.id)===String(updated.id));if(idx>-1){ordersDb[idx]={...ordersDb[idx],...updated,items:updated.items||ordersDb[idx].items};}else{ordersDb.push(updated);}const finalOrder=idx>-1?ordersDb[idx]:updated;showToast(`📦 Order #${updated.id}: "${updated.status}"`);const modal=document.getElementById('tracking-modal'),isOpen=modal&&!modal.classList.contains('hidden');if(isOpen&&String(currentTrackingOrder?.id)===String(updated.id)){currentTrackingOrder=finalOrder;renderTrackingContent(finalOrder);}if(!document.getElementById('tab-orders')?.classList.contains('hidden'))renderOrdersList();}).subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setTimeout(()=>initRealtimeTracking(),5000);});
}

function cleanupRealtime(){if(realtimeChannel){dbClient.removeChannel(realtimeChannel);realtimeChannel=null;}}

/* ============================================================
   30. IMAGE UPLOAD
   ============================================================ */
window.uploadToImgBB=async(event,textareaId)=>{
    const files=event.target.files;if(!files?.length)return;const input=event.target,statusEl=input.nextElementSibling?.classList.contains('upload-status')?input.nextElementSibling:null,textarea=document.getElementById(textareaId);if(!textarea)return;
    const existing=textarea.value?textarea.value.split('\n').filter(Boolean):[];if(statusEl){statusEl.classList.remove('hidden');statusEl.innerHTML='<i class="fas fa-spinner fa-spin mr-1"></i>Uploading…';}
    for(const file of Array.from(files)){if(file.size>32e6)continue;const fd=new FormData();fd.append('image',file);try{const res=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:'POST',body:fd});const json=await res.json();if(json.success&&json.data?.url){existing.push(json.data.url);if(statusEl)statusEl.innerHTML=`<i class="fas fa-check mr-1 text-green-500"></i>${existing.length} images ready`;}}catch{if(statusEl)statusEl.innerHTML='<i class="fas fa-times text-red-500 mr-1"></i>Upload error';}}
    textarea.value=existing.join('\n');showToast('✅ Images uploaded!');setTimeout(()=>statusEl?.classList.add('hidden'),2500);input.value='';
};

/* ============================================================
   31. SHARE / OG
   ============================================================ */
async function nativeShareProduct(id,name,price){const url=`${window.location.origin}${window.location.pathname}?pid=${id}`;const text=`Check out ${name} for just ₹${price} on OutfitKart! COD available.`;const p=products.find(x=>x.id===id),img=p?.imgs?.[0]||p?.img||'';_setOgTags({title:`${name} | OutfitKart`,description:`Buy ${name} for ₹${price}. Cash on Delivery available.`,image:img,url});if(navigator.share){try{await navigator.share({title:`${name} | OutfitKart`,text,url});}catch{}}else{await navigator.clipboard.writeText(`${text}\n${url}`).catch(()=>{});showToast('Link copied! 📋');}}

async function shareOutfitKart(){const code=currentUser?.referral_code||'',url=code?`${window.location.origin}${window.location.pathname}?ref=${code}`:window.location.origin+window.location.pathname,title='OutfitKart — Premium Fashion at Best Prices',text='🛍️ OutfitKart — Premium Fashion! COD available. Latest trends, amazing deals. 👇';_setOgTags({title,description:'Shop latest trends for men, women & combos. COD available!',image:'https://placehold.co/1200x630/e11d48/ffffff?text=OutfitKart+Fashion',url});if(navigator.share){try{await navigator.share({title,text,url});showToast('Thanks for sharing! 🎉');}catch{}}else{try{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('Link copied! 🔗');}catch{window.open(`https://wa.me/?text=${encodeURIComponent(text+'\n'+url)}`,'_blank');}}}

function _setOgTags({title,description,image,url}={}){const t=title||'OutfitKart — Premium Fashion at Best Prices',d=description||'Shop latest trends. COD available.',img=image||'https://placehold.co/1200x630/e11d48/ffffff?text=OutfitKart+Fashion',u=url||window.location.href;const set=(prop,val)=>{let el=document.querySelector(`meta[property="${prop}"]`)||document.querySelector(`meta[name="${prop}"]`);if(!el){el=document.createElement('meta');el.setAttribute('property',prop);document.head.appendChild(el);}el.setAttribute('content',val);};set('og:title',t);set('og:description',d);set('og:image',img);set('og:url',u);set('og:type','website');set('og:site_name','OutfitKart');set('twitter:card','summary_large_image');set('twitter:title',t);set('twitter:image',img);document.title=t;}

function openWhatsAppSupport(){window.open(`https://wa.me/${SUPPORT_WA}`,'_blank');}
function openEmailSupport(){window.location.href=`mailto:${SUPPORT_EMAIL}?subject=OutfitKart Support&body=Hi, I need help with my order.`;}

/* ============================================================
   32. TOAST
   ============================================================ */
function showToast(msg){const t=document.createElement('div');t.className='bg-gray-900 text-white px-5 py-3 rounded-full shadow-2xl text-sm fade-in pointer-events-auto';t.innerHTML=msg;document.getElementById('toast-container').appendChild(t);setTimeout(()=>t.parentNode?.removeChild(t),3000);}

/* ============================================================
   33. PWA
   ============================================================ */
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;_showInstallBanner();});
function _showInstallBanner(){if(window.innerWidth>=768){const banner=document.getElementById('pwa-install-banner');banner?.classList.remove('hidden','translate-y-full');banner?.classList.add('translate-y-0');}else{const modal=document.getElementById('pwa-install-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');}}
window.installApp=async function(){if(!deferredPrompt)return;deferredPrompt.prompt();const{outcome}=await deferredPrompt.userChoice;hideInstallBanner();if(outcome==='accepted'){showToast('✅ OutfitKart installed!');deferredPrompt=null;}};
window.hideInstallBanner=function(){const banner=document.getElementById('pwa-install-banner'),modal=document.getElementById('pwa-install-modal');banner?.classList.add('translate-y-full');modal?.classList.remove('flex');modal?.classList.add('hidden');setTimeout(()=>banner?.classList.add('hidden'),300);};
window.addEventListener('appinstalled',()=>hideInstallBanner());
if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').then(r=>console.log('[SW] Registered:',r)).catch(e=>console.warn('[SW] Registration failed:',e));});}


/* ============================================================
   WALLET WITHDRAWAL SYSTEM
   ============================================================ */
function showWithdrawForm() {
    const section = document.getElementById('withdraw-form-section');
    if (!section) return;
    section.classList.remove('hidden');
    // Pre-fill name
    const nameInput = document.getElementById('withdraw-name');
    if (nameInput && currentUser?.name) nameInput.value = currentUser.name;
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideWithdrawForm() {
    const section = document.getElementById('withdraw-form-section');
    if (section) section.classList.add('hidden');
}

async function submitWithdrawRequest() {
    if (!currentUser) return showToast('Please login first');

    const amountEl = document.getElementById('withdraw-amount');
    const upiEl    = document.getElementById('withdraw-upi');
    const nameEl   = document.getElementById('withdraw-name');

    const amount = parseInt(amountEl?.value) || 0;
    const upiId  = upiEl?.value.trim();
    const name   = nameEl?.value.trim();

    // Validations
    if (!amount || amount < 120)     return showToast('Minimum withdrawal amount is ₹120');
    if (!upiId)                      return showToast('Please enter your UPI ID');
    if (!name)                       return showToast('Please enter account holder name');
    if (amount > walletBalance)      return showToast(`Insufficient balance. Available: ₹${walletBalance}`);

    // Confirm
    if (!confirm(`Withdraw ₹${amount} to ${upiId}?\nProcessed within 24-48 hours.`)) return;

    showToast('⏳ Submitting withdrawal request...');

    try {
        // Save withdrawal request to Supabase
        const { data, error } = await dbClient.from('withdrawals').insert([{
            mobile:    currentUser.mobile,
            name:      name,
            upi_id:    upiId,
            amount:    amount,
            status:    'Pending',
            date:      new Date().toLocaleDateString('en-IN'),
            created_at: new Date().toISOString(),
        }]).select().single();

        if (error) throw error;

        // Deduct from wallet
        const newBal = walletBalance - amount;
        await _updateWalletBalance(newBal);
        walletBalance = newBal;

        // Update UI
        const walletEl = document.getElementById('prof-wallet');
        if (walletEl) walletEl.textContent = `₹${newBal}`;

        // Clear form
        if (amountEl) amountEl.value = '';
        if (upiEl)    upiEl.value    = '';
        hideWithdrawForm();

        showToast(`✅ Withdrawal request of ₹${amount} submitted! Will be processed in 24-48 hours.`);
        // Refresh wallet tx list
        loadWalletTransactions();

    } catch (err) {
        console.error('[submitWithdrawRequest]', err);
        showToast('❌ Error: ' + err.message);
    }
}

async function loadWalletTransactions() {
    if (!currentUser) return;
    const container = document.getElementById('wallet-tx-list');
    if (!container) return;

    try {
        const { data, error } = await dbClient
            .from('withdrawals')
            .select('*')
            .eq('mobile', currentUser.mobile)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || !data.length) {
            container.innerHTML = '<div class="text-center py-6 text-gray-400"><i class="fas fa-receipt text-3xl mb-2 block"></i><p class="text-sm">No transactions yet</p></div>';
            return;
        }

        const STATUS_COLOR = {
            'Pending': 'bg-amber-100 text-amber-700',
            'Paid':    'bg-green-100 text-green-700',
            'Rejected':'bg-red-100 text-red-600',
        };

        container.innerHTML = data.map(tx => `
            <div class="flex items-center justify-between py-2.5 px-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status === 'Paid' ? 'bg-green-100' : 'bg-amber-100'}">
                        <i class="fas fa-paper-plane text-sm ${tx.status === 'Paid' ? 'text-green-600' : 'text-amber-600'}"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-sm text-gray-800">Withdrawal to ${tx.upi_id}</div>
                        <div class="text-xs text-gray-400">${tx.date}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-base text-red-500">-₹${tx.amount}</div>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[tx.status] || 'bg-gray-100 text-gray-500'}">${tx.status}</span>
                </div>
            </div>`).join('');

    } catch (err) {
        container.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">Could not load history</div>';
    }
}

/* ============================================================
   34. GLOBAL EXPORTS
   ============================================================ */
Object.assign(window,{
    navigate,toggleCart,handleSearch,sortProducts,shopSortProducts,filterSub,_initShopScrollHide,
    openCategoryPage,openSubcatProducts,showQuickSizeModal,hideQuickSizeModal,selectQuickSize,addFromQuickModal,
    toggleWishlist,openProductPage,pdpScrollToSlide,selectSize,addToCartPDP,buyNowPDP,buyNow,
    submitReview,setRating,switchAuthTab,handleLogin,handleSignup,saveProfile,changePassword,
    uploadProfilePic,switchProfileTab,handleLogout,shareOutfitKart,nativeShareProduct,shareWithReferral,
    cancelOrder,closeRefundUpiModal,finaliseCancelWithRefund,startExchange,closeExchangeModal,confirmExchange,
    openTrackingModal,closeTrackingModal,proceedToCheckout,goToStep,initiatePayment,saveAddressForm,
    fetchPincodeDetails,useCurrentLocation,updatePaymentSelection,selectPaymentLabel,
    closeSuccessModal,closeSuccessAndGoToOrders,closeCancelModal,
    startAdminTimer,cancelAdminTimer,switchAdminTab,toggleAdminSidebar,filterAdminOrders,
    updateDropdownSubs,toggleProductMode,updateSellingPreview,adminAddProduct,openEditProduct,closeEditModal,
    updateProduct,deleteProduct,autoGenerateDescription,scrapeProductFromUrl,uploadScrapedImageToImgBB,
    loadAllOrdersAdmin,updateOrderStatus,approvePayout,renderOrdersList,updateCartCount,updateQty,removeFromCart,
    handleAdminLogin,closeAdminLogin,loadAllUsersAdmin,adminLogout,exitAdmin,
    openWhatsAppSupport,openEmailSupport,
    copyReferralCode,switchReferralTab,loadReferrals,renderSidebarReferralWidget,
    cancelReferralForOrder,recordReferralPurchase,
    loadAdminReferrals,adminFilterReferrals,adminConfirmReferral,updateSizeSection,
    showWithdrawForm,hideWithdrawForm,submitWithdrawRequest,loadWalletTransactions,
    goBannerSlide,nextBannerSlide,prevBannerSlide,
});
