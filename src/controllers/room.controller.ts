import { Elysia, t } from 'elysia';
import { roomService } from '../services/room.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const roomController = new Elysia({ prefix: '/api/rooms' })
  .get('/', async ({ query }) => {
    const onlyActive = query.activeOnly === 'true';
    const rooms = await roomService.getAllRooms(onlyActive);
    return { success: true, data: rooms };
  })
  .get('/:id', async ({ params, set }) => {
    const room = await roomService.getRoomById(params.id);
    if (!room) {
      set.status = 404;
      return { success: false, error: 'ไม่พบห้องประชุมที่ต้องการ' };
    }
    return { success: true, data: room };
  })
  .post(
    '/',
    async ({ body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const newRoom = await roomService.createRoom(body as any);
        set.status = 201;
        return { success: true, message: 'เพิ่มห้องประชุมสำเร็จ', data: newRoom };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        code: t.String(),
        name: t.String(),
        capacity: t.Number(),
        floor: t.Optional(t.String()),
        description: t.Optional(t.String()),
        image_url: t.Optional(t.String()),
        images: t.Optional(t.Array(t.String())),
        equipment: t.Optional(t.Array(t.String())),
        is_active: t.Optional(t.Boolean())
      })
    }
  )
  .put(
    '/:id',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const updated = await roomService.updateRoom(params.id, body as any);
        return { success: true, message: 'แก้ไขห้องประชุมสำเร็จ', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  )
  .delete('/:id', async ({ params, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const ok = await roomService.deleteRoom(params.id);
      return { success: ok, message: ok ? 'ลบห้องประชุมเรียบร้อยแล้ว' : 'ไม่พบห้องประชุม' };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  });
