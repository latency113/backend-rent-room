import { Elysia } from 'elysia';
import { notificationService } from '../services/notification.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const notificationController = new Elysia({ prefix: '/api/notifications' })
  .get('/', async ({ headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth) {
      set.status = 401;
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
    }

    try {
      const list = await notificationService.getUserNotifications(auth.id);
      return { success: true, data: list };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  })
  .patch('/:id/read', async ({ params, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth) {
      set.status = 401;
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
    }

    try {
      await notificationService.markAsRead(params.id);
      return { success: true };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  })
  .patch('/read-all', async ({ headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth) {
      set.status = 401;
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
    }

    try {
      await notificationService.markAllAsRead(auth.id);
      return { success: true };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  });
