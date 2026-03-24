import { Context, Next } from 'hono'
import { getSupabaseWithAuth } from './supabase'

export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'غير مصرح - يرجى تسجيل الدخول' }, 401);
  }

  const env = c.env as any;
  const supabase = getSupabaseWithAuth(env, token);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return c.json({ error: 'جلسة منتهية - يرجى تسجيل الدخول مرة أخرى' }, 401);
  }

  c.set('user', user);
  c.set('supabase', supabase);
  c.set('token', token);
  
  await next();
}
