import { bookingRepository } from '../repositories/booking.repository';
import { roomRepository } from '../repositories/room.repository';
import { equipmentRepository } from '../repositories/equipment.repository';
import { notificationService } from './notification.service';
import { Booking, BookingStatus, CreateBookingDTO, ReportFilterDTO } from '../types';

export class BookingService {
  /**
   * Helper to normalize input into ISO Datetime strings and validate future time
   */
  private parseTimeRange(
    data: { booking_date?: string; start_time: string; end_time: string },
    checkFuture: boolean = true
  ) {
    let startISO = data.start_time;
    let endISO = data.end_time;

    // If given as HH:mm and booking_date
    if (data.booking_date && data.start_time.includes(':') && !data.start_time.includes('T')) {
      startISO = `${data.booking_date}T${data.start_time}:00`;
    }
    if (data.booking_date && data.end_time.includes(':') && !data.end_time.includes('T')) {
      endISO = `${data.booking_date}T${data.end_time}:00`;
    }

    const startDate = new Date(startISO);
    const endDate = new Date(endISO);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('รูปแบบวันและเวลาไม่ถูกต้อง');
    }
    if (startDate >= endDate) {
      throw new Error('เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุดเสมอ');
    }

    // Disallow booking in the past
    if (checkFuture) {
      const now = new Date();
      // Allow a 2-minute grace period to account for client-server clock skew / form submission latency
      const graceTime = new Date(now.getTime() - 2 * 60 * 1000);
      if (startDate < graceTime) {
        throw new Error('ไม่สามารถจองห้องประชุมย้อนหลังได้ กรุณาเลือกวันและเวลาที่เป็นปัจจุบันหรือในอนาคต');
      }
    }

    return { startISO: startDate.toISOString(), endISO: endDate.toISOString() };
  }

  /**
   * Helper to resolve requested equipments from either:
   * 1. requested_equipments: { equipment_id, requested_quantity }[]
   * 2. equipment_ids: number[]
   * 3. equipment: string[] (names)
   */
  private async resolveEquipments(data: {
    requested_equipments?: { equipment_id: number; requested_quantity?: number }[];
    equipment_ids?: number[];
    equipment?: string[];
  }): Promise<{ equipment_id: number; requested_quantity: number }[]> {
    if (data.requested_equipments && data.requested_equipments.length > 0) {
      return data.requested_equipments.map(e => ({
        equipment_id: Number(e.equipment_id),
        requested_quantity: Number(e.requested_quantity) || 1
      }));
    }

    if (data.equipment_ids && data.equipment_ids.length > 0) {
      return data.equipment_ids.map(id => ({
        equipment_id: Number(id),
        requested_quantity: 1
      }));
    }

    if (data.equipment && data.equipment.length > 0) {
      const allEquipments = await equipmentRepository.findAll();
      const nameToEq = new Map(
        allEquipments.map(e => [e.equipment_name.toLowerCase().trim(), e.equipment_id])
      );
      const list: { equipment_id: number; requested_quantity: number }[] = [];
      for (const name of data.equipment) {
        const clean = String(name).toLowerCase().trim();
        const eqId = nameToEq.get(clean);
        if (eqId) {
          list.push({ equipment_id: eqId, requested_quantity: 1 });
        }
      }
      return list;
    }

    return [];
  }

  async createBooking(userId: string | number, data: CreateBookingDTO): Promise<Booking> {
    const numUserId = Number(userId);
    const numRoomId = Number(data.room_id);

    if (!numRoomId || !data.start_time || !data.end_time || !data.title) {
      throw new Error('กรุณากรอกข้อมูลการจองที่จำเป็นให้ครบถ้วน');
    }

    const { startISO, endISO } = this.parseTimeRange({
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time
    });

    const room = await roomRepository.findById(numRoomId);
    if (!room) {
      throw new Error('ไม่พบห้องประชุมที่เลือก');
    }

    const attendees = Number(data.attendees_count || data.attendee_count || 1);
    if (attendees > room.capacity) {
      throw new Error(`จำนวนผู้เข้าร่วม (${attendees} คน) เกินความจุของห้องประชุมนี้ (${room.capacity} คน)`);
    }

    // Overlap check
    const overlaps = await bookingRepository.findOverlappingBookings(numRoomId, startISO, endISO);
    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      const conflictStart = conflict.start_time.substring(11, 16) || conflict.start_time;
      const conflictEnd = conflict.end_time.substring(11, 16) || conflict.end_time;
      throw new Error(
        `ไม่สามารถจองได้ เนื่องจากห้อง "${room.room_name}" มีการจองช่วงเวลา ${conflictStart} - ${conflictEnd} น. อยู่แล้ว`
      );
    }

    // Resolve equipment items
    const finalEquipments = await this.resolveEquipments(data);

    const newBooking = await bookingRepository.create({
      user_id: numUserId,
      room_id: numRoomId,
      start_time: startISO,
      end_time: endISO,
      attendee_count: attendees,
      status: 'PENDING',
      title: data.title.trim(),
      note: data.note || '',
      requested_equipments: finalEquipments
    });

    console.log(
      `[BOOKING] New booking created ID ${newBooking.booking_id} for room ${room.room_name}, equipment count: ${finalEquipments.length}`
    );
    return newBooking;
  }

  async updateBooking(id: string | number, userId: string | number, data: any, isAdmin: boolean = false): Promise<Booking> {
    const existing = await bookingRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบข้อมูลการจองนี้');
    }

    if (!isAdmin) {
      if (existing.user_id !== Number(userId)) {
        throw new Error('คุณไม่มีสิทธิ์แก้ไขการจองของผู้อื่น');
      }
      if (existing.status !== 'PENDING') {
        throw new Error('สามารถแก้ไขได้เฉพาะการจองที่ยังรอการอนุมัติ (Pending) เท่านั้น');
      }
    }

    let startISO = existing.start_time_iso || existing.raw_start_time || `${existing.booking_date}T${existing.start_time}:00`;
    let endISO = existing.end_time_iso || existing.raw_end_time || `${existing.booking_date}T${existing.end_time}:00`;

    if (data.start_time || data.end_time || data.booking_date) {
      const bDate = data.booking_date || existing.booking_date;
      const sTime = data.start_time || existing.start_time;
      const eTime = data.end_time || existing.end_time;
      const isTimeChanged = sTime !== existing.start_time || eTime !== existing.end_time || bDate !== existing.booking_date;
      const parsed = this.parseTimeRange({ booking_date: bDate, start_time: sTime, end_time: eTime }, isTimeChanged);
      startISO = parsed.startISO;
      endISO = parsed.endISO;

      // Check overlap
      const overlaps = await bookingRepository.findOverlappingBookings(
        existing.room_id,
        startISO,
        endISO,
        existing.booking_id
      );
      if (overlaps.length > 0) {
        throw new Error('ไม่สามารถเปลี่ยนเวลาได้ เนื่องจากช่วงเวลานี้มีรายการจองอยู่แล้ว');
      }
    }

    let finalEquipments: { equipment_id: number; requested_quantity: number }[] | undefined = undefined;
    if (data.requested_equipments !== undefined || data.equipment_ids !== undefined || data.equipment !== undefined) {
      finalEquipments = await this.resolveEquipments(data);
    }

    const updated = await bookingRepository.update(id, {
      title: data.title ?? existing.title,
      note: data.note ?? existing.note,
      attendee_count: data.attendee_count ?? data.attendees_count ?? existing.attendee_count,
      start_time: startISO,
      end_time: endISO,
      requested_equipments: finalEquipments
    });

    if (!updated) {
      throw new Error('ไม่สามารถบันทึกการแก้ไขการจองได้');
    }

    return updated;
  }

  async cancelBooking(id: string | number, userId: string | number, isAdmin: boolean = false, reason?: string): Promise<Booking> {
    const existing = await bookingRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบข้อมูลการจองนี้');
    }

    if (!isAdmin && existing.user_id !== Number(userId)) {
      throw new Error('คุณไม่มีสิทธิ์ยกเลิกการจองของผู้อื่น');
    }

    if (existing.status === 'CANCELLED') {
      throw new Error('การจองนี้ถูกยกเลิกไปแล้ว');
    }

    const note = reason ? `ยกเลิกเนื่องจาก: ${reason}` : (existing.note || 'ผู้ใช้ยกเลิกการจอง');
    const updated = await bookingRepository.updateStatus(id, 'CANCELLED', note);
    if (!updated) {
      throw new Error('ไม่สามารถยกเลิกการจองได้');
    }

    try {
      await notificationService.notifyBookingCancelled(updated, isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้จอง');
    } catch (notifErr: any) {
      console.error('[BookingService] notifyBookingCancelled error:', notifErr?.message || notifErr);
    }
    return updated;
  }

  async approveBooking(
    id: string | number,
    adminIdOrNote?: number | string,
    note?: string
  ): Promise<Booking> {
    const existing = await bookingRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบข้อมูลการจองนี้');
    }

    let adminId: number | undefined;
    let finalNote = note;
    if (typeof adminIdOrNote === 'number') {
      adminId = adminIdOrNote;
    } else if (typeof adminIdOrNote === 'string') {
      if (!isNaN(Number(adminIdOrNote))) {
        adminId = Number(adminIdOrNote);
      } else {
        finalNote = adminIdOrNote;
      }
    }

    let startISO = existing.start_time_iso || existing.raw_start_time;
    let endISO = existing.end_time_iso || existing.raw_end_time;
    if (!startISO || !startISO.includes('T')) {
      startISO = `${existing.booking_date}T${existing.start_time}:00`;
    }
    if (!endISO || !endISO.includes('T')) {
      endISO = `${existing.booking_date}T${existing.end_time}:00`;
    }

    // Re-verify no other approved booking clashes
    const overlaps = await bookingRepository.findOverlappingBookings(
      existing.room_id,
      startISO,
      endISO,
      existing.booking_id
    );

    const approvedConflict = overlaps.find(o => o.status === 'APPROVED');
    if (approvedConflict) {
      throw new Error('ไม่สามารถอนุมัติได้ เนื่องจากมีรายการที่ได้รับการอนุมัติแล้วในช่วงเวลาเดียวกัน');
    }

    const updated = await bookingRepository.updateStatus(id, 'APPROVED', finalNote || 'อนุมัติเรียบร้อย', adminId);
    if (!updated) {
      throw new Error('ไม่สามารถอนุมัติการจองได้');
    }

    try {
      await notificationService.notifyBookingApproved(updated);
    } catch (notifErr: any) {
      console.error('[BookingService] notifyBookingApproved error:', notifErr?.message || notifErr);
    }
    return updated;
  }

  async rejectBooking(
    id: string | number,
    adminIdOrReason?: number | string,
    reason?: string
  ): Promise<Booking> {
    const existing = await bookingRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบข้อมูลการจองนี้');
    }

    let adminId: number | undefined;
    let finalReason = reason;
    if (typeof adminIdOrReason === 'number') {
      adminId = adminIdOrReason;
    } else if (typeof adminIdOrReason === 'string') {
      if (!isNaN(Number(adminIdOrReason))) {
        adminId = Number(adminIdOrReason);
      } else {
        finalReason = adminIdOrReason;
      }
    }

    const updated = await bookingRepository.updateStatus(
      id,
      'REJECTED',
      finalReason ? `ปฏิเสธ: ${finalReason}` : 'ไม่อนุมัติคำขอ',
      adminId
    );
    if (!updated) {
      throw new Error('ไม่สามารถปฏิเสธการจองได้');
    }

    try {
      await notificationService.notifyBookingRejected(updated, finalReason);
    } catch (notifErr: any) {
      console.error('[BookingService] notifyBookingRejected error:', notifErr?.message || notifErr);
    }
    return updated;
  }

  async getMyBookings(userId: string | number): Promise<Booking[]> {
    return bookingRepository.findByUserId(userId);
  }

  async getAllBookings(filters?: ReportFilterDTO): Promise<Booking[]> {
    return bookingRepository.findAll(filters);
  }

  async getBookingById(id: string | number): Promise<Booking | null> {
    return bookingRepository.findById(id);
  }

  async getCalendarBookings(roomId?: string | number, date?: string): Promise<Booking[]> {
    const filters: ReportFilterDTO = {};
    if (roomId && roomId !== 'All') {
      filters.room_id = roomId;
    }
    if (date) {
      filters.start_date = date;
      filters.end_date = date;
    }
    return bookingRepository.findAll(filters);
  }
}

export const bookingService = new BookingService();
