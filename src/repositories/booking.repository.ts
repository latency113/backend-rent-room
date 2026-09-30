import { supabase } from '../config/supabase';
import { Booking, BookingStatus, ReportFilterDTO } from '../types';

const BOOKING_RELATIONS_SELECT =
  '*, users:users!booking_user_id_fkey(*, department(*)), room(*, room_image(*)), booking_equipment(*, equipment(*))';

export class BookingRepository {
  private formatBooking(b: any): Booking {
    const startTimeISO = new Date(b.start_time).toISOString();
    const endTimeISO = new Date(b.end_time).toISOString();
    const dateStr = startTimeISO.split('T')[0];
    const sTime = startTimeISO.substring(11, 16);
    const eTime = endTimeISO.substring(11, 16);

    const userName = b.users ? `${b.users.first_name || ''} ${b.users.last_name || ''}`.trim() : 'ผู้ใช้งาน';
    const roomName = b.room?.room_name || `ห้องประชุม ${b.room_id}`;
    const equipments = (b.booking_equipment || []).map((be: any) => be.equipment?.equipment_name).filter(Boolean);

    return {
      booking_id: b.booking_id,
      start_time: b.start_time,
      end_time: b.end_time,
      attendee_count: b.attendee_count,
      status: b.status,
      created_at: b.created_at,
      user_id: b.user_id,
      room_id: b.room_id,
      approved_by_admin_id: b.approved_by_admin_id,
      title: b.title || 'การประชุม',
      note: b.note || '',

      // Joined relations
      user: b.users ? {
        user_id: b.users.user_id,
        first_name: b.users.first_name,
        last_name: b.users.last_name,
        email: b.users.email,
        phone: b.users.phone,
        name: userName
      } : undefined,
      room: b.room ? {
        room_id: b.room.room_id,
        room_name: b.room.room_name,
        capacity: b.room.capacity,
        location_detail: b.room.location_detail,
        name: b.room.room_name,
        id: String(b.room.room_id)
      } : undefined,
      booking_equipments: (b.booking_equipment || []).map((be: any) => ({
        equipment_id: be.equipment_id,
        equipment_name: be.equipment?.equipment_name || '',
        requested_quantity: be.requested_quantity || 1
      })),

      // Backward-compat aliases for frontend UI
      id: String(b.booking_id),
      booking_date: dateStr,
      start_time: sTime,
      end_time: eTime,
      attendees_count: b.attendee_count,
      booker_name: userName,
      department: b.users?.department?.department_name || 'ฝ่ายพัฒนาผลิตภัณฑ์',
      branch: 'สำนักงานใหญ่',
      phone: b.users?.phone || '',
      email: b.users?.email || '',
      equipment: equipments
    };
  }

  async findAll(filters?: ReportFilterDTO): Promise<Booking[]> {
    let query = supabase
      .from('booking')
      .select(BOOKING_RELATIONS_SELECT)
      .order('start_time', { ascending: false });

    if (filters?.room_id && filters.room_id !== 'All') {
      query = query.eq('room_id', Number(filters.room_id));
    }
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase BookingRepository] findAll error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    let list = (data || []).map(b => this.formatBooking(b));

    if (filters?.start_date) {
      list = list.filter(b => b.booking_date! >= filters.start_date!);
    }
    if (filters?.end_date) {
      list = list.filter(b => b.booking_date! <= filters.end_date!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.booker_name && b.booker_name.toLowerCase().includes(q)) ||
        (b.department && b.department.toLowerCase().includes(q))
      );
    }

    return list;
  }

  async findById(id: string | number): Promise<Booking | null> {
    const numId = Number(id);
    const { data, error } = await supabase
      .from('booking')
      .select(BOOKING_RELATIONS_SELECT)
      .eq('booking_id', numId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase BookingRepository] findById error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;
    return this.formatBooking(data);
  }

  async findByUserId(userId: string | number): Promise<Booking[]> {
    const numId = Number(userId);
    const { data, error } = await supabase
      .from('booking')
      .select(BOOKING_RELATIONS_SELECT)
      .eq('user_id', numId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('[Supabase BookingRepository] findByUserId error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return (data || []).map(b => this.formatBooking(b));
  }

  /**
   * Overlap check directly comparing start_time and end_time timestamps for the room
   * Overlap condition: (newStart < existingEnd) AND (newEnd > existingStart)
   */
  async findOverlappingBookings(
    roomId: string | number,
    startDateTimeISO: string,
    endDateTimeISO: string,
    excludeBookingId?: string | number
  ): Promise<any[]> {
    const numRoomId = Number(roomId);
    let query = supabase
      .from('booking')
      .select('*, room(*)')
      .eq('room_id', numRoomId)
      .in('status', ['APPROVED', 'PENDING'])
      .lt('start_time', endDateTimeISO)
      .gt('end_time', startDateTimeISO);

    if (excludeBookingId) {
      query = query.neq('booking_id', Number(excludeBookingId));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase BookingRepository] findOverlappingBookings error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return (data || []).map(b => this.formatBooking(b));
  }

  async create(bookingData: {
    user_id: number;
    room_id: number;
    start_time: string;
    end_time: string;
    attendee_count: number;
    status?: BookingStatus;
    title?: string;
    note?: string;
    equipment_ids?: number[];
    requested_equipments?: { equipment_id: number; requested_quantity: number }[];
  }): Promise<Booking> {
    const insertPayload = {
      user_id: bookingData.user_id,
      room_id: bookingData.room_id,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      attendee_count: bookingData.attendee_count,
      status: bookingData.status || 'PENDING',
      title: bookingData.title || 'การประชุม',
      note: bookingData.note || ''
    };

    const { data, error } = await supabase
      .from('booking')
      .insert([insertPayload])
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase BookingRepository] create error:', error?.message);
      throw new Error(`ไม่สามารถสร้างการจองในฐานข้อมูลได้: ${error?.message}`);
    }

    const bookingId = data.booking_id;

    // Insert equipment if requested
    if (bookingData.requested_equipments && bookingData.requested_equipments.length > 0) {
      const eqInserts = bookingData.requested_equipments.map(eq => ({
        booking_id: bookingId,
        equipment_id: Number(eq.equipment_id),
        requested_quantity: Number(eq.requested_quantity) || 1
      }));
      const { error: eqErr } = await supabase.from('booking_equipment').insert(eqInserts);
      if (eqErr) {
        console.error('[Supabase BookingRepository] insert booking_equipment error:', eqErr.message);
      } else {
        console.log(`[Supabase BookingRepository] Successfully linked ${eqInserts.length} equipment items to booking #${bookingId}`);
      }
    } else if (bookingData.equipment_ids && bookingData.equipment_ids.length > 0) {
      const eqInserts = bookingData.equipment_ids.map(eqId => ({
        booking_id: bookingId,
        equipment_id: Number(eqId),
        requested_quantity: 1
      }));
      const { error: eqErr } = await supabase.from('booking_equipment').insert(eqInserts);
      if (eqErr) {
        console.error('[Supabase BookingRepository] insert booking_equipment error:', eqErr.message);
      }
    }

    return this.findById(bookingId) as Promise<Booking>;
  }

  async update(id: string | number, partial: any): Promise<Booking | null> {
    const numId = Number(id);
    const updatePayload: any = {};
    if (partial.title !== undefined) updatePayload.title = partial.title;
    if (partial.note !== undefined) updatePayload.note = partial.note;
    if (partial.attendee_count !== undefined) updatePayload.attendee_count = Number(partial.attendee_count);
    if (partial.attendees_count !== undefined) updatePayload.attendee_count = Number(partial.attendees_count);
    if (partial.start_time !== undefined) updatePayload.start_time = partial.start_time;
    if (partial.end_time !== undefined) updatePayload.end_time = partial.end_time;
    if (partial.status !== undefined) updatePayload.status = partial.status.toUpperCase();

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from('booking')
        .update(updatePayload)
        .eq('booking_id', numId);

      if (error) {
        console.error('[Supabase BookingRepository] update error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
    }

    // Update equipments if provided
    if (partial.requested_equipments !== undefined) {
      await supabase.from('booking_equipment').delete().eq('booking_id', numId);
      if (Array.isArray(partial.requested_equipments) && partial.requested_equipments.length > 0) {
        const eqInserts = partial.requested_equipments.map((eq: any) => ({
          booking_id: numId,
          equipment_id: Number(eq.equipment_id),
          requested_quantity: Number(eq.requested_quantity) || 1
        }));
        const { error: eqErr } = await supabase.from('booking_equipment').insert(eqInserts);
        if (eqErr) {
          console.error('[Supabase BookingRepository] update booking_equipment error:', eqErr.message);
        }
      }
    }

    return this.findById(numId);
  }

  async updateStatus(id: string | number, status: BookingStatus, note?: string, adminId?: number): Promise<Booking | null> {
    const numId = Number(id);
    const updatePayload: any = { status: status.toUpperCase() };
    if (note !== undefined) updatePayload.note = note;
    if (adminId !== undefined) updatePayload.approved_by_admin_id = adminId;

    const { error } = await supabase
      .from('booking')
      .update(updatePayload)
      .eq('booking_id', numId);

    if (error) {
      console.error('[Supabase BookingRepository] updateStatus error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return this.findById(numId);
  }

  async delete(id: string | number): Promise<boolean> {
    const numId = Number(id);
    const { error } = await supabase.from('booking').delete().eq('booking_id', numId);
    if (error) {
      console.error('[Supabase BookingRepository] delete error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    return true;
  }
}

export const bookingRepository = new BookingRepository();
