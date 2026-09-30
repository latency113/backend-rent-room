import { bookingRepository } from '../repositories/booking.repository';
import { roomRepository } from '../repositories/room.repository';
import { Booking, ReportFilterDTO } from '../types';

export interface ReportSummary {
  totalBookings: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  approvalRatePercentage: number;
  byRoom: {
    roomId: string;
    roomName: string;
    roomCode: string;
    count: number;
    percentage: number;
  }[];
  byDepartment: {
    department: string;
    count: number;
  }[];
  bookings: Booking[];
}

export class ReportService {
  async getReportData(filters: ReportFilterDTO): Promise<ReportSummary> {
    const allRooms = await roomRepository.findAll();
    const bookings = await bookingRepository.findAll(filters);

    const totalBookings = bookings.length;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;

    const roomCountMap = new Map<number, number>();
    const deptCountMap = new Map<string, number>();

    allRooms.forEach(r => roomCountMap.set(r.room_id, 0));

    bookings.forEach(b => {
      const statusUpper = (b.status || '').toUpperCase();
      if (statusUpper === 'PENDING') pendingCount++;
      else if (statusUpper === 'APPROVED') approvedCount++;
      else if (statusUpper === 'REJECTED') rejectedCount++;
      else if (statusUpper === 'CANCELLED') cancelledCount++;

      if (b.room_id) {
        roomCountMap.set(b.room_id, (roomCountMap.get(b.room_id) || 0) + 1);
      }
      const dept = b.department || 'ไม่ระบุแผนก';
      deptCountMap.set(dept, (deptCountMap.get(dept) || 0) + 1);
    });

    const evaluated = approvedCount + rejectedCount;
    const approvalRatePercentage = evaluated > 0 ? Math.round((approvedCount / evaluated) * 100) : 100;

    const byRoom = allRooms.map(room => {
      const count = roomCountMap.get(room.room_id) || 0;
      const percentage = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
      return {
        roomId: String(room.room_id),
        roomName: room.room_name,
        roomCode: `MR-${room.room_id}`,
        count,
        percentage
      };
    }).sort((a, b) => b.count - a.count);

    const byDepartment = Array.from(deptCountMap.entries()).map(([department, count]) => ({
      department,
      count
    })).sort((a, b) => b.count - a.count);

    return {
      totalBookings,
      pendingCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      approvalRatePercentage,
      byRoom,
      byDepartment,
      bookings
    };
  }
}

export const reportService = new ReportService();
