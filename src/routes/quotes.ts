import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth'

const quotes = new Hono()
quotes.use('*', authMiddleware)

// ---- Helper: إضافة حدث للـ Timeline ----
async function addTimeline(supabase: any, quoteId: string, userId: string, action: string, details?: string, oldVal?: string, newVal?: string) {
  await supabase.from('quote_timeline').insert({ quote_id: quoteId, user_id: userId, action, details, old_value: oldVal, new_value: newVal });
}

// ============================================
// ⚠️ IMPORTANT: Static routes MUST come BEFORE /:id
// ============================================

// ---- إحصائيات (Dashboard) ----
quotes.get('/stats/dashboard', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;

  const { data: allQuotes } = await supabase.from('quotes').select('status, total, created_at, valid_until, next_followup_date, client_id').eq('user_id', user.id);
  const { data: allClients } = await supabase.from('clients').select('id').eq('user_id', user.id);
  const { data: allProjects } = await supabase.from('projects').select('id, status, budget').eq('user_id', user.id);

  const quotes_data = allQuotes || [];
  const today = new Date().toISOString().split('T')[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const totalValue = quotes_data.reduce((s: number, q: any) => s + Number(q.total || 0), 0);
  const acceptedValue = quotes_data.filter((q: any) => q.status === 'accepted').reduce((s: number, q: any) => s + Number(q.total || 0), 0);
  const sentValue = quotes_data.filter((q: any) => q.status === 'sent').reduce((s: number, q: any) => s + Number(q.total || 0), 0);

  const statusCounts: any = { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 };
  quotes_data.forEach((q: any) => { statusCounts[q.status] = (statusCounts[q.status] || 0) + 1; });

  const total = quotes_data.length;
  const winRate = total > 0 ? Math.round((statusCounts.accepted / Math.max(statusCounts.accepted + statusCounts.rejected, 1)) * 100) : 0;

  const needFollowup = quotes_data.filter((q: any) => q.next_followup_date && q.next_followup_date <= today && q.status !== 'accepted' && q.status !== 'rejected').length;
  const expiringSoon = quotes_data.filter((q: any) => q.valid_until && q.valid_until >= today && q.valid_until <= weekLater && q.status === 'sent').length;

  // Monthly data (last 6 months)
  const monthly: any[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().substring(0, 7);
    const monthQuotes = quotes_data.filter((q: any) => q.created_at?.startsWith(ym));
    monthly.push({
      month: ym,
      total: monthQuotes.length,
      accepted: monthQuotes.filter((q: any) => q.status === 'accepted').length,
      value: monthQuotes.reduce((s: number, q: any) => s + Number(q.total || 0), 0),
    });
  }

  // Top clients by quote value
  const clientMap: any = {};
  quotes_data.forEach((q: any) => {
    if (!clientMap[q.client_id]) clientMap[q.client_id] = { count: 0, value: 0, accepted: 0 };
    clientMap[q.client_id].count++;
    clientMap[q.client_id].value += Number(q.total || 0);
    if (q.status === 'accepted') clientMap[q.client_id].accepted++;
  });

  return c.json({
    totalClients: allClients?.length || 0,
    totalQuotes: total,
    totalProjects: allProjects?.length || 0,
    statusCounts,
    totalValue, acceptedValue, sentValue,
    winRate, needFollowup, expiringSoon, monthly,
    topClientsCount: Object.keys(clientMap).length,
  });
});

// ---- قائمة عروض الأسعار مع فلاتر ----
quotes.get('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { client_id, status, date_from, date_to, followup, expiring, search } = c.req.query();

  let query = supabase.from('quotes').select('*, clients(name, company)').eq('user_id', user.id).order('created_at', { ascending: false });

  if (client_id) query = query.eq('client_id', client_id);
  if (status) query = query.eq('status', status);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to + 'T23:59:59');

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  let result = data || [];
  const today = new Date().toISOString().split('T')[0];

  // فلتر: العروض التي تحتاج متابعة اليوم أو قبله
  if (followup === 'true') {
    result = result.filter((q: any) => q.next_followup_date && q.next_followup_date <= today && q.status !== 'accepted' && q.status !== 'rejected');
  }

  // فلتر: العروض التي ستنتهي صلاحيتها خلال 7 أيام
  if (expiring === 'true') {
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    result = result.filter((q: any) => q.valid_until && q.valid_until >= today && q.valid_until <= weekLater && q.status === 'sent');
  }

  // بحث نصي
  if (search) {
    const s = search.toLowerCase();
    result = result.filter((q: any) => q.title?.toLowerCase().includes(s) || q.quote_number?.toLowerCase().includes(s) || q.clients?.name?.toLowerCase().includes(s));
  }

  return c.json(result);
});

// ---- إنشاء عرض سعر ----
quotes.post('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const body = await c.req.json();

  const { data: seqData, error: seqError } = await supabase.rpc('generate_quote_number', { p_user_id: user.id });
  if (seqError) return c.json({ error: 'فشل في توليد رقم العرض: ' + seqError.message }, 500);

  const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
    user_id: user.id, client_id: body.client_id, quote_number: seqData, title: body.title, status: 'draft',
    notes: body.notes || null, valid_until: body.valid_until || null, next_followup_date: body.next_followup_date || null,
    template_id: body.template_id || null, renewed_from: body.renewed_from || null,
  }).select().single();
  if (quoteError) return c.json({ error: quoteError.message }, 500);

  if (body.items?.length > 0) {
    const items = body.items.map((item: any, i: number) => ({ quote_id: quote.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, sort_order: i }));
    const { error: itemsError } = await supabase.from('quote_items').insert(items);
    if (itemsError) return c.json({ error: itemsError.message }, 500);
  }

  await addTimeline(supabase, quote.id, user.id, 'created', 'تم إنشاء العرض');

  const { data: fullQuote } = await supabase.from('quotes').select('*, clients(name, company), quote_items(*)').eq('id', quote.id).single();
  return c.json(fullQuote, 201);
});

// ---- تفاصيل عرض سعر ----
quotes.get('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data, error } = await supabase.from('quotes').select('*, clients(name, company, email, phone, address), quote_items(*)')
    .eq('id', id).eq('user_id', user.id).single();
  if (error) return c.json({ error: 'العرض غير موجود' }, 404);
  if (data.quote_items) data.quote_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
  return c.json(data);
});

// ---- Timeline عرض ----
quotes.get('/:id/timeline', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data, error } = await supabase.from('quote_timeline').select('*').eq('quote_id', id).eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ---- تحديث حالة العرض (مع lost_reason) ----
quotes.patch('/:id/status', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const { status, lost_reason } = await c.req.json();

  const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  if (!validStatuses.includes(status)) return c.json({ error: 'حالة غير صالحة' }, 400);

  const { data: old } = await supabase.from('quotes').select('status').eq('id', id).eq('user_id', user.id).single();
  if (!old) return c.json({ error: 'العرض غير موجود' }, 404);

  const updateData: any = { status };
  if (status === 'rejected' && lost_reason) updateData.lost_reason = lost_reason;

  const { data, error } = await supabase.from('quotes').update(updateData).eq('id', id).eq('user_id', user.id).select().single();
  if (error) return c.json({ error: error.message }, 500);

  const statusLabels: any = { draft: 'مسودة', sent: 'مُرسل', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهي' };
  await addTimeline(supabase, id, user.id, 'status_changed', `تغيير الحالة من ${statusLabels[old.status]} إلى ${statusLabels[status]}`, old.status, status);

  return c.json(data);
});

// ---- تحديث عرض سعر ----
quotes.put('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { error: quoteError } = await supabase.from('quotes').update({
    title: body.title, notes: body.notes, client_id: body.client_id,
    valid_until: body.valid_until || null, next_followup_date: body.next_followup_date || null,
  }).eq('id', id).eq('user_id', user.id);
  if (quoteError) return c.json({ error: quoteError.message }, 500);

  if (body.items) {
    await supabase.from('quote_items').delete().eq('quote_id', id);
    if (body.items.length > 0) {
      const items = body.items.map((item: any, i: number) => ({ quote_id: id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, sort_order: i }));
      await supabase.from('quote_items').insert(items);
    }
  }

  await addTimeline(supabase, id, user.id, 'updated', 'تم تحديث العرض');

  const { data } = await supabase.from('quotes').select('*, clients(name, company), quote_items(*)').eq('id', id).single();
  return c.json(data);
});

// ---- نسخ عرض (Duplicate) ----
quotes.post('/:id/duplicate', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data: orig } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', id).eq('user_id', user.id).single();
  if (!orig) return c.json({ error: 'العرض غير موجود' }, 404);

  const { data: seqData } = await supabase.rpc('generate_quote_number', { p_user_id: user.id });

  const { data: newQ, error } = await supabase.from('quotes').insert({
    user_id: user.id, client_id: orig.client_id, quote_number: seqData,
    title: orig.title + ' (نسخة)', status: 'draft', notes: orig.notes,
    valid_until: orig.valid_until, template_id: orig.template_id,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);

  if (orig.quote_items?.length > 0) {
    const items = orig.quote_items.map((item: any) => ({ quote_id: newQ.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, sort_order: item.sort_order }));
    await supabase.from('quote_items').insert(items);
  }

  await addTimeline(supabase, newQ.id, user.id, 'duplicated', `تم نسخ العرض من ${orig.quote_number}`);
  return c.json(newQ, 201);
});

// ---- تجديد عرض (Renew) ----
quotes.post('/:id/renew', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { data: orig } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', id).eq('user_id', user.id).single();
  if (!orig) return c.json({ error: 'العرض غير موجود' }, 404);

  const { data: seqData } = await supabase.rpc('generate_quote_number', { p_user_id: user.id });

  const { data: newQ, error } = await supabase.from('quotes').insert({
    user_id: user.id, client_id: orig.client_id, quote_number: seqData,
    title: orig.title, status: 'draft', notes: orig.notes,
    valid_until: body.valid_until || null, renewed_from: orig.id, template_id: orig.template_id,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);

  if (orig.quote_items?.length > 0) {
    const items = orig.quote_items.map((item: any) => ({ quote_id: newQ.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, sort_order: item.sort_order }));
    await supabase.from('quote_items').insert(items);
  }

  await supabase.from('quotes').update({ status: 'expired' }).eq('id', id).eq('user_id', user.id);
  await addTimeline(supabase, id, user.id, 'renewed', `تم تجديد العرض برقم ${seqData}`);
  await addTimeline(supabase, newQ.id, user.id, 'created', `عرض مجدد من ${orig.quote_number}`);

  return c.json(newQ, 201);
});

// ---- تحويل العرض المقبول إلى مشروع ----
quotes.post('/:id/convert-to-project', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).eq('user_id', user.id).single();
  if (!quote) return c.json({ error: 'العرض غير موجود' }, 404);
  if (quote.status !== 'accepted') return c.json({ error: 'يمكن تحويل العروض المقبولة فقط' }, 400);

  const { data: project, error } = await supabase.from('projects').insert({
    user_id: user.id, quote_id: id, client_id: quote.client_id,
    name: body.name || quote.title, description: body.description || quote.notes,
    status: 'active', budget: quote.total,
    start_date: body.start_date || new Date().toISOString().split('T')[0],
    end_date: body.end_date || null,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);

  await addTimeline(supabase, id, user.id, 'converted_to_project', `تم تحويل العرض إلى مشروع`);
  return c.json(project, 201);
});

// ---- رفع PDF إلى Supabase Storage ----
quotes.post('/:id/upload-pdf', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { base64Data, fileName } = body;

    if (!base64Data) return c.json({ error: 'لا توجد بيانات PDF' }, 400);

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `${user.id}/${fileName || id + '.pdf'}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quote-pdfs')
      .upload(filePath, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) return c.json({ error: 'فشل رفع PDF: ' + uploadError.message }, 500);

    // Get public URL
    const { data: urlData } = supabase.storage.from('quote-pdfs').getPublicUrl(filePath);
    const pdfUrl = urlData?.publicUrl || '';

    // Save URL in quote record
    await supabase.from('quotes').update({ pdf_url: pdfUrl }).eq('id', id).eq('user_id', user.id);
    await addTimeline(supabase, id, user.id, 'pdf_generated', 'تم إنشاء وحفظ ملف PDF');

    return c.json({ pdf_url: pdfUrl, path: filePath });
  } catch (e: any) {
    return c.json({ error: 'خطأ في رفع PDF: ' + e.message }, 500);
  }
});

// ---- حفظ رابط PDF ----
quotes.patch('/:id/pdf', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const { pdf_url } = await c.req.json();

  const { data, error } = await supabase.from('quotes').update({ pdf_url }).eq('id', id).eq('user_id', user.id).select().single();
  if (error) return c.json({ error: error.message }, 500);

  await addTimeline(supabase, id, user.id, 'pdf_generated', 'تم إنشاء ملف PDF');
  return c.json(data);
});

// ---- حذف عرض سعر ----
quotes.delete('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { error } = await supabase.from('quotes').delete().eq('id', id).eq('user_id', user.id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'تم حذف العرض بنجاح' });
});

export default quotes;
