import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'
import authRoutes from './routes/auth'
import clientRoutes from './routes/clients'
import quoteRoutes from './routes/quotes'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors())
app.use(renderer)

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/quotes', quoteRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// SPA - All pages served from single entry
app.get('*', (c) => {
  const env = c.env;
  return c.render(
    <div>
      <script dangerouslySetInnerHTML={{ __html: `
        window.__SUPABASE_URL__ = "${env.SUPABASE_URL || ''}";
        window.__SUPABASE_ANON_KEY__ = "${env.SUPABASE_ANON_KEY || ''}";
      `}} />
      
      {/* Navigation */}
      <nav id="navbar" class="bg-white border-b border-gray-200 shadow-sm hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center gap-6">
              <a href="/" class="text-xl font-bold text-primary-600 flex items-center gap-2" data-link>
                <i class="fas fa-file-invoice-dollar"></i>
                <span>عروض الأسعار</span>
              </a>
              <div class="hidden sm:flex items-center gap-1">
                <a href="/" data-link class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-home ml-1"></i> الرئيسية
                </a>
                <a href="/clients" data-link class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-users ml-1"></i> العملاء
                </a>
                <a href="/quotes" data-link class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <i class="fas fa-file-alt ml-1"></i> العروض
                </a>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span id="user-email" class="text-sm text-gray-500 hidden sm:inline"></span>
              <button onclick="App.logout()" class="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <i class="fas fa-sign-out-alt ml-1"></i> خروج
              </button>
            </div>
          </div>
        </div>
        {/* Mobile nav */}
        <div class="sm:hidden border-t border-gray-100 px-4 py-2 flex gap-1">
          <a href="/" data-link class="nav-link flex-1 text-center px-2 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50">
            <i class="fas fa-home block text-lg mb-0.5"></i> الرئيسية
          </a>
          <a href="/clients" data-link class="nav-link flex-1 text-center px-2 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50">
            <i class="fas fa-users block text-lg mb-0.5"></i> العملاء
          </a>
          <a href="/quotes" data-link class="nav-link flex-1 text-center px-2 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50">
            <i class="fas fa-file-alt block text-lg mb-0.5"></i> العروض
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-center justify-center min-h-[60vh]">
          <div class="spinner"></div>
        </div>
      </main>

      {/* Toast Container */}
      <div id="toast-container" class="fixed bottom-4 left-4 z-50 flex flex-col gap-2"></div>
    </div>
  )
})

export default app
