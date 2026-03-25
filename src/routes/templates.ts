import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth'
import type { AppEnv } from '../lib/types'

const templates = new Hono<AppEnv>()
templates.use('*', authMiddleware)

// قائمة القوالب
templates.get('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { data, error } = await supabase.from('quote_templates').select('*, template_items(*)').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// إنشاء قالب
templates.post('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const body = await c.req.json();

  const { data: tmpl, error } = await supabase.from('quote_templates').insert({
    user_id: user.id, name: body.name, description: body.description || null,
    default_notes: body.default_notes || null, default_valid_days: body.default_valid_days || 30,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);

  if (body.items?.length > 0) {
    const items = body.items.map((item: any, i: number) => ({
      template_id: tmpl.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, sort_order: i,
    }));
    await supabase.from('template_items').insert(items);
  }

  const { data: full } = await supabase.from('quote_templates').select('*, template_items(*)').eq('id', tmpl.id).single();
  return c.json(full, 201);
});

// تفاصيل قالب
templates.get('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { data, error } = await supabase.from('quote_templates').select('*, template_items(*)').eq('id', c.req.param('id')).eq('user_id', user.id).single();
  if (error) return c.json({ error: 'القالب غير موجود' }, 404);
  return c.json(data);
});

// حذف قالب
templates.delete('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { error } = await supabase.from('quote_templates').delete().eq('id', c.req.param('id')).eq('user_id', user.id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'تم حذف القالب' });
});

export default templates;
