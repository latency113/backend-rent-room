import { notificationRepository } from '../repositories/notification.repository';
import { User, Booking } from '../types';

export class NotificationService {
  /**
   * Log and record email dispatch for system events
   */
  private logEmail(to?: string, subject?: string, bodyText?: string) {
    console.log(`\n================== 📧 EMAIL NOTIFICATION SENT ==================`);
    console.log(`TO: ${to || 'N/A'}`);
    console.log(`SUBJECT: ${subject || ''}`);
    console.log(`CONTENT:\n${bodyText || ''}`);
    console.log(`=================================================================\n`);
  }

  async notifyRegistrationApproved(user: User) {
    const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'ผู้ใช้งาน';
    const title = 'บัญชีของคุณได้รับการอนุมัติเรียบร้อยแล้ว';
    const message = `ยินดีต้อนรับคุณ ${displayName}! บัญชีของคุณได้รับการอนุมัติจากผู้ดูแลระบบแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบเพื่อจองห้องประชุมได้ทันที`;

    await notificationRepository.create({
      user_id: user.user_id || user.id || 0,
      title,
      message,
      type: 'registration_approved'
    });

    this.logEmail(
      user.email,
      `[ระบบจองห้องประชุม] ยินดีต้อนรับ - บัญชีของคุณได้รับการอนุมัติแล้ว`,
      `สวัสดีคุณ ${displayName},\n\nบัญชีผู้ใช้งานของคุณได้รับการอนุมัติเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบและเริ่มทำการจองห้องประชุมได้ทันทีที่เว็บไซต์ระบบจองห้องประชุม`
    );
  }

  async notifyRegistrationRejected(user: User, reason?: string) {
    const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'ผู้ใช้งาน';
    const title = 'คำขอสมัครสมาชิกไม่ได้รับการอนุมัติ';
    const message = `คำขอสมัครสมาชิกของคุณไม่ผ่านการอนุมัติ ${reason ? `เนื่องจาก: ${reason}` : ''}`;

    await notificationRepository.create({
      user_id: user.user_id || user.id || 0,
      title,
      message,
      type: 'registration_rejected'
    });

    this.logEmail(
      user.email,
      `[ระบบจองห้องประชุม] แจ้งผลการสมัครสมาชิก`,
      `สวัสดีคุณ ${displayName},\n\nขออภัย คำขอสมัครสมาชิกของคุณไม่ผ่านการอนุมัติ ${reason ? `เนื่องจาก: ${reason}` : ''}\nหากมีข้อสงสัยโปรดติดต่อฝ่ายผู้ดูแลระบบ`
    );
  }

  async notifyBookingApproved(booking: Booking) {
    const title = 'คำขอจองห้องประชุมได้รับการอนุมัติ';
    const message = `คำขอจองห้อง "${booking.room?.name || 'ห้องประชุม'}" ในวันที่ ${booking.booking_date} เวลา ${booking.start_time} - ${booking.end_time} น. ได้รับการอนุมัติแล้ว`;

    await notificationRepository.create({
      user_id: booking.user_id,
      title,
      message,
      type: 'booking_approved'
    });

    this.logEmail(
      booking.email || booking.user?.email,
      `[ระบบจองห้องประชุม] คำขอจองห้องประชุมได้รับการอนุมัติ - ${booking.title}`,
      `สวัสดีคุณ ${booking.booker_name || booking.user?.name || 'ผู้ใช้งาน'},\n\nคำขอจองห้องประชุมของคุณได้รับการอนุมัติเรียบร้อยแล้ว:\n- หัวข้อ: ${booking.title}\n- ห้องประชุม: ${booking.room?.name}\n- วันที่: ${booking.booking_date}\n- เวลา: ${booking.start_time} - ${booking.end_time} น.\n- อุปกรณ์ที่เลือก: ${(booking.equipment || []).join(', ') || 'ไม่มี'}\n- หมายเหตุ: ${booking.note || '-'}`
    );
  }

  async notifyBookingRejected(booking: Booking, reason?: string) {
    const title = 'คำขอจองห้องประชุมถูกปฏิเสธ';
    const message = `คำขอจองห้อง "${booking.room?.name || 'ห้องประชุม'}" ในวันที่ ${booking.booking_date} เวลา ${booking.start_time} - ${booking.end_time} น. ถูกปฏิเสธ ${reason ? `(เหตุผล: ${reason})` : ''}`;

    await notificationRepository.create({
      user_id: booking.user_id,
      title,
      message,
      type: 'booking_rejected'
    });

    this.logEmail(
      booking.email || booking.user?.email,
      `[ระบบจองห้องประชุม] คำขอจองห้องประชุมถูกปฏิเสธ - ${booking.title}`,
      `สวัสดีคุณ ${booking.booker_name || booking.user?.name || 'ผู้ใช้งาน'},\n\nขออภัย คำขอจองห้องประชุมของคุณไม่ได้รับการอนุมัติ:\n- หัวข้อ: ${booking.title}\n- ห้องประชุม: ${booking.room?.name}\n- วันที่: ${booking.booking_date} (${booking.start_time} - ${booking.end_time} น.)\n- เหตุผล: ${reason || booking.note || 'ห้องไม่ว่างหรือติดภารกิจด่วน'}`
    );
  }

  async notifyBookingCancelled(booking: Booking, cancelledBy: string) {
    const title = 'การจองห้องประชุมถูกยกเลิกแล้ว';
    const message = `การจองห้อง "${booking.room?.name || 'ห้องประชุม'}" ในวันที่ ${booking.booking_date} เวลา ${booking.start_time} - ${booking.end_time} น. ถูกยกเลิกโดย ${cancelledBy}`;

    await notificationRepository.create({
      user_id: booking.user_id,
      title,
      message,
      type: 'booking_cancelled'
    });

    this.logEmail(
      booking.email || booking.user?.email,
      `[ระบบจองห้องประชุม] แจ้งเตือนการยกเลิกจองห้องประชุม - ${booking.title}`,
      `สวัสดีคุณ ${booking.booker_name || booking.user?.name || 'ผู้ใช้งาน'},\n\nการจองห้องประชุม "${booking.room?.name}" วันที่ ${booking.booking_date} เวลา ${booking.start_time} - ${booking.end_time} น. ได้ถูกยกเลิกเรียบร้อยแล้ว`
    );
  }

  async getUserNotifications(userId: string) {
    return notificationRepository.findByUserId(userId);
  }

  async markAsRead(id: string) {
    return notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    return notificationRepository.markAllAsRead(userId);
  }
}

export const notificationService = new NotificationService();
