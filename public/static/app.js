// =============================================
// نظام إدارة عروض الأسعار - Frontend App
// =============================================

const App = {
  token: null,
  user: null,

  // ---- التهيئة ----
  init() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');

    if (this.token && this.user) {
      this.showApp();
    } else {
      this.showLogin();
    }

    // SPA Router
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        history.pushState(null, '', href);
        this.route();
      }
    });
    window.addEventListener('popstate', () => this.route());
  },

  // ---- Router ----
  route() {
    const path = location.pathname;
    this.updateActiveNav(path);

    if (path === '/' || path === '') {
      this.renderDashboard();
    } else if (path === '/clients') {
      this.renderClients();
    } else if (path === '/clients/new') {
      this.renderClientForm();
    } else if (path.match(/^\/clients\/[\w-]+$/)) {
      this.renderClientDetail(path.split('/')[2]);
    } else if (path === '/quotes') {
      this.renderQuotes();
    } else if (path === '/quotes/new') {
      this.renderQuoteForm();
    } else if (path.match(/^\/quotes\/[\w-]+$/)) {
      this.renderQuoteDetail(path.split('/')[2]);
    } else {
      this.setContent('<div class="text-center py-20"><h2 class="text-2xl text-gray-400">الصفحة غير موجودة</h2></div>');
    }
  },

  updateActiveNav(path) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = (href === '/' && path === '/') || (href !== '/' && path.startsWith(href));
      link.classList.toggle('text-primary-600', isActive);
      link.classList.toggle('bg-primary-50', isActive);
      link.classList.toggle('text-gray-600', !isActive);
    });
  },

  // ---- API Helper ----
  async api(method, url, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();

    if (res.status === 401) {
      this.logout();
      throw new Error('غير مصرح');
    }
    if (!res.ok) throw new Error(data.error || 'حدث خطأ');
    return data;
  },

  // ---- UI Helpers ----
  setContent(html) {
    const main = document.getElementById('main-content');
    main.innerHTML = html;
    main.querySelector('.fade-in')?.classList.add('fade-in');
  },

  showLoading() {
    this.setContent('<div class="flex items-center justify-center min-h-[40vh]"><div class="spinner"></div></div>');
  },

  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm fade-in`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr));
  },

  statusBadge(status) {
    const map = {
      draft: { label: 'مسودة', cls: 'bg-gray-100 text-gray-700' },
      sent: { label: 'مُرسل', cls: 'bg-blue-100 text-blue-700' },
      accepted: { label: 'مقبول', cls: 'bg-green-100 text-green-700' },
      rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700' },
    };
    const s = map[status] || map.draft;
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}">${s.label}</span>`;
  },

  // ---- Auth ----
  showApp() {
    document.getElementById('navbar').classList.remove('hidden');
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = this.user?.email || '';
    this.route();
  },

  showLogin() {
    document.getElementById('navbar').classList.add('hidden');
    this.setContent(`
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 -m-6 p-6">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md fade-in">
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-file-invoice-dollar text-3xl text-primary-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">نظام عروض الأسعار</h1>
            <p class="text-gray-500 mt-1">سجّل دخولك للمتابعة</p>
          </div>
          
          <div id="auth-tabs" class="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onclick="App.switchAuthTab('login')" id="tab-login" class="flex-1 py-2 text-sm font-medium rounded-md bg-white shadow text-primary-600 transition-all">دخول</button>
            <button onclick="App.switchAuthTab('register')" id="tab-register" class="flex-1 py-2 text-sm font-medium rounded-md text-gray-500 transition-all">حساب جديد</button>
          </div>

          <form id="auth-form" onsubmit="App.handleAuth(event)">
            <div id="register-name" class="hidden mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input type="text" id="auth-name" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="أدخل اسمك" />
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" id="auth-email" required class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="example@email.com" />
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input type="password" id="auth-password" required minlength="6" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="••••••••" />
            </div>
            <button type="submit" id="auth-btn" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              تسجيل الدخول
            </button>
          </form>

          <p id="auth-error" class="mt-4 text-sm text-red-500 text-center hidden"></p>
        </div>
      </div>
    `);
  },

  authMode: 'login',

  switchAuthTab(mode) {
    this.authMode = mode;
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const nameField = document.getElementById('register-name');
    const btn = document.getElementById('auth-btn');

    if (mode === 'login') {
      loginTab.className = 'flex-1 py-2 text-sm font-medium rounded-md bg-white shadow text-primary-600 transition-all';
      registerTab.className = 'flex-1 py-2 text-sm font-medium rounded-md text-gray-500 transition-all';
      nameField.classList.add('hidden');
      btn.textContent = 'تسجيل الدخول';
    } else {
      registerTab.className = 'flex-1 py-2 text-sm font-medium rounded-md bg-white shadow text-primary-600 transition-all';
      loginTab.className = 'flex-1 py-2 text-sm font-medium rounded-md text-gray-500 transition-all';
      nameField.classList.remove('hidden');
      btn.textContent = 'إنشاء حساب';
    }
  },

  async handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-btn');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner mx-auto" style="width:20px;height:20px;border-width:2px;"></div>';
    errorEl.classList.add('hidden');

    try {
      let data;
      if (this.authMode === 'login') {
        data = await this.api('POST', '/api/auth/login', { email, password });
      } else {
        data = await this.api('POST', '/api/auth/register', { email, password, full_name: name });
      }

      if (data.session) {
        this.token = data.session.access_token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        this.toast(this.authMode === 'login' ? 'تم تسجيل الدخول بنجاح' : 'تم إنشاء الحساب بنجاح');
        this.showApp();
      } else {
        errorEl.textContent = 'تحقق من بريدك الإلكتروني لتأكيد الحساب';
        errorEl.classList.remove('hidden');
      }
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = this.authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب';
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
    this.user = null;
    this.showLogin();
  },

  // ---- لوحة التحكم ----
  async renderDashboard() {
    this.showLoading();
    try {
      const [clients, quotes] = await Promise.all([
        this.api('GET', '/api/clients'),
        this.api('GET', '/api/quotes'),
      ]);

      const totalQuotes = quotes.length;
      const totalClients = clients.length;
      const totalAccepted = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0);
      const drafts = quotes.filter(q => q.status === 'draft').length;

      this.setContent(`
        <div class="fade-in">
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-800">مرحبًا 👋</h1>
            <p class="text-gray-500 mt-1">لوحة التحكم - ملخص سريع</p>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-users text-blue-600"></i>
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-800">${totalClients}</p>
              <p class="text-sm text-gray-500">العملاء</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-file-alt text-purple-600"></i>
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-800">${totalQuotes}</p>
              <p class="text-sm text-gray-500">العروض</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-clock text-amber-600"></i>
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-800">${drafts}</p>
              <p class="text-sm text-gray-500">مسودات</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-check-circle text-green-600"></i>
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-800">${this.formatCurrency(totalAccepted)}</p>
              <p class="text-sm text-gray-500">المقبولة</p>
            </div>
          </div>

          <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
              <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-semibold text-gray-800">آخر العروض</h3>
                <a href="/quotes" data-link class="text-sm text-primary-600 hover:underline">عرض الكل</a>
              </div>
              <div class="divide-y divide-gray-50">
                ${quotes.slice(0, 5).map(q => `
                  <a href="/quotes/${q.id}" data-link class="block px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div class="flex justify-between items-center">
                      <div>
                        <p class="font-medium text-sm text-gray-800">${q.title}</p>
                        <p class="text-xs text-gray-400 mt-0.5">${q.quote_number} - ${q.clients?.name || ''}</p>
                      </div>
                      <div class="text-left">
                        ${this.statusBadge(q.status)}
                        <p class="text-xs text-gray-500 mt-1">${this.formatCurrency(q.total)}</p>
                      </div>
                    </div>
                  </a>
                `).join('') || '<p class="px-5 py-8 text-center text-gray-400 text-sm">لا توجد عروض بعد</p>'}
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
              <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-semibold text-gray-800">آخر العملاء</h3>
                <a href="/clients" data-link class="text-sm text-primary-600 hover:underline">عرض الكل</a>
              </div>
              <div class="divide-y divide-gray-50">
                ${clients.slice(0, 5).map(cl => `
                  <a href="/clients/${cl.id}" data-link class="block px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div class="flex justify-between items-center">
                      <div>
                        <p class="font-medium text-sm text-gray-800">${cl.name}</p>
                        <p class="text-xs text-gray-400 mt-0.5">${cl.company || ''}</p>
                      </div>
                      <p class="text-xs text-gray-400">${this.formatDate(cl.created_at)}</p>
                    </div>
                  </a>
                `).join('') || '<p class="px-5 py-8 text-center text-gray-400 text-sm">لا يوجد عملاء بعد</p>'}
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  // ---- العملاء ----
  async renderClients() {
    this.showLoading();
    try {
      const clients = await this.api('GET', '/api/clients');
      this.setContent(`
        <div class="fade-in">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">العملاء</h1>
              <p class="text-gray-500 text-sm mt-1">${clients.length} عميل</p>
            </div>
            <a href="/clients/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <i class="fas fa-plus"></i> إضافة عميل
            </a>
          </div>
          
          ${clients.length === 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-users text-2xl text-gray-400"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-600 mb-2">لا يوجد عملاء بعد</h3>
              <p class="text-gray-400 text-sm mb-4">ابدأ بإضافة أول عميل لك</p>
              <a href="/clients/new" data-link class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <i class="fas fa-plus"></i> إضافة عميل
              </a>
            </div>
          ` : `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                      <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">الشركة</th>
                      <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">البريد</th>
                      <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">الهاتف</th>
                      <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    ${clients.map(cl => `
                      <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="history.pushState(null,'','/clients/${cl.id}');App.route();">
                        <td class="px-5 py-3.5">
                          <p class="font-medium text-sm text-gray-800">${cl.name}</p>
                        </td>
                        <td class="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">${cl.company || '-'}</td>
                        <td class="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">${cl.email || '-'}</td>
                        <td class="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell" dir="ltr">${cl.phone || '-'}</td>
                        <td class="px-5 py-3.5 text-sm text-gray-400">${this.formatDate(cl.created_at)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `}
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  renderClientForm() {
    this.setContent(`
      <div class="fade-in max-w-2xl mx-auto">
        <div class="flex items-center gap-3 mb-6">
          <a href="/clients" data-link class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <i class="fas fa-arrow-right"></i>
          </a>
          <h1 class="text-2xl font-bold text-gray-800">إضافة عميل جديد</h1>
        </div>
        
        <form onsubmit="App.createClient(event)" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">اسم العميل *</label>
              <input type="text" id="client-name" required class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="أدخل اسم العميل" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
              <input type="text" id="client-company" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="اسم الشركة" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" id="client-email" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="email@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
              <input type="tel" id="client-phone" dir="ltr" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-left" placeholder="+966 5xx xxx xxx" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input type="text" id="client-address" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="العنوان" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <textarea id="client-notes" rows="3" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none" placeholder="ملاحظات إضافية..."></textarea>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <a href="/clients" data-link class="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</a>
            <button type="submit" id="save-client-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <i class="fas fa-save ml-1"></i> حفظ العميل
            </button>
          </div>
        </form>
      </div>
    `);
  },

  async createClient(e) {
    e.preventDefault();
    const btn = document.getElementById('save-client-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner mx-auto" style="width:18px;height:18px;border-width:2px;"></div>';

    try {
      await this.api('POST', '/api/clients', {
        name: document.getElementById('client-name').value,
        company: document.getElementById('client-company').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        notes: document.getElementById('client-notes').value,
      });
      this.toast('تم إضافة العميل بنجاح');
      history.pushState(null, '', '/clients');
      this.route();
    } catch (err) {
      this.toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save ml-1"></i> حفظ العميل';
    }
  },

  async renderClientDetail(id) {
    this.showLoading();
    try {
      const [client, quotes] = await Promise.all([
        this.api('GET', `/api/clients/${id}`),
        this.api('GET', `/api/quotes?client_id=${id}`),
      ]);

      this.setContent(`
        <div class="fade-in">
          <div class="flex items-center gap-3 mb-6">
            <a href="/clients" data-link class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <i class="fas fa-arrow-right"></i>
            </a>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-800">${client.name}</h1>
              <p class="text-gray-500 text-sm">${client.company || ''}</p>
            </div>
            <button onclick="App.deleteClient('${id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg text-sm transition-colors">
              <i class="fas fa-trash ml-1"></i> حذف
            </button>
          </div>

          <div class="grid lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 class="font-semibold text-gray-800 mb-4">معلومات العميل</h3>
              <div class="space-y-3">
                ${client.email ? `<div class="flex items-center gap-3"><i class="fas fa-envelope text-gray-400 w-5"></i><span class="text-sm">${client.email}</span></div>` : ''}
                ${client.phone ? `<div class="flex items-center gap-3"><i class="fas fa-phone text-gray-400 w-5"></i><span class="text-sm" dir="ltr">${client.phone}</span></div>` : ''}
                ${client.address ? `<div class="flex items-center gap-3"><i class="fas fa-map-marker-alt text-gray-400 w-5"></i><span class="text-sm">${client.address}</span></div>` : ''}
                ${client.notes ? `<div class="mt-4 pt-4 border-t border-gray-100"><p class="text-sm text-gray-500">${client.notes}</p></div>` : ''}
                <div class="pt-3 border-t border-gray-100">
                  <p class="text-xs text-gray-400">أُضيف في ${this.formatDate(client.created_at)}</p>
                </div>
              </div>
            </div>

            <div class="lg:col-span-2">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800">عروض الأسعار (${quotes.length})</h3>
                <a href="/quotes/new?client_id=${id}" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <i class="fas fa-plus"></i> عرض جديد
                </a>
              </div>
              
              ${quotes.length === 0 ? `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <p class="text-gray-400 text-sm">لا توجد عروض لهذا العميل</p>
                </div>
              ` : `
                <div class="space-y-3">
                  ${quotes.map(q => `
                    <a href="/quotes/${q.id}" data-link class="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                      <div class="flex justify-between items-start">
                        <div>
                          <p class="font-medium text-gray-800">${q.title}</p>
                          <p class="text-xs text-gray-400 mt-1">${q.quote_number} - ${this.formatDate(q.created_at)}</p>
                        </div>
                        <div class="text-left">
                          ${this.statusBadge(q.status)}
                          <p class="text-sm font-medium text-gray-700 mt-1">${this.formatCurrency(q.total)}</p>
                        </div>
                      </div>
                    </a>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  async deleteClient(id) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع العروض المرتبطة به.')) return;
    try {
      await this.api('DELETE', `/api/clients/${id}`);
      this.toast('تم حذف العميل');
      history.pushState(null, '', '/clients');
      this.route();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  // ---- عروض الأسعار ----
  async renderQuotes() {
    this.showLoading();
    try {
      const quotes = await this.api('GET', '/api/quotes');
      this.setContent(`
        <div class="fade-in">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">عروض الأسعار</h1>
              <p class="text-gray-500 text-sm mt-1">${quotes.length} عرض</p>
            </div>
            <a href="/quotes/new" data-link class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <i class="fas fa-plus"></i> عرض جديد
            </a>
          </div>

          ${quotes.length === 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-file-alt text-2xl text-gray-400"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-600 mb-2">لا توجد عروض بعد</h3>
              <p class="text-gray-400 text-sm mb-4">أنشئ أول عرض سعر</p>
              <a href="/quotes/new" data-link class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <i class="fas fa-plus"></i> عرض جديد
              </a>
            </div>
          ` : `
            <div class="space-y-3">
              ${quotes.map(q => `
                <a href="/quotes/${q.id}" data-link class="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-1">
                        <p class="font-medium text-gray-800">${q.title}</p>
                        ${this.statusBadge(q.status)}
                      </div>
                      <p class="text-sm text-gray-500">${q.quote_number}</p>
                      <p class="text-xs text-gray-400 mt-1">
                        <i class="fas fa-user ml-1"></i>${q.clients?.name || '-'}
                        ${q.clients?.company ? ` - ${q.clients.company}` : ''}
                        <span class="mx-2">|</span>
                        <i class="fas fa-calendar ml-1"></i>${this.formatDate(q.created_at)}
                      </p>
                    </div>
                    <p class="text-lg font-bold text-gray-800 mr-4">${this.formatCurrency(q.total)}</p>
                  </div>
                </a>
              `).join('')}
            </div>
          `}
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  async renderQuoteForm() {
    this.showLoading();
    try {
      const clients = await this.api('GET', '/api/clients');
      const params = new URLSearchParams(location.search);
      const preselectedClient = params.get('client_id') || '';

      if (clients.length === 0) {
        this.setContent(`
          <div class="fade-in max-w-2xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-amber-500"></i>
              </div>
              <h3 class="text-lg font-medium text-gray-600 mb-2">أضف عميلاً أولاً</h3>
              <p class="text-gray-400 text-sm mb-4">تحتاج لإضافة عميل واحد على الأقل قبل إنشاء عرض سعر</p>
              <a href="/clients/new" data-link class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <i class="fas fa-plus"></i> إضافة عميل
              </a>
            </div>
          </div>
        `);
        return;
      }

      this.setContent(`
        <div class="fade-in max-w-3xl mx-auto">
          <div class="flex items-center gap-3 mb-6">
            <a href="/quotes" data-link class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <i class="fas fa-arrow-right"></i>
            </a>
            <h1 class="text-2xl font-bold text-gray-800">إنشاء عرض سعر</h1>
          </div>

          <form onsubmit="App.createQuote(event)" class="space-y-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 class="font-semibold text-gray-800 mb-4">معلومات العرض</h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">عنوان العرض *</label>
                  <input type="text" id="quote-title" required class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="مثال: عرض تصميم موقع إلكتروني" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">العميل *</label>
                  <select id="quote-client" required class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm">
                    <option value="">اختر العميل</option>
                    ${clients.map(cl => `<option value="${cl.id}" ${cl.id === preselectedClient ? 'selected' : ''}>${cl.name}${cl.company ? ' - ' + cl.company : ''}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <input type="text" id="quote-notes" class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="ملاحظات اختيارية" />
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800">البنود</h3>
                <button type="button" onclick="App.addQuoteItem()" class="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  <i class="fas fa-plus"></i> إضافة بند
                </button>
              </div>

              <div id="quote-items" class="space-y-3">
                <div class="quote-item bg-gray-50 rounded-lg p-4">
                  <div class="grid gap-3 sm:grid-cols-12 items-end">
                    <div class="sm:col-span-5">
                      <label class="block text-xs font-medium text-gray-500 mb-1">الوصف</label>
                      <input type="text" name="description" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="وصف البند" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-gray-500 mb-1">الكمية</label>
                      <input type="number" name="quantity" value="1" min="0.01" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center" onchange="App.calcTotal()" />
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-xs font-medium text-gray-500 mb-1">السعر</label>
                      <input type="number" name="unit_price" value="0" min="0" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onchange="App.calcTotal()" placeholder="0.00" />
                    </div>
                    <div class="sm:col-span-2 flex items-center justify-between">
                      <span class="item-total text-sm font-medium text-gray-700">0.00</span>
                      <button type="button" onclick="App.removeQuoteItem(this)" class="text-red-400 hover:text-red-600 p-1">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span class="font-semibold text-gray-700">الإجمالي</span>
                <span id="quote-total" class="text-xl font-bold text-primary-600">0.00 ر.س</span>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <a href="/quotes" data-link class="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</a>
              <button type="submit" id="save-quote-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-save ml-1"></i> حفظ العرض
              </button>
            </div>
          </form>
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  addQuoteItem() {
    const container = document.getElementById('quote-items');
    const item = document.createElement('div');
    item.className = 'quote-item bg-gray-50 rounded-lg p-4 fade-in';
    item.innerHTML = `
      <div class="grid gap-3 sm:grid-cols-12 items-end">
        <div class="sm:col-span-5">
          <label class="block text-xs font-medium text-gray-500 mb-1">الوصف</label>
          <input type="text" name="description" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="وصف البند" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-500 mb-1">الكمية</label>
          <input type="number" name="quantity" value="1" min="0.01" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center" onchange="App.calcTotal()" />
        </div>
        <div class="sm:col-span-3">
          <label class="block text-xs font-medium text-gray-500 mb-1">السعر</label>
          <input type="number" name="unit_price" value="0" min="0" step="0.01" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onchange="App.calcTotal()" placeholder="0.00" />
        </div>
        <div class="sm:col-span-2 flex items-center justify-between">
          <span class="item-total text-sm font-medium text-gray-700">0.00</span>
          <button type="button" onclick="App.removeQuoteItem(this)" class="text-red-400 hover:text-red-600 p-1">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(item);
  },

  removeQuoteItem(btn) {
    const items = document.querySelectorAll('.quote-item');
    if (items.length <= 1) {
      this.toast('يجب أن يحتوي العرض على بند واحد على الأقل', 'error');
      return;
    }
    btn.closest('.quote-item').remove();
    this.calcTotal();
  },

  calcTotal() {
    let total = 0;
    document.querySelectorAll('.quote-item').forEach(item => {
      const qty = parseFloat(item.querySelector('[name="quantity"]').value) || 0;
      const price = parseFloat(item.querySelector('[name="unit_price"]').value) || 0;
      const lineTotal = qty * price;
      item.querySelector('.item-total').textContent = lineTotal.toFixed(2);
      total += lineTotal;
    });
    document.getElementById('quote-total').textContent = this.formatCurrency(total);
  },

  async createQuote(e) {
    e.preventDefault();
    const btn = document.getElementById('save-quote-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner mx-auto" style="width:18px;height:18px;border-width:2px;"></div>';

    const items = [];
    document.querySelectorAll('.quote-item').forEach(item => {
      items.push({
        description: item.querySelector('[name="description"]').value,
        quantity: parseFloat(item.querySelector('[name="quantity"]').value),
        unit_price: parseFloat(item.querySelector('[name="unit_price"]').value),
      });
    });

    try {
      const quote = await this.api('POST', '/api/quotes', {
        client_id: document.getElementById('quote-client').value,
        title: document.getElementById('quote-title').value,
        notes: document.getElementById('quote-notes').value,
        items,
      });
      this.toast('تم إنشاء العرض بنجاح');
      history.pushState(null, '', `/quotes/${quote.id}`);
      this.route();
    } catch (err) {
      this.toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save ml-1"></i> حفظ العرض';
    }
  },

  async renderQuoteDetail(id) {
    this.showLoading();
    try {
      const quote = await this.api('GET', `/api/quotes/${id}`);

      this.setContent(`
        <div class="fade-in">
          <div class="flex items-center gap-3 mb-6">
            <a href="/quotes" data-link class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <i class="fas fa-arrow-right"></i>
            </a>
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-800">${quote.title}</h1>
                ${this.statusBadge(quote.status)}
              </div>
              <p class="text-gray-500 text-sm mt-1">${quote.quote_number}</p>
            </div>
            <button onclick="App.deleteQuote('${id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg text-sm transition-colors">
              <i class="fas fa-trash ml-1"></i> حذف
            </button>
          </div>

          <div class="grid lg:grid-cols-3 gap-6">
            {/* معلومات العرض */}
            <div class="space-y-4">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-semibold text-gray-800 mb-4">معلومات العميل</h3>
                <div class="space-y-2">
                  <a href="/clients/${quote.client_id}" data-link class="text-primary-600 hover:underline font-medium text-sm">
                    <i class="fas fa-user ml-1"></i>${quote.clients?.name || '-'}
                  </a>
                  ${quote.clients?.company ? `<p class="text-sm text-gray-500">${quote.clients.company}</p>` : ''}
                  ${quote.clients?.email ? `<p class="text-sm text-gray-500"><i class="fas fa-envelope ml-1 text-gray-400"></i>${quote.clients.email}</p>` : ''}
                  ${quote.clients?.phone ? `<p class="text-sm text-gray-500" dir="ltr"><i class="fas fa-phone mr-1 text-gray-400"></i>${quote.clients.phone}</p>` : ''}
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-semibold text-gray-800 mb-4">تغيير الحالة</h3>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="App.updateQuoteStatus('${id}','draft')" class="px-3 py-2 text-xs font-medium rounded-lg border ${quote.status === 'draft' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}">مسودة</button>
                  <button onclick="App.updateQuoteStatus('${id}','sent')" class="px-3 py-2 text-xs font-medium rounded-lg border ${quote.status === 'sent' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-blue-50'}">مُرسل</button>
                  <button onclick="App.updateQuoteStatus('${id}','accepted')" class="px-3 py-2 text-xs font-medium rounded-lg border ${quote.status === 'accepted' ? 'bg-green-100 border-green-300 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-green-50'}">مقبول</button>
                  <button onclick="App.updateQuoteStatus('${id}','rejected')" class="px-3 py-2 text-xs font-medium rounded-lg border ${quote.status === 'rejected' ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-red-50'}">مرفوض</button>
                </div>
              </div>

              ${quote.notes ? `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 class="font-semibold text-gray-800 mb-2">ملاحظات</h3>
                  <p class="text-sm text-gray-500">${quote.notes}</p>
                </div>
              ` : ''}

              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p class="text-xs text-gray-400">أُنشئ في ${this.formatDate(quote.created_at)}</p>
                <p class="text-xs text-gray-400 mt-1">آخر تحديث ${this.formatDate(quote.updated_at)}</p>
              </div>
            </div>

            {/* بنود العرض */}
            <div class="lg:col-span-2">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-5 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-800">بنود العرض</h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-5 py-3 text-right text-xs font-medium text-gray-500">#</th>
                        <th class="px-5 py-3 text-right text-xs font-medium text-gray-500">الوصف</th>
                        <th class="px-5 py-3 text-center text-xs font-medium text-gray-500">الكمية</th>
                        <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">السعر</th>
                        <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                      ${(quote.quote_items || []).map((item, i) => `
                        <tr>
                          <td class="px-5 py-3 text-sm text-gray-400">${i + 1}</td>
                          <td class="px-5 py-3 text-sm text-gray-800">${item.description}</td>
                          <td class="px-5 py-3 text-sm text-gray-600 text-center">${item.quantity}</td>
                          <td class="px-5 py-3 text-sm text-gray-600 text-left">${this.formatCurrency(item.unit_price)}</td>
                          <td class="px-5 py-3 text-sm font-medium text-gray-800 text-left">${this.formatCurrency(item.total)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr class="bg-primary-50">
                        <td colspan="4" class="px-5 py-4 text-left font-bold text-gray-700">الإجمالي الكلي</td>
                        <td class="px-5 py-4 text-left text-xl font-bold text-primary-600">${this.formatCurrency(quote.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setContent(`<div class="text-center py-20 text-red-500">${err.message}</div>`);
    }
  },

  async updateQuoteStatus(id, status) {
    try {
      await this.api('PATCH', `/api/quotes/${id}/status`, { status });
      const statusLabels = { draft: 'مسودة', sent: 'مُرسل', accepted: 'مقبول', rejected: 'مرفوض' };
      this.toast(`تم تغيير الحالة إلى: ${statusLabels[status]}`);
      this.renderQuoteDetail(id);
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  async deleteQuote(id) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    try {
      await this.api('DELETE', `/api/quotes/${id}`);
      this.toast('تم حذف العرض');
      history.pushState(null, '', '/quotes');
      this.route();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },
};

// تشغيل التطبيق
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
