import { Elysia, t } from 'elysia';
import { userService } from '../services/user.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const userController = new Elysia({ prefix: '/api/users' })
  // List all users (Admin only)
  .get('/', async ({ headers, query, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const users = await userService.getAllUsers(query.status, query.role);
      return { success: true, data: users };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  })
  // Create user (Admin only)
  .post(
    '/',
    async ({ headers, body, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const created = await userService.createUser(auth.id, body as any);
        return { success: true, message: 'สร้างผู้ใช้งานเรียบร้อยแล้ว', data: created };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        first_name: t.Optional(t.String()),
        last_name: t.Optional(t.String()),
        name: t.Optional(t.String()),
        email: t.String(),
        password: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        role: t.Optional(t.String()),
        department_id: t.Optional(t.Nullable(t.Number())),
        status: t.Optional(t.String())
      })
    }
  )
  // Approve user registration
  .patch('/:id/approve', async ({ params, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const updated = await userService.approveUser(params.id);
      return { success: true, message: 'อนุมัติการสมัครสมาชิกเรียบร้อยแล้ว', data: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })
  // Reject user registration
  .patch(
    '/:id/reject',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const updated = await userService.rejectUser(params.id, (body as any)?.reason);
        return { success: true, message: 'ปฏิเสธคำขอสมัครสมาชิกเรียบร้อยแล้ว', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Optional(t.Object({
        reason: t.Optional(t.String())
      }))
    }
  )
  // Update user profile/info
  .put(
    '/:id',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth) {
        set.status = 401;
        return { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบ' };
      }
      if (auth.role !== 'admin' && auth.id !== params.id) {
        set.status = 403;
        return { success: false, error: 'Forbidden: ไม่มีสิทธิ์แก้ไขข้อมูลผู้อื่น' };
      }

      try {
        const updated = await userService.updateUser(params.id, body as any);
        return { success: true, message: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  )
  // Delete user
  .delete('/:id', async ({ params, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const ok = await userService.deleteUser(params.id);
      return { success: ok, message: ok ? 'ลบข้อมูลผู้ใช้งานเรียบร้อย' : 'ไม่พบผู้ใช้ที่ต้องการลบ' };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  });
