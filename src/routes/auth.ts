import { Hono } from 'hono'
import { getSupabase } from '../lib/supabase'

const auth = new Hono()

// تسجيل الدخول
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const env = c.env as any;
  const supabase = getSupabase(env);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({
    user: data.user,
    session: data.session
  });
});

// إنشاء حساب جديد
auth.post('/register', async (c) => {
  const { email, password, full_name } = await c.req.json();
  const env = c.env as any;
  const supabase = getSupabase(env);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name }
    }
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({
    user: data.user,
    session: data.session,
    message: 'تم إنشاء الحساب بنجاح'
  });
});

// تسجيل الخروج
auth.post('/logout', async (c) => {
  const env = c.env as any;
  const supabase = getSupabase(env);
  await supabase.auth.signOut();
  return c.json({ message: 'تم تسجيل الخروج' });
});

export default auth;
