import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'
import authRoutes from './routes/auth'
import clientRoutes from './routes/clients'
import quoteRoutes from './routes/quotes'
import templateRoutes from './routes/templates'
import projectRoutes from './routes/projects'

type Bindings = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use(renderer)

app.route('/api/auth', authRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/quotes', quoteRoutes)
app.route('/api/templates', templateRoutes)
app.route('/api/projects', projectRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// SPA
app.get('*', (c) => {
  const env = c.env;
  return c.render(
    <div>
      <script dangerouslySetInnerHTML={{ __html: `
        window.__SUPABASE_URL__ = "${env.SUPABASE_URL || ''}";
        window.__SUPABASE_ANON_KEY__ = "${env.SUPABASE_ANON_KEY || ''}";
      `}} />

      <nav id="navbar" class="bg-white border-b border-gray-200 shadow-sm hidden sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <div class="flex justify-between items-center h-14">
            <div class="flex items-center gap-4">
              <a href="/" class="text-lg font-bold text-primary-600 flex items-center gap-2" data-link>
                <i class="fas fa-file-invoice-dollar"></i>
                <span class="hidden sm:inline">عروض الأسعار</span>
              </a>
              <div class="hidden md:flex items-center gap-0.5">
                <a href="/" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-chart-line ml-1"></i> الرئيسية
                </a>
                <a href="/clients" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-users ml-1"></i> العملاء
                </a>
                <a href="/quotes" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-file-alt ml-1"></i> العروض
                </a>
                <a href="/kanban" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-columns ml-1"></i> كانبان
                </a>
                <a href="/templates" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-layer-group ml-1"></i> القوالب
                </a>
                <a href="/projects" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-project-diagram ml-1"></i> المشاريع
                </a>
                <a href="/reports" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-chart-bar ml-1"></i> التقارير
                </a>
                <a href="/settings" data-link class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-cog ml-1"></i> الإعدادات
                </a>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span id="alerts-badge" class="hidden"></span>
              <span id="user-email" class="text-xs text-gray-400 hidden lg:inline"></span>
              <button onclick="App.logout()" class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                <i class="fas fa-sign-out-alt ml-1"></i> خروج
              </button>
            </div>
          </div>
        </div>
        {/* Mobile nav */}
        <div class="md:hidden border-t border-gray-100 px-2 py-1 flex gap-0.5 overflow-x-auto">
          <a href="/" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-chart-line block text-base mb-0.5"></i>الرئيسية
          </a>
          <a href="/clients" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-users block text-base mb-0.5"></i>العملاء
          </a>
          <a href="/quotes" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-file-alt block text-base mb-0.5"></i>العروض
          </a>
          <a href="/kanban" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-columns block text-base mb-0.5"></i>كانبان
          </a>
          <a href="/templates" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-layer-group block text-base mb-0.5"></i>القوالب
          </a>
          <a href="/projects" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-project-diagram block text-base mb-0.5"></i>المشاريع
          </a>
          <a href="/reports" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-chart-bar block text-base mb-0.5"></i>التقارير
          </a>
          <a href="/settings" data-link class="nav-link flex-shrink-0 text-center px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-600">
            <i class="fas fa-cog block text-base mb-0.5"></i>الإعدادات
          </a>
        </div>
      </nav>

      <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-center justify-center min-h-[60vh]"><div class="spinner"></div></div>
      </main>

      <div id="toast-container" class="fixed bottom-4 left-4 z-50 flex flex-col gap-2"></div>
      {/* Modal container */}
      <div id="modal-overlay" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
        <div id="modal-content" class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"></div>
      </div>
    </div>
  )
})

export default app
