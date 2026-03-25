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
    content: body.content || null,
    variables_json: body.variables_json || null,
    template_type: body.template_type || null,
    service_type: body.service_type || null,
    is_active: body.is_active ?? true,
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

// نسخ قالب
templates.post('/:id/duplicate', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data: original, error: originalError } = await supabase
    .from('quote_templates')
    .select('*, template_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (originalError || !original) return c.json({ error: 'القالب غير موجود' }, 404);

  const { data: duplicate, error: duplicateError } = await supabase
    .from('quote_templates')
    .insert({
      user_id: user.id,
      name: `${original.name} (نسخة)`,
      description: original.description,
      default_notes: original.default_notes,
      default_valid_days: original.default_valid_days,
      content: original.content || null,
      variables_json: original.variables_json || null,
      template_type: original.template_type || null,
      service_type: original.service_type || null,
      is_active: original.is_active ?? true,
    })
    .select()
    .single();
  if (duplicateError) return c.json({ error: duplicateError.message }, 500);

  if (original.template_items?.length > 0) {
    const items = original.template_items.map((item: any) => ({
      template_id: duplicate.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order,
    }));
    await supabase.from('template_items').insert(items);
  }

  const { data: full } = await supabase
    .from('quote_templates')
    .select('*, template_items(*)')
    .eq('id', duplicate.id)
    .single();
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
