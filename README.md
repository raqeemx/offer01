# نظام إدارة عروض الأسعار

نظام ويب عربي (RTL) لإدارة عروض الأسعار مبني على Hono + Cloudflare Pages + Supabase.

---

## دليل الإعداد الكامل (خطوة بخطوة)

### المرحلة 1: إعداد Supabase (قاعدة البيانات والمصادقة)

#### الخطوة 1 - إنشاء حساب ومشروع Supabase
1. اذهب إلى **[supabase.com](https://supabase.com)** واضغط **Start your project**
2. سجّل بحساب GitHub الخاص بك
3. اضغط **New Project**
4. املأ البيانات:
   - **Organization**: اختر مؤسستك أو أنشئ واحدة
   - **Name**: `quote-manager` (أو أي اسم تريده)
   - **Database Password**: اختر كلمة مرور قوية واحفظها
   - **Region**: اختر أقرب منطقة لك (مثال: `Central EU` أو `West US`)
5. اضغط **Create new project** وانتظر دقيقة حتى يجهز

#### الخطوة 2 - نسخ مفاتيح API
1. بعد إنشاء المشروع، اذهب إلى **Settings** (الترس في الشريط الجانبي)
2. اضغط **API** من القائمة
3. ستجد قسم **Project URL** - انسخ الرابط (يبدأ بـ `https://xxxxx.supabase.co`)
4. في قسم **Project API keys** - انسخ مفتاح **anon public** (النص الطويل الذي يبدأ بـ `eyJ...`)

> ⚠️ **مهم**: المفتاح `anon public` آمن للاستخدام في الكود. لا تنسخ مفتاح `service_role` أبدًا!

#### الخطوة 3 - إنشاء قاعدة البيانات
1. في لوحة تحكم Supabase، اضغط **SQL Editor** من الشريط الجانبي
2. اضغط **New query**
3. افتح ملف `supabase/schema.sql` من المشروع
4. انسخ **كل محتوى الملف** والصقه في المحرر
5. اضغط **Run** (أو Ctrl+Enter)
6. يجب أن ترى رسالة **Success. No rows returned** - هذا طبيعي

#### الخطوة 4 - التحقق من إنشاء الجداول
1. اذهب إلى **Table Editor** من الشريط الجانبي
2. يجب أن ترى 4 جداول:
   - `clients`
   - `quotes`
   - `quote_items`
   - `quote_sequences`

#### الخطوة 5 - إعداد المصادقة
1. اذهب إلى **Authentication** من الشريط الجانبي
2. اضغط **Providers**
3. تأكد أن **Email** مفعّل (يكون مفعلاً افتراضياً)
4. **مهم جداً** - لتسهيل التجربة: اذهب إلى **Authentication** > **Settings**
5. في قسم **Email Auth** - **عطّل** خيار **Confirm email** (أزل العلامة)
   - هذا يسمح لك بتسجيل حساب واستخدامه فوراً بدون تأكيد بريد
   - يمكنك تفعيله لاحقاً في الإنتاج

---

### المرحلة 2: ربط المشروع بـ Supabase

#### الخطوة 6 - تحديث متغيرات البيئة المحلية
افتح ملف `.dev.vars` في المشروع وعدّله:

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```

> استبدل القيم بالمفاتيح التي نسختها في الخطوة 2

#### الخطوة 7 - تحديث إعدادات Cloudflare
افتح ملف `wrangler.jsonc` وعدّل قسم `vars`:

```jsonc
{
  "vars": {
    "SUPABASE_URL": "https://xxxxxxxx.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx"
  }
}
```

> ⚠️ **تنبيه**: ملف `wrangler.jsonc` سيُرفع على GitHub. مفتاح `anon public` آمن للمشاركة لأنه محمي بـ RLS.
> إذا أردت خصوصية أكبر، استخدم Cloudflare Secrets عند النشر (موضح لاحقاً).

---

### المرحلة 3: تشغيل المشروع محلياً

#### الخطوة 8 - تثبيت وتشغيل
```bash
# 1. استنسخ المشروع (بعد رفعه على GitHub)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. تثبيت الحزم
npm install

# 3. بناء المشروع
npm run build

# 4. تشغيل سيرفر التطوير
npm run dev:sandbox
```

#### الخطوة 9 - تجربة التطبيق
1. افتح المتصفح على `http://localhost:3000`
2. ستظهر صفحة تسجيل الدخول
3. اضغط **حساب جديد** وأنشئ حساباً
4. بعد التسجيل ستدخل للوحة التحكم
5. جرّب:
   - إضافة عميل جديد
   - إنشاء عرض سعر
   - تغيير حالة العرض

---

### المرحلة 4: رفع المشروع على GitHub

#### الخطوة 10 - إنشاء مستودع GitHub
1. اذهب إلى **[github.com/new](https://github.com/new)**
2. **Repository name**: `quote-manager` (أو أي اسم)
3. **Description**: `نظام إدارة عروض الأسعار - Arabic RTL Quote Management System`
4. اختر **Private** (خاص) أو **Public** (عام)
5. **لا تضع علامة** على أي من الخيارات (README, .gitignore, license)
6. اضغط **Create repository**

#### الخطوة 11 - رفع الكود
```bash
cd quote-manager

# ربط المستودع المحلي بـ GitHub
git remote add origin https://github.com/YOUR_USERNAME/quote-manager.git

# رفع الكود
git branch -M main
git push -u origin main
```

> ملف `.dev.vars` لن يُرفع لأنه مُدرج في `.gitignore` ✅

---

### المرحلة 5: النشر على Cloudflare Pages (اختياري)

#### الخطوة 12 - إنشاء حساب Cloudflare
1. اذهب إلى **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. أنشئ حساباً مجانياً

#### الخطوة 13 - إنشاء API Token
1. اذهب إلى **[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)**
2. اضغط **Create Token**
3. اختر قالب **Edit Cloudflare Workers**
4. اضغط **Continue to summary** ثم **Create Token**
5. انسخ التوكن

#### الخطوة 14 - النشر
```bash
# تسجيل الدخول لـ Cloudflare
export CLOUDFLARE_API_TOKEN=your_token_here

# إنشاء المشروع
npx wrangler pages project create quote-manager --production-branch main

# بناء ونشر
npm run build
npx wrangler pages deploy dist --project-name quote-manager
```

#### الخطوة 15 - إضافة المتغيرات كـ Secrets (أكثر أماناً)
```bash
# بدلاً من وضع المفاتيح في wrangler.jsonc
npx wrangler pages secret put SUPABASE_URL --project-name quote-manager
# سيطلب منك إدخال القيمة - الصق رابط Supabase

npx wrangler pages secret put SUPABASE_ANON_KEY --project-name quote-manager
# الصق مفتاح anon
```

بعد النشر ستحصل على رابط مثل:
`https://quote-manager.pages.dev`

---

## هيكل المشروع
```
quote-manager/
├── src/
│   ├── index.tsx          # نقطة الدخول + الصفحة الرئيسية
│   ├── renderer.tsx       # قالب HTML (RTL + Tailwind + Font)
│   ├── lib/
│   │   ├── supabase.ts    # إعداد Supabase client
│   │   ├── auth.ts        # Middleware التحقق من المصادقة
│   │   └── helpers.ts     # دوال مساعدة (تنسيق التاريخ/العملة)
│   └── routes/
│       ├── auth.ts        # API تسجيل الدخول/الخروج/إنشاء حساب
│       ├── clients.ts     # API العملاء (CRUD)
│       └── quotes.ts      # API عروض الأسعار (CRUD + حالات)
├── public/static/
│   └── app.js             # واجهة المستخدم (SPA بـ Vanilla JS)
├── supabase/
│   └── schema.sql         # مخطط قاعدة البيانات الكامل
├── .dev.vars              # متغيرات البيئة المحلية (لا يُرفع على GitHub)
├── .gitignore             # الملفات المستثناة من Git
├── wrangler.jsonc         # إعدادات Cloudflare Workers
├── ecosystem.config.cjs   # إعدادات PM2
├── vite.config.ts         # إعدادات Vite
├── package.json           # الحزم والسكربتات
└── tsconfig.json          # إعدادات TypeScript
```

## مسارات API
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `GET /api/health` | GET | فحص صحة الخدمة |
| `POST /api/auth/login` | POST | تسجيل الدخول `{email, password}` |
| `POST /api/auth/register` | POST | إنشاء حساب `{email, password, full_name}` |
| `GET /api/clients` | GET | قائمة العملاء |
| `POST /api/clients` | POST | إنشاء عميل |
| `GET /api/clients/:id` | GET | تفاصيل عميل + عروضه |
| `PUT /api/clients/:id` | PUT | تحديث عميل |
| `DELETE /api/clients/:id` | DELETE | حذف عميل |
| `GET /api/quotes` | GET | قائمة العروض `(?client_id=)` |
| `POST /api/quotes` | POST | إنشاء عرض مع بنوده |
| `GET /api/quotes/:id` | GET | تفاصيل عرض + بنوده |
| `PUT /api/quotes/:id` | PUT | تحديث عرض |
| `PATCH /api/quotes/:id/status` | PATCH | تغيير حالة `{status}` |
| `DELETE /api/quotes/:id` | DELETE | حذف عرض |

## حالات عرض السعر
| الحالة | بالعربي | اللون |
|--------|---------|-------|
| `draft` | مسودة | رمادي |
| `sent` | مُرسل | أزرق |
| `accepted` | مقبول | أخضر |
| `rejected` | مرفوض | أحمر |

## التقنيات
- **Hono** - إطار العمل الخلفي (خفيف وسريع)
- **Cloudflare Pages** - منصة النشر
- **Supabase** - Auth + PostgreSQL Database + RLS
- **Tailwind CSS** - التصميم (عبر CDN)
- **IBM Plex Sans Arabic** - الخط العربي
- **Vanilla JavaScript** - SPA بدون إطار عمل

## ميزات مستقبلية
- [ ] تحرير العملاء
- [ ] تحرير عروض الأسعار
- [ ] طباعة/تصدير PDF
- [ ] البحث والتصفية
- [ ] ضريبة القيمة المضافة
- [ ] إرسال العرض بالبريد
- [ ] دعم متعدد العملات
