import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth'
import type { AppEnv } from '../lib/types'

const clients = new Hono<AppEnv>()

clients.use('*', authMiddleware)

// قائمة العملاء
clients.get('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// إنشاء عميل
clients.post('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      address: body.address || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// تفاصيل عميل
clients.get('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return c.json({ error: 'العميل غير موجود' }, 404);
  return c.json(data);
});

// تحديث عميل
clients.put('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      address: body.address,
      notes: body.notes,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// حذف عميل
clients.delete('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const id = c.req.param('id');

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: 'تم حذف العميل بنجاح' });
});

export default clients;
