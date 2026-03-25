// =============================================
// نظام إدارة عروض الأسعار - Frontend App V3
// Arabic RTL Quote Management System
// =============================================
const App = {
  token: null, user: null, authMode: 'login',
  supabaseUrl: '', supabaseKey: '',

  // ---- PDF Template Settings (stored in localStorage) ----
  defaultPdfSettings: {
    companyName: 'اسم الشركة / المكتب',
    companyNameEn: 'Company Name',
    companyAddress: 'المملكة العربية السعودية',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyCR: '',  // السجل التجاري
    companyVAT: '', // الرقم الضريبي
    logoUrl: '',    // رابط الشعار
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    showVAT: true,
    vatRate: 15,
    currency: 'ر.س',
    currencyEn: 'SAR',
    termsAndConditions: [
      'هذا العرض صالح للمدة المحددة من تاريخ الإصدار.',
      'الأسعار المذكورة بالريال السعودي ولا تشمل ضريبة القيمة المضافة ما لم يُذكر خلاف ذلك.',
      'يبدأ العمل بعد الموافقة على العرض واستلام الدفعة المقدمة.',
      'يحق للطرفين إنهاء الاتفاقية بإشعار كتابي مسبق مدته 30 يوماً.',
      'جميع الحقوق الفكرية للمخرجات تنتقل للعميل بعد السداد الكامل.'
    ],
    paymentTerms: [
      '50% دفعة مقدمة عند التوقيع',
      '50% عند الانتهاء والتسليم'
    ],
    footerText: 'شكراً لثقتكم بنا - نتطلع للعمل معكم',
    showSignatureArea: true,
    showPaymentTerms: true,
    showTermsAndConditions: true,
    showCompanyStamp: true,
  },

  getPdfSettings() {
    try {
      const saved = localStorage.getItem('pdfSettings');
      if (saved) return { ...this.defaultPdfSettings, ...JSON.parse(saved) };
    } catch(e) {}
    return { ...this.defaultPdfSettings };
  },

  savePdfSettings(settings) {
    localStorage.setItem('pdfSettings', JSON.stringify(settings));
  },

  init() {
    this.supabaseUrl = window.__SUPABASE_URL__ || '';
    this.supabaseKey = window.__SUPABASE_ANON_KEY__ || '';
    this.token = localStorage.getItem('token');
    try {
      this.user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      this.user = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    if (this.token && this.user) { this.showApp(); } else { this.showLogin(); }
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        const href = link.getAttribute('href');
        if (!href) return;
        if (/^https?:\/\//i.test(href)) return;
        e.preventDefault();
        history.pushState(null, '', href);
        this.route();
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-action');
      if (action === 'create-pdf-template') {
        e.preventDefault();
        this.createNewPdfTemplate();
      }
    });
    window.addEventListener('popstate', () => this.route());
  },

  // ---- Router ----
  route() {
    const rawPath = location.pathname || '/';
    const p = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
    this.updateActiveNav(p);
    if (p === '/' || p === '') this.renderDashboard();
    else if (p === '/clients') this.renderClients();
    else if (p === '/clients/new') this.renderClientForm();
    else if (p.match(/^\/clients\/[\w-]+\/edit$/)) this.renderClientForm(p.split('/')[2]);
    else if (p.match(/^\/clients\/[\w-]+$/)) this.renderClientDetail(p.split('/')[2]);
    else if (p === '/quotes') this.renderQuotes();
    else if (p === '/quotes/new') this.renderQuoteForm();
    else if (p.match(/^\/quotes\/[\w-]+\/edit$/)) this.renderQuoteEditForm(p.split('/')[2]);
    else if (p.match(/^\/quotes\/[\w-]+$/)) this.renderQuoteDetail(p.split('/')[2]);
    else if (p === '/kanban') this.renderKanban();
    else if (p === '/templates') this.renderTemplates();
    else if (p === '/templates/new') this.renderTemplateForm();
    else if (p.match(/^\/templates\/[\w-]+\/edit$/)) this.renderTemplateForm(p.split('/')[2]);
    else if (p === '/quote-template') this.renderQuoteTemplateManager();
    else if (p === '/projects') this.renderProjects();
    else if (p.match(/^\/projects\/[\w-]+$/)) this.renderProjectDetail(p.split('/')[2]);
    else if (p === '/reports') this.renderReports();
    else if (p === '/settings') this.renderPdfSettings();
    else this.setContent('<div class="text-center py-20"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-exclamation text-2xl text-gray-400"></i></div><h2 class="text-xl text-gray-400">الصفحة غير موجودة</h2><a href="/" data-link class="text-primary-600 text-sm mt-2 inline-block">العودة للرئيسية</a></div>');
  },

  updateActiveNav(path) {
    document.querySelectorAll('.nav-link').forEach(l => {
      const h = l.getAttribute('href');
      const active = (h === '/' && path === '/') || (h !== '/' && path.startsWith(h));
      l.classList.toggle('text-primary-600', active);
      l.classList.toggle('bg-primary-50', active);
      l.classList.toggle('text-gray-600', !active);
    });
  },

  // ---- API & UI Helpers ----
  async api(method, url, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const opts = { method, headers, signal: controller.signal };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (res.status === 401) { this.logout(); throw new Error('غير مصرح'); }
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('انتهت مهلة الاتصال بالخادم، حاول التحديث مرة أخرى');
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  setContent(html) { document.getElementById('main-content').innerHTML = html; },
  showLoading() { this.setContent('<div class="flex items-center justify-center min-h-[40vh]"><div class="spinner"></div></div>'); },

  toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-amber-500' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm fade-in max-w-sm`;
    t.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3500);
  },

  showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); },

  fmtCurrency(a) { return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(a || 0); },
  fmtDate(d) { if (!d) return '-'; return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d)); },
  fmtDateShort(d) { if (!d) return '-'; return new Intl.DateTimeFormat('ar-SA', { month: 'numeric', day: 'numeric' }).format(new Date(d)); },
  fmtDateInput(d) { if (!d) return ''; return d.split('T')[0]; },

  statusBadge(s) {
    const m = { draft:{l:'مسودة',c:'bg-gray-100 text-gray-700',i:'fa-pencil-alt'}, sent:{l:'مُرسل',c:'bg-blue-100 text-blue-700',i:'fa-paper-plane'}, accepted:{l:'مقبول',c:'bg-green-100 text-green-700',i:'fa-check-circle'}, rejected:{l:'مرفوض',c:'bg-red-100 text-red-700',i:'fa-times-circle'}, expired:{l:'منتهي',c:'bg-amber-100 text-amber-700',i:'fa-clock'} };
    const x = m[s] || m.draft;
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${x.c} inline-flex items-center gap-1"><i class="fas ${x.i} text-[10px]"></i>${x.l}</span>`;
  },

  statusLabel(s) { return { draft:'مسودة', sent:'مُرسل', accepted:'مقبول', rejected:'مرفوض', expired:'منتهي' }[s] || s; },

  projectStatusBadge(s) {
    const m = { active:{l:'نشط',c:'bg-green-100 text-green-700'}, on_hold:{l:'معلّق',c:'bg-amber-100 text-amber-700'}, completed:{l:'مكتمل',c:'bg-blue-100 text-blue-700'}, cancelled:{l:'ملغي',c:'bg-red-100 text-red-700'} };
    const x = m[s] || m.active;
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${x.c}">${x.l}</span>`;
  },

  isExpired(d) { return d && new Date(d) < new Date(); },
  isExpiringSoon(d) { if (!d) return false; const diff = (new Date(d) - new Date()) / 86400000; return diff >= 0 && diff <= 7; },
  isFollowupDue(d) { return d && new Date(d) <= new Date(); },

  // ---- Auth ----
  showApp() {
    document.getElementById('navbar').classList.remove('hidden');
    const e = document.getElementById('user-email');
    if (e) e.textContent = this.user?.email || '';
    this.checkAlerts();
    this.route();
  },

  async checkAlerts() {
    try {
      const [followup, expiring] = await Promise.all([
        this.api('GET', '/api/quotes?followup=true'),
        this.api('GET', '/api/quotes?expiring=true'),
      ]);
      const total = followup.length + expiring.length;
      const badge = document.getElementById('alerts-badge');
      if (total > 0 && badge) {
        badge.classList.remove('hidden');
        badge.innerHTML = `<button onclick="App.showAlerts()" class="relative flex h-7 w-7 items-center justify-center" title="${total} تنبيه"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] font-bold items-center justify-center">${total}</span></button>`;
        window._alertsData = { followup, expiring };
      }
    } catch (e) {}
  },

  showAlerts() {
    const d = window._alertsData || {};
    const followup = d.followup || [];
    const expiring = d.expiring || [];
    this.showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-bell ml-2 text-amber-500"></i>التنبيهات</h3>
        ${followup.length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-amber-700 mb-2"><i class="fas fa-phone ml-1"></i> تحتاج متابعة (${followup.length})</h4>
          <div class="space-y-2">${followup.map(q => `
            <div class="flex justify-between items-center text-sm bg-amber-50 rounded-lg p-2.5 cursor-pointer hover:bg-amber-100" onclick="App.closeModal();history.pushState(null,'','/quotes/${q.id}');App.route();">
              <div><span class="font-medium text-gray-800">${q.title}</span><span class="text-gray-400 text-xs mr-2">${q.quote_number}</span></div>
              <span class="text-amber-600 text-xs">${this.fmtDate(q.next_followup_date)}</span>
            </div>`).join('')}</div>
        </div>` : ''}
        ${expiring.length > 0 ? `
        <div>
          <h4 class="text-sm font-semibold text-red-700 mb-2"><i class="fas fa-hourglass-half ml-1"></i> تنتهي قريبًا (${expiring.length})</h4>
          <div class="space-y-2">${expiring.map(q => `
            <div class="flex justify-between items-center text-sm bg-red-50 rounded-lg p-2.5 cursor-pointer hover:bg-red-100" onclick="App.closeModal();history.pushState(null,'','/quotes/${q.id}');App.route();">
              <div><span class="font-medium text-gray-800">${q.title}</span><span class="text-gray-400 text-xs mr-2">${q.quote_number}</span></div>
              <span class="text-red-600 text-xs">${this.fmtDate(q.valid_until)}</span>
            </div>`).join('')}</div>
        </div>` : ''}
        <div class="flex justify-end mt-4"><button onclick="App.closeModal()" class="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">إغلاق</button></div>
      </div>
    `);
  },

  showLogin() {
    document.getElementById('navbar').classList.add('hidden');
    this.setContent(`
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 -m-6 p-6">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md fade-in">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200"><i class="fas fa-file-invoice-dollar text-3xl text-white"></i></div>
            <h1 class="text-2xl font-bold text-gray-800">نظام عروض الأسعار</h1>
            <p class="text-gray-500 mt-1 text-sm">إدارة عروضك بكفاءة واحترافية</p>
          </div>
          <div class="flex mb-6 bg-gray-100 rounded-xl p-1">
            <button onclick="App.switchAuthTab('login')" id="tab-login" class="flex-1 py-2.5 text-sm font-medium rounded-lg bg-white shadow text-primary-600 transition-all">دخول</button>
            <button onclick="App.switchAuthTab('register')" id="tab-register" class="flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all">حساب جديد</button>
          </div>
          <form id="auth-form" onsubmit="App.handleAuth(event)">
            <div id="register-name" class="hidden mb-4"><label class="block text-sm font-medium text-gray-700 mb-1.5">الاسم</label><input type="text" id="auth-name" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="أدخل اسمك الكامل"/></div>
            <div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label><input type="email" id="auth-email" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="example@email.com"/></div>
            <div class="mb-6"><label class="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label><input type="password" id="auth-password" required minlength="6" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="6 أحرف على الأقل"/></div>
            <button type="submit" id="auth-btn" class="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium py-3 rounded-xl text-sm shadow-lg shadow-primary-200 transition-all">تسجيل الدخول</button>
          </form>
          <p id="auth-error" class="mt-4 text-sm text-red-500 text-center hidden"></p>
        </div>
      </div>
    `);
  },

  switchAuthTab(mode) {
    this.authMode = mode;
    document.getElementById('tab-login').className = `flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode==='login'?'bg-white shadow text-primary-600':'text-gray-500'}`;
    document.getElementById('tab-register').className = `flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode==='register'?'bg-white shadow text-primary-600':'text-gray-500'}`;
    document.getElementById('register-name').classList.toggle('hidden', mode==='login');
    document.getElementById('auth-btn').textContent = mode==='login'?'تسجيل الدخول':'إنشاء حساب';
  },

  async handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value, password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value;
    const err = document.getElementById('auth-error'), btn = document.getElementById('auth-btn');
    btn.disabled = true; btn.innerHTML = '<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px;"></div>'; err.classList.add('hidden');
    try {
      const data = this.authMode === 'login' ? await this.api('POST','/api/auth/login',{email,password}) : await this.api('POST','/api/auth/register',{email,password,full_name:name});
      if (data.session) { this.token = data.session.access_token; this.user = data.user; localStorage.setItem('token',this.token); localStorage.setItem('user',JSON.stringify(this.user)); this.toast(this.authMode==='login'?'تم تسجيل الدخول بنجاح':'تم إنشاء الحساب بنجاح'); this.showApp(); }
      else { err.textContent = 'تحقق من بريدك الإلكتروني لتأكيد الحساب'; err.classList.remove('hidden'); }
    } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = this.authMode==='login'?'تسجيل الدخول':'إنشاء حساب'; }
  },

  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); this.token = null; this.user = null; this.showLogin(); },

  // ========================================
  // لوحة التحكم (Opportunity Dashboard)
  // ========================================
  async renderDashboard() {
    this.showLoading();
    try {
      const stats = await this.api('GET', '/api/quotes/stats/dashboard');
      const [followup, expiring] = await Promise.all([
        this.api('GET', '/api/quotes?followup=true'),
        this.api('GET', '/api/quotes?expiring=true'),
      ]);

      const months = stats.monthly || [];
      const maxVal = Math.max(...months.map(m => m.value), 1);

      this.setContent(`
        <div class="fade-in space-y-6">
          <div><h1 class="text-2xl font-bold text-gray-800">لوحة التحكم</h1><p class="text-gray-500 text-sm mt-1">ملخص الأداء والتنبيهات</p></div>

          <!-- إحصائيات -->
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            ${this._statCard('fa-users','blue',stats.totalClients,'العملاء','/clients')}
            ${this._statCard('fa-file-alt','purple',stats.totalQuotes,'العروض','/quotes')}
            ${this._statCard('fa-project-diagram','indigo',stats.totalProjects,'المشاريع','/projects')}
            ${this._statCard('fa-trophy','emerald',stats.winRate + '%','نسبة الفوز','/reports')}
            ${this._statCard('fa-coins','green',this.fmtCurrency(stats.acceptedValue),'المقبولة','/reports')}
          </div>

          <!-- تنبيهات -->
          ${(followup.length > 0 || expiring.length > 0) ? `
          <div class="grid lg:grid-cols-2 gap-4">
            ${followup.length > 0 ? `
            <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
              <h3 class="font-semibold text-amber-800 mb-3 flex items-center gap-2"><i class="fas fa-bell animate-bounce"></i>تحتاج متابعة (${followup.length})</h3>
              <div class="space-y-2">${followup.slice(0,5).map(q => `
                <a href="/quotes/${q.id}" data-link class="flex justify-between items-center text-sm bg-white/80 backdrop-blur rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div><span class="font-medium text-gray-800">${q.title}</span><span class="text-gray-400 text-xs mr-2">${q.quote_number}</span></div>
                  <span class="text-amber-600 text-xs font-medium">${this.fmtDate(q.next_followup_date)}</span>
                </a>`).join('')}</div>
            </div>` : ''}
            ${expiring.length > 0 ? `
            <div class="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-5">
              <h3 class="font-semibold text-red-800 mb-3 flex items-center gap-2"><i class="fas fa-hourglass-half"></i>تنتهي قريبًا (${expiring.length})</h3>
              <div class="space-y-2">${expiring.slice(0,5).map(q => `
                <a href="/quotes/${q.id}" data-link class="flex justify-between items-center text-sm bg-white/80 backdrop-blur rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div><span class="font-medium text-gray-800">${q.title}</span><span class="text-gray-400 text-xs mr-2">${q.quote_number}</span></div>
                  <span class="text-red-600 text-xs font-medium">${this.fmtDate(q.valid_until)}</span>
                </a>`).join('')}</div>
            </div>` : ''}
          </div>` : ''}

          <!-- Pipeline + Chart -->
          <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-funnel-dollar ml-2 text-primary-500"></i>Pipeline العروض</h3>
              <div class="space-y-3">
                ${this._pipelineBar('مسودة', stats.statusCounts.draft, stats.totalQuotes, 'gray')}
                ${this._pipelineBar('مُرسل', stats.statusCounts.sent, stats.totalQuotes, 'blue')}
                ${this._pipelineBar('مقبول', stats.statusCounts.accepted, stats.totalQuotes, 'green')}
                ${this._pipelineBar('مرفوض', stats.statusCounts.rejected, stats.totalQuotes, 'red')}
                ${this._pipelineBar('منتهي', stats.statusCounts.expired || 0, stats.totalQuotes, 'amber')}
              </div>
              <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span class="text-gray-500">قيمة المُرسلة (Pipeline)</span>
                <span class="font-bold text-blue-600">${this.fmtCurrency(stats.sentValue)}</span>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-chart-bar ml-2 text-primary-500"></i>آخر 6 أشهر</h3>
              <div class="flex items-end gap-2 h-40">
                ${months.map(m => {
                  const h = Math.max(Math.round((m.value / maxVal) * 100), 8);
                  const lbl = new Date(m.month + '-15').toLocaleDateString('ar-SA', { month: 'short' });
                  return `<div class="flex-1 flex flex-col items-center gap-1">
                    <span class="text-[10px] text-gray-400 font-medium">${m.total}</span>
                    <div class="w-full bg-primary-100 rounded-t-lg relative" style="height:${h}%">
                      <div class="absolute bottom-0 w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all" style="height:${m.total > 0 ? Math.max(Math.round((m.accepted / Math.max(m.total,1)) * 100), 10) : 0}%"></div>
                    </div>
                    <span class="text-[10px] text-gray-500">${lbl}</span>
                  </div>`;
                }).join('')}
              </div>
              <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 bg-primary-100 rounded"></span>إجمالي</span>
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 bg-primary-500 rounded"></span>مقبول</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-bolt ml-2 text-amber-500"></i>إجراءات سريعة</h3>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <a href="/quotes/new" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors text-center"><i class="fas fa-plus-circle text-xl text-primary-600"></i><span class="text-xs font-medium text-primary-700">عرض جديد</span></a>
              <a href="/clients/new" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-center"><i class="fas fa-user-plus text-xl text-blue-600"></i><span class="text-xs font-medium text-blue-700">عميل جديد</span></a>
              <a href="/quote-template" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-center"><i class="fas fa-file-contract text-xl text-amber-600"></i><span class="text-xs font-medium text-amber-700">قالب العرض</span></a>
              <a href="/kanban" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-center"><i class="fas fa-columns text-xl text-purple-600"></i><span class="text-xs font-medium text-purple-700">كانبان</span></a>
              <a href="/templates/new" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-center"><i class="fas fa-layer-group text-xl text-green-600"></i><span class="text-xs font-medium text-green-700">قالب جديد</span></a>
            </div>
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  _statCard(icon, color, value, label, href) {
    return `<a href="${href}" data-link class="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"><div class="w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center mb-2"><i class="fas ${icon} text-${color}-600"></i></div><p class="text-xl font-bold text-gray-800">${value}</p><p class="text-xs text-gray-500 mt-0.5">${label}</p></a>`;
  },

  _pipelineBar(label, count, total, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div class="flex items-center gap-3"><span class="w-16 text-xs text-gray-600 font-medium">${label}</span><div class="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden"><div class="bg-${color}-500 h-6 rounded-full transition-all duration-500" style="width:${pct}%"></div></div><span class="w-8 text-xs font-bold text-gray-700 text-left">${count}</span></div>`;
  },

  // ========================================
  // العملاء
  // ========================================
  async renderClients() {
    this.showLoading();
    try {
      const clients = await this.api('GET', '/api/clients');
      this.setContent(`
        <div class="fade-in">
          <div class="flex justify-between items-center mb-6">
            <div><h1 class="text-2xl font-bold text-gray-800">العملاء</h1><p class="text-gray-500 text-sm mt-1">${clients.length} عميل</p></div>
            <a href="/clients/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><i class="fas fa-plus"></i> إضافة عميل</a>
          </div>
          ${clients.length === 0 ? this._emptyState('fa-users','لا يوجد عملاء بعد','ابدأ بإضافة أول عميل','/clients/new','إضافة عميل') : `
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div class="overflow-x-auto"><table class="w-full">
            <thead class="bg-gray-50"><tr>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">الاسم</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">الشركة</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">البريد</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">الهاتف</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">
              ${clients.map(c => `<tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="history.pushState(null,'','/clients/${c.id}');App.route();">
                <td class="px-5 py-3.5"><div class="flex items-center gap-3"><div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0"><span class="text-primary-600 font-bold text-sm">${(c.name||'?')[0]}</span></div><p class="font-medium text-sm text-gray-800">${c.name}</p></div></td>
                <td class="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">${c.company||'-'}</td>
                <td class="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">${c.email||'-'}</td>
                <td class="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell" dir="ltr">${c.phone||'-'}</td>
                <td class="px-5 py-3.5 text-sm text-gray-400">${this.fmtDate(c.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div></div>`}
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  _emptyState(icon, title, desc, href, btn) {
    return `<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"><div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas ${icon} text-3xl text-gray-400"></i></div><h3 class="text-lg font-medium text-gray-600 mb-2">${title}</h3><p class="text-gray-400 text-sm mb-6">${desc}</p><a href="${href}" data-link class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-plus"></i> ${btn}</a></div>`;
  },

  renderClientForm(editId) {
    if (editId) {
      this.showLoading();
      this.api('GET', `/api/clients/${editId}`).then(client => {
        this._showClientForm(client);
      }).catch(e => this.toast(e.message, 'error'));
    } else {
      this._showClientForm(null);
    }
  },

  _showClientForm(client) {
    const isEdit = !!client;
    this.setContent(`
      <div class="fade-in max-w-2xl mx-auto">
        <div class="flex items-center gap-3 mb-6"><a href="${isEdit?'/clients/'+client.id:'/clients'}" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">${isEdit?'تعديل العميل':'إضافة عميل جديد'}</h1></div>
        <form onsubmit="App.saveClient(event, ${isEdit?"'"+client.id+"'":'null'})" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1.5">اسم العميل *</label><input type="text" id="client-name" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${client?.name||''}" placeholder="أدخل اسم العميل"/></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1.5">الشركة</label><input type="text" id="client-company" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${client?.company||''}"/></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label><input type="email" id="client-email" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${client?.email||''}"/></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1.5">الهاتف</label><input type="tel" id="client-phone" dir="ltr" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-left" value="${client?.phone||''}"/></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1.5">العنوان</label><input type="text" id="client-address" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${client?.address||''}"/></div>
            <div class="sm:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label><textarea id="client-notes" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none">${client?.notes||''}</textarea></div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100"><a href="${isEdit?'/clients/'+client.id:'/clients'}" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-client-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> ${isEdit?'تحديث':'حفظ'}</button></div>
        </form>
      </div>
    `);
  },

  async saveClient(e, editId) {
    e.preventDefault(); const btn = document.getElementById('save-client-btn'); btn.disabled = true;
    const data = { name: document.getElementById('client-name').value, company: document.getElementById('client-company').value, email: document.getElementById('client-email').value, phone: document.getElementById('client-phone').value, address: document.getElementById('client-address').value, notes: document.getElementById('client-notes').value };
    try {
      if (editId) {
        await this.api('PUT', `/api/clients/${editId}`, data);
        this.toast('تم تحديث العميل'); history.pushState(null, '', `/clients/${editId}`);
      } else {
        await this.api('POST', '/api/clients', data);
        this.toast('تم إضافة العميل'); history.pushState(null, '', '/clients');
      }
      this.route();
    } catch (e) { this.toast(e.message, 'error'); btn.disabled = false; }
  },

  async renderClientDetail(id) {
    this.showLoading();
    try {
      const [client, quotes] = await Promise.all([this.api('GET', `/api/clients/${id}`), this.api('GET', `/api/quotes?client_id=${id}`)]);
      const totalValue = quotes.reduce((s, q) => s + Number(q.total || 0), 0);
      const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.total || 0), 0);

      this.setContent(`
        <div class="fade-in">
          <div class="flex items-center gap-3 mb-6">
            <a href="/clients" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a>
            <div class="flex-1"><h1 class="text-2xl font-bold text-gray-800">${client.name}</h1>${client.company?`<p class="text-gray-500 text-sm">${client.company}</p>`:''}</div>
            <div class="flex gap-1">
              <a href="/clients/${id}/edit" data-link class="text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-xl text-sm font-medium"><i class="fas fa-edit ml-1"></i>تعديل</a>
              <button onclick="App.deleteClient('${id}')" class="text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl text-sm"><i class="fas fa-trash ml-1"></i>حذف</button>
            </div>
          </div>
          <div class="grid lg:grid-cols-3 gap-6">
            <div class="space-y-4">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-address-card ml-2 text-primary-500"></i>معلومات العميل</h3>
                <div class="space-y-3">
                  ${client.email?`<div class="flex items-center gap-3"><div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><i class="fas fa-envelope text-blue-500 text-sm"></i></div><span class="text-sm">${client.email}</span></div>`:''}
                  ${client.phone?`<div class="flex items-center gap-3"><div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><i class="fas fa-phone text-green-500 text-sm"></i></div><span class="text-sm" dir="ltr">${client.phone}</span></div>`:''}
                  ${client.address?`<div class="flex items-center gap-3"><div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center"><i class="fas fa-map-marker-alt text-amber-500 text-sm"></i></div><span class="text-sm">${client.address}</span></div>`:''}
                  ${client.notes?`<div class="mt-3 pt-3 border-t border-gray-100"><p class="text-sm text-gray-500 whitespace-pre-wrap">${client.notes}</p></div>`:''}
                </div>
              </div>
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-chart-pie ml-2 text-primary-500"></i>ملخص</h3>
                <div class="grid grid-cols-2 gap-3 text-center">
                  <div class="bg-gray-50 rounded-lg p-3"><p class="text-xl font-bold text-gray-800">${quotes.length}</p><p class="text-[10px] text-gray-500">عروض</p></div>
                  <div class="bg-green-50 rounded-lg p-3"><p class="text-xl font-bold text-green-700">${quotes.filter(q=>q.status==='accepted').length}</p><p class="text-[10px] text-green-600">مقبولة</p></div>
                  <div class="bg-blue-50 rounded-lg p-3"><p class="text-sm font-bold text-blue-700">${this.fmtCurrency(totalValue)}</p><p class="text-[10px] text-blue-600">إجمالي</p></div>
                  <div class="bg-emerald-50 rounded-lg p-3"><p class="text-sm font-bold text-emerald-700">${this.fmtCurrency(acceptedValue)}</p><p class="text-[10px] text-emerald-600">مقبولة</p></div>
                </div>
              </div>
            </div>
            <div class="lg:col-span-2">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800">عروض الأسعار (${quotes.length})</h3>
                <a href="/quotes/new?client_id=${id}" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"><i class="fas fa-plus ml-1"></i> عرض جديد</a>
              </div>
              ${quotes.length === 0 ? '<div class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">لا توجد عروض لهذا العميل</div>' : `
              <div class="space-y-2">${quotes.map(q => `
                <a href="/quotes/${q.id}" data-link class="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start">
                    <div><p class="font-medium text-gray-800">${q.title}</p><p class="text-xs text-gray-400 mt-1">${q.quote_number} • ${this.fmtDate(q.created_at)}</p></div>
                    <div class="text-left">${this.statusBadge(q.status)}<p class="text-sm font-bold text-gray-700 mt-1">${this.fmtCurrency(q.total)}</p></div>
                  </div>
                </a>`).join('')}</div>`}
            </div>
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async deleteClient(id) { if (!confirm('حذف العميل وجميع عروضه؟ لا يمكن التراجع عن هذا الإجراء.')) return; try { await this.api('DELETE', `/api/clients/${id}`); this.toast('تم حذف العميل'); history.pushState(null,'','/clients'); this.route(); } catch(e) { this.toast(e.message,'error'); } },

  // ========================================
  // عروض الأسعار (مع فلاتر وبحث)
  // ========================================
  async renderQuotes() {
    this.showLoading();
    try {
      const [allQuotes, clients] = await Promise.all([this.api('GET', '/api/quotes'), this.api('GET', '/api/clients')]);

      this.setContent(`
        <div class="fade-in">
          <div class="flex justify-between items-center mb-4">
            <div><h1 class="text-2xl font-bold text-gray-800">عروض الأسعار</h1><p class="text-gray-500 text-sm mt-1">${allQuotes.length} عرض</p></div>
            <a href="/quotes/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><i class="fas fa-plus"></i> عرض جديد</a>
          </div>

          <!-- بحث وفلاتر -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div class="mb-3">
              <div class="relative"><i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i><input type="text" id="f-search" oninput="App.filterQuotes()" placeholder="بحث بالعنوان أو الرقم أو العميل..." class="w-full border border-gray-300 rounded-xl pr-10 pl-4 py-2.5 text-sm"/></div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label class="block text-xs text-gray-500 mb-1">الحالة</label><select id="f-status" onchange="App.filterQuotes()" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">الكل</option><option value="draft">مسودة</option><option value="sent">مُرسل</option><option value="accepted">مقبول</option><option value="rejected">مرفوض</option><option value="expired">منتهي</option></select></div>
              <div><label class="block text-xs text-gray-500 mb-1">العميل</label><select id="f-client" onchange="App.filterQuotes()" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">الكل</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
              <div><label class="block text-xs text-gray-500 mb-1">من تاريخ</label><input type="date" id="f-from" onchange="App.filterQuotes()" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
              <div><label class="block text-xs text-gray-500 mb-1">إلى تاريخ</label><input type="date" id="f-to" onchange="App.filterQuotes()" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
            </div>
          </div>

          <div id="quotes-list">${this._renderQuotesList(allQuotes)}</div>
        </div>
      `);
      window._allQuotes = allQuotes;
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  filterQuotes() {
    let q = window._allQuotes || [];
    const status = document.getElementById('f-status')?.value;
    const client = document.getElementById('f-client')?.value;
    const from = document.getElementById('f-from')?.value;
    const to = document.getElementById('f-to')?.value;
    const search = document.getElementById('f-search')?.value?.toLowerCase();
    if (status) q = q.filter(x => x.status === status);
    if (client) q = q.filter(x => x.client_id === client);
    if (from) q = q.filter(x => x.created_at >= from);
    if (to) q = q.filter(x => x.created_at <= to + 'T23:59:59');
    if (search) q = q.filter(x => x.title?.toLowerCase().includes(search) || x.quote_number?.toLowerCase().includes(search) || x.clients?.name?.toLowerCase().includes(search));
    document.getElementById('quotes-list').innerHTML = this._renderQuotesList(q);
  },

  _renderQuotesList(quotes) {
    if (quotes.length === 0) return '<div class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">لا توجد عروض مطابقة</div>';
    return `<div class="space-y-2">${quotes.map(q => {
      const expWarning = this.isExpiringSoon(q.valid_until) ? '<i class="fas fa-clock text-amber-500 text-xs" title="ينتهي قريبًا"></i>' : this.isExpired(q.valid_until) && q.status === 'sent' ? '<i class="fas fa-exclamation-triangle text-red-500 text-xs" title="منتهي الصلاحية"></i>' : '';
      const followWarning = this.isFollowupDue(q.next_followup_date) && !['accepted','rejected'].includes(q.status) ? '<i class="fas fa-bell text-amber-500 text-xs" title="يحتاج متابعة"></i>' : '';
      return `<a href="/quotes/${q.id}" data-link class="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all hover:border-primary-200">
        <div class="flex justify-between items-start">
          <div class="flex-1"><div class="flex items-center gap-2 mb-1 flex-wrap"><p class="font-medium text-gray-800">${q.title}</p>${this.statusBadge(q.status)}${expWarning}${followWarning}</div>
            <p class="text-sm text-gray-500">${q.quote_number}</p>
            <p class="text-xs text-gray-400 mt-1"><i class="fas fa-user ml-1"></i>${q.clients?.name||'-'} <span class="mx-1">•</span> <i class="fas fa-calendar ml-1"></i>${this.fmtDate(q.created_at)}${q.valid_until ? ` <span class="mx-1">•</span> <i class="fas fa-hourglass-half ml-1"></i>صالح حتى ${this.fmtDate(q.valid_until)}` : ''}</p></div>
          <p class="text-lg font-bold text-gray-800 mr-4">${this.fmtCurrency(q.total)}</p>
        </div>
      </a>`}).join('')}</div>`;
  },

  // ---- نموذج إنشاء عرض سعر ----
  async renderQuoteForm() {
    this.showLoading();
    try {
      const [clients, templates] = await Promise.all([this.api('GET', '/api/clients'), this.api('GET', '/api/templates')]);
      const params = new URLSearchParams(location.search);
      const preClient = params.get('client_id') || '';
      const preTemplate = params.get('template_id') || '';

      if (clients.length === 0) { this.setContent(this._emptyState('fa-exclamation-triangle','أضف عميلاً أولاً','تحتاج لإضافة عميل قبل إنشاء عرض','/clients/new','إضافة عميل')); return; }

      const validDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      this.setContent(`
        <div class="fade-in max-w-3xl mx-auto">
          <div class="flex items-center gap-3 mb-6"><a href="/quotes" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">إنشاء عرض سعر</h1></div>

          ${templates.length > 0 ? `
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
            <label class="block text-sm font-medium text-amber-800 mb-2"><i class="fas fa-layer-group ml-1"></i> استخدام قالب جاهز</label>
            <select id="quote-template" onchange="App.loadTemplate()" class="w-full border border-amber-300 rounded-xl px-4 py-2.5 text-sm bg-white"><option value="">بدون قالب</option>${templates.map(t => `<option value="${t.id}">${t.name} (${(t.template_items||[]).length} بند)</option>`).join('')}</select>
            <p class="text-xs text-amber-700 mt-2">عند اختيار قالب يحتوي محتوى نصي، سيتم إنشاء العرض من القالب مع معاينة المحتوى النهائي قبل الحفظ.</p>
          </div>` : ''}

          <form onsubmit="App.createQuote(event)" class="space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-info-circle ml-2 text-primary-500"></i>معلومات العرض</h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">عنوان العرض *</label><input type="text" id="quote-title" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="مثال: عرض تصميم موقع إلكتروني"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">العميل *</label><select id="quote-client" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="">اختر العميل</option>${clients.map(c => `<option value="${c.id}" ${c.id===preClient?'selected':''}>${c.name}${c.company?' - '+c.company:''}</option>`).join('')}</select></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">صالح حتى</label><input type="date" id="quote-valid" value="${validDate}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">موعد المتابعة التالية</label><input type="date" id="quote-followup" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label><input type="text" id="quote-notes" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="ملاحظات إضافية (اختياري)"/></div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800"><i class="fas fa-list-ul ml-2 text-primary-500"></i>البنود</h3><button type="button" onclick="App.addItem()" class="text-primary-600 text-sm font-medium hover:bg-primary-50 px-3 py-1 rounded-lg"><i class="fas fa-plus ml-1"></i> إضافة بند</button></div>
              <div id="quote-items" class="space-y-2">
                ${this._itemRow()}
              </div>
              <div class="mt-4 pt-4 border-t-2 border-primary-100 flex justify-between items-center"><span class="font-semibold text-gray-700 text-lg">الإجمالي</span><span id="quote-total" class="text-2xl font-bold text-primary-600">0.00 ر.س</span></div>
            </div>

            <div id="quote-template-content-card" class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hidden">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold text-gray-800"><i class="fas fa-file-alt ml-2 text-amber-500"></i>محتوى العرض من القالب</h3>
                <button type="button" onclick="App.previewTemplateQuote()" class="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-medium"><i class="fas fa-eye ml-1"></i> معاينة</button>
              </div>
              <div class="grid gap-3 lg:grid-cols-2">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">المحتوى القابل للتعديل</label>
                  <textarea id="quote-editable-content" rows="14" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono" dir="rtl" placeholder="اكتب نص العرض باستخدام المتغيرات {{client_name}} ..."></textarea>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">المتغيرات (JSON)</label>
                    <textarea id="quote-variables-json" rows="6" class="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr" placeholder='{"client_name":"شركة ألف","subject":"تقييم أصول ثابتة"}'></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">المعاينة</label>
                    <div id="quote-rendered-preview" class="min-h-[170px] border border-gray-200 rounded-xl p-3 bg-gray-50 text-sm whitespace-pre-wrap"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3"><a href="/quotes" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-quote-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> حفظ العرض</button></div>
          </form>
        </div>
      `);
      window._templates = templates;
      if (preTemplate) this.loadTemplate();
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  _itemRow(item) {
    const desc = item?.description || '';
    const qty = item?.quantity || 1;
    const price = item?.unit_price || 0;
    return `<div class="quote-item bg-gray-50 rounded-xl p-3"><div class="grid gap-2 sm:grid-cols-12 items-end">
      <div class="sm:col-span-5"><label class="block text-[10px] font-medium text-gray-500 mb-1">الوصف</label><input type="text" name="description" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="وصف البند" value="${desc}"/></div>
      <div class="sm:col-span-2"><label class="block text-[10px] font-medium text-gray-500 mb-1">الكمية</label><input type="number" name="quantity" value="${qty}" min="0.01" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center" oninput="App.calcTotal()"/></div>
      <div class="sm:col-span-3"><label class="block text-[10px] font-medium text-gray-500 mb-1">السعر (ر.س)</label><input type="number" name="unit_price" value="${price}" min="0" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" oninput="App.calcTotal()"/></div>
      <div class="sm:col-span-2 flex items-center justify-between"><span class="item-total text-sm font-bold text-gray-700">${(qty*price).toFixed(2)}</span><button type="button" onclick="App.removeItem(this)" class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><i class="fas fa-times"></i></button></div>
    </div></div>`;
  },

  addItem() { document.getElementById('quote-items').insertAdjacentHTML('beforeend', this._itemRow()); },
  removeItem(btn) { if (document.querySelectorAll('.quote-item').length <= 1) { this.toast('بند واحد على الأقل','warning'); return; } btn.closest('.quote-item').remove(); this.calcTotal(); },

  calcTotal() {
    let t = 0;
    document.querySelectorAll('.quote-item').forEach(item => {
      const q = parseFloat(item.querySelector('[name="quantity"]').value)||0;
      const p = parseFloat(item.querySelector('[name="unit_price"]').value)||0;
      const lt = q*p; item.querySelector('.item-total').textContent = lt.toFixed(2); t += lt;
    });
    const el = document.getElementById('quote-total');
    if (el) el.textContent = this.fmtCurrency(t);
  },

  loadTemplate() {
    const tid = document.getElementById('quote-template')?.value;
    const contentCard = document.getElementById('quote-template-content-card');
    if (!tid) {
      if (contentCard) contentCard.classList.add('hidden');
      const saveBtn = document.getElementById('save-quote-btn');
      if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save ml-1"></i> حفظ العرض';
      return;
    }
    const tmpl = (window._templates||[]).find(t => t.id === tid);
    if (!tmpl) return;
    if (tmpl.default_notes) document.getElementById('quote-notes').value = tmpl.default_notes;
    if (tmpl.default_valid_days) { const d = new Date(Date.now()+tmpl.default_valid_days*86400000); document.getElementById('quote-valid').value = d.toISOString().split('T')[0]; }
    const container = document.getElementById('quote-items'); container.innerHTML = '';
    (tmpl.template_items||[]).forEach(item => {
      container.insertAdjacentHTML('beforeend', this._itemRow(item));
    });
    if ((tmpl.template_items||[]).length === 0) container.insertAdjacentHTML('beforeend', this._itemRow());
    if (tmpl.content) {
      if (contentCard) contentCard.classList.remove('hidden');
      const contentEl = document.getElementById('quote-editable-content');
      const varsEl = document.getElementById('quote-variables-json');
      if (contentEl) contentEl.value = tmpl.content;
      if (varsEl) varsEl.value = JSON.stringify(tmpl.variables_json || {}, null, 2);
      this.previewTemplateQuote();
      const saveBtn = document.getElementById('save-quote-btn');
      if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-file-import ml-1"></i> إنشاء من القالب';
    } else {
      if (contentCard) contentCard.classList.add('hidden');
    }
    this.calcTotal();
    this.toast('تم تحميل القالب', 'info');
  },

  previewTemplateQuote() {
    const content = document.getElementById('quote-editable-content')?.value || '';
    const previewEl = document.getElementById('quote-rendered-preview');
    if (!previewEl) return;
    let vars = {};
    try {
      const raw = document.getElementById('quote-variables-json')?.value?.trim();
      vars = raw ? JSON.parse(raw) : {};
    } catch {
      previewEl.textContent = 'صيغة JSON غير صحيحة في المتغيرات.';
      return;
    }
    const rendered = content.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_, key) => {
      const val = vars?.[key];
      return val === null || val === undefined ? '' : String(val);
    });
    previewEl.textContent = rendered || 'لا توجد معاينة.';
  },

  async createQuote(e) {
    e.preventDefault(); const btn = document.getElementById('save-quote-btn'); btn.disabled = true;
    const items = []; document.querySelectorAll('.quote-item').forEach(item => { items.push({ description: item.querySelector('[name="description"]').value, quantity: parseFloat(item.querySelector('[name="quantity"]').value), unit_price: parseFloat(item.querySelector('[name="unit_price"]').value) }); });
    try {
      const templateId = document.getElementById('quote-template')?.value || null;
      const editableContent = document.getElementById('quote-editable-content')?.value || '';
      const rawVars = document.getElementById('quote-variables-json')?.value || '';
      let variables = {};
      if (rawVars.trim()) variables = JSON.parse(rawVars);

      const payload = {
        client_id: document.getElementById('quote-client').value,
        title: document.getElementById('quote-title').value,
        notes: document.getElementById('quote-notes').value,
        valid_until: document.getElementById('quote-valid').value || null,
        next_followup_date: document.getElementById('quote-followup')?.value || null,
        template_id: templateId,
        items
      };

      const quote = (templateId && editableContent.trim())
        ? await this.api('POST', '/api/quotes/from-template', { ...payload, editable_content: editableContent, variables_json: variables })
        : await this.api('POST', '/api/quotes', payload);

      this.toast('تم إنشاء العرض بنجاح'); history.pushState(null, '', `/quotes/${quote.id}`); this.route();
    } catch (e) { this.toast(e.message, 'error'); btn.disabled = false; }
  },

  // ---- تعديل عرض سعر ----
  async renderQuoteEditForm(id) {
    this.showLoading();
    try {
      const [quote, clients] = await Promise.all([this.api('GET', `/api/quotes/${id}`), this.api('GET', '/api/clients')]);
      this.setContent(`
        <div class="fade-in max-w-3xl mx-auto">
          <div class="flex items-center gap-3 mb-6"><a href="/quotes/${id}" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">تعديل عرض سعر</h1><span class="text-sm text-gray-400">${quote.quote_number}</span></div>
          <form onsubmit="App.updateQuote(event, '${id}')" class="space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">عنوان العرض *</label><input type="text" id="quote-title" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${quote.title}"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">العميل *</label><select id="quote-client" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">${clients.map(c => `<option value="${c.id}" ${c.id===quote.client_id?'selected':''}>${c.name}${c.company?' - '+c.company:''}</option>`).join('')}</select></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">صالح حتى</label><input type="date" id="quote-valid" value="${this.fmtDateInput(quote.valid_until)}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">موعد المتابعة</label><input type="date" id="quote-followup" value="${this.fmtDateInput(quote.next_followup_date)}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label><input type="text" id="quote-notes" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="${quote.notes||''}"/></div>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800">البنود</h3><button type="button" onclick="App.addItem()" class="text-primary-600 text-sm font-medium"><i class="fas fa-plus ml-1"></i> إضافة بند</button></div>
              <div id="quote-items" class="space-y-2">
                ${(quote.quote_items||[]).map(item => this._itemRow(item)).join('') || this._itemRow()}
              </div>
              <div class="mt-4 pt-4 border-t-2 border-primary-100 flex justify-between items-center"><span class="font-semibold text-gray-700 text-lg">الإجمالي</span><span id="quote-total" class="text-2xl font-bold text-primary-600">${this.fmtCurrency(quote.total)}</span></div>
            </div>
            ${(quote.template_id || quote.editable_content || quote.rendered_content) ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold text-gray-800"><i class="fas fa-file-signature ml-2 text-amber-500"></i>محتوى العرض النصي</h3>
                <button type="button" onclick="App.previewQuoteEditContent()" class="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-medium"><i class="fas fa-eye ml-1"></i> معاينة</button>
              </div>
              <div class="grid gap-3 lg:grid-cols-2">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">المحتوى القابل للتعديل</label>
                  <textarea id="quote-editable-content" rows="12" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" dir="rtl">${quote.editable_content || quote.template_snapshot || ''}</textarea>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">المتغيرات (JSON)</label>
                    <textarea id="quote-variables-json" rows="5" class="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr">${JSON.stringify(quote.variables_json || {}, null, 2)}</textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">المحتوى النهائي</label>
                    <div id="quote-rendered-preview" class="min-h-[170px] border border-gray-200 rounded-xl p-3 bg-gray-50 text-sm whitespace-pre-wrap">${quote.rendered_content || ''}</div>
                  </div>
                </div>
              </div>
            </div>` : ''}
            <div class="flex justify-end gap-3"><a href="/quotes/${id}" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-quote-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> تحديث العرض</button></div>
          </form>
        </div>
      `);
      this.calcTotal();
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async updateQuote(e, id) {
    e.preventDefault(); const btn = document.getElementById('save-quote-btn'); btn.disabled = true;
    const items = []; document.querySelectorAll('.quote-item').forEach(item => { items.push({ description: item.querySelector('[name="description"]').value, quantity: parseFloat(item.querySelector('[name="quantity"]').value), unit_price: parseFloat(item.querySelector('[name="unit_price"]').value) }); });
    try {
      await this.api('PUT', `/api/quotes/${id}`, { client_id: document.getElementById('quote-client').value, title: document.getElementById('quote-title').value, notes: document.getElementById('quote-notes').value, valid_until: document.getElementById('quote-valid').value || null, next_followup_date: document.getElementById('quote-followup')?.value || null, items });
      if (document.getElementById('quote-editable-content')) {
        let vars = {};
        const rawVars = document.getElementById('quote-variables-json')?.value || '{}';
        if (rawVars.trim()) vars = JSON.parse(rawVars);
        await this.api('PUT', `/api/quotes/${id}/content`, { editable_content: document.getElementById('quote-editable-content').value });
        await this.api('POST', `/api/quotes/${id}/render`, { variables_json: vars });
      }
      this.toast('تم تحديث العرض'); history.pushState(null, '', `/quotes/${id}`); this.route();
    } catch (e) { this.toast(e.message, 'error'); btn.disabled = false; }
  },

  previewQuoteEditContent() {
    const content = document.getElementById('quote-editable-content')?.value || '';
    const previewEl = document.getElementById('quote-rendered-preview');
    if (!previewEl) return;
    let vars = {};
    try {
      const raw = document.getElementById('quote-variables-json')?.value?.trim();
      vars = raw ? JSON.parse(raw) : {};
    } catch {
      previewEl.textContent = 'صيغة JSON غير صحيحة في المتغيرات.';
      return;
    }
    const rendered = content.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_, key) => {
      const val = vars?.[key];
      return val === null || val === undefined ? '' : String(val);
    });
    previewEl.textContent = rendered || 'لا توجد معاينة.';
  },

  // ---- تفاصيل عرض سعر ----
  async renderQuoteDetail(id) {
    this.showLoading();
    try {
      const [quote, timeline] = await Promise.all([this.api('GET', `/api/quotes/${id}`), this.api('GET', `/api/quotes/${id}/timeline`)]);

      this.setContent(`
        <div class="fade-in">
          <div class="flex items-center gap-3 mb-6">
            <a href="/quotes" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a>
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap"><h1 class="text-xl font-bold text-gray-800">${quote.title}</h1>${this.statusBadge(quote.status)}
                ${quote.valid_until ? (this.isExpired(quote.valid_until) && quote.status==='sent' ? '<span class="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full"><i class="fas fa-exclamation-triangle ml-1"></i>منتهي الصلاحية</span>' : this.isExpiringSoon(quote.valid_until) ? '<span class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><i class="fas fa-clock ml-1"></i>ينتهي قريبًا</span>' : '') : ''}
              </div>
              <p class="text-gray-500 text-sm mt-1">${quote.quote_number}</p>
            </div>
            <div class="flex items-center gap-1 no-print flex-wrap">
              <a href="/quotes/${id}/edit" data-link class="text-gray-600 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg text-xs font-medium" title="تعديل"><i class="fas fa-edit ml-1"></i>تعديل</a>
              <button onclick="App.exportPDF('${id}')" id="pdf-btn" class="text-primary-600 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg text-xs font-medium" title="تصدير PDF"><i class="fas fa-file-pdf ml-1"></i>PDF</button>
              <button onclick="App.duplicateQuote('${id}')" class="text-gray-600 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg text-xs font-medium" title="نسخ"><i class="fas fa-copy ml-1"></i>نسخ</button>
              <button onclick="App.renewQuote('${id}')" class="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs font-medium" title="تجديد"><i class="fas fa-redo ml-1"></i>تجديد</button>
              ${quote.status==='accepted'?`<button onclick="App.convertToProject('${id}')" class="text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg text-xs font-medium" title="تحويل لمشروع"><i class="fas fa-project-diagram ml-1"></i>مشروع</button>`:''}
              <button onclick="App.deleteQuote('${id}')" class="text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-medium"><i class="fas fa-trash"></i></button>
            </div>
          </div>

          <div class="grid lg:grid-cols-3 gap-4">
            <!-- Sidebar -->
            <div class="space-y-4">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-user ml-2 text-primary-500"></i>العميل</h3>
                <a href="/clients/${quote.client_id}" data-link class="text-primary-600 hover:underline font-medium text-sm"><i class="fas fa-external-link-alt ml-1 text-xs"></i>${quote.clients?.name||'-'}</a>
                ${quote.clients?.company?`<p class="text-sm text-gray-500 mt-1"><i class="fas fa-building ml-1 text-gray-400"></i>${quote.clients.company}</p>`:''}
                ${quote.clients?.email?`<p class="text-sm text-gray-500 mt-1"><i class="fas fa-envelope ml-1 text-gray-400"></i>${quote.clients.email}</p>`:''}
                ${quote.clients?.phone?`<p class="text-sm text-gray-500 mt-1" dir="ltr"><i class="fas fa-phone mr-1 text-gray-400"></i>${quote.clients.phone}</p>`:''}
              </div>

              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-info-circle ml-2 text-primary-500"></i>التفاصيل</h3>
                <div class="space-y-2.5 text-sm">
                  ${quote.valid_until?`<div class="flex justify-between items-center"><span class="text-gray-500">صالح حتى</span><span class="font-medium ${this.isExpired(quote.valid_until)?'text-red-600':'text-gray-700'}">${this.fmtDate(quote.valid_until)}</span></div>`:''}
                  ${quote.next_followup_date?`<div class="flex justify-between items-center"><span class="text-gray-500">المتابعة</span><span class="font-medium ${this.isFollowupDue(quote.next_followup_date)?'text-amber-600':'text-gray-700'}">${this.fmtDate(quote.next_followup_date)}</span></div>`:''}
                  ${quote.renewed_from?`<div class="flex justify-between items-center"><span class="text-gray-500">مجدد من</span><a href="/quotes/${quote.renewed_from}" data-link class="text-primary-600 text-xs hover:underline">العرض السابق</a></div>`:''}
                  ${quote.pdf_url && quote.pdf_url !== 'local_export' ?`<div class="flex justify-between items-center"><span class="text-gray-500">PDF</span><a href="${quote.pdf_url}" target="_blank" class="text-primary-600 text-xs hover:underline"><i class="fas fa-download ml-1"></i>تحميل</a></div>`:''}
                  ${quote.lost_reason?`<div class="mt-2 p-3 bg-red-50 rounded-xl border border-red-100"><span class="text-xs font-semibold text-red-700 flex items-center gap-1"><i class="fas fa-exclamation-circle"></i>سبب الرفض:</span><p class="text-xs text-red-600 mt-1">${quote.lost_reason}</p></div>`:''}
                  ${quote.notes?`<div class="mt-2 pt-2 border-t border-gray-100"><p class="text-xs text-gray-500 whitespace-pre-wrap">${quote.notes}</p></div>`:''}
                  <div class="pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <p>أُنشئ: ${this.fmtDate(quote.created_at)}</p>
                    ${quote.updated_at !== quote.created_at ? `<p>آخر تعديل: ${this.fmtDate(quote.updated_at)}</p>` : ''}
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 no-print">
                <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-exchange-alt ml-2 text-primary-500"></i>تغيير الحالة</h3>
                <div class="grid grid-cols-2 gap-1.5">
                  ${['draft','sent','accepted','rejected','expired'].map(s => {
                    const lbl = {draft:'مسودة',sent:'مُرسل',accepted:'مقبول',rejected:'مرفوض',expired:'منتهي'}[s];
                    const icons = {draft:'fa-pencil-alt',sent:'fa-paper-plane',accepted:'fa-check',rejected:'fa-times',expired:'fa-clock'}[s];
                    const colors = {draft:'gray',sent:'blue',accepted:'green',rejected:'red',expired:'amber'}[s];
                    const active = quote.status===s;
                    return `<button onclick="App.changeStatus('${id}','${s}')" class="px-2 py-2 text-xs font-medium rounded-xl border transition-all ${active?`bg-${colors}-100 border-${colors}-300 text-${colors}-700 shadow-sm`:`border-gray-200 text-gray-500 hover:bg-${colors}-50 hover:border-${colors}-200`}"><i class="fas ${icons} ml-1"></i>${lbl}</button>`;
                  }).join('')}
                </div>
              </div>

              <!-- Timeline -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 no-print">
                <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-history ml-2 text-primary-500"></i>سجل الأحداث</h3>
                ${timeline.length === 0 ? '<p class="text-xs text-gray-400 text-center py-2">لا توجد أحداث بعد</p>' : `
                <div class="relative pr-3 space-y-4">
                  <div class="absolute right-0 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                  ${timeline.slice(0,10).map(t => {
                    const actionIcons = {created:'fa-plus-circle text-green-500',status_changed:'fa-exchange-alt text-blue-500',updated:'fa-edit text-amber-500',duplicated:'fa-copy text-purple-500',renewed:'fa-redo text-indigo-500',pdf_generated:'fa-file-pdf text-red-500',converted_to_project:'fa-project-diagram text-green-600'};
                    const ic = actionIcons[t.action] || 'fa-circle text-gray-400';
                    return `<div class="flex gap-3 relative"><div class="w-6 h-6 bg-white rounded-full flex items-center justify-center z-10 -mr-0.5 shadow-sm border border-gray-100"><i class="fas ${ic} text-xs"></i></div><div class="flex-1 pb-1"><p class="text-xs text-gray-700 font-medium">${t.details||t.action}</p><p class="text-[10px] text-gray-400 mt-0.5">${this.fmtDate(t.created_at)}</p></div></div>`;
                  }).join('')}
                </div>`}
              </div>
            </div>

            <!-- بنود العرض -->
            <div class="lg:col-span-2">
              <div id="quote-pdf-content" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <!-- PDF Header -->
                <div id="pdf-header" class="hidden p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                  <div class="flex justify-between items-start">
                    <div><h2 class="text-xl font-bold">عرض سعر</h2><p class="text-primary-100 text-sm mt-1">${quote.quote_number}</p></div>
                    <div class="text-left text-sm"><p class="font-medium">${quote.clients?.name||''}</p><p class="text-primary-100">${quote.clients?.company||''}</p></div>
                  </div>
                </div>
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                  <h3 class="font-semibold text-gray-800"><i class="fas fa-list ml-2 text-primary-500"></i>بنود العرض</h3>
                  <span class="text-sm text-gray-400 font-mono">${quote.quote_number}</span>
                </div>
                <div class="overflow-x-auto"><table class="w-full">
                  <thead class="bg-gray-50"><tr>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">#</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">الوصف</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">الكمية</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">سعر الوحدة</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">الإجمالي</th>
                  </tr></thead>
                  <tbody class="divide-y divide-gray-50">
                    ${(quote.quote_items||[]).map((item, i) => `<tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm text-gray-400 font-medium">${i+1}</td>
                      <td class="px-4 py-3 text-sm text-gray-800 font-medium">${item.description}</td>
                      <td class="px-4 py-3 text-sm text-gray-600 text-center">${item.quantity}</td>
                      <td class="px-4 py-3 text-sm text-gray-600 text-left">${this.fmtCurrency(item.unit_price)}</td>
                      <td class="px-4 py-3 text-sm font-bold text-gray-800 text-left">${this.fmtCurrency(item.total)}</td>
                    </tr>`).join('')}
                  </tbody>
                  <tfoot><tr class="bg-gradient-to-r from-primary-50 to-blue-50">
                    <td colspan="4" class="px-4 py-4 text-left font-bold text-gray-700 text-lg">الإجمالي</td>
                    <td class="px-4 py-4 text-left text-xl font-bold text-primary-600">${this.fmtCurrency(quote.total)}</td>
                  </tr></tfoot>
                </table></div>
                ${quote.valid_until?`<div class="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100 flex items-center gap-1"><i class="fas fa-calendar-alt"></i>صالح حتى: ${this.fmtDate(quote.valid_until)}</div>`:''}
                ${quote.notes?`<div class="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100"><i class="fas fa-sticky-note ml-1"></i>${quote.notes}</div>`:''}
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async changeStatus(id, status) {
    if (status === 'rejected') {
      this.showModal(`
        <div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-times-circle ml-2 text-red-500"></i>سبب الرفض</h3>
        <p class="text-sm text-gray-500 mb-3">أدخل سبب رفض العرض لتتبعه لاحقاً</p>
        <textarea id="lost-reason" rows="3" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="مثال: السعر مرتفع، اختار منافس آخر..."></textarea>
        <div class="flex justify-end gap-3 mt-4">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</button>
          <button onclick="App._confirmReject('${id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium">تأكيد الرفض</button>
        </div></div>
      `);
      return;
    }
    try { await this.api('PATCH', `/api/quotes/${id}/status`, { status }); this.toast(`تم تغيير الحالة إلى: ${this.statusLabel(status)}`); this.renderQuoteDetail(id); } catch(e) { this.toast(e.message,'error'); }
  },

  async _confirmReject(id) {
    const reason = document.getElementById('lost-reason').value;
    this.closeModal();
    try { await this.api('PATCH', `/api/quotes/${id}/status`, { status: 'rejected', lost_reason: reason }); this.toast('تم رفض العرض'); this.renderQuoteDetail(id); } catch(e) { this.toast(e.message,'error'); }
  },

  async duplicateQuote(id) {
    if (!confirm('نسخ هذا العرض؟ سيتم إنشاء عرض جديد بحالة "مسودة".')) return;
    try { const q = await this.api('POST', `/api/quotes/${id}/duplicate`); this.toast('تم نسخ العرض بنجاح'); history.pushState(null,'',`/quotes/${q.id}`); this.route(); } catch(e) { this.toast(e.message,'error'); }
  },

  async renewQuote(id) {
    const validDate = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
    this.showModal(`
      <div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-redo ml-2 text-blue-600"></i>تجديد العرض</h3>
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4"><p class="text-sm text-blue-700"><i class="fas fa-info-circle ml-1"></i>سيتم إنشاء عرض جديد بنفس البنود وتغيير حالة العرض الحالي إلى "منتهي"</p></div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">صالح حتى</label>
      <input type="date" id="renew-valid" value="${validDate}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/>
      <div class="flex justify-end gap-3 mt-4">
        <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</button>
        <button onclick="App._confirmRenew('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">تجديد</button>
      </div></div>
    `);
  },

  async _confirmRenew(id) {
    const validUntil = document.getElementById('renew-valid').value; this.closeModal();
    try { const q = await this.api('POST', `/api/quotes/${id}/renew`, { valid_until: validUntil }); this.toast('تم تجديد العرض بنجاح'); history.pushState(null,'',`/quotes/${q.id}`); this.route(); } catch(e) { this.toast(e.message,'error'); }
  },

  async convertToProject(id) {
    this.showModal(`
      <div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-project-diagram ml-2 text-green-600"></i>تحويل إلى مشروع</h3>
      <div class="bg-green-50 border border-green-100 rounded-xl p-3 mb-4"><p class="text-sm text-green-700"><i class="fas fa-check-circle ml-1"></i>سيتم إنشاء مشروع جديد مرتبط بهذا العرض</p></div>
      <div class="space-y-3">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">اسم المشروع</label><input type="text" id="proj-name" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="اترك فارغاً لاستخدام عنوان العرض"/></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label><input type="date" id="proj-start" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label><input type="date" id="proj-end" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-4">
        <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</button>
        <button onclick="App._confirmConvert('${id}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium">تحويل</button>
      </div></div>
    `);
  },

  async _confirmConvert(id) {
    const data = { name: document.getElementById('proj-name').value, start_date: document.getElementById('proj-start').value, end_date: document.getElementById('proj-end').value || null };
    this.closeModal();
    try { await this.api('POST', `/api/quotes/${id}/convert-to-project`, data); this.toast('تم تحويل العرض إلى مشروع بنجاح'); history.pushState(null,'','/projects'); this.route(); } catch(e) { this.toast(e.message,'error'); }
  },

  // ---- Lazy load external libraries ----
  async _loadScript(url, check, retries = 2) {
    if (check()) return;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = url;
          s.onload = () => {
            // Verify the script actually loaded correctly (not an HTML error page)
            if (check()) { resolve(); }
            else { setTimeout(() => check() ? resolve() : reject(new Error('Script loaded but check failed')), 200); }
          };
          s.onerror = () => reject(new Error('فشل تحميل المكتبة: ' + url));
          document.head.appendChild(s);
          // Timeout after 15 seconds
          setTimeout(() => reject(new Error('timeout')), 15000);
        });
        return; // Success
      } catch (e) {
        if (attempt === retries) throw new Error('فشل تحميل المكتبة بعد عدة محاولات: ' + url);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  },

  async _ensurePDFLibs() {
    // Load from local static files (CDN blocked by wrangler dev proxy MIME mismatch)
    await this._loadScript(
      '/static/jspdf.umd.min.js',
      () => window.jspdf && window.jspdf.jsPDF
    );
    await this._loadScript(
      '/static/html2canvas.min.js',
      () => typeof html2canvas === 'function'
    );
  },

  // ========================================
  // PDF Export via Browser Print (Perfect Arabic)
  // ========================================
  async exportPDF(id) {
    const btn = document.getElementById('pdf-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner mx-auto" style="width:14px;height:14px;border-width:2px;"></div>'; }
    this.toast('جارٍ إنشاء عرض الأتعاب PDF...', 'info');

    try {
      // Fetch quote data
      const quote = await this.api('GET', `/api/quotes/${id}`);
      
      // Check if user has saved PDF templates
      const pdfTemplates = this.getPdfTemplatesList();
      
      if (pdfTemplates.length > 0) {
        // Show template selection dialog
        this._showTemplateSelectionForExport(quote);
      } else {
        // Use default built-in template
        this._exportWithBuiltinTemplate(quote);
      }
    } catch (e) {
      console.error('PDF Export Error:', e);
      this.toast('فشل تصدير PDF: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-pdf ml-1"></i>PDF'; }
    }
  },

  _showTemplateSelectionForExport(quote) {
    const templates = this.getPdfTemplatesList();
    this.showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-file-pdf ml-2 text-red-500"></i>اختر قالب التصدير</h3>
        <div class="space-y-2 mb-4">
          <button onclick="App.closeModal();App._exportWithBuiltinTemplate(window._exportQuote)" 
            class="w-full text-right p-3 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><i class="fas fa-table text-primary-600"></i></div>
              <div><p class="font-semibold text-gray-800">القالب الافتراضي (جدول بنود)</p>
              <p class="text-xs text-gray-500">عرض أتعاب مع جدول البنود والمجاميع</p></div>
            </div>
          </button>
          ${templates.map(t => `
          <button onclick="App.closeModal();App._exportWithTextTemplate('${t.id}', window._exportQuote)" 
            class="w-full text-right p-3 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><i class="fas fa-file-contract text-amber-600"></i></div>
              <div><p class="font-semibold text-gray-800">${this._escHtml(t.name)}</p>
              <p class="text-xs text-gray-500">قالب نصي مع متغيرات</p></div>
            </div>
          </button>`).join('')}
        </div>
        <div class="flex justify-end">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</button>
        </div>
      </div>
    `);
    window._exportQuote = quote;
  },

  // Export using text template (from template manager)
  async _exportWithTextTemplate(templateId, quote) {
    const template = this.getPdfTemplate(templateId);
    if (!template) { this.toast('القالب غير موجود', 'error'); return; }

    const cfg = this.getPdfSettings();
    const logo = this.getCompanyLogo();
    const items = quote.quote_items || [];
    const subtotal = quote.total || 0;
    const vatAmount = cfg.showVAT ? subtotal * (cfg.vatRate / 100) : 0;
    const grandTotal = subtotal + vatAmount;
    const fmtNum = (n) => new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
    const validDays = quote.valid_until ? Math.ceil((new Date(quote.valid_until) - new Date(quote.created_at)) / (1000*60*60*24)) : 30;

    // Build variables from quote data
    const vars = {
      quote_number: quote.quote_number || '',
      quote_date: this.fmtDate(quote.created_at),
      client_name: quote.clients?.name || '',
      company_name: quote.clients?.company || '',
      client_email: quote.clients?.email || '',
      client_phone: quote.clients?.phone || '',
      client_address: quote.clients?.address || '',
      subject: quote.title || '',
      company_name_internal: cfg.companyName || '',
      service_type: quote.title || '',
      scope_of_work: items.map((it, i) => `- ${it.description}`).join('\n'),
      start_days: '5',
      duration_days: '15',
      fees: fmtNum(subtotal),
      vat_percentage: String(cfg.vatRate),
      vat: fmtNum(vatAmount),
      total: fmtNum(grandTotal),
      validity_days: String(validDays),
      bank_name: '',
      iban: '',
      prepared_by: '',
      job_title: '',
      notes: quote.notes || '',
    };

    // Merge with saved template vars
    const savedVars = this.getQuoteVars();
    for (const key of Object.keys(savedVars)) {
      if (!vars[key] || vars[key] === '') vars[key] = savedVars[key];
    }

    // Fill template (or use pre-rendered content from quote if available)
    let filled = (quote.rendered_content && String(quote.rendered_content).trim()) ? String(quote.rendered_content) : template.content;
    if (!quote.rendered_content) {
      for (const [key, value] of Object.entries(vars)) {
        filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
      }
    }

    const pc = cfg.primaryColor || '#1e3a8a';
    
    // Convert plain text to styled HTML
    const htmlLines = filled.split('\n').map(line => {
      const trimmed = line.trim();
      if (/^-{10,}$/.test(trimmed)) return '<hr style="border:none;border-top:1.5px solid #d1d5db;margin:12px 0;">';
      if (trimmed === '') return '<div style="height:8px;"></div>';
      if (/^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً|الحادي عشر|الثاني عشر|الثالث عشر)/.test(trimmed)) {
        return `<h3 style="font-size:14px;font-weight:800;color:${pc};margin:18px 0 6px;padding:6px 12px;border-right:4px solid ${pc};background:${pc}08;">${this._escHtml(trimmed)}</h3>`;
      }
      if (trimmed.startsWith('- ')) return `<div style="padding:2px 0 2px 0;margin-right:16px;font-size:12px;color:#374151;">&#8226; ${this._escHtml(trimmed.substring(2))}</div>`;
      if (/^\d+\./.test(trimmed)) return `<div style="padding:2px 0;margin-right:16px;font-size:12px;color:#374151;">${this._escHtml(trimmed)}</div>`;
      return `<p style="font-size:12px;line-height:2;color:#1a1a2e;margin:0 0 4px;">${this._escHtml(trimmed)}</p>`;
    }).join('');

    this._printPdfHtml(`
      <div style="padding:0;margin:0;">
        <div style="height:5px;background:linear-gradient(90deg,${pc},${cfg.secondaryColor});"></div>
        <div style="padding:24px 36px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;">
          <div style="flex:1;">
            ${logo ? `<img src="${logo}" style="height:50px;margin-bottom:8px;" />` : ''}
            <h2 style="font-size:18px;font-weight:800;color:${pc};margin:0;">${this._escHtml(cfg.companyName)}</h2>
            ${cfg.companyNameEn ? `<p style="font-size:10px;color:#6b7280;margin:2px 0 0;">${this._escHtml(cfg.companyNameEn)}</p>` : ''}
            <div style="margin-top:6px;font-size:9px;color:#6b7280;line-height:1.8;">
              ${[cfg.companyAddress, cfg.companyPhone, cfg.companyEmail].filter(Boolean).map(d => `<span>${this._escHtml(d)}</span>`).join(' | ')}
            </div>
          </div>
          <div style="text-align:left;min-width:180px;">
            <div style="background:${pc};color:#fff;border-radius:8px;padding:14px 18px;text-align:center;">
              <h1 style="font-size:20px;font-weight:800;margin:0;">عرض أتعاب</h1>
              <p style="font-size:10px;margin:3px 0 0;opacity:0.85;">Fee Proposal</p>
            </div>
            <div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:6px;padding:8px 12px;margin-top:8px;text-align:center;">
              <p style="font-size:9px;color:#6b7280;margin:0;">رقم العرض</p>
              <p style="font-size:14px;font-weight:800;color:${pc};margin:2px 0 0;">${quote.quote_number || ''}</p>
            </div>
          </div>
        </div>
        <div style="padding:20px 36px;">
          ${htmlLines}
        </div>
        <div style="padding:12px 36px;background:${pc};text-align:center;margin-top:20px;">
          <p style="font-size:10px;color:#fff;margin:0;">${this._escHtml(cfg.footerText)}</p>
          <p style="font-size:8px;color:#ffffff99;margin:3px 0 0;">${this._escHtml(cfg.companyName)} | ${quote.quote_number || ''}</p>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,${cfg.secondaryColor},${pc});"></div>
      </div>
    `, `عرض-أتعاب-${quote.quote_number || 'draft'}`, quote.id);
  },

  // Export using built-in table template
  _exportWithBuiltinTemplate(quote) {
    const items = quote.quote_items || [];
    const cfg = this.getPdfSettings();
    const logo = this.getCompanyLogo();
    const pc = cfg.primaryColor || '#1e3a8a';
    const sc = cfg.secondaryColor || '#3b82f6';
    const fmtNum = (n) => new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
    const subtotal = quote.total || 0;
    const vatAmount = cfg.showVAT ? subtotal * (cfg.vatRate / 100) : 0;
    const grandTotal = subtotal + vatAmount;
    const validDays = quote.valid_until ? Math.ceil((new Date(quote.valid_until) - new Date(quote.created_at)) / (1000*60*60*24)) : 30;
    const clientName = quote.clients?.name || '';
    const clientCompany = quote.clients?.company || '';
    const clientEmail = quote.clients?.email || '';
    const clientPhone = quote.clients?.phone || '';
    const clientAddress = quote.clients?.address || '';
    const quoteNumber = quote.quote_number || '';
    const quoteDate = this.fmtDate(quote.created_at);
    const validUntil = quote.valid_until ? this.fmtDate(quote.valid_until) : '';

    const renderedBlock = (quote.rendered_content || '').trim();
    const renderedLinesHtml = renderedBlock ? renderedBlock.split('\n').map(line => {
      const t = this._escHtml((line || '').trim());
      if (!t) return '<div style="height:8px;"></div>';
      return `<p style="font-size:11px;line-height:2.1;color:#1f2937;margin:0 0 6px;white-space:pre-wrap;">${t}</p>`;
    }).join('') : '';

    this._printPdfHtml(`
      <div style="padding:0;margin:0;">
        <div style="height:5px;background:linear-gradient(90deg,${pc},${sc},${sc}99);"></div>
        
        <!-- Header -->
        <div style="padding:24px 36px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;">
          <div style="flex:1;">
            ${logo ? `<img src="${logo}" style="height:50px;margin-bottom:8px;" />` : ''}
            <h2 style="font-size:18px;font-weight:800;color:${pc};margin:0;line-height:1.3;">${this._escHtml(cfg.companyName)}</h2>
            ${cfg.companyNameEn ? `<p style="font-size:10px;color:#6b7280;margin:2px 0 0;font-weight:500;">${this._escHtml(cfg.companyNameEn)}</p>` : ''}
            <div style="margin-top:6px;font-size:9px;color:#6b7280;line-height:1.8;">
              ${cfg.companyAddress ? `<span style="color:${pc};margin-left:3px;">&#9679;</span> ${this._escHtml(cfg.companyAddress)}<br/>` : ''}
              ${cfg.companyPhone ? `<span style="color:${pc};margin-left:3px;">&#9679;</span> هاتف: <span dir="ltr">${this._escHtml(cfg.companyPhone)}</span><br/>` : ''}
              ${cfg.companyEmail ? `<span style="color:${pc};margin-left:3px;">&#9679;</span> ${this._escHtml(cfg.companyEmail)}` : ''}
            </div>
          </div>
          <div style="text-align:left;min-width:180px;">
            <div style="background:${pc};color:#fff;border-radius:8px;padding:14px 18px;text-align:center;">
              <h1 style="font-size:20px;font-weight:800;margin:0;">عرض أتعاب</h1>
              <p style="font-size:10px;margin:3px 0 0;opacity:0.85;">Fee Proposal</p>
            </div>
            <div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:6px;padding:8px 12px;margin-top:8px;text-align:center;">
              <p style="font-size:9px;color:#6b7280;margin:0;">رقم العرض / Ref No.</p>
              <p style="font-size:14px;font-weight:800;color:${pc};margin:2px 0 0;direction:ltr;">${quoteNumber}</p>
            </div>
            <p style="font-size:9px;color:#6b7280;margin:5px 0 0;text-align:center;">التاريخ: ${quoteDate}</p>
          </div>
        </div>

        <!-- Client & Details -->
        <div style="padding:16px 36px;display:flex;gap:16px;">
          <div style="flex:1;background:#fafbff;border:1px solid #e8ecf4;border-radius:8px;padding:14px 16px;">
            <p style="font-size:9px;font-weight:800;color:${pc};letter-spacing:1px;margin:0 0 8px;border-bottom:2px solid ${sc}44;padding-bottom:6px;">مقدم إلى / ADDRESSED TO</p>
            <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 3px;">${this._escHtml(clientName)}</p>
            ${clientCompany ? `<p style="font-size:11px;color:#4b5563;margin:0 0 2px;">${this._escHtml(clientCompany)}</p>` : ''}
            ${clientAddress ? `<p style="font-size:10px;color:#6b7280;margin:0 0 2px;">${this._escHtml(clientAddress)}</p>` : ''}
            ${clientEmail ? `<p style="font-size:10px;color:#6b7280;margin:0 0 2px;">${this._escHtml(clientEmail)}</p>` : ''}
            ${clientPhone ? `<p style="font-size:10px;color:#6b7280;margin:0;" dir="ltr" style="text-align:right;">${this._escHtml(clientPhone)}</p>` : ''}
          </div>
          <div style="flex:1;background:#fafbff;border:1px solid #e8ecf4;border-radius:8px;padding:14px 16px;">
            <p style="font-size:9px;font-weight:800;color:${pc};letter-spacing:1px;margin:0 0 8px;border-bottom:2px solid ${sc}44;padding-bottom:6px;">تفاصيل العرض / DETAILS</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="font-size:10px;color:#6b7280;padding:2px 0;">تاريخ الإصدار:</td><td style="font-size:11px;font-weight:600;color:#1a1a2e;">${quoteDate}</td></tr>
              ${validUntil ? `<tr><td style="font-size:10px;color:#6b7280;padding:2px 0;">صالح حتى:</td><td style="font-size:11px;font-weight:600;color:#1a1a2e;">${validUntil}</td></tr>` : ''}
              <tr><td style="font-size:10px;color:#6b7280;padding:2px 0;">مدة الصلاحية:</td><td style="font-size:11px;font-weight:600;color:#1a1a2e;">${validDays} يوماً</td></tr>
              ${cfg.companyCR ? `<tr><td style="font-size:10px;color:#6b7280;padding:2px 0;">السجل التجاري:</td><td style="font-size:11px;font-weight:600;color:#1a1a2e;">${this._escHtml(cfg.companyCR)}</td></tr>` : ''}
            </table>
          </div>
        </div>

        <!-- Subject -->
        ${quote.title ? `<div style="padding:0 36px;margin-bottom:14px;">
          <div style="background:${pc}08;border:1px solid ${sc}33;border-right:4px solid ${pc};border-radius:6px;padding:12px 16px;">
            <p style="font-size:9px;color:${pc};font-weight:700;margin:0 0 3px;">الموضوع / SUBJECT</p>
            <p style="font-size:14px;color:#1a1a2e;font-weight:700;margin:0;">${this._escHtml(quote.title)}</p>
          </div>
        </div>` : ''}

        ${renderedLinesHtml ? `<div style="padding:0 36px;margin-bottom:14px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;direction:rtl;text-align:right;">
            <p style="font-size:11px;font-weight:800;color:${pc};margin:0 0 8px;">نص العرض</p>
            ${renderedLinesHtml}
          </div>
        </div>` : ''}

        <!-- Items Table -->
        <div style="padding:0 36px;margin-bottom:14px;">
          <p style="font-size:11px;font-weight:800;color:${pc};margin:0 0 8px;">بنود الأتعاب / SCOPE & FEES</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;">
            <thead>
              <tr style="background:${pc};">
                <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#fff;width:30px;border-left:1px solid ${sc};">م</th>
                <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#fff;border-left:1px solid ${sc};">البند / الوصف</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#fff;width:50px;border-left:1px solid ${sc};">الكمية</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#fff;width:100px;border-left:1px solid ${sc};">سعر الوحدة</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#fff;width:100px;">المبلغ (${this._escHtml(cfg.currency)})</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fb'};border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 10px;font-size:11px;color:#6b7280;font-weight:700;text-align:center;border-left:1px solid #e5e7eb;">${i + 1}</td>
                  <td style="padding:8px 10px;font-size:11px;color:#1a1a2e;font-weight:500;border-left:1px solid #e5e7eb;">${this._escHtml(item.description)}</td>
                  <td style="padding:8px 10px;font-size:11px;color:#4b5563;text-align:center;border-left:1px solid #e5e7eb;">${item.quantity}</td>
                  <td style="padding:8px 10px;font-size:11px;color:#4b5563;text-align:center;border-left:1px solid #e5e7eb;">${fmtNum(item.unit_price)}</td>
                  <td style="padding:8px 10px;font-size:11px;color:#1a1a2e;font-weight:700;text-align:center;">${fmtNum(item.total || item.quantity * item.unit_price)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}

        <!-- Totals -->
        <div style="padding:0 36px;margin-bottom:16px;">
          <div style="display:flex;justify-content:flex-start;">
            <table style="width:280px;border-collapse:collapse;border:1px solid #d1d5db;">
              <tr style="background:#f8f9fb;border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 12px;font-size:11px;color:#6b7280;font-weight:600;">المجموع الفرعي</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1a1a2e;text-align:left;direction:ltr;width:120px;">${fmtNum(subtotal)} ${this._escHtml(cfg.currency)}</td>
              </tr>
              ${cfg.showVAT ? `<tr style="background:#f8f9fb;border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 12px;font-size:11px;color:#6b7280;font-weight:600;">ضريبة القيمة المضافة (${cfg.vatRate}%)</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1a1a2e;text-align:left;direction:ltr;">${fmtNum(vatAmount)} ${this._escHtml(cfg.currency)}</td>
              </tr>` : ''}
              <tr style="background:${pc};">
                <td style="padding:10px 12px;font-size:12px;font-weight:800;color:#fff;">الإجمالي ${cfg.showVAT ? 'شامل الضريبة' : ''}</td>
                <td style="padding:10px 12px;font-size:15px;font-weight:900;color:#fff;text-align:left;direction:ltr;">${fmtNum(grandTotal)} ${this._escHtml(cfg.currency)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Notes -->
        ${quote.notes ? `<div style="padding:0 36px;margin-bottom:12px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;">
            <p style="font-size:9px;font-weight:700;color:#92400e;margin:0 0 4px;">ملاحظات / NOTES</p>
            <p style="font-size:10px;color:#4b5563;margin:0;line-height:1.7;white-space:pre-wrap;">${this._escHtml(quote.notes)}</p>
          </div>
        </div>` : ''}

        <!-- Payment Terms -->
        ${cfg.showPaymentTerms && cfg.paymentTerms.length > 0 ? `<div style="padding:0 36px;margin-bottom:12px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;">
            <p style="font-size:9px;font-weight:700;color:#166534;margin:0 0 5px;">شروط الدفع / PAYMENT TERMS</p>
            <ul style="margin:0;padding:0 14px;list-style-type:disc;">
              ${cfg.paymentTerms.map(t => `<li style="font-size:10px;color:#374151;margin-bottom:2px;line-height:1.6;">${this._escHtml(t)}</li>`).join('')}
            </ul>
          </div>
        </div>` : ''}

        <!-- T&C -->
        ${cfg.showTermsAndConditions && cfg.termsAndConditions.length > 0 ? `<div style="padding:0 36px;margin-bottom:14px;">
          <div style="background:#fafbff;border:1px solid #e8ecf4;border-radius:6px;padding:10px 14px;">
            <p style="font-size:9px;font-weight:700;color:${pc};margin:0 0 5px;">الشروط والأحكام / TERMS & CONDITIONS</p>
            <ol style="margin:0;padding:0 16px;list-style-type:decimal;">
              ${cfg.termsAndConditions.map(t => `<li style="font-size:10px;color:#4b5563;margin-bottom:2px;line-height:1.6;">${this._escHtml(t)}</li>`).join('')}
            </ol>
          </div>
        </div>` : ''}

        <!-- Signature -->
        ${cfg.showSignatureArea ? `<div style="padding:0 36px;margin-bottom:16px;">
          <div style="display:flex;gap:24px;">
            <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;text-align:center;">
              <p style="font-size:9px;font-weight:700;color:${pc};margin:0 0 5px;">الطرف الأول / مقدم العرض</p>
              <p style="font-size:11px;font-weight:600;color:#374151;margin:0 0 3px;">${this._escHtml(cfg.companyName)}</p>
              <div style="height:50px;"></div>
              <div style="border-top:1px solid #d1d5db;padding-top:6px;">
                <p style="font-size:9px;color:#9ca3af;margin:0;">التوقيع: .........................................</p>
                <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;">الاسم: .........................................</p>
                <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;">التاريخ: .........................................</p>
              </div>
            </div>
            <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;text-align:center;">
              <p style="font-size:9px;font-weight:700;color:${pc};margin:0 0 5px;">الطرف الثاني / العميل</p>
              <p style="font-size:11px;font-weight:600;color:#374151;margin:0 0 3px;">${this._escHtml(clientName)}${clientCompany ? ' - ' + this._escHtml(clientCompany) : ''}</p>
              <div style="height:50px;"></div>
              <div style="border-top:1px solid #d1d5db;padding-top:6px;">
                <p style="font-size:9px;color:#9ca3af;margin:0;">التوقيع: .........................................</p>
                <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;">الاسم: .........................................</p>
                <p style="font-size:9px;color:#9ca3af;margin:2px 0 0;">التاريخ: .........................................</p>
              </div>
            </div>
          </div>
        </div>` : ''}

        <!-- Footer -->
        <div style="padding:12px 36px;background:${pc};text-align:center;">
          <p style="font-size:10px;color:#fff;margin:0;font-weight:500;">${this._escHtml(cfg.footerText)}</p>
          <p style="font-size:8px;color:#ffffff99;margin:3px 0 0;">${this._escHtml(cfg.companyName)} | ${quoteNumber}</p>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,${sc},${pc});"></div>
      </div>
    `, `عرض-أتعاب-${quoteNumber || 'draft'}`, quote.id);
  },

  // ========================================
  // Core PDF Print Engine (Browser-based, perfect Arabic)
  // ========================================
  async _printPdfHtml(htmlContent, fileName, quoteId = null) {
    try {
      await this._ensurePDFLibs();
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.right = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.width = '794px';
      wrapper.style.background = '#fff';
      wrapper.style.direction = 'rtl';
      wrapper.innerHTML = `<div style="width:100%;background:#fff;direction:rtl;line-height:1.9;padding:8px 0;">${htmlContent}</div>`;
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(wrapper);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      if (quoteId) {
        const dataUri = pdf.output('datauristring');
        const base64Data = dataUri.split(',')[1];
        const upload = await this.api('POST', `/api/quotes/${quoteId}/upload-pdf`, {
          base64Data,
          fileName: `${fileName}.pdf`
        });
        if (upload?.pdf_url) this.toast('تم إنشاء PDF وحفظه في التخزين السحابي');
      }

      pdf.save(`${fileName}.pdf`);
      return;
    } catch (e) {
      console.warn('PDF binary generation failed, fallback to print window:', e);
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (!printWindow) {
      this.toast('يرجى السماح بالنوافذ المنبثقة لتصدير PDF', 'error');
      return;
    }
    
    printWindow.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this._escHtml(fileName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif; 
      direction: rtl; 
      color: #1a1a2e; 
      line-height: 1.6;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page { 
      size: A4; 
      margin: 8mm 0 8mm 0; 
    }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    .print-actions { 
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%); 
      z-index: 9999; display: flex; gap: 8px; background: #fff; padding: 12px 20px; 
      border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e5e7eb;
    }
    .print-actions button {
      padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; 
      cursor: pointer; border: none; font-family: 'IBM Plex Sans Arabic', sans-serif;
    }
    .btn-print { background: #1e3a8a; color: #fff; }
    .btn-print:hover { background: #1e40af; }
    .btn-close { background: #f3f4f6; color: #374151; }
    .btn-close:hover { background: #e5e7eb; }
    table { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="no-print print-actions">
    <button class="btn-print" onclick="window.print()">&#128424; طباعة / حفظ PDF</button>
    <button class="btn-close" onclick="window.close()">&#10005; إغلاق</button>
  </div>
  <div id="pdf-content" style="max-width:210mm;margin:0 auto;">
    ${htmlContent}
  </div>
</body>
</html>`);
    printWindow.document.close();
    this.toast('تم فتح نافذة الطباعة - اختر "حفظ كـ PDF" للتصدير');
  },


    async deleteQuote(id) { if (!confirm('حذف هذا العرض؟ لا يمكن التراجع.')) return; try { await this.api('DELETE', `/api/quotes/${id}`); this.toast('تم حذف العرض'); history.pushState(null,'','/quotes'); this.route(); } catch(e) { this.toast(e.message,'error'); } },

  // ========================================
  // Kanban Board
  // ========================================
  async renderKanban() {
    this.showLoading();
    try {
      const quotes = await this.api('GET', '/api/quotes');
      const cols = [
        { id: 'draft', label: 'مسودة', color: 'gray', icon: 'fa-pencil-alt' },
        { id: 'sent', label: 'مُرسل', color: 'blue', icon: 'fa-paper-plane' },
        { id: 'accepted', label: 'مقبول', color: 'green', icon: 'fa-check-circle' },
        { id: 'rejected', label: 'مرفوض', color: 'red', icon: 'fa-times-circle' },
      ];

      this.setContent(`
        <div class="fade-in">
          <div class="mb-6"><h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-columns ml-2 text-primary-500"></i>كانبان العروض</h1><p class="text-gray-500 text-sm mt-1">اسحب البطاقات لتغيير حالة العرض</p></div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            ${cols.map(col => {
              const colQuotes = quotes.filter(q => q.status === col.id);
              const colTotal = colQuotes.reduce((s,q) => s + Number(q.total||0), 0);
              return `
              <div class="kanban-col bg-${col.color}-50/50 rounded-xl p-3 border-2 border-dashed border-${col.color}-200 min-h-[300px] transition-colors" id="kanban-${col.id}"
                ondragover="event.preventDefault();this.classList.add('border-solid','bg-${col.color}-100/50')"
                ondragleave="this.classList.remove('border-solid','bg-${col.color}-100/50')"
                ondrop="App.kanbanDrop(event,'${col.id}');this.classList.remove('border-solid','bg-${col.color}-100/50')">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2"><div class="w-7 h-7 bg-${col.color}-200 rounded-lg flex items-center justify-center"><i class="fas ${col.icon} text-${col.color}-600 text-xs"></i></div><h3 class="font-semibold text-sm text-gray-800">${col.label}</h3></div>
                  <span class="bg-${col.color}-200 text-${col.color}-700 text-xs font-bold px-2 py-0.5 rounded-full">${colQuotes.length}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3 font-medium">${this.fmtCurrency(colTotal)}</p>
                <div class="space-y-2">
                  ${colQuotes.map(q => `
                  <div class="kanban-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing" draggable="true" data-id="${q.id}"
                    ondragstart="event.dataTransfer.setData('text/plain','${q.id}');this.style.opacity='0.5'"
                    ondragend="this.style.opacity='1'">
                    <a href="/quotes/${q.id}" data-link class="block">
                      <p class="font-medium text-sm text-gray-800 mb-1 line-clamp-1">${q.title}</p>
                      <p class="text-[10px] text-gray-400 font-mono">${q.quote_number}</p>
                      <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                        <span class="text-xs text-gray-500 line-clamp-1">${q.clients?.name||''}</span>
                        <span class="text-xs font-bold text-gray-700">${this.fmtCurrency(q.total)}</span>
                      </div>
                      ${q.valid_until && this.isExpiringSoon(q.valid_until) ? '<div class="mt-1"><span class="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><i class="fas fa-clock ml-0.5"></i>ينتهي قريباً</span></div>' : ''}
                    </a>
                  </div>`).join('')}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async kanbanDrop(event, newStatus) {
    event.preventDefault();
    const qId = event.dataTransfer.getData('text/plain');
    if (!qId) return;
    try { await this.api('PATCH', `/api/quotes/${qId}/status`, { status: newStatus }); this.toast(`تم نقل العرض إلى: ${this.statusLabel(newStatus)}`); this.renderKanban(); } catch(e) { this.toast(e.message,'error'); }
  },

  // ========================================
  // القوالب
  // ========================================
  async renderTemplates() {
    this.showLoading();
    try {
      const templates = await this.api('GET', '/api/templates');
      this.setContent(`
        <div class="fade-in">
          <div class="flex justify-between items-center mb-6">
            <div><h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-layer-group ml-2 text-primary-500"></i>قوالب العروض</h1><p class="text-gray-500 text-sm mt-1">${templates.length} قالب</p></div>
            <div class="flex gap-2">
              <a href="/templates/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><i class="fas fa-plus"></i> قالب جديد</a>
              <a href="/templates/new?preset=fee-proposal" data-link class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><i class="fas fa-file-contract"></i> قالب عرض أتعاب</a>
            </div>
          </div>
          ${templates.length === 0 ? this._emptyState('fa-layer-group','لا توجد قوالب بعد','أنشئ قالبًا لتسريع إنشاء عروض الأسعار','/templates/new','قالب جديد') : `
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${templates.map(t => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3">
                <div><h3 class="font-semibold text-gray-800">${t.name}</h3>${t.description?`<p class="text-xs text-gray-500 mt-1">${t.description}</p>`:''}</div>
                <div class="flex items-center gap-1">
                  <a href="/templates/${t.id}/edit" data-link class="text-gray-400 hover:text-primary-600 p-1 rounded-lg hover:bg-primary-50"><i class="fas fa-edit text-xs"></i></a>
                  <button onclick="App.deleteTemplate('${t.id}')" class="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>
                </div>
              </div>
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span class="flex items-center gap-1"><i class="fas fa-list-ul"></i>${(t.template_items||[]).length} بند</span>
                <span class="flex items-center gap-1"><i class="fas fa-calendar"></i>${t.default_valid_days} يوم</span>
              </div>
              <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <p class="text-sm font-bold text-primary-600">${this.fmtCurrency((t.template_items||[]).reduce((s,i)=>s+i.quantity*i.unit_price,0))}</p>
                <a href="/quotes/new?template_id=${t.id}" data-link class="text-xs text-primary-600 hover:underline">استخدام</a>
              </div>
            </div>
          `).join('')}</div>`}
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async renderTemplateForm(id = null) {
    let template = null;
    if (id) {
      try { template = await this.api('GET', `/api/templates/${id}`); } catch {}
    }
    const params = new URLSearchParams(location.search);
    const isFeePreset = params.get('preset') === 'fee-proposal' || (template && template.template_type === 'fee_proposal');

    this.setContent(`
      <div class="fade-in max-w-5xl mx-auto">
        <div class="flex items-center gap-3 mb-6"><a href="/templates" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">إنشاء قالب جديد</h1></div>
        <form onsubmit="App.createTemplate(event)" class="space-y-4">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-info-circle ml-2 text-primary-500"></i>معلومات القالب</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">اسم القالب *</label><input type="text" id="tmpl-name" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="مثال: قالب تصميم مواقع"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">الوصف</label><input type="text" id="tmpl-desc" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="وصف مختصر للقالب"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">أيام الصلاحية الافتراضية</label><input type="number" id="tmpl-days" value="30" min="1" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
              <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">ملاحظات افتراضية</label><input type="text" id="tmpl-notes" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="ملاحظات تضاف تلقائياً عند استخدام القالب"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">نوع القالب</label><input type="text" id="tmpl-type" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="fee_proposal"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">نوع الخدمة</label><input type="text" id="tmpl-service-type" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="machinery_valuation"/></div>
            </div>
          </div>
          <div class="grid gap-4 lg:grid-cols-3">
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold text-gray-800"><i class="fas fa-file-signature ml-2 text-amber-500"></i>محتوى خطاب العرض</h3>
                <button type="button" onclick="App.insertTemplateVariable('{{client_name}}')" class="text-xs text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-lg">إدراج اسم العميل</button>
              </div>
              <textarea id="tmpl-content" rows="16" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm whitespace-pre" dir="rtl">عرض أتعاب - تقييم الأصول الثابتة

رقم العرض: {{quote_number}}
التاريخ: {{quote_date}}

السادة/ {{client_name}}

الموضوع: {{subject}}

{{scope_of_work}}

الأتعاب: {{fees}}
ضريبة القيمة المضافة: {{vat}}
الإجمالي: {{total}}

{{bank_name}}
{{iban}}</textarea>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">متغيرات القالب (JSON)</label>
                <textarea id="tmpl-vars-json" rows="5" class="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr">{}</textarea>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-code ml-2 text-primary-500"></i>المتغيرات</h3>
              <div class="space-y-2">
                ${['quote_number','quote_date','client_name','subject','scope_of_work','fees','vat','total','bank_name','iban'].map(v => `<button type="button" onclick="App.insertTemplateVariable('{{${v}}}')" class="w-full text-right text-xs bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono">{{${v}}}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="grid gap-4 lg:grid-cols-3">
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold text-gray-800"><i class="fas fa-file-signature ml-2 text-amber-500"></i>محتوى خطاب العرض</h3>
                <button type="button" onclick="App.insertTemplateVariable('{{client_name}}')" class="text-xs text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-lg">إدراج اسم العميل</button>
              </div>
              <textarea id="tmpl-content" rows="16" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm whitespace-pre" dir="rtl">${template?.content || `عرض أتعاب - تقييم الأصول الثابتة

رقم العرض: {{quote_number}}
التاريخ: {{quote_date}}

السادة/ {{client_name}}

الموضوع: {{subject}}

{{scope_of_work}}

الأتعاب: {{fees}}
ضريبة القيمة المضافة: {{vat}}
الإجمالي: {{total}}

{{bank_name}}
{{iban}`}</textarea>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">متغيرات القالب (JSON)</label>
                <textarea id="tmpl-vars-json" rows="5" class="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr">${JSON.stringify(template?.variables_json || {}, null, 2)}</textarea>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-code ml-2 text-primary-500"></i>المتغيرات</h3>
              <div class="space-y-2">
                ${['quote_number','quote_date','client_name','subject','scope_of_work','fees','vat','total','bank_name','iban'].map(v => `<button type="button" onclick="App.insertTemplateVariable('{{${v}}}')" class="w-full text-right text-xs bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono">{{${v}}}</button>`).join('')}
              </div>
            </div>
          </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800"><i class="fas fa-list-ul ml-2 text-primary-500"></i>البنود الافتراضية</h3><button type="button" onclick="App.addItem()" class="text-primary-600 text-sm font-medium hover:bg-primary-50 px-3 py-1 rounded-lg"><i class="fas fa-plus ml-1"></i> إضافة بند</button></div>
            <div id="quote-items" class="space-y-2">${(template?.template_items || []).map(item => this._itemRow(item)).join('') || this._itemRow()}</div>
          </div>
          <div class="flex justify-end gap-3"><a href="/templates" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-tmpl-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> ${id ? 'تحديث القالب' : 'حفظ القالب'}</button></div>
        </form>
      </div>
    `);
  },

  async createTemplate(e, templateId = '') {
    e.preventDefault();
    const items = []; document.querySelectorAll('.quote-item').forEach(item => { items.push({ description: item.querySelector('[name="description"]').value, quantity: parseFloat(item.querySelector('[name="quantity"]').value), unit_price: parseFloat(item.querySelector('[name="unit_price"]').value) }); });
    try {
      let vars = {};
      const rawVars = document.getElementById('tmpl-vars-json')?.value || '{}';
      if (rawVars.trim()) vars = JSON.parse(rawVars);
      await this.api('POST', '/api/templates', {
        name: document.getElementById('tmpl-name').value,
        description: document.getElementById('tmpl-desc').value,
        default_notes: document.getElementById('tmpl-notes').value,
        default_valid_days: parseInt(document.getElementById('tmpl-days').value)||30,
        content: document.getElementById('tmpl-content').value,
        variables_json: vars,
        template_type: document.getElementById('tmpl-type')?.value || null,
        service_type: document.getElementById('tmpl-service-type')?.value || null,
        is_active: true,
        items
      });
      this.toast('تم إنشاء القالب بنجاح'); history.pushState(null,'','/templates'); this.route();
    } catch(e) { this.toast(e.message,'error'); }
  },

  insertTemplateVariable(variable) {
    const textarea = document.getElementById('tmpl-content');
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = textarea.value || '';
    textarea.value = current.slice(0, start) + variable + current.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
  },

  async deleteTemplate(id) { if (!confirm('حذف هذا القالب؟')) return; try { await this.api('DELETE',`/api/templates/${id}`); this.toast('تم حذف القالب'); this.renderTemplates(); } catch(e) { this.toast(e.message,'error'); } },

  // ========================================
  // المشاريع
  // ========================================
  async renderProjects() {
    this.showLoading();
    try {
      const projects = await this.api('GET', '/api/projects');
      this.setContent(`
        <div class="fade-in">
          <div class="mb-6"><h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-project-diagram ml-2 text-primary-500"></i>المشاريع</h1><p class="text-gray-500 text-sm mt-1">${projects.length} مشروع</p></div>
          ${projects.length === 0 ? '<div class="bg-white rounded-xl border border-gray-100 p-12 text-center"><div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-project-diagram text-3xl text-gray-400"></i></div><h3 class="text-lg font-medium text-gray-600 mb-2">لا توجد مشاريع بعد</h3><p class="text-gray-400 text-sm">حوّل عرضًا مقبولاً إلى مشروع من صفحة تفاصيل العرض</p></div>' : `
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${projects.map(p => `
            <a href="/projects/${p.id}" data-link class="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3"><h3 class="font-semibold text-gray-800">${p.name}</h3>${this.projectStatusBadge(p.status)}</div>
              <p class="text-sm text-gray-500"><i class="fas fa-user ml-1 text-gray-400"></i>${p.clients?.name||''} ${p.clients?.company?' - '+p.clients.company:''}</p>
              ${p.quotes?`<p class="text-xs text-gray-400 mt-1"><i class="fas fa-file-alt ml-1"></i>${p.quotes.quote_number}</p>`:''}
              <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <span class="text-xs text-gray-400"><i class="fas fa-calendar ml-1"></i>${p.start_date?this.fmtDate(p.start_date):'-'}</span>
                <span class="text-sm font-bold text-primary-600">${this.fmtCurrency(p.budget)}</span>
              </div>
            </a>`).join('')}</div>`}
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async renderProjectDetail(id) {
    this.showLoading();
    try {
      const project = await this.api('GET', `/api/projects/${id}`);
      this.setContent(`
        <div class="fade-in max-w-2xl mx-auto">
          <div class="flex items-center gap-3 mb-6"><a href="/projects" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a>
            <div class="flex-1"><h1 class="text-xl font-bold text-gray-800">${project.name}</h1></div>${this.projectStatusBadge(project.status)}
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div class="grid sm:grid-cols-2 gap-4 text-sm">
              <div class="flex items-center gap-2"><span class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><i class="fas fa-user text-blue-500 text-xs"></i></span><div><span class="text-gray-500 text-xs">العميل</span><p class="font-medium">${project.clients?.name||'-'}</p></div></div>
              <div class="flex items-center gap-2"><span class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><i class="fas fa-coins text-green-500 text-xs"></i></span><div><span class="text-gray-500 text-xs">الميزانية</span><p class="font-bold text-primary-600">${this.fmtCurrency(project.budget)}</p></div></div>
              <div class="flex items-center gap-2"><span class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center"><i class="fas fa-calendar text-amber-500 text-xs"></i></span><div><span class="text-gray-500 text-xs">تاريخ البدء</span><p>${this.fmtDate(project.start_date)}</p></div></div>
              <div class="flex items-center gap-2"><span class="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><i class="fas fa-flag-checkered text-red-500 text-xs"></i></span><div><span class="text-gray-500 text-xs">تاريخ الانتهاء</span><p>${this.fmtDate(project.end_date)}</p></div></div>
              ${project.quotes?`<div class="sm:col-span-2"><span class="text-gray-500 text-xs">العرض المرتبط</span><a href="/quotes/${project.quote_id}" data-link class="block text-primary-600 hover:underline font-medium mt-0.5">${project.quotes.quote_number} - ${project.quotes.title}</a></div>`:''}
              ${project.description?`<div class="sm:col-span-2"><span class="text-gray-500 text-xs">الوصف</span><p class="mt-0.5">${project.description}</p></div>`:''}
            </div>
            <div class="pt-4 border-t border-gray-100">
              <h4 class="text-sm font-medium text-gray-700 mb-3">تغيير حالة المشروع</h4>
              <div class="flex gap-2 flex-wrap">
                ${['active','on_hold','completed','cancelled'].map(s => {
                  const lbl = {active:'نشط',on_hold:'معلّق',completed:'مكتمل',cancelled:'ملغي'}[s];
                  const icons = {active:'fa-play',on_hold:'fa-pause',completed:'fa-check',cancelled:'fa-ban'}[s];
                  return `<button onclick="App.updateProject('${id}','${s}')" class="px-3 py-2 text-xs font-medium rounded-xl border transition-all flex items-center gap-1 ${project.status===s?'bg-primary-100 border-primary-300 text-primary-700 shadow-sm':'border-gray-200 text-gray-500 hover:bg-gray-50'}"><i class="fas ${icons}"></i>${lbl}</button>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  async updateProject(id, status) {
    try { await this.api('PATCH', `/api/projects/${id}`, { status }); this.toast('تم تحديث حالة المشروع'); this.renderProjectDetail(id); } catch(e) { this.toast(e.message,'error'); }
  },

  // ========================================
  // التقارير
  // ========================================
  async renderReports() {
    this.showLoading();
    try {
      const stats = await this.api('GET', '/api/quotes/stats/dashboard');
      const months = stats.monthly || [];
      const avgQuoteValue = stats.totalQuotes > 0 ? stats.totalValue / stats.totalQuotes : 0;

      this.setContent(`
        <div class="fade-in space-y-6">
          <div><h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-chart-bar ml-2 text-primary-500"></i>تقارير الأداء</h1><p class="text-gray-500 text-sm mt-1">تحليل شامل لأداء المبيعات</p></div>

          <!-- KPIs -->
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white shadow-lg">
              <div class="flex items-center gap-2 mb-2"><i class="fas fa-trophy text-primary-200"></i><span class="text-primary-100 text-xs">نسبة الفوز</span></div>
              <p class="text-4xl font-bold">${stats.winRate}%</p>
              <p class="text-primary-200 text-xs mt-1">${stats.statusCounts.accepted} مقبول من ${stats.statusCounts.accepted + stats.statusCounts.rejected} محسوم</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-2"><div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><i class="fas fa-check-circle text-green-600 text-sm"></i></div><span class="text-gray-500 text-xs">المقبولة</span></div>
              <p class="text-2xl font-bold text-gray-800">${stats.statusCounts.accepted}</p>
              <p class="text-green-600 text-sm font-bold mt-1">${this.fmtCurrency(stats.acceptedValue)}</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-2"><div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-clock text-blue-600 text-sm"></i></div><span class="text-gray-500 text-xs">قيد الانتظار</span></div>
              <p class="text-2xl font-bold text-gray-800">${stats.statusCounts.sent}</p>
              <p class="text-blue-600 text-sm font-bold mt-1">${this.fmtCurrency(stats.sentValue)}</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-2"><div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><i class="fas fa-calculator text-purple-600 text-sm"></i></div><span class="text-gray-500 text-xs">متوسط قيمة العرض</span></div>
              <p class="text-xl font-bold text-gray-800">${this.fmtCurrency(avgQuoteValue)}</p>
              <p class="text-gray-400 text-xs mt-1">من ${stats.totalQuotes} عرض</p>
            </div>
          </div>

          <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-chart-pie ml-2 text-primary-500"></i>توزيع الحالات</h3>
              <div class="space-y-3">
                ${['draft','sent','accepted','rejected','expired'].map(s => {
                  const count = stats.statusCounts[s] || 0;
                  const pct = stats.totalQuotes > 0 ? Math.round((count/stats.totalQuotes)*100) : 0;
                  const colors = {draft:'gray',sent:'blue',accepted:'green',rejected:'red',expired:'amber'}[s];
                  return `<div class="flex items-center gap-3"><span class="w-14 text-xs text-gray-600 font-medium">${this.statusLabel(s)}</span><div class="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden"><div class="bg-${colors}-500 h-7 rounded-full flex items-center justify-end px-2 transition-all duration-500" style="width:${Math.max(pct,5)}%"><span class="text-[10px] text-white font-bold">${count}</span></div></div><span class="w-10 text-xs text-gray-500 text-left font-medium">${pct}%</span></div>`;
                }).join('')}
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-coins ml-2 text-primary-500"></i>القيم الإجمالية</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span class="text-sm text-gray-600"><i class="fas fa-file-alt ml-1 text-gray-400"></i>إجمالي العروض</span><span class="font-bold text-gray-800">${this.fmtCurrency(stats.totalValue)}</span></div>
                <div class="flex justify-between items-center p-3 bg-green-50 rounded-xl"><span class="text-sm text-green-700"><i class="fas fa-check-circle ml-1"></i>المقبولة</span><span class="font-bold text-green-700">${this.fmtCurrency(stats.acceptedValue)}</span></div>
                <div class="flex justify-between items-center p-3 bg-blue-50 rounded-xl"><span class="text-sm text-blue-700"><i class="fas fa-paper-plane ml-1"></i>قيد الانتظار</span><span class="font-bold text-blue-700">${this.fmtCurrency(stats.sentValue)}</span></div>
                <div class="flex justify-between items-center p-3 bg-purple-50 rounded-xl"><span class="text-sm text-purple-700"><i class="fas fa-calculator ml-1"></i>متوسط القيمة</span><span class="font-bold text-purple-700">${this.fmtCurrency(avgQuoteValue)}</span></div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-semibold text-gray-800 mb-4"><i class="fas fa-calendar-alt ml-2 text-primary-500"></i>الأداء الشهري (آخر 6 أشهر)</h3>
            <div class="overflow-x-auto"><table class="w-full">
              <thead class="bg-gray-50"><tr>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">الشهر</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">العروض</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">المقبولة</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">نسبة الفوز</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">القيمة</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-50">
                ${months.map(m => {
                  const wr = m.total > 0 ? Math.round((m.accepted/m.total)*100) : 0;
                  const lbl = new Date(m.month+'-15').toLocaleDateString('ar-SA',{year:'numeric',month:'long'});
                  return `<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm text-gray-800 font-medium">${lbl}</td><td class="px-4 py-3 text-sm text-center">${m.total}</td><td class="px-4 py-3 text-sm text-center text-green-600 font-bold">${m.accepted}</td><td class="px-4 py-3 text-sm text-center"><span class="bg-${wr>=50?'green':'gray'}-100 text-${wr>=50?'green':'gray'}-700 px-2 py-0.5 rounded-full text-xs font-medium">${wr}%</span></td><td class="px-4 py-3 text-sm text-left font-bold">${this.fmtCurrency(m.value)}</td></tr>`;
                }).join('')}
              </tbody>
            </table></div>
          </div>
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },
  // ========================================
  // PDF Template Settings Page (إعدادات قالب عرض الأتعاب)
  // ========================================
  renderPdfSettings() {
    const cfg = this.getPdfSettings();
    this.setContent(`
      <div class="fade-in space-y-6 max-w-4xl">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-cog ml-2 text-primary-500"></i>إعدادات قالب عرض الأتعاب</h1>
            <p class="text-gray-500 text-sm mt-1">خصّص قالب PDF الخاص بك ليتناسب مع هوية شركتك</p>
          </div>
          <button onclick="App.previewPdfTemplate()" class="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            <i class="fas fa-eye ml-1"></i>معاينة القالب
          </button>
        </div>

        <form onsubmit="App.savePdfSettingsForm(event)">
          <!-- Company Info -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-building ml-2 text-primary-500"></i>بيانات الشركة / المكتب</h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اسم الشركة (عربي) *</label>
                <input type="text" id="cfg-companyName" value="${this._escAttr(cfg.companyName)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اسم الشركة (إنجليزي)</label>
                <input type="text" id="cfg-companyNameEn" value="${this._escAttr(cfg.companyNameEn)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input type="text" id="cfg-companyAddress" value="${this._escAttr(cfg.companyAddress)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input type="text" id="cfg-companyPhone" value="${this._escAttr(cfg.companyPhone)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input type="email" id="cfg-companyEmail" value="${this._escAttr(cfg.companyEmail)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الموقع الإلكتروني</label>
                <input type="text" id="cfg-companyWebsite" value="${this._escAttr(cfg.companyWebsite)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
                <input type="text" id="cfg-companyCR" value="${this._escAttr(cfg.companyCR)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                <input type="text" id="cfg-companyVAT" value="${this._escAttr(cfg.companyVAT)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">رابط شعار الشركة (URL)</label>
                <input type="url" id="cfg-logoUrl" value="${this._escAttr(cfg.logoUrl)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" placeholder="https://example.com/logo.png" />
                <p class="text-xs text-gray-400 mt-1">أدخل رابط مباشر لصورة الشعار (PNG أو JPG). اتركه فارغاً لعدم عرض شعار.</p>
              </div>
            </div>
          </div>

          <!-- Appearance -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-palette ml-2 text-purple-500"></i>المظهر والألوان</h3>
            <div class="grid sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اللون الرئيسي</label>
                <div class="flex items-center gap-2">
                  <input type="color" id="cfg-primaryColor" value="${cfg.primaryColor}" class="w-10 h-10 rounded border-0 cursor-pointer" />
                  <input type="text" id="cfg-primaryColorText" value="${cfg.primaryColor}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" onchange="document.getElementById('cfg-primaryColor').value=this.value" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اللون الثانوي</label>
                <div class="flex items-center gap-2">
                  <input type="color" id="cfg-secondaryColor" value="${cfg.secondaryColor}" class="w-10 h-10 rounded border-0 cursor-pointer" />
                  <input type="text" id="cfg-secondaryColorText" value="${cfg.secondaryColor}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" onchange="document.getElementById('cfg-secondaryColor').value=this.value" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">العملة</label>
                <div class="flex gap-2">
                  <input type="text" id="cfg-currency" value="${this._escAttr(cfg.currency)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="ر.س" />
                  <input type="text" id="cfg-currencyEn" value="${this._escAttr(cfg.currencyEn)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" placeholder="SAR" />
                </div>
              </div>
            </div>
          </div>

          <!-- VAT & Financial -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-percent ml-2 text-green-500"></i>الضريبة والمالية</h3>
            <div class="grid sm:grid-cols-3 gap-4 items-end">
              <div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="cfg-showVAT" ${cfg.showVAT ? 'checked' : ''} class="w-4 h-4 text-primary-600 rounded" />
                  <span class="text-sm font-medium text-gray-700">إظهار ضريبة القيمة المضافة</span>
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نسبة الضريبة (%)</label>
                <input type="number" id="cfg-vatRate" value="${cfg.vatRate}" min="0" max="100" step="0.5" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
              </div>
            </div>
          </div>

          <!-- Payment Terms -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-money-bill-wave ml-2 text-green-500"></i>شروط الدفع</h3>
            <label class="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" id="cfg-showPaymentTerms" ${cfg.showPaymentTerms ? 'checked' : ''} class="w-4 h-4 text-primary-600 rounded" />
              <span class="text-sm font-medium text-gray-700">إظهار شروط الدفع في القالب</span>
            </label>
            <div id="payment-terms-list">
              ${cfg.paymentTerms.map((t, i) => `
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-gray-400 w-5">${i+1}.</span>
                  <input type="text" value="${this._escAttr(t)}" class="payment-term-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>
                </div>
              `).join('')}
            </div>
            <button type="button" onclick="App._addPaymentTerm()" class="text-primary-600 text-xs font-medium hover:text-primary-800 mt-1"><i class="fas fa-plus ml-1"></i>إضافة بند دفع</button>
          </div>

          <!-- Terms & Conditions -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-gavel ml-2 text-amber-500"></i>الشروط والأحكام</h3>
            <label class="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" id="cfg-showTermsAndConditions" ${cfg.showTermsAndConditions ? 'checked' : ''} class="w-4 h-4 text-primary-600 rounded" />
              <span class="text-sm font-medium text-gray-700">إظهار الشروط والأحكام في القالب</span>
            </label>
            <div id="terms-list">
              ${cfg.termsAndConditions.map((t, i) => `
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-gray-400 w-5">${i+1}.</span>
                  <input type="text" value="${this._escAttr(t)}" class="terms-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>
                </div>
              `).join('')}
            </div>
            <button type="button" onclick="App._addTerm()" class="text-primary-600 text-xs font-medium hover:text-primary-800 mt-1"><i class="fas fa-plus ml-1"></i>إضافة شرط</button>
          </div>

          <!-- Signature & Footer -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
            <h3 class="font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100"><i class="fas fa-signature ml-2 text-indigo-500"></i>التوقيع والتذييل</h3>
            <div class="space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="cfg-showSignatureArea" ${cfg.showSignatureArea ? 'checked' : ''} class="w-4 h-4 text-primary-600 rounded" />
                <span class="text-sm font-medium text-gray-700">إظهار منطقة التوقيع</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="cfg-showCompanyStamp" ${cfg.showCompanyStamp ? 'checked' : ''} class="w-4 h-4 text-primary-600 rounded" />
                <span class="text-sm font-medium text-gray-700">إظهار حقل الختم</span>
              </label>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نص التذييل</label>
                <input type="text" id="cfg-footerText" value="${this._escAttr(cfg.footerText)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <button type="submit" class="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors">
              <i class="fas fa-save ml-1"></i>حفظ الإعدادات
            </button>
            <button type="button" onclick="App.resetPdfSettings()" class="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              <i class="fas fa-undo ml-1"></i>استعادة الافتراضي
            </button>
          </div>
        </form>
      </div>
    `);

    // Sync color pickers with text inputs
    document.getElementById('cfg-primaryColor').addEventListener('input', (e) => {
      document.getElementById('cfg-primaryColorText').value = e.target.value;
    });
    document.getElementById('cfg-secondaryColor').addEventListener('input', (e) => {
      document.getElementById('cfg-secondaryColorText').value = e.target.value;
    });
  },

  _escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  _escAttr(s) { return this._escHtml(s); },

  _addPaymentTerm() {
    const list = document.getElementById('payment-terms-list');
    const count = list.querySelectorAll('.payment-term-input').length + 1;
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `<span class="text-xs text-gray-400 w-5">${count}.</span><input type="text" class="payment-term-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="بند دفع جديد..." /><button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>`;
    list.appendChild(div);
    div.querySelector('input').focus();
  },

  _addTerm() {
    const list = document.getElementById('terms-list');
    const count = list.querySelectorAll('.terms-input').length + 1;
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `<span class="text-xs text-gray-400 w-5">${count}.</span><input type="text" class="terms-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="شرط جديد..." /><button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>`;
    list.appendChild(div);
    div.querySelector('input').focus();
  },

  savePdfSettingsForm(e) {
    e.preventDefault();
    const settings = {
      companyName: document.getElementById('cfg-companyName').value.trim(),
      companyNameEn: document.getElementById('cfg-companyNameEn').value.trim(),
      companyAddress: document.getElementById('cfg-companyAddress').value.trim(),
      companyPhone: document.getElementById('cfg-companyPhone').value.trim(),
      companyEmail: document.getElementById('cfg-companyEmail').value.trim(),
      companyWebsite: document.getElementById('cfg-companyWebsite').value.trim(),
      companyCR: document.getElementById('cfg-companyCR').value.trim(),
      companyVAT: document.getElementById('cfg-companyVAT').value.trim(),
      logoUrl: document.getElementById('cfg-logoUrl').value.trim(),
      primaryColor: document.getElementById('cfg-primaryColor').value,
      secondaryColor: document.getElementById('cfg-secondaryColor').value,
      showVAT: document.getElementById('cfg-showVAT').checked,
      vatRate: parseFloat(document.getElementById('cfg-vatRate').value) || 15,
      currency: document.getElementById('cfg-currency').value.trim() || 'ر.س',
      currencyEn: document.getElementById('cfg-currencyEn').value.trim() || 'SAR',
      showPaymentTerms: document.getElementById('cfg-showPaymentTerms').checked,
      paymentTerms: [...document.querySelectorAll('.payment-term-input')].map(i => i.value.trim()).filter(v => v),
      showTermsAndConditions: document.getElementById('cfg-showTermsAndConditions').checked,
      termsAndConditions: [...document.querySelectorAll('.terms-input')].map(i => i.value.trim()).filter(v => v),
      showSignatureArea: document.getElementById('cfg-showSignatureArea').checked,
      showCompanyStamp: document.getElementById('cfg-showCompanyStamp').checked,
      footerText: document.getElementById('cfg-footerText').value.trim(),
    };
    this.savePdfSettings(settings);
    this.toast('تم حفظ إعدادات القالب بنجاح');
  },

  resetPdfSettings() {
    if (!confirm('استعادة جميع الإعدادات الافتراضية؟ سيتم فقدان التخصيصات الحالية.')) return;
    localStorage.removeItem('pdfSettings');
    this.toast('تم استعادة الإعدادات الافتراضية', 'info');
    this.renderPdfSettings();
  },

  async previewPdfTemplate() {
    this.toast('جارٍ إنشاء معاينة القالب...', 'info');
    // Save current form first
    const form = document.querySelector('form');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
    
    try {
      await this._ensurePDFLibs();
      const cfg = this.getPdfSettings();
      const fmtNum = (n) => new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
      
      // Create sample data for preview
      const sampleItems = [
        { description: 'دراسة وتحليل المتطلبات', quantity: 1, unit_price: 5000 },
        { description: 'تصميم واجهات المستخدم (UI/UX)', quantity: 1, unit_price: 8000 },
        { description: 'تطوير البرمجيات والتنفيذ', quantity: 1, unit_price: 15000 },
        { description: 'الاختبار وضمان الجودة', quantity: 1, unit_price: 3000 },
        { description: 'التدريب والتوثيق', quantity: 1, unit_price: 2000 },
      ];
      const subtotal = sampleItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const vatAmount = cfg.showVAT ? subtotal * (cfg.vatRate / 100) : 0;
      const grandTotal = subtotal + vatAmount;
      const pc = cfg.primaryColor;
      const sc = cfg.secondaryColor;

      const previewHtml = `
        <div style="max-width:794px;margin:0 auto;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.15);direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;color:#1a1a2e;line-height:1.6;">
          <div style="height:6px;background:linear-gradient(90deg,${pc},${sc},${sc}99);"></div>
          <div style="padding:28px 40px 20px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;">
            <div style="flex:1;">
              ${cfg.logoUrl ? `<img src="${cfg.logoUrl}" style="height:50px;margin-bottom:8px;" onerror="this.style.display='none'" />` : ''}
              <h2 style="font-size:20px;font-weight:800;color:${pc};margin:0;">${cfg.companyName}</h2>
              ${cfg.companyNameEn ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0;">${cfg.companyNameEn}</p>` : ''}
              <div style="margin-top:6px;font-size:10px;color:#6b7280;line-height:1.8;">
                ${cfg.companyAddress ? `<span>&#9679; ${cfg.companyAddress}</span><br/>` : ''}
                ${cfg.companyPhone ? `<span>&#9679; هاتف: <span dir="ltr">${cfg.companyPhone}</span></span><br/>` : ''}
                ${cfg.companyEmail ? `<span>&#9679; ${cfg.companyEmail}</span>` : ''}
              </div>
            </div>
            <div style="text-align:left;min-width:200px;">
              <div style="background:${pc};color:#fff;border-radius:10px;padding:16px 20px;text-align:center;">
                <h1 style="font-size:22px;font-weight:800;margin:0;">عرض أتعاب</h1>
                <p style="font-size:11px;margin:4px 0 0;opacity:0.85;">Fee Proposal</p>
              </div>
              <div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:8px;padding:10px 14px;margin-top:10px;text-align:center;">
                <p style="font-size:10px;color:#6b7280;margin:0;">رقم العرض</p>
                <p style="font-size:15px;font-weight:800;color:${pc};margin:3px 0 0;">QT-2026-001</p>
              </div>
            </div>
          </div>
          <div style="padding:20px 40px;text-align:center;color:#6b7280;font-size:12px;">[ معاينة فقط - البيانات الفعلية ستظهر عند تصدير عرض حقيقي ]</div>
          <div style="padding:0 40px 18px;">
            <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;">
              <thead><tr style="background:${pc};"><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#fff;width:36px;border-left:1px solid ${sc};">م</th><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#fff;border-left:1px solid ${sc};">البند</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#fff;width:60px;border-left:1px solid ${sc};">الكمية</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#fff;width:100px;border-left:1px solid ${sc};">سعر الوحدة</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#fff;width:100px;">المبلغ</th></tr></thead>
              <tbody>${sampleItems.map((item, i) => `<tr style="background:${i%2===0?'#fff':'#f8f9fb'};border-bottom:1px solid #e5e7eb;"><td style="padding:10px 12px;font-size:12px;text-align:center;border-left:1px solid #e5e7eb;">${i+1}</td><td style="padding:10px 12px;font-size:12px;border-left:1px solid #e5e7eb;">${item.description}</td><td style="padding:10px 12px;font-size:12px;text-align:center;border-left:1px solid #e5e7eb;">${item.quantity}</td><td style="padding:10px 12px;font-size:12px;text-align:center;direction:ltr;border-left:1px solid #e5e7eb;">${fmtNum(item.unit_price)}</td><td style="padding:10px 12px;font-size:12px;text-align:center;direction:ltr;font-weight:700;">${fmtNum(item.quantity*item.unit_price)}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          <div style="padding:0 40px 18px;"><div style="display:flex;justify-content:flex-start;">
            <table style="width:300px;border-collapse:collapse;border:1px solid #d1d5db;">
              <tr style="background:#f8f9fb;border-bottom:1px solid #e5e7eb;"><td style="padding:9px 14px;font-size:12px;color:#6b7280;">المجموع الفرعي</td><td style="padding:9px 14px;font-size:13px;font-weight:700;text-align:left;direction:ltr;">${fmtNum(subtotal)} ${cfg.currency}</td></tr>
              ${cfg.showVAT ? `<tr style="background:#f8f9fb;border-bottom:1px solid #e5e7eb;"><td style="padding:9px 14px;font-size:12px;color:#6b7280;">ضريبة (${cfg.vatRate}%)</td><td style="padding:9px 14px;font-size:13px;font-weight:700;text-align:left;direction:ltr;">${fmtNum(vatAmount)} ${cfg.currency}</td></tr>` : ''}
              <tr style="background:${pc};"><td style="padding:12px 14px;font-size:13px;font-weight:800;color:#fff;">الإجمالي</td><td style="padding:12px 14px;font-size:16px;font-weight:900;color:#fff;text-align:left;direction:ltr;">${fmtNum(grandTotal)} ${cfg.currency}</td></tr>
            </table>
          </div></div>
          <div style="padding:14px 40px;background:${pc};text-align:center;">
            <p style="font-size:11px;color:#fff;margin:0;">${cfg.footerText}</p>
          </div>
          <div style="height:4px;background:linear-gradient(90deg,${sc},${pc});"></div>
        </div>
      `;

      this.showModal(`
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-800"><i class="fas fa-eye ml-2 text-primary-500"></i>معاينة القالب</h3>
            <button onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
          </div>
          <div style="max-height:70vh;overflow-y:auto;border-radius:8px;border:1px solid #e5e7eb;">
            ${previewHtml}
          </div>
          <p class="text-xs text-gray-400 text-center mt-3">هذه معاينة تقريبية - ملف PDF النهائي سيحتوي على بيانات العميل والعرض الفعلية</p>
        </div>
      `);
    } catch(e) {
      this.toast('فشل إنشاء المعاينة: ' + e.message, 'error');
    }
  },

  // ========================================
  // PDF Template Manager (Multi-Template System)
  // ========================================

  // Default template text
  _defaultQuoteTemplate() {
    return `عرض أتعاب - تقييم الأصول الثابتة (الآلات والمعدات)

رقم العرض: {{quote_number}}
التاريخ: {{quote_date}}

السادة/ {{client_name}}
شركة/ {{company_name}}

الموضوع: {{subject}}

السلام عليكم ورحمة الله وبركاته،

نود أن نتقدم لكم بخالص الشكر والتقدير على ثقتكم بشركة {{company_name_internal}}، ويسعدنا أن نقدم لكم عرضنا الفني والمالي لتنفيذ مهمة {{service_type}}، وذلك وفقًا لأفضل المعايير المهنية المعتمدة.

--------------------------------------------------

أولاً: نبذة عن الشركة

{{company_name_internal}} هي شركة متخصصة في تقييم الأصول والآلات والمعدات، ومرخصة من الهيئة السعودية للمقيمين المعتمدين، وتضم نخبة من الخبراء المعتمدين ذوي الخبرة العملية والعلمية، مع الالتزام الكامل بالمعايير الدولية للتقييم وقواعد وأخلاقيات المهنة.

--------------------------------------------------

ثانياً: الهدف من التقييم

بدأ تقييم الآلات والمعدات كتقييم محاسبي بنسبة إهلاك محددة لكل نوع من المعدات والآلات عن طريق المحاسبين، وبمرور الزمن وجد المتعاملين مع هذا النوع من التقييم أنه لا يعكس الصورة الحقيقية لقيمة الآلات والمعدات، لذلك تم اللجوء للخبراء المختصين في تقييم المعدات والذي يعكس في النهاية القيمة السوقية العادلة للمعدات والآلات مع الأخذ بعين الاعتبار حالة المعدات الفنية وقدرتها الإنتاجية والتغير التكنولوجي المثالي الذي حدث للمعدة.

--------------------------------------------------

ثالثاً: نطاق العمل

يشمل نطاق العمل ما يلي:

{{scope_of_work}}

--------------------------------------------------

رابعاً: آلية التنفيذ

سيتم تنفيذ العمل وفق الخطوات التالية:

1. استلام التكليف الرسمي
2. تشكيل فريق العمل المناسب
3. جمع البيانات والمستندات
4. المعاينة الميدانية والفحص الفني
5. تحليل البيانات
6. إعداد التقرير النهائي

--------------------------------------------------

خامساً: الجدول الزمني

سنسعى لبدء العمل الميداني خلال {{start_days}} أيام من الموافقة. ونتوقع أن يتم الانتهاء من العمل الميداني والتقييم الخاص بنا في غضون {{duration_days}} يوم عمل من استلام البيانات كاملة.

--------------------------------------------------

سادساً: مسؤوليات العميل

أن أداء خبير التقييم يعتمد على الأداء الفعال في الوقت المناسب لمسؤوليات العميل المنصوص عليها في هذا الاقتراح والقرارات والموافقات في الوقت المناسب.

--------------------------------------------------

سابعاً: الأتعاب المالية

قيمة الأتعاب: {{fees}} ريال سعودي
ضريبة القيمة المضافة ({{vat_percentage}}%): {{vat}}
الإجمالي: {{total}} ريال سعودي

--------------------------------------------------

ثامناً: شروط الدفع

- 50% دفعة مقدمة عند الموافقة
- 50% عند تسليم مسودة التقرير

--------------------------------------------------

تاسعاً: صلاحية العرض

هذا العرض صالح لمدة {{validity_days}} يوم من تاريخ الإصدار.

--------------------------------------------------

عاشراً: الشروط العامة

في حالة زيادة نطاق عملنا، أو إذا لم يكن الموظفون قادرين على توفير مستوى الدعم المشار إليه في هذا العرض، فسوف نناقش هذا الأمر على وجه السرعة مع المديرين التنفيذيين قبل الشروع في العمل.

--------------------------------------------------

الحادي عشر: البيانات البنكية

اسم المستفيد: {{company_name_internal}}
اسم البنك: {{bank_name}}
رقم الآيبان: {{iban}}

--------------------------------------------------

الثاني عشر: خدمة العميل

هدفنا هو تزويد العميل بخدمة عالية الجودة لتلبية احتياجاتك. نحن نقدر إتاحة الفرصة لنا لتقديم الخدمة ونتطلع إلى العمل معك بشأن هذه المشاركة.

--------------------------------------------------

الثالث عشر: القبول والتوقيع

يرجى التكرم بتوقيع هذا العرض وإعادته بما يفيد الموافقة:

الاسم: __________
التوقيع: ________
التاريخ: ________

--------------------------------------------------

وتفضلوا بقبول فائق الاحترام والتقدير،،

{{prepared_by}}
{{job_title}}
{{company_name_internal}}`;
  },

  // Default variable values
  _defaultQuoteVars() {
    return {
      quote_number: 'QT-2026-0001',
      quote_date: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      client_name: 'محمد أحمد العلي',
      company_name: 'شركة النخبة للمقاولات',
      subject: 'تقييم الأصول الثابتة (الآلات والمعدات)',
      company_name_internal: 'شركة التقييم المحترفة',
      service_type: 'تقييم الأصول الثابتة',
      scope_of_work: '- تقييم جميع الآلات والمعدات الثابتة\n- إعداد تقرير تقييم شامل وفق المعايير الدولية\n- تحديد القيمة السوقية العادلة لكل أصل',
      start_days: '5',
      duration_days: '15',
      fees: '50,000',
      vat_percentage: '15',
      vat: '7,500',
      total: '57,500',
      validity_days: '30',
      bank_name: 'البنك الأهلي السعودي',
      iban: 'SA00 0000 0000 0000 0000 0000',
      prepared_by: 'م. أحمد محمد',
      job_title: 'مدير التقييم',
    };
  },

  // ---- Multi-Template Storage ----
  getPdfTemplatesList() {
    try {
      const saved = localStorage.getItem('pdfTemplates');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  },

  savePdfTemplatesList(list) {
    localStorage.setItem('pdfTemplates', JSON.stringify(list));
  },

  getPdfTemplate(id) {
    return this.getPdfTemplatesList().find(t => t.id === id) || null;
  },

  savePdfTemplate(template) {
    const list = this.getPdfTemplatesList();
    const idx = list.findIndex(t => t.id === template.id);
    if (idx >= 0) list[idx] = template;
    else list.push(template);
    this.savePdfTemplatesList(list);
  },

  deletePdfTemplate(id) {
    const list = this.getPdfTemplatesList().filter(t => t.id !== id);
    this.savePdfTemplatesList(list);
  },

  getQuoteVars() {
    try {
      const saved = localStorage.getItem('quoteVars');
      if (saved) return { ...this._defaultQuoteVars(), ...JSON.parse(saved) };
    } catch(e) {}
    return { ...this._defaultQuoteVars() };
  },

  saveQuoteVars(vars) {
    localStorage.setItem('quoteVars', JSON.stringify(vars));
  },

  getCompanyLogo() {
    try { return localStorage.getItem('companyLogoPNG') || ''; } catch(e) { return ''; }
  },

  saveCompanyLogo(base64) { localStorage.setItem('companyLogoPNG', base64); },

  _extractVars(template) {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  },

  _applyVars(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return result;
  },

  // ========================================
  // Quote Template Manager (قالب العرض)
  // ========================================
  renderQuoteTemplateManager() {
    const templates = this.getPdfTemplatesList();
    const logo = this.getCompanyLogo();

    this.setContent(`
      <div class="fade-in space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-file-contract ml-2 text-primary-500"></i>إدارة قوالب العروض</h1>
            <p class="text-gray-500 text-sm mt-1">أنشئ قوالب نصية لعروض الأتعاب واستخدمها عند تصدير PDF</p>
          </div>
          <button type="button" data-action="create-pdf-template" class="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 flex items-center gap-2 shadow-sm">
            <i class="fas fa-plus"></i> قالب جديد
          </button>
        </div>

        <!-- Company Logo -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 class="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100"><i class="fas fa-image ml-2 text-green-500"></i>شعار الشركة (PNG)</h3>
          <div class="flex items-center gap-4">
            <div id="logo-preview" class="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
              ${logo ? '<img src="' + logo + '" class="max-w-full max-h-full object-contain" />' : '<i class="fas fa-cloud-upload-alt text-2xl text-gray-400"></i>'}
            </div>
            <div class="flex-1">
              <input type="file" id="logo-upload" accept="image/png,image/jpeg" onchange="App.handleLogoUpload(event)" class="hidden" />
              <button type="button" onclick="document.getElementById('logo-upload').click()" class="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors mb-2">
                <i class="fas fa-upload ml-1"></i>رفع شعار
              </button>
              ${logo ? '<button type="button" onclick="App.removeLogo()" class="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors mb-2 mr-2"><i class="fas fa-trash ml-1"></i>حذف</button>' : ''}
              <p class="text-xs text-gray-400">PNG أو JPG - يُدمج داخل PDF مباشرة</p>
            </div>
          </div>
        </div>

        <!-- Templates List -->
        ${templates.length === 0 ? `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-file-contract text-3xl text-amber-500"></i></div>
          <h3 class="text-lg font-medium text-gray-700 mb-2">لا توجد قوالب بعد</h3>
          <p class="text-gray-400 text-sm mb-6">أنشئ قالب نصي لعروض الأتعاب مع دعم المتغيرات <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{{variable}}</code></p>
          <button type="button" data-action="create-pdf-template" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700"><i class="fas fa-plus ml-1"></i> إنشاء قالب</button>
        </div>
        ` : `
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${templates.map(t => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><i class="fas fa-file-contract text-amber-600"></i></div>
                  <div>
                    <h3 class="font-semibold text-gray-800">${this._escHtml(t.name)}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">${this._extractVars(t.content).length} متغير</p>
                  </div>
                </div>
                <button onclick="App.deletePdfTemplateConfirm('${t.id}')" class="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>
              </div>
              <p class="text-xs text-gray-500 line-clamp-2 mb-3">${this._escHtml(t.content.substring(0, 120))}...</p>
              <div class="flex gap-2">
                <button onclick="App.editPdfTemplate('${t.id}')" class="flex-1 text-center bg-primary-50 text-primary-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-primary-100">
                  <i class="fas fa-edit ml-1"></i>تعديل
                </button>
                <button onclick="App.previewPdfTemplateById('${t.id}')" class="flex-1 text-center bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-100">
                  <i class="fas fa-eye ml-1"></i>معاينة
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        `}

        <!-- Help info -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h3 class="font-semibold text-blue-800 mb-2"><i class="fas fa-info-circle ml-2"></i>كيف يعمل نظام القوالب؟</h3>
          <ul class="text-sm text-blue-700 space-y-1.5">
            <li>&#8226; أنشئ قوالب نصية مع متغيرات مثل <code class="bg-blue-100 px-1.5 py-0.5 rounded text-xs">{{client_name}}</code> و <code class="bg-blue-100 px-1.5 py-0.5 rounded text-xs">{{fees}}</code></li>
            <li>&#8226; عند تصدير عرض كـ PDF، اختر القالب المناسب وسيتم تعبئة المتغيرات تلقائياً من بيانات العرض</li>
            <li>&#8226; النص العربي يُعرض بشكل مثالي - قابل للنسخ والبحث في PDF</li>
            <li>&#8226; الشعار يُدمج داخل الملف مباشرة (ليس كرابط خارجي)</li>
          </ul>
        </div>
      </div>
    `);
  },

  createNewPdfTemplate() {
    const id = 'tpl_' + Date.now();
    const template = {
      id: id,
      name: 'قالب جديد',
      content: this._defaultQuoteTemplate(),
      createdAt: new Date().toISOString(),
    };
    this.savePdfTemplate(template);
    this.editPdfTemplate(id);
  },

  editPdfTemplate(id) {
    const template = this.getPdfTemplate(id);
    if (!template) { this.toast('القالب غير موجود', 'error'); return; }
    
    const vars = this._extractVars(template.content);
    const savedVars = this.getQuoteVars();

    this.setContent(`
      <div class="fade-in space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <a href="/quote-template" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a>
            <div>
              <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-edit ml-2 text-primary-500"></i>تعديل القالب</h1>
              <p class="text-gray-500 text-sm mt-1">محرر نصي مع دعم المتغيرات</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="App.previewPdfTemplateById('${id}')" class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
              <i class="fas fa-eye ml-1"></i>معاينة
            </button>
            <button onclick="App.exportPdfTemplateStandalone('${id}')" class="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700">
              <i class="fas fa-file-pdf ml-1"></i>تصدير PDF
            </button>
          </div>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <!-- Editor (2/3) -->
          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">اسم القالب</label>
                <input type="text" id="tpl-name" value="${this._escAttr(template.name)}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="مثال: عرض تقييم أصول" />
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h3 class="font-bold text-gray-800"><i class="fas fa-edit ml-2 text-primary-500"></i>محرر القالب</h3>
                <button onclick="App._insertVarPopup()" class="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-100">
                  <i class="fas fa-code ml-1"></i>إدراج متغير
                </button>
              </div>
              <textarea id="tpl-editor" rows="30" dir="rtl" 
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm leading-7 resize-y"
                style="font-family: 'IBM Plex Sans Arabic', monospace; min-height: 600px;"
                oninput="App._onTplEditorChange('${id}')">${this._escHtml(template.content)}</textarea>
              <div class="flex items-center justify-between mt-2">
                <p class="text-xs text-gray-400"><i class="fas fa-info-circle ml-1"></i>استخدم <code class="bg-gray-100 px-1 rounded">{{variable_name}}</code> لإدراج متغيرات</p>
                <button onclick="App._saveTplFromEditor('${id}')" class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                  <i class="fas fa-save ml-1"></i>حفظ القالب
                </button>
              </div>
            </div>
          </div>

          <!-- Variables (1/3) -->
          <div class="space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-20">
              <h3 class="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                <i class="fas fa-tags ml-2 text-amber-500"></i>المتغيرات <span class="text-xs text-gray-400 font-normal" id="var-count">(${vars.length})</span>
              </h3>
              <div id="vars-panel" class="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                ${vars.map(v => `
                  <div class="group">
                    <label class="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                      <code class="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">{{${v}}}</code>
                    </label>
                    ${v === 'scope_of_work' ? 
                      '<textarea id="var-' + v + '" rows="3" class="qt-var w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" data-var="' + v + '">' + this._escHtml(savedVars[v] || '') + '</textarea>' :
                      '<input type="text" id="var-' + v + '" class="qt-var w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" data-var="' + v + '" value="' + this._escAttr(savedVars[v] || '') + '" />'
                    }
                  </div>
                `).join('')}
              </div>
              <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onclick="App._saveVarsFromPanel()" class="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-600">
                  <i class="fas fa-save ml-1"></i>حفظ المتغيرات
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  },

  _onTplEditorChange(id) {
    const editor = document.getElementById('tpl-editor');
    if (!editor) return;
    const vars = this._extractVars(editor.value);
    const countEl = document.getElementById('var-count');
    if (countEl) countEl.textContent = '(' + vars.length + ')';
    
    // Update vars panel
    const panel = document.getElementById('vars-panel');
    if (!panel) return;
    const savedVars = this.getQuoteVars();
    const currentVals = {};
    panel.querySelectorAll('.qt-var').forEach(el => { currentVals[el.dataset.var] = el.value; });
    
    const currentNames = [...panel.querySelectorAll('.qt-var')].map(el => el.dataset.var);
    if (JSON.stringify(vars) !== JSON.stringify(currentNames)) {
      panel.innerHTML = vars.map(v => {
        const val = currentVals[v] || savedVars[v] || '';
        return `<div class="group">
          <label class="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
            <code class="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">{{${v}}}</code>
          </label>
          ${v === 'scope_of_work' ? 
            '<textarea id="var-' + v + '" rows="3" class="qt-var w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" data-var="' + v + '">' + this._escHtml(val) + '</textarea>' :
            '<input type="text" id="var-' + v + '" class="qt-var w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" data-var="' + v + '" value="' + this._escAttr(val) + '" />'
          }
        </div>`;
      }).join('');
    }
  },

  _saveTplFromEditor(id) {
    const name = document.getElementById('tpl-name')?.value?.trim() || 'قالب بدون اسم';
    const content = document.getElementById('tpl-editor')?.value || '';
    const template = this.getPdfTemplate(id) || { id, createdAt: new Date().toISOString() };
    template.name = name;
    template.content = content;
    template.updatedAt = new Date().toISOString();
    this.savePdfTemplate(template);
    this.toast('تم حفظ القالب بنجاح');
  },

  _saveVarsFromPanel() {
    const vars = {};
    document.querySelectorAll('.qt-var').forEach(el => { vars[el.dataset.var] = el.value; });
    this.saveQuoteVars(vars);
    this.toast('تم حفظ المتغيرات بنجاح');
  },

  _insertVarPopup() {
    const editor = document.getElementById('tpl-editor');
    const currentVars = editor ? this._extractVars(editor.value) : [];
    const allVars = [...new Set([...currentVars, ...Object.keys(this._defaultQuoteVars())])];
    
    this.showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-code ml-2 text-amber-500"></i>إدراج متغير</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">اسم المتغير (بالإنجليزية)</label>
          <input type="text" id="new-var-name" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" dir="ltr" placeholder="e.g. client_email" />
        </div>
        <div class="bg-gray-50 rounded-xl p-3 mb-4">
          <p class="text-xs font-medium text-gray-600 mb-2">أو اختر:</p>
          <div class="flex flex-wrap gap-1.5">
            ${allVars.map(v => `<button onclick="document.getElementById('new-var-name').value='${v}'" class="bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg text-xs hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700">${v}</button>`).join('')}
          </div>
        </div>
        <div class="flex justify-end gap-3">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</button>
          <button onclick="App._doInsertVar()" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium">إدراج</button>
        </div>
      </div>
    `);
  },

  _doInsertVar() {
    const name = document.getElementById('new-var-name')?.value?.trim();
    if (!name) { this.toast('أدخل اسم المتغير', 'warning'); return; }
    const editor = document.getElementById('tpl-editor');
    if (editor) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const varText = '{{' + name + '}}';
      editor.value = editor.value.substring(0, start) + varText + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + varText.length;
      editor.focus();
    }
    this.closeModal();
  },

  deletePdfTemplateConfirm(id) {
    if (!confirm('حذف هذا القالب؟')) return;
    this.deletePdfTemplate(id);
    this.toast('تم حذف القالب', 'info');
    this.renderQuoteTemplateManager();
  },

  previewPdfTemplateById(id) {
    const template = this.getPdfTemplate(id);
    if (!template) return;
    const vars = this.getQuoteVars();
    const filled = this._applyVars(template.content, vars);
    const logo = this.getCompanyLogo();

    this.showModal(`
      <div class="p-4" style="max-width:700px;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800"><i class="fas fa-eye ml-2 text-primary-500"></i>معاينة: ${this._escHtml(template.name)}</h3>
          <button onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
        </div>
        <div style="max-height:70vh;overflow-y:auto;border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:30px;direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;line-height:2;">
          ${logo ? '<div style="text-align:center;margin-bottom:20px;"><img src="' + logo + '" style="max-height:80px;" /></div>' : ''}
          <div style="white-space:pre-wrap;font-size:14px;color:#1a1a2e;">${this._escHtml(filled).replace(/--{10,}/g, '<hr style="border:none;border-top:2px solid #e5e7eb;margin:15px 0;">')}</div>
        </div>
      </div>
    `);
  },

  // Export standalone template (from editor page)
  exportPdfTemplateStandalone(id) {
    // Save first
    this._saveTplFromEditor(id);
    this._saveVarsFromPanel();

    const template = this.getPdfTemplate(id);
    if (!template) { this.toast('القالب غير موجود', 'error'); return; }

    const vars = this.getQuoteVars();
    const cfg = this.getPdfSettings();
    const logo = this.getCompanyLogo();
    const pc = cfg.primaryColor || '#1e3a8a';

    let filled = this._applyVars(template.content, vars);
    
    const htmlLines = filled.split('\n').map(line => {
      const trimmed = line.trim();
      if (/^-{10,}$/.test(trimmed)) return '<hr style="border:none;border-top:1.5px solid #d1d5db;margin:12px 0;">';
      if (trimmed === '') return '<div style="height:8px;"></div>';
      if (/^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً|الحادي عشر|الثاني عشر|الثالث عشر)/.test(trimmed)) {
        return '<h3 style="font-size:14px;font-weight:800;color:' + pc + ';margin:18px 0 6px;padding:6px 12px;border-right:4px solid ' + pc + ';background:' + pc + '08;">' + this._escHtml(trimmed) + '</h3>';
      }
      if (trimmed.startsWith('- ')) return '<div style="padding:2px 0;margin-right:16px;font-size:12px;color:#374151;">&#8226; ' + this._escHtml(trimmed.substring(2)) + '</div>';
      if (/^\d+\./.test(trimmed)) return '<div style="padding:2px 0;margin-right:16px;font-size:12px;color:#374151;">' + this._escHtml(trimmed) + '</div>';
      return '<p style="font-size:12px;line-height:2;color:#1a1a2e;margin:0 0 4px;">' + this._escHtml(trimmed) + '</p>';
    }).join('');

    this._printPdfHtml(`
      <div style="padding:0;margin:0;">
        <div style="height:5px;background:linear-gradient(90deg,${pc},${cfg.secondaryColor});"></div>
        <div style="padding:24px 36px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;">
          <div style="flex:1;">
            ${logo ? '<img src="' + logo + '" style="height:50px;margin-bottom:8px;" />' : ''}
            <h2 style="font-size:18px;font-weight:800;color:${pc};margin:0;">${this._escHtml(cfg.companyName)}</h2>
            ${cfg.companyNameEn ? '<p style="font-size:10px;color:#6b7280;margin:2px 0 0;">' + this._escHtml(cfg.companyNameEn) + '</p>' : ''}
          </div>
          <div style="text-align:left;min-width:180px;">
            <div style="background:${pc};color:#fff;border-radius:8px;padding:14px 18px;text-align:center;">
              <h1 style="font-size:20px;font-weight:800;margin:0;">عرض أتعاب</h1>
              <p style="font-size:10px;margin:3px 0 0;opacity:0.85;">Fee Proposal</p>
            </div>
            <div style="background:#f0f4ff;border:1px solid #dbeafe;border-radius:6px;padding:8px 12px;margin-top:8px;text-align:center;">
              <p style="font-size:9px;color:#6b7280;margin:0;">رقم العرض</p>
              <p style="font-size:14px;font-weight:800;color:${pc};margin:2px 0 0;">${this._escHtml(vars.quote_number || '')}</p>
            </div>
          </div>
        </div>
        <div style="padding:20px 36px;">
          ${htmlLines}
        </div>
        <div style="padding:12px 36px;background:${pc};text-align:center;margin-top:20px;">
          <p style="font-size:10px;color:#fff;margin:0;">${this._escHtml(cfg.footerText)}</p>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,${cfg.secondaryColor},${pc});"></div>
      </div>
    `, 'عرض-أتعاب-' + (vars.quote_number || 'draft'));
  },

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.toast('حجم الملف كبير جداً (الحد الأقصى 2MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.saveCompanyLogo(e.target.result);
      this.toast('تم رفع الشعار بنجاح');
      this.renderQuoteTemplateManager();
    };
    reader.readAsDataURL(file);
  },

  removeLogo() {
    if (!confirm('حذف شعار الشركة؟')) return;
    localStorage.removeItem('companyLogoPNG');
    this.toast('تم حذف الشعار', 'info');
    this.renderQuoteTemplateManager();
  },


  _hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [30, 58, 138];
  },

};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
document.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') App.closeModal(); });
