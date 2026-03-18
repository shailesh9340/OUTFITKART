'use strict';

/* ============================================================
   OutfitKart — Node.js Backend Server
   Run: node server.js
   Install: npm install express cors node-fetch multer razorpay @supabase/supabase-js node-cron form-data
   ============================================================ */

/* ── HARDCODED CONFIG ─────────────────────────────────────── */
const PORT               = 3000;
const SUPABASE_URL       = 'https://wlgytgwmmefwpljstque.supabase.co';
const SUPABASE_KEY       = 'sb_publishable_fFampYvNGSn7TE0TOy56dQ_xXrer_P8';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZ3l0Z3dtbWVmd3BsanN0cXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzNTY3MSwiZXhwIjoyMDg4OTExNjcxfQ.MJ1CYOtgEbJClXHzKOElHg2CcdcoDLP7nKJSNU_sFAg';
const RAZORPAY_KEY_ID    = 'rzp_live_SSnlkbwQnRuvjP';
const RAZORPAY_KEY_SECRET = 'DcJHf5lNoszO78k7bMoZ7j5v'; 
const IMGBB_KEY          = '3949e4873d8510691ee63026d22eeb75';
const SCRAPINGBEE_KEY    = 'BCR4ZMY5YAQGN1PM8HGEWBV52QGL1R4YRX58YTCP52G23H89YSVVE6S65PO2D5T56RVBITJQKCDBK4ZN';
const SUPPORT_WA         = '918982296773';
const SUPPORT_EMAIL      = 'shaileshkumarchauhan9340@gmail.com';
const ADMIN_TOKENS       = ['shailesh_admin_token', 'aman_admin_token'];

/* ── REQUIRES ─────────────────────────────────────────────── */
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const cron     = require('node-cron');
const FormData = require('form-data');

/* ── APP INIT ─────────────────────────────────────────────── */
const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','apikey']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* Static files — frontend public folder se serve hoga */
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json'))
            res.setHeader('Cache-Control', 'no-cache');
    }
}));

/* ── ADMIN AUTH MIDDLEWARE ────────────────────────────────── */
function requireAdmin(req, res, next) {
    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (!ADMIN_TOKENS.includes(auth)) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

/* ── DYNAMIC IMPORTS & SERVER START ──────────────────────── */
let fetch;
let supabase;
let Razorpay;
let multer;

async function init() {
    /* node-fetch v3 is ESM-only */
    const fetchModule = await import('node-fetch').catch(() => null);
    fetch = fetchModule ? fetchModule.default : globalThis.fetch;

    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    Razorpay = require('razorpay');
    multer   = require('multer');

    registerRoutes();
    startCrons();

    app.listen(PORT, () => {
        console.log(`\n🚀 OutfitKart Server running → http://localhost:${PORT}`);
        console.log(`📊 Health check → http://localhost:${PORT}/api/health\n`);
    });
}

/* ============================================================
   ALL ROUTES
   ============================================================ */
function registerRoutes() {

    /* ──────────────────────────────────────────────────────
       HEALTH CHECK
       ────────────────────────────────────────────────────── */
    app.get('/api/health', (req, res) => {
        res.json({
            status:    'ok',
            timestamp: new Date().toISOString(),
            service:   'OutfitKart API',
            version:   '2.0.0'
        });
    });

    /* ──────────────────────────────────────────────────────
       PRODUCTS
       ────────────────────────────────────────────────────── */
    app.get('/api/products', async (req, res) => {
        try {
            const { data, error } = await supabase.from('products').select('*');
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data, count: data.length });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.get('/api/products/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
            if (error) return res.status(404).json({ error: 'Product not found' });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/products', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('products').insert([req.body]).select().single();
            if (error) return res.status(400).json({ error: error.message });
            res.status(201).json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.patch('/api/products/:id', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single();
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.delete('/api/products/:id', requireAdmin, async (req, res) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', req.params.id);
            if (error) return res.status(400).json({ error: error.message });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       ORDERS
       ────────────────────────────────────────────────────── */
    app.get('/api/orders', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data, count: data.length });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.get('/api/orders/user/:mobile', async (req, res) => {
        try {
            const { data, error } = await supabase.from('orders').select('*').eq('mobile', req.params.mobile).order('date', { ascending: false });
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
        try {
            const { status, refund_upi } = req.body;
            const payload = { status };
            if (refund_upi) payload.refund_upi = refund_upi;
            const { data, error } = await supabase.from('orders').update(payload).eq('id', req.params.id).select().single();
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       USERS
       ────────────────────────────────────────────────────── */
    app.get('/api/users', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('users').select('*').order('mobile', { ascending: false });
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data, count: data.length });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.get('/api/users/:mobile', async (req, res) => {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('mobile', req.params.mobile).maybeSingle();
            if (error) return res.status(400).json({ error: error.message });
            if (!data)  return res.status(404).json({ error: 'User not found' });
            const { password: _, ...safeUser } = data;
            res.json({ data: safeUser });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.patch('/api/users/:mobile', async (req, res) => {
        try {
            const { password: _, ...updates } = req.body;
            const { data, error } = await supabase.from('users').update(updates).eq('mobile', req.params.mobile).select().single();
            if (error) return res.status(400).json({ error: error.message });
            const { password: __, ...safeUser } = data;
            res.json({ data: safeUser });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.patch('/api/users/:mobile/wallet', async (req, res) => {
        try {
            const { wallet } = req.body;
            if (typeof wallet !== 'number') return res.status(400).json({ error: 'wallet must be a number' });
            const { data, error } = await supabase.from('users').update({ wallet }).eq('mobile', req.params.mobile).select('mobile, name, wallet').single();
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       RAZORPAY PAYMENT
       ────────────────────────────────────────────────────── */
    app.post('/api/payment/create-order', async (req, res) => {
        try {
            const { amount, currency = 'INR', notes = {} } = req.body;
            if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
            const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
            const order = await rzp.orders.create({
                amount:   Math.round(amount * 100),
                currency,
                receipt:  'receipt_' + Date.now(),
                notes
            });
            res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/payment/verify', (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            const expected = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');
            if (expected === razorpay_signature) res.json({ verified: true });
            else res.status(400).json({ verified: false, error: 'Signature mismatch' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), (req, res) => {
        try {
            const sig      = req.headers['x-razorpay-signature'];
            const body     = req.body.toString();
            const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
            if (expected !== sig) return res.status(400).json({ error: 'Invalid signature' });
            const event = JSON.parse(body);
            console.log('[Webhook]', event.event);
            if (event.event === 'payment.captured') {
                const p = event.payload.payment.entity;
                console.log(`[Webhook] Payment captured ₹${p.amount / 100} | ID: ${p.id}`);
            }
            res.json({ received: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       IMGBB IMAGE UPLOAD
       ────────────────────────────────────────────────────── */
    const upload = multer({
        storage: multer.memoryStorage(),
        limits:  { fileSize: 32 * 1024 * 1024 }
    });

    app.post('/api/upload/image', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file provided' });
            const base64 = req.file.buffer.toString('base64');
            const fd = new FormData();
            fd.append('image', base64);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                method: 'POST', body: fd, headers: fd.getHeaders()
            });
            const data = await response.json();
            if (data.success) res.json({ success: true, url: data.data.url, thumb: data.data.thumb?.url });
            else res.status(400).json({ success: false, error: 'Upload failed' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/upload/url', async (req, res) => {
        try {
            const { image_url } = req.body;
            if (!image_url) return res.status(400).json({ error: 'image_url required' });
            const fd = new FormData();
            fd.append('image', image_url);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                method: 'POST', body: fd, headers: fd.getHeaders()
            });
            const data = await response.json();
            if (data.success) res.json({ success: true, url: data.data.url });
            else res.status(400).json({ success: false, error: 'ImgBB upload failed' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       SCRAPINGBEE PROXY
       ────────────────────────────────────────────────────── */
    app.post('/api/scrape', async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'url required' });
            const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=in`;
            const response = await fetch(apiUrl);
            if (!response.ok) return res.status(400).json({ error: `ScrapingBee: ${response.status}` });
            const html = await response.text();
            res.json({ html, url });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       PINCODE LOOKUP
       ────────────────────────────────────────────────────── */
    app.get('/api/pincode/:pin', async (req, res) => {
        try {
            const { pin } = req.params;
            if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'Invalid pincode' });
            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const data = await response.json();
            res.json(data);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       REFERRALS
       ────────────────────────────────────────────────────── */
    app.get('/api/referrals/:mobile', async (req, res) => {
        try {
            const { data, error } = await supabase.from('referrals').select('*')
                .eq('referrer_mobile', req.params.mobile)
                .order('created_at', { ascending: false });
            if (error) return res.status(400).json({ error: error.message });
            const pending   = data.filter(r => r.status === 'pending');
            const confirmed = data.filter(r => r.status === 'confirmed');
            const cancelled = data.filter(r => r.status === 'cancelled');
            res.json({
                data,
                summary: {
                    pending_count:    pending.length,
                    confirmed_count:  confirmed.length,
                    cancelled_count:  cancelled.length,
                    pending_amount:   pending.reduce((s,r)   => s+(r.commission||0), 0),
                    confirmed_amount: confirmed.reduce((s,r) => s+(r.commission||0), 0),
                    cancelled_amount: cancelled.reduce((s,r) => s+(r.commission||0), 0),
                }
            });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/referrals/confirm/:id', requireAdmin, async (req, res) => {
        try {
            const { data: ref, error } = await supabase.from('referrals').select('*').eq('id', req.params.id).single();
            if (error || !ref) return res.status(404).json({ error: 'Referral not found' });
            if (ref.status === 'confirmed') return res.status(400).json({ error: 'Already confirmed' });
            await supabase.from('referrals').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', req.params.id);
            const { data: user } = await supabase.from('users').select('wallet').eq('mobile', ref.referrer_mobile).maybeSingle();
            if (user) {
                const newWallet = (user.wallet || 0) + (ref.commission || 0);
                await supabase.from('users').update({ wallet: newWallet }).eq('mobile', ref.referrer_mobile);
            }
            res.json({ success: true, commission: ref.commission, referrer: ref.referrer_mobile });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       WITHDRAWALS
       ────────────────────────────────────────────────────── */
    app.get('/api/withdrawals', requireAdmin, async (req, res) => {
        try {
            const status = req.query.status || 'Pending';
            const query = status === 'all'
                ? supabase.from('withdrawals').select('*').order('created_at', { ascending: false })
                : supabase.from('withdrawals').select('*').eq('status', status).order('created_at', { ascending: false });
            const { data, error } = await query;
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data, count: data.length });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.patch('/api/withdrawals/:id/approve', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('withdrawals')
                .update({ status: 'Paid', paid_at: new Date().toISOString() })
                .eq('id', req.params.id).select().single();
            if (error) return res.status(400).json({ error: error.message });
            res.json({ data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       ADMIN STATS
       ────────────────────────────────────────────────────── */
    app.get('/api/admin/stats', requireAdmin, async (req, res) => {
        try {
            const [ordersRes, usersRes, productsRes, referralsRes] = await Promise.all([
                supabase.from('orders').select('id, total, margin_total, status'),
                supabase.from('users').select('mobile, wallet'),
                supabase.from('products').select('id', { count: 'exact' }),
                supabase.from('referrals').select('id, commission, status'),
            ]);
            const orders    = ordersRes.data  || [];
            const users     = usersRes.data   || [];
            const products  = productsRes.data || [];
            const referrals = referralsRes.data || [];
            const active    = orders.filter(o => o.status !== 'Cancelled');
            const cancelled = orders.filter(o => o.status === 'Cancelled');
            const revenue   = active.reduce((s,o) => s+(o.total||0), 0);
            const profit    = active.reduce((s,o) => s+(o.margin_total||0), 0);
            res.json({
                totalRevenue:            revenue,
                totalProfit:             profit,
                totalOrders:             orders.length,
                activeOrders:            active.length,
                cancelledOrders:         cancelled.length,
                totalUsers:              users.length,
                totalProducts:           products.length,
                avgOrderValue:           active.length ? Math.round(revenue / active.length) : 0,
                totalWallet:             users.reduce((s,u) => s+(u.wallet||0), 0),
                pendingReferrals:        referrals.filter(r => r.status === 'pending').length,
                confirmedReferralAmount: referrals.filter(r => r.status === 'confirmed').reduce((s,r) => s+(r.commission||0), 0),
            });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    /* ──────────────────────────────────────────────────────
       CATCH ALL — SPA (index.html serve karo)
       ────────────────────────────────────────────────────── */
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
            if (err) res.status(404).json({ error: 'Not found' });
        });
    });
}

/* ============================================================
   CRON JOBS
   ============================================================ */
function startCrons() {

    /* Referral auto-confirm — har roz raat 2 baje */
    cron.schedule('0 2 * * *', async () => {
        console.log('[Cron] Referral auto-confirm running...');
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: pending } = await supabase.from('referrals')
                .select('*').eq('status', 'pending').lt('created_at', thirtyDaysAgo);
            if (!pending?.length) { console.log('[Cron] No referrals to confirm.'); return; }
            let confirmed = 0;
            for (const ref of pending) {
                try {
                    const { data: order } = await supabase.from('orders').select('status').eq('id', ref.order_id).maybeSingle();
                    if (order?.status === 'Cancelled') {
                        await supabase.from('referrals').update({ status: 'cancelled' }).eq('id', ref.id);
                        continue;
                    }
                    await supabase.from('referrals').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', ref.id);
                    const { data: user } = await supabase.from('users').select('wallet').eq('mobile', ref.referrer_mobile).maybeSingle();
                    if (user) {
                        await supabase.from('users').update({ wallet: (user.wallet||0) + (ref.commission||0) }).eq('mobile', ref.referrer_mobile);
                        console.log(`[Cron] ✅ ₹${ref.commission} credited → +91 ${ref.referrer_mobile}`);
                    }
                    confirmed++;
                } catch (e) { console.error(`[Cron] Referral ${ref.id} error:`, e.message); }
            }
            console.log(`[Cron] Done — ${confirmed} referrals confirmed.`);
        } catch (err) { console.error('[Cron] Fatal error:', err.message); }
    });

    /* Daily revenue report — subah 8 baje */
    cron.schedule('0 8 * * *', async () => {
        try {
            const today = new Date().toLocaleDateString('en-IN');
            const { data: orders } = await supabase.from('orders').select('total, margin_total, status').eq('date', today);
            const active = (orders||[]).filter(o => o.status !== 'Cancelled');
            const rev    = active.reduce((s,o) => s+(o.total||0), 0);
            const profit = active.reduce((s,o) => s+(o.margin_total||0), 0);
            console.log(`\n📈 Daily Report — ${today}`);
            console.log(`   Orders: ${active.length} | Revenue: ₹${rev.toLocaleString('en-IN')} | Profit: ₹${profit.toLocaleString('en-IN')}\n`);
        } catch (err) { console.error('[Cron] Daily report error:', err.message); }
    });
}

/* ── GRACEFUL SHUTDOWN ────────────────────────────────────── */
process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0); });
process.on('SIGINT',  () => { console.log('Shutting down...'); process.exit(0); });

/* ── START SERVER ─────────────────────────────────────────── */
init().catch(console.error);
