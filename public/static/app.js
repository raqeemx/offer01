// =============================================
// نظام إدارة عروض الأسعار - Frontend App V3
// Arabic RTL Quote Management System
// =============================================
const App = {
  token: null, user: null, authMode: 'login',
  supabaseUrl: '', supabaseKey: '',

  init() {
    this.supabaseUrl = window.__SUPABASE_URL__ || '';
    this.supabaseKey = window.__SUPABASE_ANON_KEY__ || '';
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    if (this.token && this.user) { this.showApp(); } else { this.showLogin(); }
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) { e.preventDefault(); history.pushState(null, '', link.getAttribute('href')); this.route(); }
    });
    window.addEventListener('popstate', () => this.route());
  },

  // ---- Router ----
  route() {
    const p = location.pathname;
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
    else if (p === '/projects') this.renderProjects();
    else if (p.match(/^\/projects\/[\w-]+$/)) this.renderProjectDetail(p.split('/')[2]);
    else if (p === '/reports') this.renderReports();
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
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (res.status === 401) { this.logout(); throw new Error('غير مصرح'); }
    if (!res.ok) throw new Error(data.error || 'حدث خطأ');
    return data;
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
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a href="/quotes/new" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors text-center"><i class="fas fa-plus-circle text-xl text-primary-600"></i><span class="text-xs font-medium text-primary-700">عرض جديد</span></a>
              <a href="/clients/new" data-link class="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-center"><i class="fas fa-user-plus text-xl text-blue-600"></i><span class="text-xs font-medium text-blue-700">عميل جديد</span></a>
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

      if (clients.length === 0) { this.setContent(this._emptyState('fa-exclamation-triangle','أضف عميلاً أولاً','تحتاج لإضافة عميل قبل إنشاء عرض','/clients/new','إضافة عميل')); return; }

      const validDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      this.setContent(`
        <div class="fade-in max-w-3xl mx-auto">
          <div class="flex items-center gap-3 mb-6"><a href="/quotes" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">إنشاء عرض سعر</h1></div>

          ${templates.length > 0 ? `
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
            <label class="block text-sm font-medium text-amber-800 mb-2"><i class="fas fa-layer-group ml-1"></i> استخدام قالب جاهز</label>
            <select id="quote-template" onchange="App.loadTemplate()" class="w-full border border-amber-300 rounded-xl px-4 py-2.5 text-sm bg-white"><option value="">بدون قالب</option>${templates.map(t => `<option value="${t.id}">${t.name} (${(t.template_items||[]).length} بند)</option>`).join('')}</select>
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

            <div class="flex justify-end gap-3"><a href="/quotes" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-quote-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> حفظ العرض</button></div>
          </form>
        </div>
      `);
      window._templates = templates;
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
    if (!tid) return;
    const tmpl = (window._templates||[]).find(t => t.id === tid);
    if (!tmpl) return;
    if (tmpl.default_notes) document.getElementById('quote-notes').value = tmpl.default_notes;
    if (tmpl.default_valid_days) { const d = new Date(Date.now()+tmpl.default_valid_days*86400000); document.getElementById('quote-valid').value = d.toISOString().split('T')[0]; }
    const container = document.getElementById('quote-items'); container.innerHTML = '';
    (tmpl.template_items||[]).forEach(item => {
      container.insertAdjacentHTML('beforeend', this._itemRow(item));
    });
    if ((tmpl.template_items||[]).length === 0) container.insertAdjacentHTML('beforeend', this._itemRow());
    this.calcTotal();
    this.toast('تم تحميل القالب', 'info');
  },

  async createQuote(e) {
    e.preventDefault(); const btn = document.getElementById('save-quote-btn'); btn.disabled = true;
    const items = []; document.querySelectorAll('.quote-item').forEach(item => { items.push({ description: item.querySelector('[name="description"]').value, quantity: parseFloat(item.querySelector('[name="quantity"]').value), unit_price: parseFloat(item.querySelector('[name="unit_price"]').value) }); });
    try {
      const quote = await this.api('POST', '/api/quotes', { client_id: document.getElementById('quote-client').value, title: document.getElementById('quote-title').value, notes: document.getElementById('quote-notes').value, valid_until: document.getElementById('quote-valid').value || null, next_followup_date: document.getElementById('quote-followup')?.value || null, template_id: document.getElementById('quote-template')?.value || null, items });
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
      this.toast('تم تحديث العرض'); history.pushState(null, '', `/quotes/${id}`); this.route();
    } catch (e) { this.toast(e.message, 'error'); btn.disabled = false; }
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

  // ---- PDF Export with Supabase Storage Upload ----
  async exportPDF(id) {
    const btn = document.getElementById('pdf-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner mx-auto" style="width:14px;height:14px;border-width:2px;"></div>'; }
    this.toast('جارٍ إنشاء PDF...', 'info');
    try {
      // Show PDF header for better export
      const pdfHeader = document.getElementById('pdf-header');
      if (pdfHeader) pdfHeader.classList.remove('hidden');

      const el = document.getElementById('quote-pdf-content');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });

      // Hide PDF header after capture
      if (pdfHeader) pdfHeader.classList.add('hidden');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfW = pdf.internal.pageSize.getWidth() - 20;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, pdfW, pdfH);

      // Generate blob for upload
      const pdfBlob = pdf.output('blob');
      const pdfFileName = `quote-${id.substring(0,8)}-${Date.now()}.pdf`;

      // Download locally
      pdf.save(pdfFileName);
      this.toast('تم تحميل PDF بنجاح');

      // Upload to Supabase Storage
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          const result = await this.api('POST', `/api/quotes/${id}/upload-pdf`, {
            base64Data: base64,
            fileName: pdfFileName,
          });
          if (result.pdf_url) {
            this.toast('تم حفظ PDF في السحابة', 'success');
          }
        };
        reader.readAsDataURL(pdfBlob);
      } catch (uploadErr) {
        console.log('PDF upload to storage skipped:', uploadErr.message);
        // Still save local reference
        try { await this.api('PATCH', `/api/quotes/${id}/pdf`, { pdf_url: 'local_export' }); } catch(e) {}
      }
    } catch (e) {
      this.toast('فشل تصدير PDF: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-pdf ml-1"></i>PDF'; }
    }
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
            <a href="/templates/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"><i class="fas fa-plus"></i> قالب جديد</a>
          </div>
          ${templates.length === 0 ? this._emptyState('fa-layer-group','لا توجد قوالب بعد','أنشئ قالبًا لتسريع إنشاء عروض الأسعار','/templates/new','قالب جديد') : `
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${templates.map(t => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3">
                <div><h3 class="font-semibold text-gray-800">${t.name}</h3>${t.description?`<p class="text-xs text-gray-500 mt-1">${t.description}</p>`:''}</div>
                <button onclick="App.deleteTemplate('${t.id}')" class="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"><i class="fas fa-trash text-xs"></i></button>
              </div>
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span class="flex items-center gap-1"><i class="fas fa-list-ul"></i>${(t.template_items||[]).length} بند</span>
                <span class="flex items-center gap-1"><i class="fas fa-calendar"></i>${t.default_valid_days} يوم</span>
              </div>
              <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <p class="text-sm font-bold text-primary-600">${this.fmtCurrency((t.template_items||[]).reduce((s,i)=>s+i.quantity*i.unit_price,0))}</p>
                <a href="/quotes/new" data-link class="text-xs text-primary-600 hover:underline">استخدام</a>
              </div>
            </div>
          `).join('')}</div>`}
        </div>
      `);
    } catch (e) { this.setContent(`<div class="text-center py-20 text-red-500">${e.message}</div>`); }
  },

  renderTemplateForm() {
    this.setContent(`
      <div class="fade-in max-w-3xl mx-auto">
        <div class="flex items-center gap-3 mb-6"><a href="/templates" data-link class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><i class="fas fa-arrow-right"></i></a><h1 class="text-2xl font-bold text-gray-800">إنشاء قالب جديد</h1></div>
        <form onsubmit="App.createTemplate(event)" class="space-y-4">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-semibold text-gray-800 mb-3"><i class="fas fa-info-circle ml-2 text-primary-500"></i>معلومات القالب</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">اسم القالب *</label><input type="text" id="tmpl-name" required class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="مثال: قالب تصميم مواقع"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">الوصف</label><input type="text" id="tmpl-desc" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="وصف مختصر للقالب"/></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">أيام الصلاحية الافتراضية</label><input type="number" id="tmpl-days" value="30" min="1" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"/></div>
              <div class="sm:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">ملاحظات افتراضية</label><input type="text" id="tmpl-notes" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="ملاحظات تضاف تلقائياً عند استخدام القالب"/></div>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800"><i class="fas fa-list-ul ml-2 text-primary-500"></i>البنود الافتراضية</h3><button type="button" onclick="App.addItem()" class="text-primary-600 text-sm font-medium hover:bg-primary-50 px-3 py-1 rounded-lg"><i class="fas fa-plus ml-1"></i> إضافة بند</button></div>
            <div id="quote-items" class="space-y-2">${this._itemRow()}</div>
          </div>
          <div class="flex justify-end gap-3"><a href="/templates" data-link class="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100">إلغاء</a><button type="submit" id="save-tmpl-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium shadow-sm"><i class="fas fa-save ml-1"></i> حفظ القالب</button></div>
        </form>
      </div>
    `);
  },

  async createTemplate(e) {
    e.preventDefault();
    const items = []; document.querySelectorAll('.quote-item').forEach(item => { items.push({ description: item.querySelector('[name="description"]').value, quantity: parseFloat(item.querySelector('[name="quantity"]').value), unit_price: parseFloat(item.querySelector('[name="unit_price"]').value) }); });
    try {
      await this.api('POST', '/api/templates', { name: document.getElementById('tmpl-name').value, description: document.getElementById('tmpl-desc').value, default_notes: document.getElementById('tmpl-notes').value, default_valid_days: parseInt(document.getElementById('tmpl-days').value)||30, items });
      this.toast('تم إنشاء القالب بنجاح'); history.pushState(null,'','/templates'); this.route();
    } catch(e) { this.toast(e.message,'error'); }
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
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
document.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') App.closeModal(); });
