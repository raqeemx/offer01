# نظام إدارة عروض الأسعار - Arabic RTL Quote Management System

## نظرة عامة
نظام ويب عربي (RTL) متكامل لإدارة عروض الأسعار، مبني بـ Hono + Supabase + Tailwind CSS.

## الميزات المنجزة

### الميزات الأساسية
- [x] تسجيل الدخول / إنشاء حساب عبر Supabase Auth
- [x] إدارة العملاء (CRUD: إنشاء، عرض، تعديل، حذف)
- [x] إنشاء عروض أسعار مع رقم تلقائي (QT-YYYY-NNNN)
- [x] إضافة بنود ديناميكية (وصف + كمية + سعر)
- [x] حساب الإجمالي تلقائياً
- [x] حالات العرض: مسودة، مُرسل، مقبول، مرفوض، منتهي

### الميزات المتقدمة
- [x] تصدير PDF مع html2canvas + jsPDF
- [x] رفع PDF إلى Supabase Storage
- [x] قوالب عروض الأسعار (إنشاء واستخدام)
- [x] تاريخ صلاحية العرض (valid_until)
- [x] موعد المتابعة التالية (next_followup_date)
- [x] تنبيهات للعروض التي تحتاج متابعة / تنتهي قريباً
- [x] فلترة حسب الحالة والعميل والتاريخ + بحث نصي
- [x] Timeline لكل عرض (سجل الأحداث)
- [x] تجديد العرض (Renew Quote)
- [x] نسخ العرض (Duplicate Quote)
- [x] تتبع سبب الرفض (Lost Reason Tracking)
- [x] لوحة كانبان مع السحب والإفلات (Drag & Drop)
- [x] لوحة تحكم شاملة (Opportunity Dashboard)
- [x] تنبيهات انتهاء الصلاحية (Expiry Alerts)
- [x] تحويل العرض المقبول إلى مشروع
- [x] تقارير الأداء ونسبة الفوز
- [x] تعديل العميل وتعديل العرض (Edit forms)

## البنية التقنية

### Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (PDF files)
- **Frontend**: Vanilla JS SPA + Tailwind CSS
- **Font**: IBM Plex Sans Arabic
- **PDF**: jsPDF + html2canvas

### API Endpoints
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | /api/auth/login | تسجيل الدخول |
| POST | /api/auth/register | إنشاء حساب |
| GET | /api/clients | قائمة العملاء |
| POST | /api/clients | إنشاء عميل |
| GET | /api/clients/:id | تفاصيل عميل |
| PUT | /api/clients/:id | تعديل عميل |
| DELETE | /api/clients/:id | حذف عميل |
| GET | /api/quotes | قائمة العروض (مع فلاتر) |
| POST | /api/quotes | إنشاء عرض |
| GET | /api/quotes/:id | تفاصيل عرض |
| PUT | /api/quotes/:id | تعديل عرض |
| DELETE | /api/quotes/:id | حذف عرض |
| PATCH | /api/quotes/:id/status | تغيير حالة العرض |
| GET | /api/quotes/:id/timeline | سجل أحداث العرض |
| POST | /api/quotes/:id/duplicate | نسخ عرض |
| POST | /api/quotes/:id/renew | تجديد عرض |
| POST | /api/quotes/:id/convert-to-project | تحويل لمشروع |
| POST | /api/quotes/:id/upload-pdf | رفع PDF للسحابة |
| GET | /api/quotes/stats/dashboard | إحصائيات Dashboard |
| GET | /api/templates | قائمة القوالب |
| POST | /api/templates | إنشاء قالب |
| DELETE | /api/templates/:id | حذف قالب |
| GET | /api/projects | قائمة المشاريع |
| GET | /api/projects/:id | تفاصيل مشروع |
| PATCH | /api/projects/:id | تحديث حالة مشروع |

### الصفحات
- `/` - لوحة التحكم (Dashboard)
- `/clients` - قائمة العملاء
- `/clients/new` - إضافة عميل
- `/clients/:id` - تفاصيل عميل
- `/clients/:id/edit` - تعديل عميل
- `/quotes` - قائمة العروض مع فلاتر وبحث
- `/quotes/new` - إنشاء عرض جديد
- `/quotes/:id` - تفاصيل عرض
- `/quotes/:id/edit` - تعديل عرض
- `/kanban` - لوحة كانبان
- `/templates` - قوالب العروض
- `/templates/new` - إنشاء قالب
- `/projects` - المشاريع
- `/projects/:id` - تفاصيل مشروع
- `/reports` - تقارير الأداء

### قاعدة البيانات
| الجدول | الوصف |
|--------|-------|
| clients | العملاء |
| quotes | عروض الأسعار |
| quote_items | بنود العروض |
| quote_timeline | سجل أحداث العروض |
| quote_templates | قوالب العروض |
| template_items | بنود القوالب |
| projects | المشاريع |
| quote_sequences | تسلسل أرقام العروض |

## التشغيل

### 1. إعداد Supabase
1. أنشئ مشروع على [supabase.com](https://supabase.com)
2. شغّل ملف `supabase/schema.sql` في SQL Editor
3. في Authentication > Settings عطّل "Confirm email"

### 2. ضبط المتغيرات
عدّل `.dev.vars`:
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. التشغيل محلياً
```bash
npm install
npm run build
npm run dev:sandbox   # http://localhost:3000
```

### 4. النشر على Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name quote-manager
```

## هيكل المشروع
```
webapp/
├── src/
│   ├── index.tsx          # نقطة الدخول الرئيسية
│   ├── renderer.tsx       # JSX Renderer
│   ├── routes/
│   │   ├── auth.ts        # مصادقة
│   │   ├── clients.ts     # عملاء
│   │   ├── quotes.ts      # عروض + PDF + إحصائيات
│   │   ├── templates.ts   # قوالب
│   │   └── projects.ts    # مشاريع
│   └── lib/
│       ├── supabase.ts    # Supabase client
│       ├── auth.ts        # Auth middleware
│       └── helpers.ts     # مساعدات
├── public/static/
│   ├── app.js             # Frontend SPA
│   └── style.css          # أنماط
├── supabase/
│   └── schema.sql         # مخطط قاعدة البيانات + RLS + Storage
├── wrangler.jsonc
├── ecosystem.config.cjs
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## الحالة
- **المنصة**: Cloudflare Pages
- **الحالة**: ✅ يعمل بالكامل
- **آخر تحديث**: 2026-03-24
