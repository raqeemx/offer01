import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth'

const quotes = new Hono()

quotes.use('*', authMiddleware)

// قائمة عروض الأسعار
quotes.get('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const clientId = c.req.query('client_id');

  let query = supabase
    .from('quotes')
    .select('*, clients(name, company)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// إنشاء عرض سعر
quotes.post('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const body = await c.req.json();

  // توليد رقم العرض التلقائي
  const { data: seqData, error: seqError } = await supabase
    .rpc('generate_quote_number', { p_user_id: user.id });

  if (seqError) return c.json({ error: 'فشل في توليد رقم العرض: ' + seqError.message }, 500);

  const quoteNumber = seqData;

  // إنشاء العرض
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: user.id,
      client_id: body.client_id,
      quote_number: quoteNumber,
      title: body.title,
      status: 'draft',
      notes: body.notes || null,
    })
    .select()
    .single();

  if (quoteError) return c.json({ error: quoteError.message }, 500);

  // إضافة البنود
  if (body.items && body.items.length > 0) {
    const items = body.items.map((item: any, index: number) => ({
      quote_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(items);

    if (itemsError) return c.json({ error: itemsError.message }, 500);
  }

  // إعادة جلب العرض مع البنود
  const { data: fullQuote } = await supabase
    .from('quotes')
    .select('*, clients(name, company), quote_items(*)')
    .eq('id', quote.id)
    .single();

  return c.json(fullQuote, 201);
});

// تفاصيل عرض سعر
quotes.get('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from('quotes')
    .select('*, clients(name, company, email, phone), quote_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return c.json({ error: 'العرض غير موجود' }, 404);

  // ترتيب البنود
  if (data.quote_items) {
    data.quote_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
  }

  return c.json(data);
});

// تحديث حالة العرض
quotes.patch('/:id/status', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const { status } = await c.req.json();

  const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
  if (!validStatuses.includes(status)) {
    return c.json({ error: 'حالة غير صالحة' }, 400);
  }

  const { data, error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// تحديث عرض سعر
quotes.put('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const body = await c.req.json();

  // تحديث بيانات العرض
  const { error: quoteError } = await supabase
    .from('quotes')
    .update({
      title: body.title,
      notes: body.notes,
      client_id: body.client_id,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (quoteError) return c.json({ error: quoteError.message }, 500);

  // حذف البنود القديمة وإضافة الجديدة
  if (body.items) {
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', id);

    if (body.items.length > 0) {
      const items = body.items.map((item: any, index: number) => ({
        quote_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: index,
      }));

      await supabase.from('quote_items').insert(items);
    }
  }

  // إعادة جلب العرض
  const { data } = await supabase
    .from('quotes')
    .select('*, clients(name, company), quote_items(*)')
    .eq('id', id)
    .single();

  return c.json(data);
});

// حذف عرض سعر
quotes.delete('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'تم حذف العرض بنجاح' });
});

export default quotes;
