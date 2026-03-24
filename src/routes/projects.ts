import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth'

const projects = new Hono()
projects.use('*', authMiddleware)

// قائمة المشاريع
projects.get('/', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { data, error } = await supabase.from('projects').select('*, clients(name, company), quotes(quote_number, title, total)').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// تفاصيل مشروع
projects.get('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const { data, error } = await supabase.from('projects').select('*, clients(name, company, email, phone), quotes(quote_number, title, total, status)').eq('id', c.req.param('id')).eq('user_id', user.id).single();
  if (error) return c.json({ error: 'المشروع غير موجود' }, 404);
  return c.json(data);
});

// تحديث حالة مشروع
projects.patch('/:id', async (c) => {
  const supabase = c.get('supabase') as any;
  const user = c.get('user') as any;
  const body = await c.req.json();
  const { data, error } = await supabase.from('projects').update(body).eq('id', c.req.param('id')).eq('user_id', user.id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

export default projects;
