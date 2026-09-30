import { Elysia, t } from 'elysia';
import { authService } from '../services/auth.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const authController = new Elysia({ prefix: '/api/auth' })
  .post(
    '/register',
    async ({ body, set }) => {
      try {
        const result = await authService.register(body as any);
        set.status = 201;
        return { success: true, ...result };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        name: t.String(),
        department: t.Optional(t.String()),
        branch: t.Optional(t.String()),
        phone: t.Optional(t.String())
      })
    }
  )
  .post(
    '/login',
    async ({ body, set }) => {
      try {
        const result = await authService.login(body.email, body.password);
        return { success: true, ...result };
      } catch (err: any) {
        set.status = 401;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String()
      })
    }
  )
  .get('/me', async ({ headers, set }) => {
    const user = extractAuthUser(headers);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบ' };
    }
    try {
      const profile = await authService.getProfile(user.id);
      return { success: true, user: profile };
    } catch (err: any) {
      set.status = 404;
      return { success: false, error: err.message };
    }
  });
