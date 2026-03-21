'use strict';
/* ============================================================
   SCRIPT-ADMIN.JS — OutfitKart Admin Panel (FULLY UPDATED)
   Changes:
   1. ScrapingBee auto-import REMOVED completely
   2. Supplier URL field in normal Add Product → clickable in orders
   3. Gold: full form with supplier_price, supplier_url, margin,
      auto-calc selling price, auto-gen description, ImgBB upload
      Uses 'description' column (not 'desc')
   4. Promo Codes management tab — create, share to Telegram/WhatsApp
   5. Orders show supplier URL as clickable link + promo info
   ============================================================ */

/* ============================================================
   A1. ADMIN AUTH
   ============================================================ */
function showAdminLogin(){const m=document.getElementById('admin-login-modal');m?.classList.remove('hidden');m?.classList.add('flex');document.getElementById('admin-mobile')?.focus();}
function closeAdminLogin(goToHome=false){const m=document.getElementById('admin-login-modal');m?.classList.add('hidden');m?.classList.remove('flex');if(goToHome)navigate('home');}
function updateAdminNameInHeader(){const name=localStorage.getItem('outfitkart_admin_name')||'Admin';const nameEl=document.getElementById('admin-display-name');const avatarEl=document.getElementById('admin-avatar-initial');const pill=document.getElementById('admin-user-name-pill');if(nameEl)nameEl.textContent=name;if(avatarEl)avatarEl.textContent=name.charAt(0).toUpperCase();if(pill){pill.classList.remove('hidden');pill.classList.add('flex');}}

async function handleAdminLogin(e){
    e.preventDefault();
    const mobile=document.getElementById('admin-mobile').value.trim().replace(/\D/g,'');
    const password=document.getElementById('admin-password').value.trim();
    if(mobile.length!==10){showToast('Enter valid 10-digit mobile number ❌');return;}
    const btnEl=e.target.querySelector('button[type="submit"]');
    if(btnEl){btnEl.disabled=true;btnEl.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Verifying...';}
    try{
        if(!ADMIN_AUTHORIZED_MOBILES.includes(mobile)){showToast('Access Denied ❌ Not an authorized admin');if(btnEl){btnEl.disabled=false;btnEl.innerHTML='<i class="fas fa-lock mr-2"></i>Login';}document.getElementById('admin-password').value='';return;}
        const{data:user,error}=await dbClient.from('users').select('mobile,name,password').eq('mobile',mobile).eq('password',password).maybeSingle();
        if(error)throw error;
        if(!user){showToast('Invalid Mobile or Password ❌');document.getElementById('admin-password').value='';if(btnEl){btnEl.disabled=false;btnEl.innerHTML='<i class="fas fa-lock mr-2"></i>Login';}return;}
        isAdminLoggedIn=true;
        localStorage.setItem('outfitkart_admin_session','true');
        localStorage.setItem('outfitkart_admin_name',user.name||'Admin');
        localStorage.setItem('outfitkart_admin_mobile',user.mobile);
        showToast('Welcome '+(user.name||'Admin')+'! 👋');
        document.getElementById('admin-mobile').value='';document.getElementById('admin-password').value='';
        closeAdminLogin();setTimeout(()=>navigate('admin'),100);
    }catch(err){showToast('Login error: '+err.message);if(btnEl){btnEl.disabled=false;btnEl.innerHTML='<i class="fas fa-lock mr-2"></i>Login';}}
}

function loadAdminDashboard(){updateAdminNameInHeader();switchAdminTab('dashboard');renderAdminDashboard();}

/* ============================================================
   A2. DASHBOARD WITH CHARTS
   ============================================================ */
async function renderAdminDashboard(){
    const dashboardEl=document.getElementById('admin-dashboard-content');if(!dashboardEl)return;
    dashboardEl.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-purple-600"></i><p class="mt-2 text-gray-500">Loading...</p></div>';
    try{
        const[ordersRes,usersRes,referralsRes]=await Promise.all([
            dbClient.from('orders').select('*').order('date',{ascending:false}),
            dbClient.from('users').select('*'),
            dbClient.from('referrals').select('commission,status').order('id',{ascending:false}).limit(500),
        ]);
        const allOrders=ordersRes.data||[];const allUsers=usersRes.data||[];const allReferrals=referralsRes.data||[];
        const activeOrders=allOrders.filter(o=>o.status!=='Cancelled');const cancelledOrders=allOrders.filter(o=>o.status==='Cancelled');
        const totalRevenue=activeOrders.reduce((s,o)=>s+(o.total||0),0);const totalProfit=activeOrders.reduce((s,o)=>s+(o.margin_total||0),0);
        const recentOrders=allOrders.slice(0,5);
        const pendingComm=allReferrals.filter(r=>r.status==='pending').reduce((s,r)=>s+(r.commission||0),0);
        const confirmedComm=allReferrals.filter(r=>r.status==='confirmed').reduce((s,r)=>s+(r.commission||0),0);
        const last7Labels=[],revenueByDay=[],profitByDay=[],ordersByDay=[];
        for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const dateStr=d.toLocaleDateString('en-IN');const dayOrders=allOrders.filter(o=>o.date===dateStr&&o.status!=='Cancelled');last7Labels.push(`${d.getDate()}/${d.getMonth()+1}`);revenueByDay.push(dayOrders.reduce((s,o)=>s+(o.total||0),0));profitByDay.push(dayOrders.reduce((s,o)=>s+(o.margin_total||0),0));ordersByDay.push(dayOrders.length);}
        const statusCounts={};allOrders.forEach(o=>{statusCounts[o.status]=(statusCounts[o.status]||0)+1;});
        const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;
        dashboardEl.innerHTML=`
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-xl text-white shadow-lg"><div class="text-xl font-black">₹${totalRevenue.toLocaleString('en-IN')}</div><div class="text-xs opacity-90 font-semibold mt-1">Total Revenue</div><div class="text-[10px] opacity-70 mt-0.5">${activeOrders.length} active orders</div></div>
            <div class="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-xl text-white shadow-lg"><div class="text-xl font-black">₹${totalProfit.toLocaleString('en-IN')}</div><div class="text-xs opacity-90 font-semibold mt-1">Total Profit</div><div class="text-[10px] opacity-70 mt-0.5">From margin_amt</div></div>
            <div class="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl text-white shadow-lg"><div class="text-xl font-black">${activeOrders.length}</div><div class="text-xs opacity-90 font-semibold mt-1">Active Orders</div><span class="text-[10px] bg-red-400/60 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">${cancelledOrders.length} cancelled</span></div>
            <div class="bg-gradient-to-br from-rose-500 to-rose-700 p-4 rounded-xl text-white shadow-lg"><div class="text-xl font-black">${allUsers.length}</div><div class="text-xs opacity-90 font-semibold mt-1">Total Users</div><div class="text-[10px] opacity-70 mt-0.5">${products.length} products</div></div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3"><div class="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-hourglass-half text-amber-500 text-sm"></i></div><div><div class="text-[10px] text-gray-500">Pending Referral</div><div class="text-base font-black text-amber-600">₹${pendingComm.toLocaleString('en-IN')}</div></div></div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3"><div class="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-gift text-green-600 text-sm"></i></div><div><div class="text-[10px] text-gray-500">Confirmed Referral</div><div class="text-base font-black text-green-600">₹${confirmedComm.toLocaleString('en-IN')}</div></div></div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3"><div class="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-chart-bar text-purple-600 text-sm"></i></div><div><div class="text-[10px] text-gray-500">Avg Order Value</div><div class="text-base font-black">₹${activeOrders.length?Math.round(totalRevenue/activeOrders.length).toLocaleString('en-IN'):0}</div></div></div>
            <div class="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3"><div class="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-percentage text-teal-600 text-sm"></i></div><div><div class="text-[10px] text-gray-500">Profit Margin</div><div class="text-base font-black text-teal-600">${totalRevenue?Math.round((totalProfit/totalRevenue)*100):0}%</div></div></div>
        </div>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="bg-white rounded-xl border shadow-sm p-4"><h3 class="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wide"><i class="fas fa-chart-bar text-purple-600 mr-2"></i>Revenue & Profit — Last 7 Days</h3><div style="position:relative;height:190px"><canvas id="dash-rev-chart"></canvas></div></div>
            <div class="bg-white rounded-xl border shadow-sm p-4"><h3 class="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wide"><i class="fas fa-chart-line text-blue-600 mr-2"></i>Orders — Last 7 Days</h3><div style="position:relative;height:190px"><canvas id="dash-ord-chart"></canvas></div></div>
        </div>
        <div class="grid md:grid-cols-3 gap-4 mb-4">
            <div class="bg-white rounded-xl border shadow-sm p-4"><h3 class="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wide"><i class="fas fa-chart-pie text-rose-500 mr-2"></i>Order Status</h3><div style="position:relative;height:170px"><canvas id="dash-pie-chart"></canvas></div></div>
            <div class="bg-white rounded-xl border shadow-sm p-4 md:col-span-2">
                <div class="flex items-center justify-between mb-3"><h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide"><i class="fas fa-clock text-purple-600 mr-2"></i>Recent Orders</h3><button onclick="switchAdminTab('order')" class="text-[10px] bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg font-bold border border-purple-200">View All →</button></div>
                ${recentOrders.length?recentOrders.map(order=>{const badge=STATUS_BADGE[order.status]||'bg-gray-100 text-gray-600';return`<div class="flex justify-between items-center py-2 border-b last:border-b-0"><div><div class="font-semibold text-sm">#${order.id}</div><div class="text-xs text-gray-400">${order.customer_name||'N/A'} • ${order.date||''}</div></div><div class="text-right"><div class="font-bold text-sm">₹${(order.total||0).toLocaleString('en-IN')}</div><span class="${badge} text-[10px] px-2 py-0.5 rounded-full font-bold">${order.status}</span></div></div>`;}).join(''):'<div class="text-center text-gray-400 py-6 text-sm">No orders yet</div>'}
            </div>
        </div>`;
        setTimeout(()=>_renderDashboardCharts(last7Labels,revenueByDay,profitByDay,ordersByDay,statusCounts),150);
    }catch(err){dashboardEl.innerHTML='<div class="text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><p>Error loading dashboard</p></div>';}
}

function _renderDashboardCharts(labels, revenueByDay, profitByDay, ordersByDay, statusCounts) {
    function _draw() {
        const C = window.Chart;
        if (!C) return;

        // Purane charts ko destroy karna taaki memory leak na ho
        ['dash-rev-chart', 'dash-ord-chart', 'dash-pie-chart'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el._ci) {
                el._ci.destroy();
                el._ci = null;
            }
        });

        // 1. Revenue & Profit Chart (Bar)
        const revEl = document.getElementById('dash-rev-chart');
        if (revEl) {
            const ctx = revEl.getContext('2d');
            revEl._ci = new C(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Revenue ₹', data: revenueByDay, backgroundColor: 'rgba(124,58,237,0.75)', borderRadius: 5 },
                        { label: 'Profit ₹', data: profitByDay, backgroundColor: 'rgba(34,197,94,0.75)', borderRadius: 5 }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { y: { ticks: { callback: v => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v) } } }
                }
            });
        }

        // 2. Orders Chart (Line)
        const ordEl = document.getElementById('dash-ord-chart');
        if (ordEl) {
            const ctx = ordEl.getContext('2d');
            ordEl._ci = new C(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{ label: 'Orders', data: ordersByDay, borderColor: '#3b82f6', fill: true, tension: 0.4 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 3. Status Pie Chart (Doughnut)
        const pieEl = document.getElementById('dash-pie-chart');
        const pieLabels = Object.keys(statusCounts);
        if (pieEl && pieLabels.length) {
            const ctx = pieEl.getContext('2d');
            pieEl._ci = new C(ctx, {
                type: 'doughnut',
                data: {
                    labels: pieLabels,
                    datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#7c3aed', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'] }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '60%' }
            });
        }
    }

    // Chart.js loading logic - FIXED
    if (window.Chart) {
        _draw();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = _draw;
        document.head.appendChild(script);
    }
}

/* ============================================================
   A3. ADMIN SIDEBAR TABS
   ============================================================ */
function switchAdminTab(tab){
    document.querySelectorAll('.admin-content-tab').forEach(el=>{el.style.display='none';el.classList.add('hidden');});
    const targetTab=document.getElementById(`admin-tab-${tab}`);if(targetTab){targetTab.style.display='block';targetTab.classList.remove('hidden');}
    document.querySelectorAll('.admin-nav-btn').forEach(btn=>btn.classList.remove('active'));
    const activeBtn=document.getElementById(`btn-admin-${tab}`);if(activeBtn)activeBtn.classList.add('active');
    if(tab!=='products'&&tab!=='inventory')closeEditModal();
    if(window.innerWidth<768)toggleAdminSidebar();
    const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;
    if(tab==='dashboard')renderAdminDashboard();
    if(tab==='products')renderAdminProducts();
    if(tab==='order')loadAllOrdersAdmin();
    if(tab==='payout')loadAllWithdrawalsAdmin();
    if(tab==='users')loadAllUsersAdmin();
    if(tab==='referrals')loadAdminReferrals();
    if(tab==='influencer')loadAdminInfluencerRequests();
    if(tab==='gold')loadAdminGoldProducts();
    if(tab==='promo')loadAdminPromoCodes();
}

function toggleAdminSidebar(){
    const sidebar=document.getElementById('admin-sidebar');const overlay=document.getElementById('admin-sidebar-overlay');if(!sidebar||!overlay)return;
    const isOpen=!sidebar.classList.contains('-translate-x-full');
    if(isOpen){sidebar.classList.add('-translate-x-full');overlay.classList.add('hidden');}
    else{sidebar.classList.remove('-translate-x-full');overlay.classList.remove('hidden');}
}

/* ============================================================
   A4. LOGOUT / EXIT
   ============================================================ */
function adminLogout(){isAdminLoggedIn=false;['outfitkart_admin_session','outfitkart_admin_name','outfitkart_admin_username','outfitkart_admin_mobile'].forEach(k=>localStorage.removeItem(k));document.body.classList.remove('admin-active');const pill=document.getElementById('admin-user-name-pill');if(pill){pill.classList.add('hidden');pill.classList.remove('flex');}showToast('Admin Logged Out');navigate('home');}
function exitAdmin(){isAdminLoggedIn=false;['outfitkart_admin_session','outfitkart_admin_name','outfitkart_admin_username','outfitkart_admin_mobile'].forEach(k=>localStorage.removeItem(k));document.body.classList.remove('admin-active');navigate('home');}

/* ============================================================
   A5. PRODUCTS — ADD / EDIT / DELETE (ScrapingBee REMOVED)
   ============================================================ */
function updateDropdownSubs(catId,subId){
    try{
        const catEl=document.getElementById(catId);const subEl=document.getElementById(subId);if(!catEl||!subEl)return;
        const cData=CATEGORIES.find(c=>c.name===catEl.value);subEl.innerHTML='<option value="">Select Subcategory</option>';if(!cData)return;
        if(cData.groups){cData.groups.forEach(group=>{const og=document.createElement('optgroup');og.label=group.label;group.items.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;og.appendChild(o);});subEl.appendChild(og);});}
        else{cData.subs.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;subEl.appendChild(o);});}
        updateSizeSection(catEl.value);
    }catch(e){}
}

function updateSizeSection(categoryName){
    const sizeSection=document.getElementById('admin-size-section');const mlSection=document.getElementById('admin-ml-section');if(!sizeSection||!mlSection)return;
    if(isPerfumeCategory(categoryName)){sizeSection.classList.add('hidden');mlSection.classList.remove('hidden');}
    else{sizeSection.classList.remove('hidden');mlSection.classList.add('hidden');}
}

function toggleProductMode(mode){
    // ScrapingBee removed — always show manual fields
    const manualFields=document.getElementById('manual-fields');if(!manualFields)return;
    manualFields.classList.remove('hidden');
    const modeManual=document.getElementById('mode-manual');if(modeManual)modeManual.checked=true;
    updateSellingPreview();
    // Replace auto-import section with info box
    const autoImport=document.getElementById('auto-import-fields');
    if(autoImport&&!autoImport.querySelector('.scrape-removed-notice')){
        autoImport.innerHTML=`<div class="scrape-removed-notice bg-blue-50 border border-blue-200 rounded-xl p-4"><i class="fas fa-info-circle text-blue-500 mr-2"></i><span class="text-sm text-blue-700 font-semibold">Supplier URL field neeche add karo — order panel mein clickable link milega</span></div>`;
    }
}

function updateSellingPreview(){
    const supplier=parseInt(document.getElementById('ap-supplier-price')?.value)||0;
    // Sync range slider and number input
    const rangeEl=document.getElementById('ap-margin-pct');
    const numEl=document.getElementById('ap-margin-pct-num');
    const marginPct=parseFloat((numEl?.value!==undefined&&numEl?.value!=='')?numEl.value:(rangeEl?.value||0))||0;
    if(rangeEl)rangeEl.value=marginPct;
    if(numEl&&document.activeElement!==numEl)numEl.value=marginPct;
    const marginAmt=Math.round(supplier*marginPct/100);
    const selling=supplier+marginAmt;
    const mrp=Math.round(selling*1.4);
    const prev=document.getElementById('selling-price-preview');
    const val=document.getElementById('selling-price-value');
    const mVal=document.getElementById('margin-amt-preview');
    const mrpVal=document.getElementById('mrp-preview-value');
    const pEl=document.getElementById('ap-price');
    const mEl=document.getElementById('ap-margin');
    const oldPriceEl=document.getElementById('ap-oldprice');
    if(prev)prev.classList.toggle('hidden',selling===0);
    if(val)val.textContent=`₹${selling.toLocaleString()}`;
    if(mVal)mVal.textContent=`₹${marginAmt.toLocaleString()}`;
    if(mrpVal)mrpVal.textContent=`₹${mrp.toLocaleString()}`;
    if(pEl)pEl.value=selling;
    if(mEl)mEl.value=marginAmt;
    // MRP auto-fill karo agar user ne khud nahi bhara
    if(oldPriceEl&&selling>0&&!oldPriceEl.dataset.manualEdit)oldPriceEl.value=mrp;
}

function autoGenerateDescription(){
    const name=document.getElementById('ap-name')?.value;if(!name)return showToast('Enter Product Name first');
    document.getElementById('ap-desc').value=`Elevate your style with our premium ${name}. Crafted for the modern wardrobe with unmatched quality, comfort, and durability. Perfect for every occasion — from casual outings to formal events. 100% authentic product. Limited stock available — order now!`;
}

async function adminAddProduct(e){
    e.preventDefault();
    const imgLinks=document.getElementById('ap-imgs').value.split('\n').map(l=>l.trim()).filter(Boolean);
    const catVal=document.getElementById('ap-category').value;const isPerf=isPerfumeCategory(catVal);
    let sizes=[];
    if(isPerf){sizes=Array.from(document.querySelectorAll('.ml-admin-chk:checked')).map(cb=>cb.value);if(!sizes.length)sizes=PERFUME_ML_SIZES;}
    else{sizes=Array.from(document.querySelectorAll('.size-admin-chk:checked')).map(cb=>cb.value);}
    const supplierPrice=parseInt(document.getElementById('ap-supplier-price')?.value)||0;
    const marginPct=parseFloat(document.getElementById('ap-margin-pct')?.value)||0;
    const marginAmt=Math.round(supplierPrice*marginPct/100)||parseInt(document.getElementById('ap-margin')?.value)||0;
    const sellingPrice=supplierPrice+marginAmt;
    if(sellingPrice<=0)return showToast('Enter a valid Supplier/Cost Price');
    const supplierUrl=document.getElementById('ap-supplier-url-field')?.value.trim()||'';
    const newP={
        name:document.getElementById('ap-name').value.trim(),price:sellingPrice,supplier_price:supplierPrice,margin_amt:marginAmt,
        supplier_url:supplierUrl,
        oldprice:parseInt(document.getElementById('ap-oldprice').value)||Math.round(sellingPrice*1.4),
        checkout_discount:parseInt(document.getElementById('ap-discount').value)||0,
        brand:document.getElementById('ap-brand').value.trim(),imgs:imgLinks,category:catVal,
        sub:document.getElementById('ap-sub').value,desc:document.getElementById('ap-desc').value.trim(),
        stock_qty:parseInt(document.getElementById('ap-stock').value)||50,available_sizes:sizes,istrending:true,
    };
    try{
        const{data,error}=await dbClient.from('products').insert([newP]).select().single();if(error)throw error;
        if(data){products.push(data);e.target.reset();updateDropdownSubs('ap-category','ap-sub');renderAdminProducts();showToast(`✅ Added! Sell: ₹${sellingPrice} | Cost: ₹${supplierPrice} | Profit: ₹${marginAmt}`);const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;}
    }catch(err){showToast('Error: '+err.message);}
}

function renderAdminProducts(){
    const container=document.getElementById('admin-product-list');if(!container)return;
    const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;
    if(!products.length){container.innerHTML=`<div class="text-center py-20"><i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg font-semibold">No products yet</p><button onclick="switchAdminTab('inventory')" class="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Add First Product</button></div>`;return;}
    container.innerHTML=`<div class="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b sticky top-0 z-10"><div class="flex items-center justify-between"><span class="text-sm font-bold text-purple-700"><i class="fas fa-boxes mr-2"></i>Total: ${products.length} products</span></div></div>`+
        [...products].reverse().map(p=>{
            const isPerf=isPerfumeCategory(p.category);
            const supplierLink=p.supplier_url?`<a href="${p.supplier_url}" target="_blank" rel="noopener" class="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-0.5" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt text-[9px]"></i> Supplier Link</a>`:'';
            return `<div class="flex justify-between items-center p-3 border-b text-sm hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <img src="${p.imgs?.[0]||p.img||'https://placehold.co/48x48/eee/666?text=?'}" class="w-12 h-12 rounded-lg object-cover border shadow-sm flex-shrink-0" loading="lazy">
                    <div class="min-w-0 flex-1">
                        <span class="truncate block font-semibold text-gray-800">${p.name}</span>
                        <span class="text-xs text-gray-500">${p.category} • ${p.sub||'N/A'}${isPerf?' 🌸':''}</span>
                        ${p.brand?`<span class="text-xs text-blue-600 block font-medium">${p.brand}</span>`:''}
                        ${supplierLink}
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="text-right">
                        <div class="font-bold text-gray-900">₹${p.price}</div>
                        ${p.supplier_price?`<div class="text-[10px] text-gray-400">Cost: ₹${p.supplier_price}</div>`:''}
                        ${p.margin_amt?`<div class="text-[10px] text-green-600 font-bold">+₹${p.margin_amt}</div>`:''}
                    </div>
                    <button onclick="openEditProduct(${p.id})" class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"><i class="fas fa-pen text-sm"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><i class="fas fa-trash text-sm"></i></button>
                </div>
            </div>`;
        }).join('');
}

async function openEditProduct(productId){
    const p=products.find(x=>x.id===productId);if(!p)return showToast('Product not found');
    const isPerf=isPerfumeCategory(p.category);
    document.getElementById('edit-product-id').value=p.id;
    document.getElementById('edit-product-title').textContent=`(ID: ${p.id})`;
    document.getElementById('ep-name').value=p.name||'';document.getElementById('ep-price').value=p.price||'';
    if(document.getElementById('ep-margin-amt'))document.getElementById('ep-margin-amt').value=p.margin_amt||0;
    document.getElementById('ep-category').value=p.category||'Men';
    setTimeout(()=>{updateDropdownSubs('ep-category','ep-sub');document.getElementById('ep-sub').value=p.sub||'';},50);
    document.getElementById('edit-ap-brand').value=p.brand||'';document.getElementById('ep-desc').value=p.desc||'';
    document.getElementById('ep-oldprice').value=p.oldprice||'';document.getElementById('ep-discount').value=p.checkout_discount||0;
    document.getElementById('ep-stock').value=p.stock_qty||50;
    document.getElementById('ep-imgs').value=Array.isArray(p.imgs)?p.imgs.join('\n'):(p.imgs||'');
    const epSupUrl=document.getElementById('ep-supplier-url');if(epSupUrl)epSupUrl.value=p.supplier_url||'';
    const grid=document.getElementById('ep-sizes-grid');grid.innerHTML='';
    const allSizes=isPerf?PERFUME_ML_SIZES:['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','5','6','7','8','9','10','11','12','Free Size'];
    if(isPerf){const lbl=document.createElement('p');lbl.className='text-xs text-purple-600 font-bold mb-2 col-span-full';lbl.textContent='🌸 Select ML Volumes:';grid.appendChild(lbl);}
    allSizes.forEach(size=>{const lbl=document.createElement('label');lbl.className='flex items-center gap-1 cursor-pointer text-xs';lbl.innerHTML=`<input type="checkbox" value="${size}" class="ep-size-chk" ${p.available_sizes?.includes(size)?'checked':''}><span>${size}</span>`;grid.appendChild(lbl);});
    const modal=document.getElementById('edit-product-modal');modal?.classList.remove('hidden');modal?.classList.add('flex');
}
function closeEditModal(){document.getElementById('edit-product-modal')?.classList.add('hidden');document.getElementById('edit-product-form')?.reset();}

async function updateProduct(event){
    event.preventDefault();
    const productId=document.getElementById('edit-product-id').value;
    const updates={name:document.getElementById('ep-name').value,price:parseInt(document.getElementById('ep-price').value),margin_amt:parseInt(document.getElementById('ep-margin-amt')?.value)||0,oldprice:parseInt(document.getElementById('ep-oldprice').value)||0,checkout_discount:parseInt(document.getElementById('ep-discount').value)||0,brand:document.getElementById('edit-ap-brand').value,category:document.getElementById('ep-category').value,sub:document.getElementById('ep-sub').value,desc:document.getElementById('ep-desc').value,stock_qty:parseInt(document.getElementById('ep-stock').value)||0,available_sizes:Array.from(document.querySelectorAll('.ep-size-chk:checked')).map(cb=>cb.value),imgs:document.getElementById('ep-imgs').value.split('\n').map(l=>l.trim()).filter(Boolean),supplier_url:document.getElementById('ep-supplier-url')?.value.trim()||null};
    try{const{data,error}=await dbClient.from('products').update(updates).eq('id',productId).select().single();if(error)throw error;const idx=products.findIndex(p=>p.id==productId);if(idx>-1)products[idx]=data;closeEditModal();renderAdminProducts();showToast('✅ Product Updated!');}
    catch(err){showToast('❌ Update failed: '+err.message);}
}

async function deleteProduct(id){
    if(!confirm('Delete this product?'))return;
    try{await dbClient.from('products').delete().eq('id',id);products=products.filter(p=>p.id!==id);renderAdminProducts();const countBadge=document.getElementById('sidebar-product-count');if(countBadge)countBadge.textContent=products.length;showToast('Deleted from DB. 🗑️');}
    catch(err){showToast('Delete failed: '+err.message);}
}

function addCustomMlVolume(){
    const inp=document.getElementById('custom-ml-input');if(!inp||!inp.value||isNaN(Number(inp.value)))return showToast('Valid number enter karo');
    const val=inp.value.trim()+'ml';const existing=document.querySelector(`.ml-admin-chk[value="${val}"]`);
    if(existing){existing.checked=true;showToast(`${val} already hai — checked!`);inp.value='';return;}
    const grid=document.querySelector('#admin-ml-section .grid');if(!grid)return;
    const lbl=document.createElement('label');lbl.className='flex items-center gap-1 cursor-pointer';lbl.innerHTML=`<input type="checkbox" value="${val}" class="ml-admin-chk accent-purple-600" checked> ${val}`;
    grid.appendChild(lbl);showToast(`✅ ${val} add ho gaya!`);inp.value='';
}

/* ============================================================
   A6. DOM READY — inject supplier URL + promo tab + hide scraping
   ============================================================ */
document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
        // Supplier URL in Add Product form
        if(!document.getElementById('ap-supplier-url-field')){
            const brandRow=document.getElementById('ap-brand')?.closest('.grid');
            if(brandRow){
                const div=document.createElement('div');div.className='md:col-span-2';
                div.innerHTML=`<label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Supplier URL (order panel mein clickable link ayega)</label><div class="flex items-center gap-2"><input type="url" id="ap-supplier-url-field" placeholder="https://meesho.com/... ya amazon/flipkart link" class="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300"><a id="ap-supplier-url-preview" href="#" target="_blank" class="hidden text-indigo-600 text-lg hover:text-indigo-700" title="Preview Link"><i class="fas fa-external-link-alt"></i></a></div>`;
                brandRow.insertAdjacentElement('afterend',div);
                const urlInput=document.getElementById('ap-supplier-url-field');
                if(urlInput)urlInput.addEventListener('input',()=>{const preview=document.getElementById('ap-supplier-url-preview');if(preview){if(urlInput.value){preview.classList.remove('hidden');preview.href=urlInput.value;}else preview.classList.add('hidden');}});
            }
        }
        // Supplier URL in Edit Product modal
        if(!document.getElementById('ep-supplier-url')){
            const epDisc=document.getElementById('ep-discount');if(epDisc){const div=document.createElement('div');div.className='md:col-span-2';div.innerHTML=`<label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Supplier URL</label><input type="url" id="ep-supplier-url" placeholder="https://..." class="w-full border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300">`;epDisc.closest('.grid')?.insertAdjacentElement('afterend',div);}
        }
        // Replace auto-import/ScrapingBee section
        const autoImport=document.getElementById('auto-import-fields');
        if(autoImport){autoImport.innerHTML=`<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"><i class="fas fa-info-circle text-blue-500 text-lg mt-0.5"></i><div><p class="font-bold text-blue-800 text-sm mb-1">Manual Product Entry</p><p class="text-xs text-blue-600">Supplier URL field neeche available hai — admin panel ke orders mein clickable link dikhega jab koi order aayega.</p></div></div>`;}
        // Always show manual fields
        const manualFields=document.getElementById('manual-fields');if(manualFields)manualFields.classList.remove('hidden');
        // Inject promo tab button + tab HTML
        _injectPromoTabUI();
    },600);
});

function _injectPromoTabUI(){
    // Promo button in sidebar
    if(!document.getElementById('btn-admin-promo')){
        const refBtn=document.getElementById('btn-admin-referrals');
        if(refBtn){
            const btn=document.createElement('button');btn.id='btn-admin-promo';btn.onclick=()=>switchAdminTab('promo');btn.className='admin-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all';btn.innerHTML=`<span class="nav-icon"><i class="fas fa-tag"></i></span><span class="flex-1 text-left">Promo Codes</span><span class="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">NEW</span>`;
            refBtn.insertAdjacentElement('beforebegin',btn);
        }
    }
    // Promo tab content panel
    if(!document.getElementById('admin-tab-promo')){
        const adminContent=document.querySelector('.flex-1.p-4.md\\:p-6');
        if(adminContent){const tab=document.createElement('div');tab.id='admin-tab-promo';tab.className='admin-content-tab hidden space-y-3';tab.innerHTML=`<div class="bg-white p-4 md:p-6 rounded-xl shadow-md border"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg text-rose-600 flex items-center gap-2"><i class="fas fa-tag"></i> Promo Codes</h3><button onclick="loadAdminPromoCodes()" class="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold border border-purple-200 hover:bg-purple-200"><i class="fas fa-sync-alt mr-1"></i>Refresh</button></div><div id="admin-promo-content"><div class="text-center py-8 text-gray-400"><i class="fas fa-tag text-4xl mb-3"></i><p class="font-semibold">Click Refresh to load promo codes</p></div></div></div>`;adminContent.appendChild(tab);}
    }
}

/* ============================================================
   A7. ORDERS MANAGEMENT
   ============================================================ */
async function loadAllOrdersAdmin(){
    const container=document.getElementById('admin-full-order-list');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{const{data,error}=await dbClient.from('orders').select('*').order('date',{ascending:false});if(error)throw error;window.allAdminOrders=data||[];renderFilteredOrders(document.getElementById('admin-order-filter')?.value||'all');}
    catch(err){container.innerHTML=`<div class="text-center py-6 text-red-500">Error: ${err.message}</div>`;}
}
function filterAdminOrders(status){renderFilteredOrders(status);}

function renderFilteredOrders(filterStatus){
    const container=document.getElementById('admin-full-order-list');if(!container)return;
    const allOrders=window.allAdminOrders||[];const filteredData=filterStatus==='all'?allOrders:allOrders.filter(o=>o.status===filterStatus);
    if(!allOrders.length){container.innerHTML=`<div class="text-center py-20"><i class="fas fa-receipt text-6xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg font-semibold">No orders yet</p></div>`;return;}
    const activeOrders=allOrders.filter(o=>o.status!=='Cancelled');const cancelledOrders=allOrders.filter(o=>o.status==='Cancelled');
    if(!filteredData.length){container.innerHTML=`<div class="text-center py-16"><i class="fas fa-filter text-5xl text-gray-300 mb-3"></i><p class="text-gray-500 font-semibold">No ${filterStatus} orders found</p></div>`;return;}
    const headerHtml=`<div class="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200 mb-4 sticky top-0 z-10"><div class="flex items-center justify-between flex-wrap gap-2"><span class="text-sm font-black text-purple-700">${filterStatus==='all'?`Total: ${allOrders.length}`:`${filterStatus}: ${filteredData.length}`}</span><div class="flex gap-2"><span class="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200 font-bold">Active: ${activeOrders.length}</span><span class="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full border border-red-200 font-bold">Cancelled: ${cancelledOrders.length}</span></div></div></div>`;
    container.innerHTML=headerHtml+filteredData.map(o=>{
        const oidSafe=String(o.id||'').replace(/'/g,"\\'");const badge=STATUS_BADGE[o.status]||'bg-gray-100 text-gray-600';
        const itemsHtml=o.items?.length?o.items.map(item=>{const prod=products.find(p=>p.id===item.id)||goldProducts.find(p=>p.id===item.id);const suppUrl=prod?.supplier_url||item.supplier_url||'';return `<div class="admin-order-item"><img src="${item.img||'https://placehold.co/48x60/e11d48/fff?text=?'}" alt="${item.name}" onerror="this.src='https://placehold.co/48x60/eee/999?text=?'" loading="lazy"><div class="admin-order-item-info"><div class="admin-order-item-name" title="${item.name}">${item.name}</div><div class="admin-order-item-meta">Size: <strong>${item.size||'M'}</strong> &nbsp;•&nbsp; Qty: <strong>${item.qty||1}</strong></div><div class="admin-order-item-price">₹${((item.price||0)*(item.qty||1)).toLocaleString('en-IN')}</div>${suppUrl?`<a href="${suppUrl}" target="_blank" rel="noopener" class="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5 mt-0.5"><i class="fas fa-external-link-alt text-[8px]"></i> Supplier Link</a>`:''}</div></div>`;}).join(''):'<div class="text-xs text-gray-400 italic py-2 px-1">No item details</div>';
        const promoInfo=o.promo_code?`<div class="col-span-2 bg-rose-50 rounded p-1.5 border border-rose-200"><span class="font-bold text-rose-700 uppercase text-[10px]">Promo</span><div class="font-mono font-semibold text-rose-800 mt-0.5">${o.promo_code} (-₹${o.promo_discount||0})</div></div>`:'';
        return `<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-3 hover:shadow-md transition-all">
            <div class="flex justify-between items-start pb-3 mb-3 border-b"><div><span class="font-bold text-purple-700 font-mono text-sm">#${o.id}</span><span class="${badge} text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">${o.status||'Processing'}</span><div class="text-xs text-gray-500 mt-1">${o.date||''} • ${o.paymentmode||''}</div></div><div class="font-black text-lg text-rose-600">₹${(o.total||0).toLocaleString('en-IN')}</div></div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-3 bg-gray-50 rounded-lg p-3 border">
                <div><span class="font-bold text-gray-400 uppercase text-[10px]">Customer</span><div class="font-semibold text-gray-800 mt-0.5">${o.customer_name||'N/A'}</div></div>
                <div><span class="font-bold text-gray-400 uppercase text-[10px]">Mobile</span><div class="font-semibold text-gray-800 mt-0.5">${o.mobile||'N/A'}</div></div>
                <div class="col-span-2"><span class="font-bold text-gray-400 uppercase text-[10px]">TX ID</span><div class="font-mono text-gray-700 mt-0.5 truncate">${o.transaction_id||'N/A'}</div></div>
                ${o.margin_total?`<div class="col-span-2 bg-green-50 rounded p-1.5 border border-green-200"><span class="font-bold text-green-700 uppercase text-[10px]">Profit</span><div class="font-bold text-green-700 mt-0.5">₹${o.margin_total.toLocaleString('en-IN')}</div></div>`:''}
                ${o.referral_code?`<div class="col-span-2 bg-green-50 rounded p-1.5 border border-green-200"><span class="font-bold text-green-700 uppercase text-[10px]">Referral Code</span><div class="font-mono font-semibold text-green-800 mt-0.5">${o.referral_code}</div></div>`:''}
                ${promoInfo}
                ${o.refund_upi?`<div class="col-span-2 bg-rose-50 rounded p-1.5 border border-rose-200"><span class="font-bold text-rose-700 uppercase text-[10px]">Refund UPI</span><div class="font-mono font-semibold text-rose-800 mt-0.5 select-all">${o.refund_upi}</div></div>`:''}
            </div>
            <div class="mb-3"><div class="text-[10px] font-bold text-gray-400 uppercase mb-2">Items (${(o.items||[]).length})</div><div class="admin-order-items">${itemsHtml}</div></div>
            <div class="text-[10px] text-gray-500 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-3"><i class="fas fa-map-marker-alt text-blue-400 mr-1"></i>${[o.address,o.city,o.state,o.pincode?'- '+o.pincode:''].filter(Boolean).join(', ')||'N/A'}</div>
            <div class="flex items-center gap-2"><span class="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Status:</span><select onchange="updateOrderStatus('${oidSafe}',this.value)" class="flex-1 border border-gray-300 rounded-lg text-xs p-2 font-bold bg-white focus:ring-2 focus:ring-purple-300 outline-none cursor-pointer">${ALL_ORDER_STATUSES.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>`;
    }).join('');
}

async function updateOrderStatus(orderId,newStatus){
    orderId=String(orderId||'').trim();if(!orderId){showToast('❌ Invalid order ID');return;}showToast(`⏳ Updating #${orderId}...`);
    try{const res=await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=representation'},body:JSON.stringify({status:newStatus})});if(!res.ok)throw new Error(`HTTP ${res.status}`);showToast(`✅ Order #${orderId} → "${newStatus}"`);setTimeout(()=>loadAllOrdersAdmin(),600);}
    catch(err){showToast(`❌ Update failed: ${err.message}`);setTimeout(()=>loadAllOrdersAdmin(),500);}
}

/* ============================================================
   A8. USERS
   ============================================================ */
async function loadAllUsersAdmin(){
    const container=document.getElementById('admin-users-list');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{const{data,error}=await dbClient.from('users').select('*').order('mobile',{ascending:false});if(error)throw error;container.innerHTML=data?.length?data.map(user=>`<div class="bg-white border rounded-lg p-4 hover:shadow-md transition"><div class="flex items-center gap-4"><img src="${user.profile_pic||`https://placehold.co/48x48/e11d48/ffffff?text=${(user.name||'U').charAt(0)}`}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-200"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><div class="font-bold text-gray-900">${user.name||'Unknown'}</div>${isAuthorizedAdmin(user)?'<span class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Admin</span>':''}</div><div class="text-sm text-gray-500">+91 ${user.mobile}</div>${user.email?`<div class="text-xs text-gray-400">${user.email}</div>`:''} ${user.referral_code?`<div class="text-xs text-green-600 font-mono font-bold">Code: ${user.referral_code}</div>`:''} ${user.push_subscription?'<div class="text-xs text-blue-600"><i class="fas fa-bell text-[10px] mr-0.5"></i>Push Subscribed ✅</div>':''}</div><div class="text-right flex-shrink-0"><div class="text-lg font-bold text-purple-600">₹${user.wallet||0}</div><div class="text-xs text-gray-500">Wallet</div></div></div></div>`).join(''):'<div class="text-center text-gray-400 py-10">No users found</div>';}
    catch(err){container.innerHTML='<div class="text-center text-red-500 py-6">Error loading users</div>';}
}

/* ============================================================
   A9. PAYOUTS / WITHDRAWALS
   ============================================================ */
async function loadAllWithdrawalsAdmin(){
    const container=document.getElementById('admin-withdraw-list');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{
        const{data,error}=await dbClient.from('withdrawals').select('*').order('id',{ascending:false});if(error)throw error;
        const all=data||[];const pending=all.filter(w=>w.status==='Pending');const paid=all.filter(w=>w.status==='Paid');const rejected=all.filter(w=>w.status==='Rejected');
        if(!all.length){container.innerHTML='<div class="text-center text-gray-400 py-16"><i class="fas fa-wallet text-5xl mb-3 text-gray-300"></i><p class="font-semibold">No withdrawal requests yet</p></div>';return;}
        container.innerHTML=`<div class="grid grid-cols-3 gap-3 mb-4"><div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-amber-600">${pending.length}</div><div class="text-xs text-amber-700 font-bold">Pending</div><div class="text-xs text-amber-500">₹${pending.reduce((s,w)=>s+(w.amount||0),0).toLocaleString('en-IN')}</div></div><div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-green-600">${paid.length}</div><div class="text-xs text-green-700 font-bold">Paid</div><div class="text-xs text-green-500">₹${paid.reduce((s,w)=>s+(w.amount||0),0).toLocaleString('en-IN')}</div></div><div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><div class="text-xl font-black text-red-500">${rejected.length}</div><div class="text-xs text-red-700 font-bold">Rejected</div></div></div>
        <div class="flex gap-1 border-b mb-4 overflow-x-auto hide-scrollbar"><button onclick="filterPayouts('all',this)" class="payout-tab pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap">All (${all.length})</button><button onclick="filterPayouts('Pending',this)" class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Pending (${pending.length})</button><button onclick="filterPayouts('Paid',this)" class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Paid (${paid.length})</button><button onclick="filterPayouts('Rejected',this)" class="payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap">Rejected (${rejected.length})</button></div>
        <div id="payouts-list" class="space-y-3"></div>`;
        window._allPayouts=all;_renderPayoutsList(all);
    }catch(err){container.innerHTML=`<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`;}
}
function filterPayouts(status,btn){document.querySelectorAll('.payout-tab').forEach(b=>{b.className='payout-tab pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap';});btn.className='payout-tab pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap';const all=window._allPayouts||[];_renderPayoutsList(status==='all'?all:all.filter(w=>w.status===status));}
function _renderPayoutsList(items){
    const container=document.getElementById('payouts-list');if(!container)return;
    if(!items.length){container.innerHTML='<div class="text-center text-gray-400 py-10"><i class="fas fa-inbox text-4xl mb-3"></i><p class="font-semibold">No records found</p></div>';return;}
    const STATUS_STYLE={Pending:'bg-amber-50 border-amber-200',Paid:'bg-green-50 border-green-200',Rejected:'bg-red-50 border-red-200'};
    const BADGE={Pending:'bg-amber-100 text-amber-700',Paid:'bg-green-100 text-green-700',Rejected:'bg-red-100 text-red-600'};
    container.innerHTML=items.map(w=>`<div class="border rounded-xl p-4 ${STATUS_STYLE[w.status]||'bg-white border-gray-200'} hover:shadow-md transition-all"><div class="flex justify-between items-start mb-3"><div><div class="font-bold text-gray-800">+91 ${w.mobile}</div><div class="text-sm text-gray-600 font-medium">${w.name||'—'}</div><div class="text-xs text-gray-400 mt-0.5">${w.date||'—'}</div></div><div class="text-right"><div class="text-2xl font-black text-gray-800">₹${w.amount}</div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[w.status]||'bg-gray-100 text-gray-500'}">${w.status}</span></div></div><div class="bg-white border rounded-lg p-3 font-mono text-sm select-all mb-3 flex items-center gap-2"><i class="fas fa-university text-gray-400 text-xs"></i><span>${w.upi_id}</span></div>${w.status==='Pending'?`<div class="flex gap-2"><button onclick="approvePayout(${w.id})" class="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 active:scale-95 text-sm"><i class="fas fa-check mr-1"></i>Mark as Paid</button><button onclick="rejectPayout(${w.id})" class="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600 active:scale-95 text-sm"><i class="fas fa-times mr-1"></i>Reject</button></div>`:`<div class="text-xs text-gray-400 text-center font-semibold py-1">${w.status==='Paid'?'✅ Payment processed':'❌ Request rejected'}</div>`}</div>`).join('');
}
async function approvePayout(id){if(!confirm('Confirm: Payment done via UPI?'))return;try{await dbClient.from('withdrawals').update({status:'Paid'}).eq('id',id);showToast('✅ Payout marked as Paid!');loadAllWithdrawalsAdmin();}catch(err){showToast('Error: '+err.message);}}
async function rejectPayout(id){if(!confirm('Reject this withdrawal request? Wallet balance will be refunded.'))return;try{const{data:w}=await dbClient.from('withdrawals').select('*').eq('id',id).single();if(!w){showToast('Withdrawal not found');return;}const{data:user}=await dbClient.from('users').select('wallet').eq('mobile',w.mobile).maybeSingle();if(user){await dbClient.from('users').update({wallet:(user.wallet||0)+(w.amount||0)}).eq('mobile',w.mobile);}await dbClient.from('withdrawals').update({status:'Rejected'}).eq('id',id);showToast('❌ Rejected & ₹'+w.amount+' refunded to wallet');loadAllWithdrawalsAdmin();}catch(err){showToast('Error: '+err.message);}}

/* ============================================================
   A10. REFERRALS
   ============================================================ */
async function loadAdminReferrals(){
    const container=document.getElementById('admin-referrals-content');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{
        const{data:referrals,error}=await dbClient.from('referrals').select('*').order('id',{ascending:false});if(error)throw error;
        const all=referrals||[];const pending=all.filter(r=>r.status==='pending');const confirmed=all.filter(r=>r.status==='confirmed');const cancelled=all.filter(r=>r.status==='cancelled');
        container.innerHTML=`<div class="grid grid-cols-3 gap-3 mb-4"><div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p class="text-xs text-amber-700 font-bold uppercase mb-1">Pending</p><p class="text-2xl font-black text-amber-600">₹${pending.reduce((s,r)=>s+(r.commission||0),0).toLocaleString()}</p><p class="text-xs text-amber-500 mt-1">${pending.length} referrals</p></div><div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center"><p class="text-xs text-green-700 font-bold uppercase mb-1">Confirmed</p><p class="text-2xl font-black text-green-600">₹${confirmed.reduce((s,r)=>s+(r.commission||0),0).toLocaleString()}</p><p class="text-xs text-green-500 mt-1">${confirmed.length} referrals</p></div><div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p class="text-xs text-red-700 font-bold uppercase mb-1">Cancelled</p><p class="text-2xl font-black text-red-400">₹${cancelled.reduce((s,r)=>s+(r.commission||0),0).toLocaleString()}</p></div></div>
        <div class="flex gap-1 mb-4 border-b overflow-x-auto hide-scrollbar"><button onclick="adminFilterReferrals('pending',this)" class="pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab">⏳ Pending (${pending.length})</button><button onclick="adminFilterReferrals('all',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">All (${all.length})</button><button onclick="adminFilterReferrals('confirmed',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Confirmed (${confirmed.length})</button><button onclick="adminFilterReferrals('cancelled',this)" class="pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab">Cancelled (${cancelled.length})</button></div>
        <div id="admin-referrals-list" class="space-y-3"></div>`;
        window._allAdminReferrals=all;renderAdminReferralList(pending.length?pending:all);
    }catch(err){container.innerHTML=`<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`;}
}
function adminFilterReferrals(status,btn){document.querySelectorAll('.admin-ref-tab').forEach(b=>{b.className='pb-2 px-4 text-sm font-bold text-gray-500 whitespace-nowrap admin-ref-tab';});btn.className='pb-2 px-4 text-sm font-bold text-purple-600 border-b-2 border-purple-600 whitespace-nowrap admin-ref-tab';const all=window._allAdminReferrals||[];renderAdminReferralList(status==='all'?all:all.filter(r=>r.status===status));}
function renderAdminReferralList(items){
    const container=document.getElementById('admin-referrals-list');if(!container)return;
    if(!items.length){container.innerHTML='<div class="text-center py-10 text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>No referrals found</p></div>';return;}
    const BADGE={pending:'bg-amber-100 text-amber-700',confirmed:'bg-green-100 text-green-700',cancelled:'bg-red-100 text-red-600'};
    container.innerHTML=items.map(r=>`<div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all"><div class="flex justify-between items-start flex-wrap gap-2"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap mb-1"><span class="font-bold text-sm text-gray-800">Order #${r.order_id}</span><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status]||'bg-gray-100 text-gray-500'}">${r.status}</span></div><div class="text-xs text-gray-500">Referrer: <strong>+91 ${r.referrer_mobile}</strong></div><div class="text-xs text-gray-500">Buyer: +91 ${r.buyer_mobile}</div><div class="text-xs text-gray-600 mt-1">Order: ₹${(r.order_total||0).toLocaleString()} | Commission: <strong class="text-green-600">₹${r.commission}</strong></div></div><div class="flex flex-col gap-1 items-end">${r.status==='pending'?`<button onclick="adminConfirmReferral(${r.id})" class="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600 active:scale-95">✅ Confirm</button>`:''}</div></div></div>`).join('');
}
async function adminConfirmReferral(referralId){
    if(!confirm('Manually confirm this referral and credit wallet?'))return;
    try{const{data:ref}=await dbClient.from('referrals').select('*').eq('id',referralId).single();if(!ref)return showToast('Referral not found');await dbClient.from('referrals').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('id',referralId);const{data:user}=await dbClient.from('users').select('wallet').eq('mobile',ref.referrer_mobile).maybeSingle();if(user){await dbClient.from('users').update({wallet:(user.wallet||0)+(ref.commission||0)}).eq('mobile',ref.referrer_mobile);}showToast(`✅ ₹${ref.commission} credited to +91 ${ref.referrer_mobile}`);loadAdminReferrals();}
    catch(err){showToast('Error: '+err.message);}
}

/* ============================================================
   A11. INFLUENCER REQUESTS
   ============================================================ */
async function loadAdminInfluencerRequests(){
    const container=document.getElementById('admin-influencer-list');if(!container)return;
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i></div>';
    try{
        const{data,error}=await dbClient.from('influencer_requests').select('*').order('id',{ascending:false});if(error)throw error;
        const all=data||[];if(!all.length){container.innerHTML='<div class="text-center py-16 text-gray-400"><i class="fas fa-video text-5xl mb-3"></i><p>No influencer requests yet</p></div>';return;}
        const BADGE={Pending:'bg-amber-100 text-amber-700',Approved:'bg-green-100 text-green-700',Rejected:'bg-red-100 text-red-600'};
        container.innerHTML=all.map(r=>`<div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all mb-3"><div class="flex justify-between items-start mb-2"><div class="flex-1 min-w-0"><div class="font-bold text-sm text-gray-800">${r.name} — +91 ${r.mobile}</div><div class="text-xs text-gray-500">${r.platform} • ${(r.views||0).toLocaleString()} views</div><a href="${r.video_url}" target="_blank" class="text-xs text-blue-600 hover:underline truncate block max-w-xs">${r.video_url}</a>${r.profile_url?`<a href="${r.profile_url}" target="_blank" class="text-xs text-purple-600 hover:underline truncate block max-w-xs">${r.profile_url}</a>`:''} ${r.description?`<div class="text-xs text-gray-500 mt-1 italic">${r.description}</div>`:''}</div><div class="text-right ml-3 flex-shrink-0"><div class="text-lg font-black text-green-600">₹${r.earnings||0}</div><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[r.status]||'bg-gray-100 text-gray-500'}">${r.status}</span></div></div>${r.status==='Pending'?`<div class="flex gap-2 mt-3"><button onclick="approveInfluencer(${r.id})" class="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-700 active:scale-95"><i class="fas fa-check mr-1"></i>Approve & Credit ₹${r.earnings||0}</button><button onclick="rejectInfluencer(${r.id})" class="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-red-600 active:scale-95"><i class="fas fa-times mr-1"></i>Reject</button></div>`:`<div class="text-xs text-gray-400 text-center py-1">${r.status==='Approved'?'✅ Approved & Wallet credited':'❌ Rejected'}</div>`}</div>`).join('');
    }catch(err){container.innerHTML=`<div class="text-center text-red-500 py-10">Error: ${err.message}</div>`;}
}
async function approveInfluencer(id){if(!confirm('Approve & credit earnings to wallet?'))return;try{const{data:req}=await dbClient.from('influencer_requests').select('*').eq('id',id).single();if(!req)return showToast('Request not found');await dbClient.from('influencer_requests').update({status:'Approved'}).eq('id',id);const{data:user}=await dbClient.from('users').select('wallet').eq('mobile',req.mobile).maybeSingle();if(user){await dbClient.from('users').update({wallet:(user.wallet||0)+(req.earnings||0)}).eq('mobile',req.mobile);}showToast(`✅ ₹${req.earnings} credited to +91 ${req.mobile}`);loadAdminInfluencerRequests();}catch(err){showToast('Error: '+err.message);}}
async function rejectInfluencer(id){const reason=prompt('Rejection reason (optional):')||'Does not meet requirements';try{await dbClient.from('influencer_requests').update({status:'Rejected',reject_reason:reason}).eq('id',id);showToast('❌ Request rejected');loadAdminInfluencerRequests();}catch(err){showToast('Error: '+err.message);}}

/* ============================================================
   A12. PUSH NOTIFICATIONS
   ============================================================ */
function searchProductsForNotif(query){const q=query.toLowerCase().trim();const box=document.getElementById('notif-product-results');if(!box)return;if(q.length<2){box.innerHTML='';return;}const hits=products.filter(p=>p.name.toLowerCase().includes(q)).slice(0,6);if(!hits.length){box.innerHTML='<div class="px-3 py-2 text-xs text-gray-400">No products found</div>';return;}box.innerHTML=hits.map(p=>{const img=p.imgs?.[0]||p.img||'';return`<div onclick="selectNotifProduct(${p.id})" class="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"><img src="${img}" class="w-10 h-12 object-cover rounded flex-shrink-0" onerror="this.style.display='none'"><div class="min-w-0 flex-1"><div class="text-xs font-bold text-gray-800 truncate">${p.name}</div><div class="text-[10px] text-rose-600 font-bold">₹${p.price}</div></div></div>`;}).join('');}
function selectNotifProduct(productId){const p=products.find(x=>x.id===productId);if(!p)return;const img=p.imgs?.[0]||p.img||'';document.getElementById('notif-title').value=p.name.length>50?p.name.slice(0,47)+'...':p.name;document.getElementById('notif-body').value=`₹${p.price}${p.oldprice?' (Was ₹'+p.oldprice+')':''} — Abhi kharido! 🛍️`;document.getElementById('notif-url').value=`./?pid=${p.id}`;document.getElementById('notif-image').value=img;document.getElementById('notif-product-results').innerHTML='';document.getElementById('notif-product-search').value=p.name.slice(0,30);_updateNotifPreview();showToast('✅ Product selected!');}
function _updateNotifPreview(){const title=document.getElementById('notif-title')?.value||'';const body=document.getElementById('notif-body')?.value||'';const image=document.getElementById('notif-image')?.value||'';const prev=document.getElementById('notif-preview');if(!prev)return;if(!title&&!body){prev.classList.add('hidden');return;}prev.classList.remove('hidden');prev.innerHTML=`<div class="flex items-start gap-3 p-3 bg-gray-800 rounded-xl text-white"><img src="https://placehold.co/40x40/e11d48/ffffff?text=OK" class="w-10 h-10 rounded-lg flex-shrink-0"><div class="flex-1 min-w-0"><div class="text-xs font-bold truncate">${title||'Title'}</div><div class="text-[10px] text-gray-300 mt-0.5 line-clamp-2">${body||'Message'}</div></div>${image?`<img src="${image}" class="w-12 h-14 object-cover rounded flex-shrink-0" onerror="this.style.display='none'">`:''}</div><div class="text-[9px] text-gray-400 text-center mt-1">Preview (actual may vary by device)</div>`;}
function showPushSetupGuide(){alert('Push Setup:\n1. Supabase Edge Functions → New Function → "send-push"\n2. Ya OneSignal (free) use karo\n3. Ya Firebase Cloud Messaging (FCM)');}

async function sendAdminNotification(){
    const title=document.getElementById('notif-title')?.value.trim();const body=document.getElementById('notif-body')?.value.trim();const mobile=document.getElementById('notif-mobile')?.value.trim().replace(/\D/g,'');const url=document.getElementById('notif-url')?.value.trim()||'./';const image=document.getElementById('notif-image')?.value.trim()||null;const result=document.getElementById('notif-result');
    if(!title)return showToast('Title daalo!');if(!body)return showToast('Message daalo!');
    const btn=document.querySelector('[onclick="sendAdminNotification()"]');if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';}
    if(result){result.classList.remove('hidden');result.className='text-center text-sm font-semibold py-2 rounded-lg bg-blue-50 text-blue-700';result.textContent='Fetching subscribed users...';}
    try{
        let query=dbClient.from('users').select('mobile,name,push_subscription').not('push_subscription','is',null);
        if(mobile)query=dbClient.from('users').select('mobile,name,push_subscription').eq('mobile',mobile).not('push_subscription','is',null);
        const{data:users,error}=await query;if(error)throw error;
        const subscribed=(users||[]).filter(u=>{if(!u.push_subscription)return false;try{JSON.parse(u.push_subscription);return true;}catch{return false;}});
        if(!subscribed.length){if(result){result.className='text-center text-sm font-semibold py-2 rounded-lg bg-amber-50 text-amber-700';result.textContent='⚠️ Koi bhi subscribed user nahi mila.';}if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i>Send Notification';}return;}
        try{await dbClient.from('notifications').insert([{title,body,url:url||'./',image:image||null,mobile:mobile||null,sent_at:new Date().toISOString(),sent_by:localStorage.getItem('outfitkart_admin_mobile')||'admin',status:'pending'}]);}catch(_){}
        try{const edgeRes=await fetch(`${SUPABASE_URL}/functions/v1/send-push`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({title,body,url,image,mobile:mobile||null}),signal:AbortSignal.timeout(15000)});if(edgeRes.ok){const edgeData=await edgeRes.json();const sent=edgeData.sent||subscribed.length;if(result){result.className='text-center text-sm font-semibold py-2 rounded-lg bg-green-50 text-green-700';result.textContent=`✅ ${sent} users ko notification bheja gaya!`;}showToast(`✅ ${sent} users ko notification bheja!`);_clearNotifFields();if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i>Send Notification';}return;}}catch(_){}
        if(Notification.permission==='granted'){new Notification(title,{body,icon:image||'https://placehold.co/192x192/e11d48/ffffff?text=OK',data:{url}});}
        if(result){result.className='text-center text-sm font-semibold py-2 rounded-lg bg-amber-50 text-amber-700';result.innerHTML=`⚠️ <strong>${subscribed.length} users subscribed</strong> hain.<br><span class="text-xs">Supabase Edge Function setup karo full push ke liye.</span><br><button onclick="showPushSetupGuide()" class="mt-2 text-xs bg-purple-600 text-white px-3 py-1 rounded-lg font-bold">Setup Guide</button>`;}
        showToast(`📋 DB mein save! ${subscribed.length} users subscribed.`);_clearNotifFields();
    }catch(err){if(result){result.className='text-center text-sm font-semibold py-2 rounded-lg bg-red-50 text-red-700';result.textContent='❌ Error: '+err.message;}showToast('❌ '+err.message);}
    finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i>Send Notification';}setTimeout(()=>result?.classList.add('hidden'),10000);}
}
function _clearNotifFields(){['notif-title','notif-body','notif-mobile','notif-image','notif-url','notif-product-search'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('notif-preview')?.classList.add('hidden');const box=document.getElementById('notif-product-results');if(box)box.innerHTML='';}

/* ============================================================
   A13. PROMO CODES MANAGEMENT
   ============================================================ */
async function loadAdminPromoCodes(){
    const container=document.getElementById('admin-promo-content');if(!container)return;
    container.innerHTML='<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-rose-500"></i></div>';
    try{
        const{data,error}=await dbClient.from('promo_codes').select('*').order('id',{ascending:false});
        if(error)throw error;
        const all=data||[];
        const active=all.filter(p=>p.is_active&&new Date(p.expires_at)>new Date());
        const expired=all.filter(p=>!p.is_active||new Date(p.expires_at)<=new Date());
        container.innerHTML=`
        <!-- Create Promo Form -->
        <div class="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 mb-5">
            <h4 class="font-black text-base text-rose-700 mb-4 flex items-center gap-2"><i class="fas fa-plus-circle"></i> Create New Promo Code</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">Promo Code *</label>
                    <input type="text" id="new-promo-code" placeholder="e.g. SAVE50 or DIWALI20" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wider focus:ring-2 focus:ring-rose-400 outline-none" style="letter-spacing:0.1em;">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">Discount Amount ₹ *</label>
                    <input type="number" id="new-promo-discount" placeholder="e.g. 50" min="1" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">Max Uses</label>
                    <input type="number" id="new-promo-maxuses" placeholder="100" value="100" min="1" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">Valid For (Hours) *</label>
                    <select id="new-promo-hours" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-rose-400 outline-none">
                        <option value="5" selected>5 Hours ⏳</option>
                        <option value="1">1 Hour</option>
                        <option value="2">2 Hours</option>
                        <option value="12">12 Hours</option>
                        <option value="24">24 Hours</option>
                        <option value="48">48 Hours</option>
                        <option value="72">72 Hours</option>
                    </select>
                </div>
            </div>
            <div class="mt-3">
                <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">Minimum Order Amount ₹</label>
                <input type="number" id="new-promo-minorder" placeholder="0 = no minimum" value="0" min="0" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none">
            </div>
            <button onclick="createPromoCode()" class="w-full mt-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-xl font-black text-sm hover:from-rose-700 hover:to-rose-800 active:scale-95 transition-all shadow-lg"><i class="fas fa-plus mr-2"></i>Create Promo Code</button>
        </div>

        <!-- Active Promos -->
        <div class="mb-4">
            <h4 class="font-black text-sm text-green-700 mb-3 flex items-center gap-2"><i class="fas fa-check-circle"></i> Active Codes (${active.length})</h4>
            ${active.length?active.map(p=>_promoAdminRow(p)).join(''):'<div class="text-center text-gray-400 py-6 text-sm bg-gray-50 rounded-xl border border-dashed">No active promo codes</div>'}
        </div>

        <!-- Expired/Disabled Promos -->
        ${expired.length?`<div><h4 class="font-black text-sm text-gray-400 mb-3 flex items-center gap-2"><i class="fas fa-times-circle"></i> Expired/Disabled (${expired.length})</h4>${expired.map(p=>_promoAdminRow(p,true)).join('')}</div>`:''}
        `;
    }catch(err){
        container.innerHTML=`<div class="text-center text-red-500 py-10">
            <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
            <p class="font-bold">${err.message}</p>
            <p class="text-xs mt-2 text-gray-400">promo_codes table Supabase mein create karo</p>
            <button onclick="copyPromoSQL()" class="mt-3 text-xs bg-rose-600 text-white px-4 py-2 rounded-lg font-bold">📋 SQL Copy karo</button>
        </div>`;
    }
}

function _promoAdminRow(p,isExpired=false){
    const now=new Date();const expiresAt=new Date(p.expires_at);const isActive=p.is_active&&expiresAt>now;
    const timeLeft=isActive?_timeLeft(expiresAt):'Expired';
    const shareText=`🎉 OutfitKart Promo Code!\n\nCode: ${p.code}\nDiscount: ₹${p.discount} OFF\nValid till: ${expiresAt.toLocaleString('en-IN')}\n\nShop now 👇`;
    return `<div class="bg-white border rounded-xl p-4 mb-2 shadow-sm ${isActive?'border-green-200':'border-gray-200 opacity-60'}">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
                <div class="px-4 py-2 rounded-xl font-black text-lg tracking-widest ${isActive?'bg-rose-50 text-rose-700 border border-rose-200':'bg-gray-100 text-gray-500'}" style="letter-spacing:0.15em;">${p.code}</div>
                <div>
                    <div class="font-black text-green-600 text-lg">-₹${p.discount}</div>
                    <div class="text-[10px] text-gray-500">Min order: ₹${p.min_order||0}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-xs font-bold ${isActive?'text-green-600':'text-red-500'}">${timeLeft}</div>
                <div class="text-[10px] text-gray-400">${p.used_count||0}/${p.max_uses} used</div>
            </div>
        </div>
        ${isActive?`<div class="flex gap-2 mt-3">
            <a href="https://t.me/outfitkart" target="_blank" rel="noopener"
               onclick="sharePromoToTelegram('${p.code}',${p.discount},'${expiresAt.toLocaleString('en-IN')}')"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white active:scale-95" style="background:linear-gradient(135deg,#0088cc,#00b0f4)">
               <i class="fab fa-telegram text-sm"></i> Share on Telegram
            </a>
            <a href="https://whatsapp.com/channel/0029VbCiSs06GcGJpToxKd3z" target="_blank" rel="noopener"
               onclick="sharePromoToWhatsApp('${p.code}',${p.discount},'${expiresAt.toLocaleString('en-IN')}')"
               class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white active:scale-95" style="background:linear-gradient(135deg,#25D366,#128C7E)">
               <i class="fab fa-whatsapp text-sm"></i> Share on WhatsApp
            </a>
            <button onclick="disablePromoCode(${p.id})" class="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95">Disable</button>
        </div>`:`<div class="text-xs text-gray-400 text-center py-1">This code is ${!p.is_active?'disabled':'expired'}</div>`}
    </div>`;
}

function _timeLeft(expiresAt){
    const diff=expiresAt-new Date();if(diff<=0)return'Expired';
    const h=Math.floor(diff/3600000);const m=Math.floor((diff%3600000)/60000);
    if(h>0)return`⏳ ${h}h ${m}m left`;return`⏳ ${m}m left`;
}

async function createPromoCode(){
    const code=(document.getElementById('new-promo-code')?.value||'').trim().toUpperCase();
    const discount=parseInt(document.getElementById('new-promo-discount')?.value)||0;
    const maxUses=parseInt(document.getElementById('new-promo-maxuses')?.value)||100;
    const hours=parseInt(document.getElementById('new-promo-hours')?.value)||5;
    const minOrder=parseInt(document.getElementById('new-promo-minorder')?.value)||0;
    if(!code)return showToast('Promo code enter karo');
    if(!discount||discount<1)return showToast('Discount amount enter karo');
    if(!/^[A-Z0-9]+$/.test(code))return showToast('Code sirf letters aur numbers use karo');
    const expiresAt=new Date(Date.now()+hours*60*60*1000).toISOString();
    try{
        const{error}=await dbClient.from('promo_codes').insert([{code,discount,type:'flat',min_order:minOrder,max_uses:maxUses,used_count:0,expires_at:expiresAt,is_active:true,created_by:localStorage.getItem('outfitkart_admin_mobile')||'admin'}]);
        if(error)throw error;
        showToast(`✅ Promo code "${code}" created! Valid for ${hours} hours`);
        // Clear form
        ['new-promo-code','new-promo-discount'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        const maxUsesEl=document.getElementById('new-promo-maxuses');if(maxUsesEl)maxUsesEl.value='100';
        const minOrderEl=document.getElementById('new-promo-minorder');if(minOrderEl)minOrderEl.value='0';
        loadAdminPromoCodes();
    }catch(err){showToast('❌ Error: '+err.message+(err.message.includes('duplicate')||err.message.includes('unique')?'\n(Code already exists — use different name)':''));}
}

function sharePromoToTelegram(code,discount,expiry){
    const text=`🎉 OutfitKart Special Offer!\n\n🏷️ Promo Code: ${code}\n💰 Get ₹${discount} OFF\n⏰ Valid till: ${expiry}\n\nShop now at OutfitKart! 🛍️`;
    window.open(`https://t.me/outfitkart`,'_blank');
    navigator.clipboard?.writeText(text).then(()=>showToast('📋 Promo message copied! Paste it in Telegram channel')).catch(()=>{});
}

function sharePromoToWhatsApp(code,discount,expiry){
    const text=`🎉 *OutfitKart Special Offer!*\n\n🏷️ Promo Code: *${code}*\n💰 Get *₹${discount} OFF*\n⏰ Valid till: ${expiry}\n\nShop now at OutfitKart! 🛍️`;
    window.open(`https://whatsapp.com/channel/0029VbCiSs06GcGJpToxKd3z`,'_blank');
    navigator.clipboard?.writeText(text).then(()=>showToast('📋 Promo message copied! Paste it in WhatsApp channel')).catch(()=>{});
}

async function disablePromoCode(id){
    if(!confirm('Disable this promo code?'))return;
    try{await dbClient.from('promo_codes').update({is_active:false}).eq('id',id);showToast('✅ Promo code disabled');loadAdminPromoCodes();}
    catch(err){showToast('Error: '+err.message);}
}

function copyPromoSQL(){
    const sql=`-- Promo Codes Table (Run in Supabase SQL Editor):
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
CREATE POLICY "allow_all" ON public.promo_codes USING (true) WITH CHECK (true);`;
    navigator.clipboard.writeText(sql).then(()=>showToast('✅ SQL copied! Supabase SQL Editor mein paste karo')).catch(()=>{const ta=document.createElement('textarea');ta.value=sql;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('✅ SQL copied!');});
}

/* ============================================================
   A14. GOLD PRODUCTS — gold_products TABLE
         Uses 'description' column (not 'desc')
   ============================================================ */
let _goldAdminProducts=[];let _goldEditId=null;

async function loadAdminGoldProducts(){
    const container=document.getElementById('admin-gold-list');if(!container){console.warn('[Gold] admin-gold-list not found');return;}
    container.innerHTML='<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl" style="color:#C9A84C;"></i><p class="mt-3 font-semibold" style="color:#B8860B;">Loading Gold Products...</p></div>';
    try{
        const{data,error}=await dbClient.from('gold_products').select('*').order('id',{ascending:false});if(error)throw error;
        _goldAdminProducts=data||[];_renderGoldAdminUI(container);
    }catch(err){
        container.innerHTML=`<div class="text-center text-red-500 py-10"><i class="fas fa-exclamation-circle text-3xl mb-3"></i><p class="font-bold">${err.message}</p><p class="text-xs mt-2 text-gray-400">gold_products table Supabase mein exist karti hai?</p><button onclick="copyGoldSQL()" class="mt-3 text-xs bg-amber-600 text-white px-4 py-2 rounded-lg font-bold">📋 SQL Copy karo</button></div>`;
    }
}
const loadAdminGoldTab=loadAdminGoldProducts;

function _renderGoldAdminUI(container){
    const all=_goldAdminProducts;
    container.innerHTML=`
    <div class="p-4 rounded-xl mb-4" style="background:linear-gradient(135deg,#1a0800,#3d2c00);">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3"><span style="font-size:2rem">⭐</span><div><div class="font-black" style="background:linear-gradient(135deg,#C9A84C,#F5E6C0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:1rem;">OutfitKart Gold</div><div style="color:rgba(245,230,192,0.6);font-size:11px;">${all.length} products</div></div></div>
            <div class="flex gap-2">
                <button onclick="_openGoldForm(null)" class="flex items-center gap-2 px-3 py-2 rounded-xl font-black text-sm active:scale-95" style="background:linear-gradient(135deg,#C9A84C,#B8860B);color:#1a0800;"><i class="fas fa-plus text-xs"></i> Add Gold</button>
                <button onclick="copyGoldSQL()" class="text-xs px-3 py-2 rounded-xl font-bold" style="background:rgba(201,168,76,0.2);color:#C9A84C;border:1px solid #C9A84C;">SQL</button>
            </div>
        </div>
    </div>
    <div id="gold-form-panel" class="hidden mb-4"></div>
    <div class="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
        <button onclick="_gFilter('all')" class="gf-btn text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap" style="background:linear-gradient(135deg,#C9A84C,#B8860B);color:#1a0800;">All (${all.length})</button>
        <button onclick="_gFilter('Men')" class="gf-btn text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap bg-white border border-gray-200 text-gray-700">Men</button>
        <button onclick="_gFilter('Women')" class="gf-btn text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap bg-white border border-gray-200 text-gray-700">Women</button>
        <button onclick="_gFilter('inactive')" class="gf-btn text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap bg-white border border-gray-200 text-gray-500">Inactive</button>
    </div>
    <div id="gold-admin-product-list" class="space-y-2">${all.length?all.map(_goldAdminRow).join(''):`<div class="text-center py-12" style="color:#B8860B;"><span style="font-size:3rem;">⭐</span><p class="font-bold mt-3">Koi Gold product nahi mila</p><p class="text-sm text-gray-400 mt-1">Upar + Add Gold button se products add karo</p></div>`}</div>`;
}

function _goldAdminRow(p){
    const img=(p.imgs||[])[0]||p.img||'https://placehold.co/48x48/eee/666?text=?';
    const active=p.is_active!==false;const safeName=(p.name||'').replace(/'/g,"\\'");
    const desc=p.description||p.desc||'';
    return `<div class="flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all gold-adm-row" data-cat="${p.category||''}" data-active="${active}">
        <img src="${img}" class="w-12 h-14 rounded-lg object-cover border flex-shrink-0" loading="lazy" onerror="this.src='https://placehold.co/48x56/eee/666?text=?'">
        <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-800 truncate flex items-center gap-1"><span style="color:#B8860B;font-size:11px;">⭐</span> ${p.name}</div>
            <div class="text-xs text-gray-500">${p.category||'—'} › ${p.sub||'—'} • ₹${p.price}${p.oldprice?` <span class="line-through text-red-400">₹${p.oldprice}</span>`:''}</div>
            ${p.supplier_url?`<a href="${p.supplier_url}" target="_blank" rel="noopener" class="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt text-[8px]"></i> Supplier</a>`:''}
            <div class="text-[10px] text-blue-500">${(p.available_sizes||[]).join(', ')||'—'}</div>
        </div>
        <div class="flex flex-col gap-1.5 flex-shrink-0">
            <button onclick="_openGoldForm(${p.id})" class="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-100"><i class="fas fa-edit mr-1"></i>Edit</button>
            <button onclick="_toggleGoldActive(${p.id},${!active})" class="text-xs px-2.5 py-1 rounded-lg font-bold border ${active?'bg-green-50 text-green-700 border-green-200':'bg-gray-50 text-gray-500 border-gray-200'}">${active?'Active':'Inactive'}</button>
            <button onclick="_deleteGoldProduct(${p.id},'${safeName}')" class="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-bold hover:bg-red-100"><i class="fas fa-trash-alt mr-1"></i>Del</button>
        </div>
    </div>`;
}

function _gFilter(type){
    document.querySelectorAll('.gold-adm-row').forEach(row=>{let show=true;if(type==='Men')show=row.dataset.cat==='Men';if(type==='Women')show=row.dataset.cat==='Women';if(type==='inactive')show=row.dataset.active==='false';row.style.display=show?'':'none';});
    document.querySelectorAll('.gf-btn').forEach(btn=>{const isActive=btn.getAttribute('onclick')?.includes(`'${type}'`);btn.style.background=isActive?'linear-gradient(135deg,#C9A84C,#B8860B)':'white';btn.style.color=isActive?'#1a0800':'#374151';btn.style.border=isActive?'none':'1px solid #e5e7eb';});
}

function _openGoldForm(id){
    _goldEditId=id;const p=id?_goldAdminProducts.find(x=>x.id===id):null;
    const panel=document.getElementById('gold-form-panel');if(!panel)return;
    const sizes=p?.available_sizes||[];const imgs=p?.imgs||(p?.img?[p.img]:[]);
    // Use description field (not desc)
    const description=p?.description||p?.desc||'';
    const supplierPrice=p?.supplier_price||'';const supplierUrl=p?.supplier_url||'';
    const marginAmt=p?.margin_amt||0;
    panel.className='mb-4 bg-white border-2 rounded-2xl p-4 shadow-lg';panel.style.borderColor='#C9A84C';
    panel.innerHTML=`
    <div class="flex items-center justify-between mb-4">
        <h3 class="font-black text-base" style="color:#B8860B;">${id?'✏️ Edit Gold Product':'➕ Add Gold Product'}</h3>
        <button onclick="_closeGoldForm()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 font-bold text-sm">✕</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2"><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Product Name *</label><input id="gf-name" value="${p?.name||''}" placeholder="Gold product ka naam" required class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Category *</label><select id="gf-category" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-amber-400 outline-none"><option value="Men" ${(p?.category||'Men')==='Men'?'selected':''}>👔 Men</option><option value="Women" ${p?.category==='Women'?'selected':''}>👗 Women</option></select></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Sub Category *</label><select id="gf-sub" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-amber-400 outline-none"><option value="Topwear" ${(p?.sub||'Topwear')==='Topwear'?'selected':''}>👕 Topwear</option><option value="Bottomwear" ${p?.sub==='Bottomwear'?'selected':''}>👖 Bottomwear</option><option value="Footwear" ${p?.sub==='Footwear'?'selected':''}>👟 Footwear</option></select></div>

        <!-- Supplier Price + Margin = Selling Price auto-calc -->
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Supplier Price ₹ *</label><input id="gf-supplier-price" type="number" value="${supplierPrice}" placeholder="Cost price" oninput="_goldCalcPrice()" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Margin % <span class="text-[9px] text-gray-400">(auto-calc selling price)</span></label><input id="gf-margin-pct" type="range" min="0" max="150" value="30" oninput="_goldCalcPrice()" class="w-full mb-1"><input id="gf-margin-pct-num" type="number" value="30" min="0" placeholder="30" oninput="document.getElementById('gf-margin-pct').value=this.value;_goldCalcPrice()" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div id="gf-price-preview" class="md:col-span-2 grid grid-cols-3 gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 hidden">
            <div class="text-center"><div class="text-[10px] font-black text-amber-700 uppercase mb-1">Selling Price</div><div id="gf-selling-preview" class="text-xl font-black text-amber-800">₹0</div></div>
            <div class="text-center"><div class="text-[10px] font-black text-green-700 uppercase mb-1">Margin Amt</div><div id="gf-margin-preview" class="text-xl font-black text-green-700">₹0</div></div>
            <div class="text-center"><div class="text-[10px] font-black text-gray-500 uppercase mb-1">MRP (1.4x)</div><div id="gf-mrp-preview" class="text-xl font-black text-gray-600">₹0</div></div>
        </div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Selling Price ₹ *</label><input id="gf-price" type="number" value="${p?.price||''}" placeholder="Auto-calculated" required class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">MRP (Strike-through)</label><input id="gf-oldprice" type="number" value="${p?.oldprice||''}" placeholder="Strike-through price" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Brand</label><input id="gf-brand" value="${p?.brand||''}" placeholder="Brand name" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Stock Qty</label><input id="gf-stock" type="number" value="${p?.stock_qty||50}" placeholder="50" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div class="md:col-span-2"><label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Supplier URL (order panel mein link aayega)</label><input id="gf-supplier-url" value="${supplierUrl}" placeholder="https://meesho.com/... ya amazon link" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none"></div>
        <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-1"><label class="block text-[10px] font-black text-gray-400 uppercase">Description</label><button type="button" onclick="_autoGenGoldDesc()" class="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 font-bold hover:bg-purple-200">✨ Auto Generate</button></div>
            <textarea id="gf-desc" rows="3" placeholder="Product ki premium description..." class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-amber-400 outline-none resize-none">${description}</textarea>
        </div>
        <!-- Images with ImgBB Upload -->
        <div class="md:col-span-2">
            <label class="block text-[10px] font-black text-gray-400 uppercase mb-1">Product Images</label>
            <div class="flex items-center gap-2 mb-2">
                <label class="cursor-pointer bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 active:scale-95 flex items-center gap-1">
                    <i class="fas fa-upload"></i> Upload via ImgBB
                    <input type="file" accept="image/*" multiple class="hidden" onchange="uploadToImgBB(event,'gf-imgs')">
                </label>
                <div class="upload-status text-xs font-bold text-rose-500 hidden"><i class="fas fa-spinner fa-spin mr-1"></i>Uploading...</div>
            </div>
            <textarea id="gf-imgs" rows="2" placeholder="https://... (ek line mein ek URL)" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono text-xs focus:ring-2 focus:ring-amber-400 outline-none resize-none">${imgs.join('\n')}</textarea>
        </div>
        <!-- Sizes -->
        <div class="md:col-span-2">
            <label class="block text-[10px] font-black text-gray-400 uppercase mb-2">Available Sizes</label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div class="border rounded-xl p-2.5 bg-gray-50"><div class="text-[9px] font-black text-gray-500 uppercase text-center mb-1.5">Clothing</div><div class="grid grid-cols-4 gap-1 text-[10px]">${['XS','S','M','L','XL','XXL','3XL','4XL'].map(s=>`<label class="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" value="${s}" class="gold-size-chk" ${sizes.includes(s)?'checked':''}> ${s}</label>`).join('')}</div></div>
                <div class="border rounded-xl p-2.5 bg-blue-50"><div class="text-[9px] font-black text-blue-600 uppercase text-center mb-1.5">Pants</div><div class="grid grid-cols-3 gap-1 text-[10px]">${['28','30','32','34','36','38','40'].map(s=>`<label class="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" value="${s}" class="gold-size-chk" ${sizes.includes(s)?'checked':''}> ${s}</label>`).join('')}</div></div>
                <div class="border rounded-xl p-2.5 bg-green-50"><div class="text-[9px] font-black text-green-600 uppercase text-center mb-1.5">Footwear</div><div class="grid grid-cols-3 gap-1 text-[10px]">${['6','7','8','9','10','11','12'].map(s=>`<label class="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" value="${s}" class="gold-size-chk" ${sizes.includes(s)?'checked':''}> ${s}</label>`).join('')}</div></div>
                <div class="border rounded-xl p-2.5 bg-purple-50 flex items-center justify-center"><label class="flex flex-col items-center gap-1 cursor-pointer"><input type="checkbox" value="Free Size" class="gold-size-chk w-4 h-4" ${sizes.includes('Free Size')?'checked':''}><span class="text-xs font-bold text-purple-700 text-center">Free Size</span></label></div>
            </div>
        </div>
        <div class="md:col-span-2 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <input type="checkbox" id="gf-trending" ${p?.istrending?'checked':''} class="w-4 h-4 accent-amber-500">
            <label for="gf-trending" class="text-sm font-bold text-amber-800 cursor-pointer">⭐ Trending mein dikhao</label>
        </div>
    </div>
    <div class="flex gap-3 mt-4">
        <button onclick="_saveGoldProduct()" class="flex-1 py-3 rounded-xl font-black text-sm active:scale-95 transition-all shadow-md" style="background:linear-gradient(135deg,#C9A84C,#B8860B);color:#1a0800;"><i class="fas fa-save mr-2"></i>${id?'Save Changes':'Add Gold Product'}</button>
        <button onclick="_closeGoldForm()" class="px-6 py-3 rounded-xl font-bold text-sm border border-gray-300 bg-white hover:bg-gray-50 active:scale-95 transition-all">Cancel</button>
    </div>`;
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    // Trigger price calc if editing
    if(p?.supplier_price)setTimeout(_goldCalcPrice,100);
}

function _goldCalcPrice(){
    const supplier=parseInt(document.getElementById('gf-supplier-price')?.value)||0;
    const marginPct=parseInt(document.getElementById('gf-margin-pct-num')?.value)||0;
    const marginAmt=Math.round(supplier*marginPct/100);const selling=supplier+marginAmt;const mrp=Math.round(selling*1.4);
    const preview=document.getElementById('gf-price-preview');const selPrev=document.getElementById('gf-selling-preview');const marPrev=document.getElementById('gf-margin-preview');const mrpPrev=document.getElementById('gf-mrp-preview');const priceField=document.getElementById('gf-price');const oldpriceField=document.getElementById('gf-oldprice');
    if(preview)preview.classList.toggle('hidden',selling===0);
    if(selPrev)selPrev.textContent=`₹${selling.toLocaleString()}`;if(marPrev)marPrev.textContent=`₹${marginAmt.toLocaleString()}`;if(mrpPrev)mrpPrev.textContent=`₹${mrp.toLocaleString()}`;
    if(priceField&&selling>0)priceField.value=selling;if(oldpriceField&&selling>0&&!oldpriceField.value)oldpriceField.value=mrp;
    // Sync range slider
    const rangeEl=document.getElementById('gf-margin-pct');if(rangeEl)rangeEl.value=marginPct;
}

function _autoGenGoldDesc(){
    const name=document.getElementById('gf-name')?.value;if(!name)return showToast('Product Name pehle daalo');
    const cat=document.getElementById('gf-category')?.value||'';const sub=document.getElementById('gf-sub')?.value||'';
    document.getElementById('gf-desc').value=`✨ Premium ${name} — Exclusively available in OutfitKart Gold Collection. Crafted from the finest materials, this ${sub||cat} piece combines luxury with everyday comfort. Whether you're dressing up for a special occasion or elevating your everyday style, this piece delivers unmatched elegance. Limited edition — order now before stock runs out! 🌟`;
}

function _closeGoldForm(){_goldEditId=null;const panel=document.getElementById('gold-form-panel');if(panel){panel.className='hidden mb-4';panel.innerHTML='';}}

async function _saveGoldProduct(){
    const name=document.getElementById('gf-name')?.value.trim();const price=parseFloat(document.getElementById('gf-price')?.value);const category=document.getElementById('gf-category')?.value;const sub=document.getElementById('gf-sub')?.value;
    if(!name)return showToast('Product name required!');if(!price||isNaN(price))return showToast('Valid price required!');
    const imgsRaw=document.getElementById('gf-imgs')?.value||'';const imgs=imgsRaw.split('\n').map(s=>s.trim()).filter(Boolean);
    const sizes=[...document.querySelectorAll('.gold-size-chk:checked')].map(c=>c.value);
    const supplierPrice=parseFloat(document.getElementById('gf-supplier-price')?.value)||null;
    const marginPct=parseInt(document.getElementById('gf-margin-pct-num')?.value)||0;
    const marginAmt=supplierPrice?Math.round(supplierPrice*marginPct/100):0;
    // Save as 'description' column (not 'desc')
    const payload={name,price,oldprice:parseFloat(document.getElementById('gf-oldprice')?.value)||null,category,sub,brand:document.getElementById('gf-brand')?.value.trim()||null,description:document.getElementById('gf-desc')?.value.trim()||null,imgs,img:imgs[0]||null,available_sizes:sizes,stock_qty:parseInt(document.getElementById('gf-stock')?.value)||50,supplier_price:supplierPrice,supplier_url:document.getElementById('gf-supplier-url')?.value.trim()||null,margin_amt:marginAmt,istrending:document.getElementById('gf-trending')?.checked||false,is_active:true};
    try{
        let savedData;
        if(_goldEditId){const{data,error}=await dbClient.from('gold_products').update(payload).eq('id',_goldEditId).select().single();if(error)throw error;savedData=data;const idx=_goldAdminProducts.findIndex(p=>p.id===_goldEditId);if(idx>-1)_goldAdminProducts[idx]=savedData;showToast('✅ Gold product updated!');}
        else{const{data,error}=await dbClient.from('gold_products').insert([payload]).select().single();if(error)throw error;savedData=data;_goldAdminProducts.unshift(savedData);showToast('⭐ Gold product added!');}
        // Update frontend goldProducts array
        if(typeof goldProducts!=='undefined'){if(_goldEditId){const gi=goldProducts.findIndex(p=>p.id===_goldEditId);if(gi>-1)goldProducts[gi]={...savedData,desc:savedData.description||''};else goldProducts.unshift({...savedData,desc:savedData.description||''});}else{goldProducts.unshift({...savedData,desc:savedData.description||''});}}
        _closeGoldForm();_renderGoldAdminUI(document.getElementById('admin-gold-list'));
    }catch(err){showToast('❌ Error: '+err.message);}
}

async function _toggleGoldActive(id,isActive){
    try{const{error}=await dbClient.from('gold_products').update({is_active:isActive}).eq('id',id);if(error)throw error;const idx=_goldAdminProducts.findIndex(p=>p.id===id);if(idx>-1)_goldAdminProducts[idx].is_active=isActive;showToast(isActive?'✅ Active kar diya':'🔴 Inactive kar diya');_renderGoldAdminUI(document.getElementById('admin-gold-list'));}
    catch(err){showToast('❌ '+err.message);}
}
async function _deleteGoldProduct(id,name){
    if(!confirm(`"${name}" Gold se delete karo?`))return;
    try{const{error}=await dbClient.from('gold_products').delete().eq('id',id);if(error)throw error;_goldAdminProducts=_goldAdminProducts.filter(p=>p.id!==id);if(typeof goldProducts!=='undefined'){const gi=goldProducts.findIndex(p=>p.id===id);if(gi>-1)goldProducts.splice(gi,1);}showToast('🗑️ Gold product deleted');_renderGoldAdminUI(document.getElementById('admin-gold-list'));}
    catch(err){showToast('❌ '+err.message);}
}

function copyGoldSQL(){
    const sql=`-- OutfitKart Gold (Run in Supabase SQL Editor):
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
CREATE POLICY "admin_write" ON public.gold_products FOR ALL USING (true) WITH CHECK (true);`;
    navigator.clipboard.writeText(sql).then(()=>showToast('✅ Gold SQL copied!')).catch(()=>{const ta=document.createElement('textarea');ta.value=sql;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('✅ SQL copied!');});
}

/* ============================================================
   EXPORTS
   ============================================================ */
Object.assign(window,{
    showAdminLogin,closeAdminLogin,handleAdminLogin,updateAdminNameInHeader,loadAdminDashboard,adminLogout,exitAdmin,
    switchAdminTab,toggleAdminSidebar,
    renderAdminDashboard,_renderDashboardCharts,
    updateDropdownSubs,updateSizeSection,toggleProductMode,updateSellingPreview,autoGenerateDescription,
    adminAddProduct,renderAdminProducts,openEditProduct,closeEditModal,updateProduct,deleteProduct,addCustomMlVolume,
    loadAllOrdersAdmin,filterAdminOrders,renderFilteredOrders,updateOrderStatus,
    loadAllUsersAdmin,
    loadAllWithdrawalsAdmin,filterPayouts,approvePayout,rejectPayout,
    loadAdminReferrals,adminFilterReferrals,renderAdminReferralList,adminConfirmReferral,
    loadAdminInfluencerRequests,approveInfluencer,rejectInfluencer,
    sendAdminNotification,searchProductsForNotif,selectNotifProduct,_updateNotifPreview,_clearNotifFields,showPushSetupGuide,
    // Gold
    loadAdminGoldProducts,loadAdminGoldTab,_openGoldForm,_closeGoldForm,_saveGoldProduct,_toggleGoldActive,_deleteGoldProduct,_gFilter,copyGoldSQL,_goldCalcPrice,_autoGenGoldDesc,
    // Promo
    loadAdminPromoCodes,createPromoCode,sharePromoToTelegram,sharePromoToWhatsApp,disablePromoCode,copyPromoSQL,
});
