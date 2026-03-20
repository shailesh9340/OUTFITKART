'use strict';
/* ============================================================
   SCRIPT-ADMIN.JS — OutfitKart Admin Panel
   Depends on: script-core.js (must load first)
   ============================================================ */

/* ============================================================
   A1. ADMIN AUTH + NAME DISPLAY
   ============================================================ */
function showAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    modal?.classList.remove('hidden'); modal?.classList.add('flex');
    document.getElementById('admin-mobile')?.focus();
}

function closeAdminLogin(goToHome = false) {
    const modal = document.getElementById('admin-login-modal');
    modal?.classList.add('hidden'); modal?.classList.remove('flex');
    if (goToHome) navigate('home');
}

function updateAdminNameInHeader() {
    const name     = localStorage.getItem('outfitkart_admin_name') || 'Admin';
    const nameEl   = document.getElementById('admin-display-name');
    const avatarEl = document.getElementById('admin-avatar-initial');
    const pill     = document.getElementById('admin-user-name-pill');
    if (nameEl)   nameEl.textContent   = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    if (pill) { pill.classList.remove('hidden'); pill.classList.add('flex'); }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const mobile   = document.getElementById('admin-mobile').value.trim().replace(/\D/g, '');
    const password = document.getElementById('admin-password').value.trim();
    if (mobile.length !== 10) { showToast('Enter valid 10-digit mobile number ❌'); return; }
    const btnEl = e.target.querySelector('button[type="submit"]');
    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying...'; }
    try {
        if (!ADMIN_AUTHORIZED_MOBILES.includes(mobile)) {
            showToast('Access Denied ❌ Not an authorized admin');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-lock mr-2"></i>Login'; }
            document.getElementById('admin-password').value = '';
            return;
        }
        const { data: user, error } = await dbClient
            .from('users')
            .select('mobile, name, password')
            .eq('mobile', mobile)
            .eq('password', password)
            .maybeSingle();
        if (error) throw error;
        if (!user) {
            showToast('Invalid Mobile or Password ❌');
            document.getElementById('admin-password').value = '';
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-lock mr-2"></i>Login'; }
            return;
        }
        if (!ADMIN_AUTHORIZED_MOBILES.includes(String(user.mobile))) {
            showToast('Access Denied ❌');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-lock mr-2"></i>Login'; }
            return;
        }
        isAdminLoggedIn = true;
        localStorage.setItem('outfitkart_admin_session', 'true');
        localStorage.setItem('outfitkart_admin_name',   user.name || 'Admin');
        localStorage.setItem('outfitkart_admin_mobile', user.mobile);
        showToast('Welcome ' + (user.name || 'Admin') + '! 👋');
        document.getElementById('admin-mobile').value   = '';
        document.getElementById('admin-password').value = '';
        closeAdminLogin();
        setTimeout(() => navigate('admin'), 100);
    } catch (err) {
        showToast('Login error: ' + err.message);
        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-lock mr-2"></i>Login'; }
    }
}

function loadAdminDashboard() {
    updateAdminNameInHeader();
    switchAdminTab('dashboard');
    renderAdminDashboard();
}

/* ============================================================
   A2. ADMIN DASHBOARD WITH CHARTS
   ============================================================ */
async function renderAdminDashboard() {
    const dashboardEl = document.getElementById('admin-dashboard-content');
    if (!dashboardEl) return;
    dashboardEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-purple-600"></i><p class="mt-2 text-gray-500">Loading dashboard...</p></div>';
    try {
        const [ordersRes, usersRes, referralsRes] = await Promise.all([
            dbClient.from('orders').select('*').order('date', { ascending: false }),
            dbClient.from('users').select('*'),
            dbClient.from('referrals').select('commission, status').order('id', { ascending: false }).limit(500),
        ]);
        const allOrders    = ordersRes.data   || [];
        const allUsers     = usersRes.data    || [];
        const allReferrals = referralsRes.data || [];
        const activeOrders    = allOrders.filter(o => o.status !== 'Cancelled');
        const cancelledOrders = allOrders.filter(o => o.status === 'Cancelled');
        const totalRevenue = activeOrders.reduce((s, o) => s + (o.total        || 0), 0);
        const totalProfit  = activeOrders.reduce((s, o) => s + (o.margin_total || 0), 0);
        const recentOrders = allOrders.slice(0, 5);
        const pendingComm   = allReferrals.filter(r => r.status === 'pending').reduce((s, r) => s + (r.commission || 0), 0);
        const confirmedComm = allReferrals.filter(r => r.status === 'confirmed').reduce((s, r) => s + (r.commission || 0), 0);

        /* Last 7 days chart data */
        const last7Labels = [], revenueByDay = [], profitByDay = [], ordersByDay = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr   = d.toLocaleDateString('en-IN');
            const dayOrders = allOrders.filter(o => o.date === dateStr && o.status !== 'Cancelled');
            last7Labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
            revenueByDay.push(dayOrders.reduce((s, o) => s + (o.total        || 0), 0));
            profitByDay.push( dayOrders.reduce((s, o) => s + (o.margin_total || 0), 0));
            ordersByDay.push(dayOrders.length);
        }
        const statusCounts = {};
        allOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

        const countBadge = document.getElementById('sidebar-product-count');
        if (countBadge) countBadge.textContent = products.length;

        dashboardEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-xl text-white shadow-lg">
                <div class="text-xl font-black">₹${totalRevenue.toLocaleString('en-IN')}</div>
                <div class="text-xs opacity-90 font-semibold mt-1">Total Revenue</div>
                <div class="text-[10px] opacity-70 mt-0.5">${activeOrders.length} active orders</div>
            </div>
            <div class="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-xl text-white shadow-lg">
                <div class="text-xl font-black">₹${totalProfit.toLocaleString('en-IN')}</div>
                <div class="text-xs opacity-90 font-semibold mt-1">Total Profit</div>
                <div class="text-[10px] opacity-70 mt-0.5">From margin_amt</div>
            </div>
            <div class="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl text-white shadow-lg">
                <div class="text-xl font-black">${activeOrders.length}</div>
                <div class="text-xs opacity-90 font-semibold mt-1">Active Orders</div>
                <span class="text-[10px] bg-red-400/60 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">${cancelledOrders.length} cancelled</span>
            </div>
            <div class="bg-gradient-to-br from-rose-500 to-rose-700 p-4 rounded-xl text-white shadow-lg">
                <div class="text-xl font-black">${allUsers.length}</div>
                <div class="text-xs opacity-90 font-semibold mt-1">Total Users</div>
                <div class="text-[10px] opacity-70 mt-0.5">${products.length} products</div>
            </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                <div class="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-hourglass-half text-amber-500 text-sm"></i></div>
                <div><div class="text-[10px] text-gray-500">Pending Referral</div><div class="text-base font-black text-amber-600">₹${pendingComm.toLocaleString('en-IN')}</div></div>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                <div class="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-gift text-green-600 text-sm"></i></div>
                <div><div class="text-[10px] text-gray-500">Confirmed Referral</div><div class="text-base font-black text-green-600">₹${confirmedComm.toLocaleString('en-IN')}</div></div>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                <div class="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-chart-bar text-purple-600 text-sm"></i></div>
                <div><div class="text-[10px] text-gray-500">Avg Order Value</div><div class="text-base font-black">₹${activeOrders.length ? Math.round(totalRevenue / activeOrders.length).toLocaleString('en-IN') : 0}</div></div>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                <div class="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-percentage text-teal-600 text-sm"></i></div>
                <div><div class="text-[10px] text-gray-500">Profit Margin</div><div class="text-base font-black text-teal-600">${totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0}%</div></div>
            </div>
        </div>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="bg-white rounded-xl border shadow-sm p-4">
                <h3 class="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide"><i class="fas fa-chart-bar text-purple-600"></i> Revenue & Profit — Last 7 Days</h3>
                <div style="position:relative;height:190px"><canvas id="dash-rev-chart"></canvas></div>
            </div>
            <div class="bg-white rounded-xl border shadow-sm p-4">
                <h3 class="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide"><i class="fas fa-chart-line text-blue-600"></i> Orders — Last 7 Days</h3>
                <div style="position:relative;height:190px"><canvas id="dash-ord-chart"></canvas></div>
            </div>
        </div>
        <div class="grid md:grid-cols-3 gap-4 mb-4">
            <div class="bg-white rounded-xl border shadow-sm p-4">
                <h3 class="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2"><i class="fas fa-chart-pie text-rose-500"></i> Order Status</h3>
                <div style="position:relative;height:170px"><canvas id="dash-pie-chart"></canvas></div>
            </div>
            <div class="bg-white rounded-xl border shadow-sm p-4 md:col-span-2">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide flex items-center gap-2"><i class="fas fa-clock text-purple-600"></i> Recent Orders</h3>
                    <button onclick="switchAdminTab('order')" class="text-[10px] bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg font-bold border border-purple-200 hover:bg-purple-200">View All →</button>
                </div>
                ${recentOrders.length
                    ? recentOrders.map(order => {
                        const badge = STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600';
                        return `<div class="flex justify-between items-center py-2 border-b last:border-b-0">
                            <div><div class="font-semibold text-sm">#${order.id}</div><div class="text-xs text-gray-400">${order.customer_name || 'N/A'} • ${order.date || ''}</div></div>
                            <div class="text-right"><div class="font-bold text-sm">₹${(order.total || 0).toLocaleString('en-IN')}</div><span class="${badge} text-[10px] px-2 py-0.5 rounded-full font-bold">${order.status}</span></div>
                        </div>`;
                    }).join('')
                    : '<div class="text-center text-gray-400 py-6 text-sm">No orders yet</div>'
                }
            </div>
        </div>`;
        setTimeout(() => _renderDashboardCharts(last7Labels, revenueByDay, profitByDay, ordersByDay, statusCounts), 150);
    } catch (err) {
        dashboardEl.innerHTML = '<div class="text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><p>Error loading dashboard</p></div>';
        console.error('[Dashboard]', err);
    }
}

function _renderDashboardCharts(labels, revenueByDay, profitByDay, ordersByDay, statusCounts) {
    function _draw() {
        const C = window.Chart;
        if (!C) return;
        ['dash-rev-chart', 'dash-ord-chart', 'dash-pie-chart'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el._ci) { el._ci.destroy(); el._ci = null; }
        });
        const revCtx = document.getElementById('dash-rev-chart');
        if (revCtx) {
            revCtx._ci = new C(revCtx, {
                type: 'bar',
                data: { labels, datasets: [
                    { label: 'Revenue ₹', data: revenueByDay, backgroundColor: 'rgba(124,58,237,0.75)', borderRadius: 5 },
                    { label: 'Profit ₹',  data: profitByDay,  backgroundColor: 'rgba(34,197,94,0.75)',  borderRadius: 5 }
                ]},
                options: { responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { font: { size: 10 }, boxWidth: 10 } } },
                    scales: {
                        x: { ticks: { font: { size: 9 } }, grid: { display: false } },
                        y: { ticks: { font: { size: 9 }, callback: v => '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v) }, grid: { color: 'rgba(0,0,0,0.05)' } }
                    }
                }
            });
        }
        const ordCtx = document.getElementById('dash-ord-chart');
        if (ordCtx) {
            ordCtx._ci = new C(ordCtx, {
                type: 'line',
                data: { labels, datasets: [{
                    label: 'Orders', data: ordersByDay,
                    borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)',
                    fill: true, tension: 0.4, pointRadius: 5,
                    pointBackgroundColor: '#3b82f6', pointBorderColor: '#fff', pointBorderWidth: 2
                }]},
                options: { responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { font: { size: 10 }, boxWidth: 10 } } },
                    scales: {
                        x: { ticks: { font: { size: 9 } }, grid: { display: false } },
                        y: { ticks: { font: { size: 9 }, stepSize: 1 }, min: 0, grid: { color: 'rgba(0,0,0,0.05)' } }
                    }
                }
            });
        }
        const pieCtx = document.getElementById('dash-pie-chart');
        if (pieCtx && Object.keys(statusCounts).length) {
            const pieLabels = Object.keys(statusCounts);
            const pieData   = Object.values(statusCounts);
            const COLORS    = ['#7c3aed','#3b82f6','#f59e0b','#10b981','#ef4444','#f97316','#8b5cf6','#14b8a6','#ec4899'];
            pieCtx._ci = new C(pieCtx, {
                type: 'doughnut',
                data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: COLORS.slice(0, pieLabels.length), borderWidth: 2, borderColor: '#fff' }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10, padding: 6 } } }
                }
            });
        }
    }
    if (window.Chart) { _draw(); return; }
    const script  = document.createElement('script');
    script.src    = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = _draw;
    document.head.appendChild(script);
}

/* ============================================================
   A3. ADMIN SIDEBAR TABS
   ============================================================ */
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-content-tab').forEach(el => {
        el.style.display = 'none'; el.classList.add('hidden');
    });
    const targetTab = document.getElementById(`admin-tab-${tab}`);
    if (targetTab) { targetTab.style.display = 'block'; targetTab.classList.remove('hidden'); }

    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-admin-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    if (tab !== 'products' && tab !== 'inventory') closeEditModal();
    if (window.innerWidth < 768) toggleAdminSidebar();

    const countBadge = document.getElementById('sidebar-product-count');
    if (countBadge) countBadge.textContent = products.length;

    if (tab === 'dashboard')  renderAdminDashboard();
    if (tab === 'products')   renderAdminProducts();
    if (tab === 'order')      loadAllOrdersAdmin();
    if (tab === 'payout')     loadAllWithdrawalsAdmin();
    if (tab === 'users')      loadAllUsersAdmin();
    if (tab === 'referrals')  loadAdminReferrals();
    if (tab === 'influencer') loadAdminInfluencerRequests();
}

function toggleAdminSidebar() {
    const sidebar  = document.getElementById('admin-sidebar');
    const overlay  = document.getElementById('admin-sidebar-overlay');
    if (!sidebar || !overlay) return;
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) { sidebar.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }
    else        { sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }
}

/* ============================================================
   A4. ADMIN LOGOUT / EXIT
   ============================================================ */
function adminLogout() {
    isAdminLoggedIn = false;
    ['outfitkart_admin_session','outfitkart_admin_name','outfitkart_admin_username','outfitkart_admin_mobile']
        .forEach(k => localStorage.removeItem(k));
    document.body.classList.remove('admin-active');
    const pill = document.getElementById('admin-user-name-pill');
    if (pill) { pill.classList.add('hidden'); pill.classList.remove('flex'); }
    showToast('Admin Logged Out');
    navigate('home');
}

function exitAdmin() {
    isAdminLoggedIn = false;
    ['outfitkart_admin_session','outfitkart_admin_name','outfitkart_admin_username','outfitkart_admin_mobile']
        .forEach(k => localStorage.removeItem(k));
    document.body.classList.remove('admin-active');
    navigate('home');
}

/* ============================================================
   A5. PRODUCTS — ADD / EDIT / DELETE
   ============================================================ */
function updateDropdownSubs(catId, subId) {
    try {
        const catEl = document.getElementById(catId);
        const subEl = document.getElementById(subId);
        if (!catEl || !subEl) return;
        const cData = CATEGORIES.find(c => c.name === catEl.value);
        subEl.innerHTML = '<option value="">Select Subcategory</option>';
        if (!cData) return;
        if (cData.groups) {
            cData.groups.forEach(group => {
                const og = document.createElement('optgroup');
                og.label = group.label;
                group.items.forEach(s => {
                    const o = document.createElement('option');
                    o.value = s; o.textContent = s;
                    og.appendChild(o);
                });
                subEl.appendChild(og);
            });
        } else {
            cData.subs.forEach(s => {
                const o = document.createElement('option');
                o.value = s; o.textContent = s;
                subEl.appendChild(o);
            });
        }
        updateSizeSection(catEl.value);
    } catch (e) {}
}

function updateSizeSection(categoryName) {
    const sizeSection = document.getElementById('admin-size-section');
    const mlSection   = document.getElementById('admin-ml-section');
    if (!sizeSection || !mlSection) return;
    if (isPerfumeCategory(categoryName)) {
        sizeSection.classList.add('hidden');
        mlSection.classList.remove('hidden');
    } else {
        sizeSection.classList.remove('hidden');
        mlSection.classList.add('hidden');
    }
}

function toggleProductMode(mode) {
    const manualFields = document.getElementById('manual-fields');
    if (!manualFields) return;
    if (mode === 'manual') {
        manualFields.classList.remove('hidden');
        const modeManual = document.getElementById('mode-manual');
        if (modeManual) modeManual.checked = true;
        updateSellingPreview();
    } else {
        manualFields.classList.add('hidden');
        const modeAuto = document.getElementById('mode-auto');
        if (modeAuto) modeAuto.checked = true;
    }
}

function updateSellingPreview() {
    const supplier  = parseInt(document.getElementById('ap-supplier-price')?.value) || 0;
    const marginPct = parseFloat(document.getElementById('ap-margin-pct')?.value)   || 0;
    const marginAmt = Math.round(supplier * marginPct / 100);
    const selling   = supplier + marginAmt;
    const prev = document.getElementById('selling-price-preview');
    const val  = document.getElementById('selling-price-value');
    const mVal = document.getElementById('margin-amt-preview');
    const pEl  = document.getElementById('ap-price');
    const mEl  = document.getElementById('ap-margin');
    if (prev) prev.classList.toggle('hidden', selling === 0);
    if (val)  val.textContent  = `₹${selling.toLocaleString()}`;
    if (mVal) mVal.textContent = `₹${marginAmt.toLocaleString()}`;
    if (pEl)  pEl.value = selling;
    if (mEl)  mEl.value = marginAmt;
}

function autoGenerateDescription() {
    const name = document.getElementById('ap-name')?.value;
    if (!name) return showToast('Enter Product Name first');
    document.getElementById('ap-desc').value =
        `Elevate your style with our premium ${name}. Specially crafted for the modern wardrobe, offering unmatched comfort and lasting quality.`;
}

async function adminAddProduct(e) {
    e.preventDefault();
    const imgLinks     = document.getElementById('ap-imgs').value.split('\n').map(l => l.trim()).filter(Boolean);
    const catVal       = document.getElementById('ap-category').value;
    const isPerf       = isPerfumeCategory(catVal);
    let sizes = [];
    if (isPerf) {
        sizes = Array.from(document.querySelectorAll('.ml-admin-chk:checked')).map(cb => cb.value);
        if (!sizes.length) sizes = PERFUME_ML_SIZES;
    } else {
        sizes = Array.from(document.querySelectorAll('.size-admin-chk:checked')).map(cb => cb.value);
    }
    const supplierPrice = parseInt(document.getElementById('ap-supplier-price')?.value) || 0;
    const marginPct     = parseFloat(document.getElementById('ap-margin-pct')?.value)   || 0;
    const marginAmt     = Math.round(supplierPrice * marginPct / 100)
                          || parseInt(document.getElementById('ap-margin')?.value) || 0;
    const sellingPrice  = supplierPrice + marginAmt;
    if (sellingPrice <= 0) return showToast('Enter a valid Supplier/Cost Price');
    const supplierUrl = document.getElementById('ap-supplier-url')?.value.trim() || '';
    const newP = {
        name:              document.getElementById('ap-name').value.trim(),
        price:             sellingPrice,
        supplier_price:    supplierPrice,
        margin_amt:        marginAmt,
        supplier_url:      supplierUrl,
        oldprice:          parseInt(document.getElementById('ap-oldprice').value) || Math.round(sellingPrice * 1.4),
        checkout_discount: parseInt(document.getElementById('ap-discount').value) || 0,
        brand:             document.getElementById('ap-brand').value.trim(),
        imgs:              imgLinks,
        category:          catVal,
        sub:               document.getElementById('ap-sub').value,
        desc:              document.getElementById('ap-desc').value.trim(),
        stock_qty:         parseInt(document.getElementById('ap-stock').value) || 50,
        available_sizes:   sizes,
        istrending:        true,
    };
    try {
        const { data, error } = await dbClient.from('products').insert([newP]).select().single();
        if (error) throw error;
        if (data) {
            products.push(data);
            e.target.reset();
            updateDropdownSubs('ap-category', 'ap-sub');
            renderAdminProducts();
            document.getElementById('scrape-status')?.classList.add('hidden');
            showToast(`✅ Added! Sell: ₹${sellingPrice} | Cost: ₹${supplierPrice} | Profit: ₹${marginAmt}`);
            const countBadge = document.getElementById('sidebar-product-count');
            if (countBadge) countBadge.textContent = products.length;
        }
    } catch (err) { showToast('Error: ' + err.message); }
}

function renderAdminProducts() {
    const container  = document.getElementById('admin-product-list');
    if (!container) return;
    const countBadge = document.getElementById('sidebar-product-count');
    if (countBadge) countBadge.textContent = products.length;
    if (!products.length) {
        container.innerHTML = `<div class="text-center py-20">
            <i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 text-lg font-semibold">No products yet</p>
            <button onclick="switchAdminTab('inventory')" class="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Add First Product</button>
        </div>`;
        return;
    }
    container.innerHTML =
        `<div class="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b sticky top-0 z-10">
            <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-purple-700"><i class="fas fa-boxes mr-2"></i>Total: ${products.length} products</span>
                <span class="text-xs text-gray-500">Latest first</span>
            </div>
        </div>` +
        [...products].reverse().map(p => {
            const isPerf      = isPerfumeCategory(p.category);
            const supplierLink = p.supplier_url
                ? `<a href="${p.supplier_url}" target="_blank" rel="noopener"
                      class="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-0.5"
                      onclick="event.stopPropagation()">
                      <i class="fas fa-external-link-alt text-[9px]"></i> Supplier Link
                   </a>`
                : '';
            return `<div class="flex justify-between items-center p-3 border-b text-sm hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <img src="${p.imgs?.[0] || p.img || 'https://placehold.co/48x48/eee/666?text=?'}"
                         class="w-12 h-12 rounded-lg object-cover border shadow-sm flex-shrink-0" loading="lazy">
                    <div class="min-w-0 flex-1">
                        <span class="truncate block font-semibold text-gray-800">${p.name}</span>
                        <span class="text-xs text-gray-500">${p.category} • ${p.sub || 'N/A'}${isPerf ? ' 🌸' : ''}</span>
                        ${p.brand ? `<span class="text-xs text-blue-600 block font-medium">${p.brand}</span>` : ''}
                        ${supplierLink}
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="text-right">
                        <div class="font-bold text-gray-900">₹${p.price}</div>
                        ${p.supplier_price ? `<div class="text-[10px] text-gray-400">Cost: ₹${p.supplier_price}</div>` : ''}
                        ${p.margin_amt    ? `<div class="text-[10px] text-green-600 font-bold">+₹${p.margin_amt}</div>` : ''}
                    </div>
                    <button onclick="openEditProduct(${p.id})" class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"><i class="fas fa-pen text-sm"></i></button>
                    <button onclick="deleteProduct(${p.id})"  class="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><i class="fas fa-trash text-sm"></i></button>
                </div>
            </div>`;
        }).join('');
}

async function openEditProduct(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return showToast('Product not found');
    const isPerf = isPerfumeCategory(p.category);
    document.getElementById('edit-product-id').value    = p.id;
    document.getElementById('edit-product-title').textContent = `(ID: ${p.id})`;
    document.getElementById('ep-name').value     = p.name      || '';
    document.getElementById('ep-price').value    = p.price     || '';
    document.getElementById('ep-margin-amt')?.setAttribute('value', p.margin_amt || 0);
    if (document.getElementById('ep-margin-amt')) document.getElementById('ep-margin-amt').value = p.margin_amt || 0;
    document.getElementById('ep-category').value = p.category  || 'Men';
    setTimeout(() => {
        updateDropdownSubs('ep-category', 'ep-sub');
        document.getElementById('ep-sub').value = p.sub || '';
    }, 50);
    document.getElementById('edit-ap-brand').value = p.brand   || '';
    document.getElementById('ep-desc').value    = p.desc       || '';
    document.getElementById('ep-oldprice').value = p.oldprice  || '';
    document.getElementById('ep-discount').value = p.checkout_discount || 0;
    document.getElementById('ep-stock').value    = p.stock_qty || 50;
    document.getElementById('ep-imgs').value     = Array.isArray(p.imgs) ? p.imgs.join('\n') : (p.imgs || '');
    const grid = document.getElementById('ep-sizes-grid');
    grid.innerHTML = '';
    const allSizes = isPerf
        ? PERFUME_ML_SIZES
        : ['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','5','6','7','8','9','10','11','12','Free Size'];
    if (isPerf) {
        const lbl = document.createElement('p');
        lbl.className   = 'text-xs text-purple-600 font-bold mb-2 col-span-full';
        lbl.textContent = '🌸 Select ML Volumes:';
        grid.appendChild(lbl);
    }
    allSizes.forEach(size => {
        const lbl      = document.createElement('label');
        lbl.className  = 'flex items-center gap-1 cursor-pointer text-xs';
        lbl.innerHTML  = `<input type="checkbox" value="${size}" class="ep-size-chk" ${p.available_sizes?.includes(size) ? 'checked' : ''}><span>${size}</span>`;
        grid.appendChild(lbl);
    });
    const modal = document.getElementById('edit-product-modal');
    modal?.classList.remove('hidden'); modal?.classList.add('flex');
}

function closeEditModal() {
    document.getElementById('edit-product-modal')?.classList.add('hidden');
    document.getElementById('edit-product-form')?.reset();
}

async function updateProduct(event) {
    event.preventDefault();
    const productId = document.getElementById('edit-product-id').value;
    const updates = {
        name:              document.getElementById('ep-name').value,
        price:             parseInt(document.getElementById('ep-price').value),
        margin_amt:        parseInt(document.getElementById('ep-margin-amt')?.value) || 0,
        oldprice:          parseInt(document.getElementById('ep-oldprice').value)    || 0,
        checkout_discount: parseInt(document.getElementById('ep-discount').value)    || 0,
        brand:             document.getElementById('edit-ap-brand').value,
        category:          document.getElementById('ep-category').value,
        sub:               document.getElementById('ep-sub').value,
        desc:              document.getElementById('ep-desc').value,
        stock_qty:         parseInt(document.getElementById('ep-stock').value) || 0,
        available_sizes:   Array.from(document.querySelectorAll('.ep-size-chk:checked')).map(cb => cb.value),
        imgs:              document.getElementById('ep-imgs').value.split('\n').map(l => l.trim()).filter(Boolean),
    };
    try {
        const { data, error } = await dbClient.from('products').update(updates).eq('id', productId).select().single();
        if (error) throw error;
        const idx = products.findIndex(p => p.id == productId);
        if (idx > -1) products[idx] = data;
        closeEditModal();
        renderAdminProducts();
        showToast('✅ Product Updated!');
    } catch (err) { showToast('❌ Update failed: ' + err.message); }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        await dbClient.from('products').delete().eq('id', id);
        products = products.filter(p => p.id !== id);
        renderAdminProducts();
        const countBadge = document.getElementById('sidebar-product-count');
        if (countBadge) countBadge.textContent = products.length;
        showToast('Deleted from DB. 🗑️');
    } catch (err) { showToast('Delete failed: ' + err.message); }
}

/* ============================================================
   A6. SCRAPINGBEE — AUTO IMPORT
   ============================================================ */
const SUPPLIER_SELECTORS = {
    meesho:   { title: 'h1,[class*="pdp-title"],[class*="product-name"]', price: '[class*="price"] span,h4', image: '[class*="pdp-image"] img,img[class*="product"]' },
    amazon:   { title: '#productTitle', price: '.a-price-whole', image: '#imgBlkFront,#landingImage' },
    flipkart: { title: 'span.B_NuCI,h1.yhB1nd', price: 'div._30jeq3._16Jk6d', image: 'img._396cs4' },
    myntra:   { title: 'h1.pdp-name', price: '.pdp-price strong', image: '.image-grid-col2 img' },
    default:  { title: 'h1,[class*="title"]', price: '[class*="price"] span', image: '[class*="product"] img,main img' },
};

function detectSupplier(url) {
    if (!url) return 'default';
    if (url.includes('meesho'))   return 'meesho';
    if (url.includes('amazon'))   return 'amazon';
    if (url.includes('flipkart')) return 'flipkart';
    if (url.includes('myntra'))   return 'myntra';
    return 'default';
}

async function uploadScrapedImageToImgBB(imageUrl) {
    if (!imageUrl) return null;
    try {
        const fd1 = new FormData(); fd1.append('image', imageUrl);
        const res1  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd1 });
        const json1 = await res1.json();
        if (json1.success && json1.data?.url) return json1.data.url;
        const imgBlob = await (await fetch(imageUrl)).blob();
        const fd2 = new FormData(); fd2.append('image', imgBlob, 'product.jpg');
        const res2  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd2 });
        const json2 = await res2.json();
        return json2.success ? (json2.data?.url || null) : null;
    } catch { return null; }
}

async function scrapeProductFromUrl() {
    const urlInput = document.getElementById('scrape-url');
    const statusEl = document.getElementById('scrape-status');
    const url      = urlInput?.value.trim();
    if (!url) return showToast('Enter a Supplier URL first');
    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-blue-50 border-blue-200 text-blue-700';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping product data...';
    }
    showToast('🔍 Scraping product...');
    const sel = SUPPLIER_SELECTORS[detectSupplier(url)];
    try {
        const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=in`;
        const res    = await fetch(apiUrl);
        if (!res.ok) throw new Error(`ScrapingBee: ${res.status} ${res.statusText}`);
        const html   = await res.text();
        const doc    = new DOMParser().parseFromString(html, 'text/html');
        const title  = doc.querySelector(sel.title)?.textContent.trim().replace(/\s+/g, ' ').substring(0, 200) || '';
        const priceNum = parseInt(((doc.querySelector(sel.price)?.textContent || '').match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')) || 0;
        let imgUrl   = doc.querySelector(sel.image)?.getAttribute('src') || doc.querySelector(sel.image)?.getAttribute('data-src') || '';
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        if (!title && !priceNum) {
            if (statusEl) { statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-red-50 border-red-200 text-red-700'; statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Could not extract — fill manually'; }
            showToast('❌ Scrape failed — fill manually'); return;
        }
        if (title)    document.getElementById('ap-name').value           = title;
        if (priceNum) document.getElementById('ap-supplier-price').value = priceNum;
        if (priceNum) document.getElementById('ap-oldprice').value       = Math.round(priceNum * 1.5);
        const supUrlEl = document.getElementById('ap-supplier-url');
        if (supUrlEl) supUrlEl.value = url;
        updateSellingPreview();
        if (imgUrl) {
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-cloud-upload-alt fa-pulse"></i> Uploading image to ImgBB...'; }
            const hostedUrl = await uploadScrapedImageToImgBB(imgUrl);
            const iE = document.getElementById('ap-imgs');
            if (hostedUrl) {
                if (iE) iE.value = hostedUrl;
                if (statusEl) { statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-green-50 border-green-200 text-green-700'; statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Scraped! "${title.substring(0, 35)}..." — Cost: ₹${priceNum}`; }
            } else {
                if (iE) iE.value = imgUrl;
                if (statusEl) { statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-amber-50 border-amber-200 text-amber-700'; statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Scraped! (ImgBB failed) — Cost: ₹${priceNum}`; }
            }
        } else {
            if (statusEl) { statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-green-50 border-green-200 text-green-700'; statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Scraped! "${title.substring(0, 40)}..." — Cost: ₹${priceNum}`; }
        }
    } catch (err) {
        if (statusEl) { statusEl.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border mt-3 bg-red-50 border-red-200 text-red-700'; statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ${err.message}`; }
        showToast('❌ Scrape failed: ' + err.message);
    }
}

/* ============================================================
   A7. ORDERS MANAGEMENT
   ============================================================ */
async function loadAllOrdersAdmin() {
    const container = document.getElementById('admin-full-order-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try {
        const { data, error } = await dbClient.from('orders').select('*').order('date', { ascending: false });
        if (error) throw error;
        window.allAdminOrders = data || [];
        renderFilteredOrders(document.getElementById('admin-order-filter')?.value || 'all');
    } catch (err) { container.innerHTML = `<div class="text-center py-6 text-red-500">Error: ${err.message}</div>`; }
}

function filterAdminOrders(status) { renderFilteredOrders(status); }

function renderFilteredOrders(filterStatus) {
    const container  = document.getElementById('admin-full-order-list');
    if (!container) return;
    const allOrders    = window.allAdminOrders || [];
    const filteredData = filterStatus === 'all' ? allOrders : allOrders.filter(o => o.status === filterStatus);
    if (!allOrders.length) {
        container.innerHTML = `<div class="text-center py-20"><i class="fas fa-receipt text-6xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg font-semibold">No orders yet</p></div>`;
        return;
    }
    const activeOrders    = allOrders.filter(o => o.status !== 'Cancelled');
    const cancelledOrders = allOrders.filter(o => o.status === 'Cancelled');
    if (!filteredData.length) {
        container.innerHTML = `<div class="text-center py-16"><i class="fas fa-filter text-5xl text-gray-300 mb-3"></i><p class="text-gray-500 font-semibold">No ${filterStatus} orders found</p></div>`;
        return;
    }
    const headerHtml = `<div class="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200 mb-4 sticky top-0 z-10">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3"><i class="fas fa-clock text-purple-600 text-xl"></i>
                <div><span class="text-sm font-black text-purple-700">${filterStatus === 'all' ? `Total: ${allOrders.length}` : `${filterStatus}: ${filteredData.length}`}</span>
                <p class="text-xs text-gray-500 mt-0.5">Newest first</p></div>
            </div>
            <div class="flex gap-2">
                <span class="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200 font-bold">Active: ${activeOrders.length}</span>
                <span class="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full border border-red-200 font-bold">Cancelled: ${cancelledOrders.length}</span>
            </div>
        </div>
    </div>`;
    container.innerHTML = headerHtml + filteredData.map(o => {
        const oidSafe   = String(o.id || '').replace(/'/g, "\\'");
        const badge     = STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600';
        const itemsHtml = o.items?.length
            ? o.items.map(item =>
                `<div class="admin-order-item">
                    <img src="${item.img || 'https://placehold.co/48x60/e11d48/fff?text=?'}" alt="${item.name}"
                         onerror="this.src='https://placehold.co/48x60/eee/999?text=?'" loading="lazy">
                    <div class="admin-order-item-info">
                        <div class="admin-order-item-name" title="${item.name}">${item.name}</div>
                        <div class="admin-order-item-meta">${isPerfumeCategory(item.category || '') ? 'Vol' : 'Size'}: <strong>${item.size || 'M'}</strong> &nbsp;•&nbsp; Qty: <strong>${item.qty || 1}</strong></div>
                        <div class="admin-order-item-price">₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</div>
                    </div>
                </div>`).join('')
            : '<div class="text-xs text-gray-400 italic py-2 px-1">No item details</div>';
        return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-3 hover:shadow-md transition-all">
            <div class="flex justify-between items-start pb-3 mb-3 border-b">
                <div>
                    <span class="font-bold text-purple-700 font-mono text-sm">#${o.id}</span>
                    <span class="${badge} text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">${o.status || 'Processing'}</span>
                    <div class="text-xs text-gray-500 mt-1">${o.date || ''} • ${o.paymentmode || ''}</div>
                </div>
                <div class="font-black text-lg text-rose-600">₹${(o.total || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-3 bg-gray-50 rounded-lg p-3 border">
                <div><span class="font-bold text-gray-400 uppercase text-[10px]">Customer</span><div class="font-semibold text-gray-800 mt-0.5">${o.customer_name || 'N/A'}</div></div>
                <div><span class="font-bold text-gray-400 uppercase text-[10px]">Mobile</span><div class="font-semibold text-gray-800 mt-0.5">${o.mobile || 'N/A'}</div></div>
                <div class="col-span-2"><span class="font-bold text-gray-400 uppercase text-[10px]">TX ID</span><div class="font-mono text-gray-700 mt-0.5 truncate">${o.transaction_id || 'N/A'}</div></div>
                ${o.margin_total ? `<div class="col-span-2 bg-green-50 rounded p-1.5 border border-green-200"><span class="font-bold text-green-700 uppercase text-[10px]">Profit</span><div class="font-bold text-green-700 mt-0.5">₹${o.margin_total.toLocaleString('en-IN')}</div></div>` : ''}
                ${o.referral_code ? `<div class="col-span-2 bg-green-50 rounded p-1.5 border border-green-200"><span class="font-bold text-green-700 uppercase text-[10px]">Referral Code</span><div class="font-mono font-semibold text-green-800 mt-0.5">${o.referral_code}</div></div>` : ''}
                ${o.refund_upi ? `<div class="col-span-2 bg-rose-50 rounded p-1.5 border border-rose-200"><span class="font-bold text-rose-700 uppercase text-[10px]">Refund UPI</span><div class="font-mono font-semibold text-rose-800 mt-0.5 select-all">${o.refund_upi}</div></div>` : ''}
            </div>
            <div class="mb-3"><div class="text-[10px] font-bold text-gray-400 uppercase mb-2">Items (${(o.items || []).length})</div><div class="admin-order-items">${itemsHtml}</div></div>
            <div class="text-[10px] text-gray-500 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-3">
                <i class="fas fa-map-marker-alt text-blue-400 mr-1"></i>${[o.address, o.city, o.state, o.pincode ? '- ' + o.pincode : ''].filter(Boolean).join(', ') || 'N/A'}
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Status:</span>
                <select onchange="updateOrderStatus('${oidSafe}',this.value)"
                        class="flex-1 border border-gray-300 rounded-lg text-xs p-2 font-bold bg-white focus:ring-2 focus:ring-purple-300 outline-none cursor-pointer">
                    ${ALL_ORDER_STATUSES.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        </div>`;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    orderId = String(orderId || '').trim();
    if (!orderId) { showToast('❌ Invalid order ID'); return; }
    showToast(`⏳ Updating #${orderId}...`);
    try {
        const restUrl = `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`;
        const res = await fetch(restUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=representation' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        showToast(`✅ Order #${orderId} → "${newStatus}"`);
        setTimeout(() => loadAllOrdersAdmin(), 600);
    } catch (err) {
        showToast(`❌ Update failed: ${err.message}`);
        setTimeout(() => loadAllOrdersAdmin(), 500);
    }
}

/* ============================================================
   A8. USERS
   ============================================================ */
async function loadAllUsersAdmin() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try {
        const { data, error } = await dbClient.from('users').select('*').order('mobile', { ascending: false });
        if (error) throw error;
        container.innerHTML = data?.length
            ? data.map(user => `
                <div class="bg-white border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex items-center gap-4">
                        <img src="${user.profile_pic || `https://placehold.co/48x48/e11d48/ffffff?text=${(user.name || 'U').charAt(0)}`}"
                             class="w-12 h-12 rounded-full object-cover border-2 border-gray-200">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <div class="font-bold text-gray-900">${user.name || 'Unknown'}</div>
                                ${isAuthorizedAdmin(user) ? '<span class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Admin</span>' : ''}
                            </div>
                            <div class="text-sm text-gray-500">+91 ${user.mobile}</div>
                            ${user.email ? `<div class="text-xs text-gray-400">${user.email}</div>` : ''}
                            ${user.referral_code ? `<div class="text-xs text-green-600 font-mono font-bold">Code: ${user.referral_code}</div>` : ''}
                            ${user.push_subscription ? '<div class="text-xs text-blue-600"><i class="fas fa-bell text-[10px] mr-0.5"></i>Push Subscribed ✅</div>' : ''}
                        </div>
                        <div class="text-right flex-shrink-0">
                            <div class="text-lg font-bold text-purple-600">₹${user.wallet || 0}</div>
                            <div class="text-xs text-gray-500">Wallet</div>
                        </div>
                    </div>
                </div>`).join('')
            : '<div class="text-center text-gray-400 py-10">No users found</div>';
    } catch (err) { container.innerHTML = '<div class="text-center text-red-500 py-6">Error loading users</div>'; }
}

/* ============================================================
   A9. PAYOUTS / WITHDRAWALS
   ============================================================ */
async function loadAllWithdrawalsAdmin() {
    const container = document.getElementById('admin-withdraw-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try {
        const { data, error } = await dbClient.from('withdrawals').select('*').order('id', { ascending: false });
        if (error) throw error;
        const all      = data || [];
        const pending  = all.filter(w => w.status === 'Pending');
        const paid     = all.filter(w => w.status === 'Paid');
        const rejected = all.filter(w => w.status === 'Rejected');
        if (!all.length) {
            container.innerHTML = '<div class="text-center text-gray-400 py-16"><i class="fas fa-wallet text-5xl mb-3 text-gray-300"></i><p class="font-semibold">No withdrawal requests yet</p></div>';
            return;
        }
        container.innerHTML = `
        <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-amber-600">${pending.length}</div><div class="text-xs text-amber-700 font-bold">Pending</div><div class="text-xs text-amber-500">₹${pending.reduce((s, w) => s + (w.amount || 0), 0).toLocaleString('en-IN')}</div></div>
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-green-600">${paid.length}</div><div class="text-xs text-green-700 font-bold">Paid</div><div class="text-xs text-green-500">₹${paid.reduce((s, w) => s + (w.amount || 0), 0).toLocaleString('en-IN')}</div></div>
            <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-red-500">${rejected.length}</div><div class="text-xs text-red-700 font-bold">Rejected</div></div>
        </div>
        <div class="flex gap-1 border-b mb-4 overflow-x-auto hide-scrollbar">
            <button onclick="filterPayouts('all',this)"      class="payout-tab pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap">All (${all.length})</button>
            <button onclick="filterPayouts('Pending',this)"  class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Pending (${pending.length})</button>
            <button onclick="filterPayouts('Paid',this)"     class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Paid (${paid.length})</button>
            <button onclick="filterPayouts('Rejected',this)" class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Rejected (${rejected.length})</button>
        </div>
        <div id="payouts-list" class="space-y-3"></div>`;
        window._allPayouts = all;
        _renderPayoutsList(all);
    } catch (err) { container.innerHTML = `<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`; }
}

function filterPayouts(status, btn) {
    document.querySelectorAll('.payout-tab').forEach(b => { b.className = 'payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap'; });
    btn.className = 'payout-tab pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap';
    const all = window._allPayouts || [];
    _renderPayoutsList(status === 'all' ? all : all.filter(w => w.status === status));
}

function _renderPayoutsList(items) {
    const container = document.getElementById('payouts-list');
    if (!container) return;
    if (!items.length) { container.innerHTML = '<div class="text-center text-gray-400 py-10"><i class="fas fa-inbox text-4xl mb-3"></i><p class="font-semibold">No records found</p></div>'; return; }
    const STATUS_STYLE = { Pending: 'bg-amber-50 border-amber-200', Paid: 'bg-green-50 border-green-200', Rejected: 'bg-red-50 border-red-200' };
    const BADGE = { Pending: 'bg-amber-100 text-amber-700', Paid: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-600' };
    container.innerHTML = items.map(w => `
        <div class="border rounded-xl p-4 ${STATUS_STYLE[w.status] || 'bg-white border-gray-200'} hover:shadow-md transition-all">
            <div class="flex justify-between items-start mb-3">
                <div><div class="font-bold text-gray-800">+91 ${w.mobile}</div><div class="text-sm text-gray-600 font-medium">${w.name || '—'}</div><div class="text-xs text-gray-400 mt-0.5">${w.date || '—'}</div></div>
                <div class="text-right"><div class="text-2xl font-black text-gray-800">₹${w.amount}</div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[w.status] || 'bg-gray-100 text-gray-500'}">${w.status}</span></div>
            </div>
            <div class="bg-white border rounded-lg p-3 font-mono text-sm select-all mb-3 flex items-center gap-2"><i class="fas fa-university text-gray-400 text-xs"></i><span>${w.upi_id}</span></div>
            ${w.status === 'Pending'
                ? `<div class="flex gap-2">
                    <button onclick="approvePayout(${w.id})" class="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 active:scale-95 text-sm"><i class="fas fa-check mr-1"></i>Mark as Paid</button>
                    <button onclick="rejectPayout(${w.id})"  class="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600 active:scale-95 text-sm"><i class="fas fa-times mr-1"></i>Reject</button>
                  </div>`
                : `<div class="text-xs text-gray-400 text-center font-semibold py-1">${w.status === 'Paid' ? '✅ Payment processed' : '❌ Request rejected'}</div>`}
        </div>`).join('');
}

async function approvePayout(id) {
    if (!confirm('Confirm: Payment done via UPI?')) return;
    try {
        await dbClient.from('withdrawals').update({ status: 'Paid' }).eq('id', id);
        showToast('✅ Payout marked as Paid!');
        loadAllWithdrawalsAdmin();
    } catch (err) { showToast('Error: ' + err.message); }
}

async function rejectPayout(id) {
    if (!confirm('Reject this withdrawal request? Wallet balance will be refunded.')) return;
    try {
        const { data: w } = await dbClient.from('withdrawals').select('*').eq('id', id).single();
        if (!w) { showToast('Withdrawal not found'); return; }
        const { data: user } = await dbClient.from('users').select('wallet').eq('mobile', w.mobile).maybeSingle();
        if (user) { await dbClient.from('users').update({ wallet: (user.wallet || 0) + (w.amount || 0) }).eq('mobile', w.mobile); }
        await dbClient.from('withdrawals').update({ status: 'Rejected' }).eq('id', id);
        showToast('❌ Rejected & ₹' + w.amount + ' refunded to wallet');
        loadAllWithdrawalsAdmin();
    } catch (err) { showToast('Error: ' + err.message); }
}

/* ============================================================
   A10. REFERRALS
   ============================================================ */
async function loadAdminReferrals() {
    const container = document.getElementById('admin-referrals-content');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try {
        const { data: referrals, error } = await dbClient.from('referrals').select('*').order('id', { ascending: false });
        if (error) throw error;
        const all       = referrals || [];
        const pending   = all.filter(r => r.status === 'pending');
        const confirmed = all.filter(r => r.status === 'confirmed');
        const cancelled = all.filter(r => r.status === 'cancelled');
        container.innerHTML = `
        <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p class="text-xs text-amber-700 font-bold uppercase mb-1">Pending</p><p class="text-2xl font-black text-amber-600">₹${pending.reduce((s, r) => s + (r.commission || 0), 0).toLocaleString()}</p><p class="text-xs text-amber-500 mt-1">${pending.length} referrals</p></div>
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><p class="text-xs text-green-700 font-bold uppercase mb-1">Confirmed</p><p class="text-2xl font-black text-green-600">₹${confirmed.reduce((s, r) => s + (r.commission || 0), 0).toLocaleString()}</p><p class="text-xs text-green-500 mt-1">${confirmed.length} referrals</p></div>
            <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p class="text-xs text-red-700 font-bold uppercase mb-1">Cancelled</p><p class="text-2xl font-black text-red-400">₹${cancelled.reduce((s, r) => s + (r.commission || 0), 0).toLocaleString()}</p><p class="text-xs text-red-400 mt-1">${cancelled.length} referrals</p></div>
        </div>
        <div class="flex gap-1 mb-4 border-b overflow-x-auto hide-scrollbar">
            <button onclick="adminFilterReferrals('pending',this)"   class="pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab">⏳ Pending (${pending.length})</button>
            <button onclick="adminFilterReferrals('all',this)"       class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">All (${all.length})</button>
            <button onclick="adminFilterReferrals('confirmed',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Confirmed (${confirmed.length})</button>
            <button onclick="adminFilterReferrals('cancelled',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Cancelled (${cancelled.length})</button>
        </div>
        <div id="admin-referrals-list" class="space-y-3"></div>`;
        window._allAdminReferrals = all;
        renderAdminReferralList(pending.length ? pending : all);
    } catch (err) { container.innerHTML = `<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`; }
}

function adminFilterReferrals(status, btn) {
    document.querySelectorAll('.admin-ref-tab').forEach(b => { b.className = 'pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab'; });
    btn.className = 'pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab';
    const all = window._allAdminReferrals || [];
    renderAdminReferralList(status === 'all' ? all : all.filter(r => r.status === status));
}

function renderAdminReferralList(items) {
    const container = document.getElementById('admin-referrals-list');
    if (!container) return;
    if (!items.length) { container.innerHTML = '<div class="text-center py-10 text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>No referrals found</p></div>'; return; }
    const BADGE = { pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600' };
    container.innerHTML = items.map(r => `
        <div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start flex-wrap gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-sm text-gray-800">Order #${r.order_id}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status] || 'bg-gray-100 text-gray-500'}">${r.status}</span>
                    </div>
                    <div class="text-xs text-gray-500">Referrer: <strong>+91 ${r.referrer_mobile}</strong></div>
                    <div class="text-xs text-gray-500">Buyer: +91 ${r.buyer_mobile}</div>
                    <div class="text-xs text-gray-500">Date: ${r.date || '—'} | Code: <span class="font-mono font-semibold text-purple-700">${r.referral_code || '—'}</span></div>
                    <div class="text-xs text-gray-600 mt-1">Order: ₹${(r.order_total || 0).toLocaleString()} | Commission: <strong class="text-green-600">₹${r.commission}</strong></div>
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${r.status === 'pending' ? `<button onclick="adminConfirmReferral(${r.id})" class="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600 active:scale-95">✅ Confirm</button>` : ''}
                </div>
            </div>
        </div>`).join('');
}

async function adminConfirmReferral(referralId) {
    if (!confirm('Manually confirm this referral and credit wallet?')) return;
    try {
        const { data: ref } = await dbClient.from('referrals').select('*').eq('id', referralId).single();
        if (!ref) return showToast('Referral not found');
        await dbClient.from('referrals').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', referralId);
        const { data: user } = await dbClient.from('users').select('wallet').eq('mobile', ref.referrer_mobile).maybeSingle();
        if (user) { await dbClient.from('users').update({ wallet: (user.wallet || 0) + (ref.commission || 0) }).eq('mobile', ref.referrer_mobile); }
        showToast(`✅ ₹${ref.commission} credited to +91 ${ref.referrer_mobile}`);
        loadAdminReferrals();
    } catch (err) { showToast('Error: ' + err.message); }
}

/* ============================================================
   A11. INFLUENCER REQUESTS
   ============================================================ */
async function loadAdminInfluencerRequests() {
    const container = document.getElementById('admin-influencer-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try {
        const { data, error } = await dbClient.from('influencer_requests').select('*').order('id', { ascending: false });
        if (error) throw error;
        const all = data || [];
        if (!all.length) { container.innerHTML = '<div class="text-center py-16 text-gray-400"><i class="fas fa-video text-5xl mb-3"></i><p>No influencer requests yet</p></div>'; return; }
        const BADGE = { Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-600' };
        container.innerHTML = all.map(r => `
            <div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-sm text-gray-800">${r.name} — +91 ${r.mobile}</div>
                        <div class="text-xs text-gray-500">${r.platform} • ${(r.views || 0).toLocaleString()} views</div>
                        <a href="${r.video_url}" target="_blank" class="text-xs text-blue-600 hover:underline truncate block max-w-xs">${r.video_url}</a>
                        ${r.profile_url ? `<a href="${r.profile_url}" target="_blank" class="text-xs text-purple-600 hover:underline truncate block max-w-xs">${r.profile_url}</a>` : ''}
                        ${r.description ? `<div class="text-xs text-gray-500 mt-1 italic">${r.description}</div>` : ''}
                    </div>
                    <div class="text-right ml-3 flex-shrink-0">
                        <div class="text-lg font-black text-green-600">₹${r.earnings || 0}</div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status] || 'bg-gray-100 text-gray-500'}">${r.status}</span>
                    </div>
                </div>
                ${r.status === 'Pending'
                    ? `<div class="flex gap-2 mt-3">
                        <button onclick="approveInfluencer(${r.id})" class="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-700 active:scale-95"><i class="fas fa-check mr-1"></i>Approve & Credit ₹${r.earnings || 0}</button>
                        <button onclick="rejectInfluencer(${r.id})"  class="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-red-600 active:scale-95"><i class="fas fa-times mr-1"></i>Reject</button>
                       </div>`
                    : `<div class="text-xs text-gray-400 text-center py-1">${r.status === 'Approved' ? '✅ Approved & Wallet credited' : '❌ Rejected'}</div>`
                }
            </div>`).join('');
    } catch (err) { container.innerHTML = `<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`; }
}

async function approveInfluencer(id) {
    if (!confirm('Approve & credit earnings to wallet?')) return;
    try {
        const { data: req } = await dbClient.from('influencer_requests').select('*').eq('id', id).single();
        if (!req) return showToast('Request not found');
        await dbClient.from('influencer_requests').update({ status: 'Approved' }).eq('id', id);
        const { data: user } = await dbClient.from('users').select('wallet').eq('mobile', req.mobile).maybeSingle();
        if (user) { await dbClient.from('users').update({ wallet: (user.wallet || 0) + (req.earnings || 0) }).eq('mobile', req.mobile); }
        showToast(`✅ ₹${req.earnings} credited to +91 ${req.mobile}`);
        loadAdminInfluencerRequests();
    } catch (err) { showToast('Error: ' + err.message); }
}

async function rejectInfluencer(id) {
    const reason = prompt('Rejection reason (optional):') || 'Does not meet requirements';
    try {
        await dbClient.from('influencer_requests').update({ status: 'Rejected', reject_reason: reason }).eq('id', id);
        showToast('❌ Request rejected');
        loadAdminInfluencerRequests();
    } catch (err) { showToast('Error: ' + err.message); }
}

/* ============================================================
   A12. PUSH NOTIFICATIONS SENDER — ★ FIX: Sabhi users ko jaata hai
   Admin se seedha Supabase ke through sabhi subscribed users ko
   ============================================================ */
function searchProductsForNotif(query) {
    const q   = query.toLowerCase().trim();
    const box = document.getElementById('notif-product-results');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    const hits = products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6);
    if (!hits.length) { box.innerHTML = '<div class="px-3 py-2 text-xs text-gray-400">No products found</div>'; return; }
    box.innerHTML = hits.map(p => {
        const img = p.imgs?.[0] || p.img || '';
        return `<div onclick="selectNotifProduct(${p.id})"
                     class="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 active:bg-purple-100">
            <img src="${img}" class="w-10 h-12 object-cover rounded flex-shrink-0" onerror="this.style.display='none'">
            <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-gray-800 truncate">${p.name}</div>
                <div class="text-[10px] text-rose-600 font-bold">₹${p.price}</div>
            </div>
        </div>`;
    }).join('');
}

function selectNotifProduct(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const img = p.imgs?.[0] || p.img || '';
    document.getElementById('notif-title').value = p.name.length > 50 ? p.name.slice(0, 47) + '...' : p.name;
    document.getElementById('notif-body').value  = `₹${p.price}${p.oldprice ? ' (Was ₹' + p.oldprice + ')' : ''} — Abhi kharido! 🛍️`;
    document.getElementById('notif-url').value   = `./?pid=${p.id}`;
    document.getElementById('notif-image').value = img;
    document.getElementById('notif-product-results').innerHTML = '';
    document.getElementById('notif-product-search').value = p.name.slice(0, 30);
    _updateNotifPreview();
    showToast('✅ Product selected!');
}

function _updateNotifPreview() {
    const title = document.getElementById('notif-title')?.value || '';
    const body  = document.getElementById('notif-body')?.value  || '';
    const image = document.getElementById('notif-image')?.value || '';
    const prev  = document.getElementById('notif-preview');
    if (!prev) return;
    if (!title && !body) { prev.classList.add('hidden'); return; }
    prev.classList.remove('hidden');
    prev.innerHTML = `
        <div class="flex items-start gap-3 p-3 bg-gray-800 rounded-xl text-white">
            <img src="https://placehold.co/40x40/e11d48/ffffff?text=OK" class="w-10 h-10 rounded-lg flex-shrink-0">
            <div class="flex-1 min-w-0">
                <div class="text-xs font-bold truncate">${title || 'Title'}</div>
                <div class="text-[10px] text-gray-300 mt-0.5 line-clamp-2">${body || 'Message'}</div>
            </div>
            ${image ? `<img src="${image}" class="w-12 h-14 object-cover rounded flex-shrink-0" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="text-[9px] text-gray-400 text-center mt-1">Preview (actual may vary by device)</div>`;
}

/* ★ FIX: Push notification - sabhi subscribed users ko bhejta hai
   Supabase se sabhi push_subscription fetch karta hai
   Phir browser Notification API se (admin ke liye) ya Supabase store karta hai */
async function sendAdminNotification() {
    const title  = document.getElementById('notif-title')?.value.trim();
    const body   = document.getElementById('notif-body')?.value.trim();
    const mobile = document.getElementById('notif-mobile')?.value.trim().replace(/\D/g, '');
    const url    = document.getElementById('notif-url')?.value.trim()   || './';
    const image  = document.getElementById('notif-image')?.value.trim() || null;
    const result = document.getElementById('notif-result');

    if (!title) return showToast('Title daalo!');
    if (!body)  return showToast('Message daalo!');

    const btn = document.querySelector('[onclick="sendAdminNotification()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...'; }
    if (result) { result.classList.remove('hidden'); result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-blue-50 text-blue-700'; result.textContent = 'Fetching subscribed users...'; }

    try {
        /* Step 1: Supabase se sabhi subscribed users fetch karo */
        let query = dbClient.from('users').select('mobile, name, push_subscription').not('push_subscription', 'is', null);
        if (mobile) {
            query = dbClient.from('users').select('mobile, name, push_subscription').eq('mobile', mobile).not('push_subscription', 'is', null);
        }
        const { data: users, error } = await query;
        if (error) throw error;
        const subscribed = (users || []).filter(u => {
            if (!u.push_subscription) return false;
            try { JSON.parse(u.push_subscription); return true; } catch { return false; }
        });

        if (!subscribed.length) {
            if (result) { result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-amber-50 text-amber-700'; result.textContent = '⚠️ Koi bhi subscribed user nahi mila. Users ko pehle notifications enable karne kahein.'; }
            if (btn)    { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Notification'; }
            return;
        }

        /* Step 2: Notification record Supabase mein save karo */
        const notifPayload = {
            title,
            body,
            url:      url   || './',
            image:    image || null,
            mobile:   mobile || null,
            sent_at:  new Date().toISOString(),
            sent_by:  localStorage.getItem('outfitkart_admin_mobile') || 'admin',
            status:   'pending',
        };

        let savedNotifId = null;
        try {
            const { data: notifRow } = await dbClient.from('notifications').insert([notifPayload]).select().single();
            savedNotifId = notifRow?.id;
        } catch (_) { /* notifications table nahi hai to skip */ }

        /* Step 3: Web Push via VAPID — direct browser push */
        let sent = 0, failed = 0;

        /* Har subscribed user ke liye push bhejo via Supabase Edge Function ya Node server */
        try {
            /* Supabase Edge Function try karo */
            const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
                body:    JSON.stringify({
                    title, body, url, image,
                    mobile:   mobile || null,
                    notif_id: savedNotifId,
                }),
                signal: AbortSignal.timeout(15000),
            });
            if (edgeRes.ok) {
                const edgeData = await edgeRes.json();
                sent   = edgeData.sent   || subscribed.length;
                failed = edgeData.failed || 0;
                if (result) { result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-green-50 text-green-700'; result.textContent = `✅ ${sent} users ko notification bheja gaya!${failed ? ` (${failed} failed)` : ''}`; }
                showToast(`✅ ${sent} users ko notification bheja!`);
                _clearNotifFields();
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Notification'; }
                return;
            }
        } catch (_) { /* Edge function nahi mili — fallback */ }

        /* Step 4: Node server try karo (agar run ho raha ho) */
        try {
            const serverRes = await fetch('/api/notify/send', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer outfitkart_admin_token' },
                body:    JSON.stringify({ title, body, url, image, mobile: mobile || null }),
                signal:  AbortSignal.timeout(5000),
            });
            if (serverRes.ok) {
                const serverData = await serverRes.json();
                sent   = serverData.sent   || 0;
                failed = serverData.failed || 0;
                if (result) { result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-green-50 text-green-700'; result.textContent = `✅ ${sent} users ko notification bheja!`; }
                showToast(`✅ ${sent} users ko push notification bheja!`);
                _clearNotifFields();
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Notification'; }
                return;
            }
        } catch (_) { /* Server nahi mila */ }

        /* Step 5: Sabse zyada users — ServiceWorker ke through broadcast karo
           Agar same origin pe SW chal raha hai to sabko message bhejo */
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready.catch(() => null);
            if (reg) {
                /* SW ko instruction bhejo sabko show karne ke liye */
                reg.active?.postMessage({
                    type: 'BROADCAST_NOTIF',
                    payload: { title, body, url, image, badge: '/icon-96x96.png' },
                });
            }
        }

        /* Step 6: Admin ke browser pe bhi dikhao */
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon:  image || 'https://placehold.co/192x192/e11d48/ffffff?text=OK',
                badge: 'https://placehold.co/96x96/e11d48/ffffff?text=OK',
                data:  { url },
            });
        }

        /* Final status */
        if (result) {
            result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-amber-50 text-amber-700';
            result.innerHTML = `⚠️ <strong>${subscribed.length} users subscribed</strong> hain.<br>
                <span class="text-xs">Push bhejne ke liye Supabase Edge Function ya Node server setup karo.<br>
                Abhi DB mein save ho gaya — users next session pe dekhenge.</span>
                <br><button onclick="showPushSetupGuide()" class="mt-2 text-xs bg-purple-600 text-white px-3 py-1 rounded-lg font-bold">Setup Guide dekho</button>`;
        }
        showToast(`📋 Notification DB mein save! ${subscribed.length} users subscribed hain.`);
        _clearNotifFields();

    } catch (err) {
        if (result) { result.className = 'text-center text-sm font-semibold py-2 rounded-lg bg-red-50 text-red-700'; result.textContent = '❌ Error: ' + err.message; }
        showToast('❌ ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Notification'; }
        setTimeout(() => result?.classList.add('hidden'), 10000);
    }
}

function _clearNotifFields() {
    ['notif-title','notif-body','notif-mobile','notif-image','notif-url','notif-product-search']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('notif-preview')?.classList.add('hidden');
    const box = document.getElementById('notif-product-results');
    if (box) box.innerHTML = '';
}

function showPushSetupGuide() {
    showToast('Guide: Supabase → Edge Functions → send-push function banao. Ya Node.js server ke saath web-push library use karo.');
    alert(`Push Notification Setup Guide:

OPTION 1 — Supabase Edge Function (Recommended):
1. Supabase Dashboard → Edge Functions → New Function "send-push"
2. web-push library use karo
3. VAPID keys set karo (same jo script-core.js mein hai)
4. Function users table se push_subscription fetch kare aur sabko bheje

OPTION 2 — Node.js Server:
1. npm install web-push express
2. /api/notify/send endpoint banao
3. VAPID keys se sign karo
4. Supabase se subscriptions fetch karo
5. webpush.sendNotification() call karo

VAPID Keys Generate: https://vapidkeys.com/
Ek baar setup hone ke baad sabhi users ko push jaayega!`);
}

/* ============================================================
   A13. GLOBAL EXPORTS — Admin functions
   ============================================================ */
Object.assign(window, {
    /* Admin Auth */
    showAdminLogin, closeAdminLogin, handleAdminLogin,
    updateAdminNameInHeader, loadAdminDashboard,
    adminLogout, exitAdmin,

    /* Admin Tabs */
    switchAdminTab, toggleAdminSidebar,

    /* Dashboard */
    renderAdminDashboard, _renderDashboardCharts,

    /* Products */
    updateDropdownSubs, updateSizeSection, toggleProductMode, updateSellingPreview,
    autoGenerateDescription, adminAddProduct, renderAdminProducts,
    openEditProduct, closeEditModal, updateProduct, deleteProduct,

    /* Scraping */
    scrapeProductFromUrl, uploadScrapedImageToImgBB,

    /* Orders */
    loadAllOrdersAdmin, filterAdminOrders, renderFilteredOrders, updateOrderStatus,

    /* Users */
    loadAllUsersAdmin,

    /* Payouts */
    loadAllWithdrawalsAdmin, filterPayouts, approvePayout, rejectPayout,

    /* Referrals */
    loadAdminReferrals, adminFilterReferrals, renderAdminReferralList, adminConfirmReferral,

    /* Influencer */
    loadAdminInfluencerRequests, approveInfluencer, rejectInfluencer,

    /* Notifications */
    sendAdminNotification, searchProductsForNotif, selectNotifProduct,
    _updateNotifPreview, _clearNotifFields, showPushSetupGuide,
});
