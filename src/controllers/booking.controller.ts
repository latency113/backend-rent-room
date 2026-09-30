import { Elysia, t } from 'elysia';
import { bookingService } from '../services/booking.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const bookingController = new Elysia({ prefix: '/api/bookings' })
  // Create booking
  .post(
    '/',
    async ({ body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth) {
        set.status = 401;
        return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำการจองห้องประชุม' };
      }

      try {
        const booking = await bookingService.createBooking(auth.id, body as any);
        set.status = 201;
        return {
          success: true,
          message: 'ส่งคำขอจองห้องประชุมเรียบร้อยแล้ว รอผู้ดูแลระบบตรวจสอบและอนุมัติ',
          data: booking
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        room_id: t.String(),
        title: t.String(),
        booker_name: t.String(),
        department: t.String(),
        branch: t.Optional(t.String()),
        phone: t.String(),
        email: t.String(),
        booking_date: t.String(),
        start_time: t.String(),
        end_time: t.String(),
        attendees_count: t.Number(),
        equipment: t.Optional(t.Array(t.String())),
        equipment_ids: t.Optional(t.Array(t.Number())),
        requested_equipments: t.Optional(t.Array(t.Object({
          equipment_id: t.Number(),
          requested_quantity: t.Optional(t.Number())
        }))),
        note: t.Optional(t.String())
      })
    }
  )
  // Get all bookings (Admin or general report)
  .get('/', async ({ query, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth) {
      set.status = 401;
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
    }

    try {
      const filters = {
        room_id: query.room_id,
        status: query.status as any,
        start_date: query.start_date,
        end_date: query.end_date,
        search: query.search
      };
      const bookings = await bookingService.getAllBookings(filters);
      return { success: true, data: bookings };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  })
  // Get current user's bookings
  .get('/my', async ({ headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth) {
      set.status = 401;
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
    }

    try {
      const bookings = await bookingService.getMyBookings(auth.id);
      return { success: true, data: bookings };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  })
  // Calendar bookings (accessible for checking room availability)
  .get('/calendar', async ({ query }) => {
    const bookings = await bookingService.getCalendarBookings(query.room_id, query.date);
    return { success: true, data: bookings };
  })
  // Get single booking
  .get('/:id', async ({ params, set }) => {
    const booking = await bookingService.getBookingById(params.id);
    if (!booking) {
      set.status = 404;
      return { success: false, error: 'ไม่พบรายการจองนี้' };
    }
    return { success: true, data: booking };
  })
  // Update booking
  .put(
    '/:id',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth) {
        set.status = 401;
        return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
      }

      try {
        const isAdmin = auth.role === 'admin';
        const updated = await bookingService.updateBooking(params.id, auth.id, body as any, isAdmin);
        return { success: true, message: 'แก้ไขข้อมูลการจองสำเร็จ', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  )
  // Cancel booking
  .patch(
    '/:id/cancel',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth) {
        set.status = 401;
        return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
      }

      try {
        const isAdmin = auth.role === 'admin';
        const reason = (body as any)?.reason;
        const updated = await bookingService.cancelBooking(params.id, auth.id, isAdmin, reason);
        return { success: true, message: 'ยกเลิกการจองเรียบร้อยแล้ว', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  )
  // Admin approve booking
  .patch(
    '/:id/approve',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const adminId = Number(auth.id) || undefined;
        const note = (body as any)?.note;
        const updated = await bookingService.approveBooking(params.id, adminId, note);
        return { success: true, message: 'อนุมัติการจองห้องประชุมเรียบร้อยแล้ว', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  )
  // Admin reject booking
  .patch(
    '/:id/reject',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const adminId = Number(auth.id) || undefined;
        const reason = (body as any)?.reason;
        const updated = await bookingService.rejectBooking(params.id, adminId, reason);
        return { success: true, message: 'ปฏิเสธการจองห้องประชุมเรียบร้อยแล้ว', data: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    }
  );
