import { Elysia } from 'elysia';
import { reportService } from '../services/report.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const reportController = new Elysia({ prefix: '/api/reports' })
  .get('/', async ({ query, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const filters = {
        room_id: query.room_id,
        status: query.status as any,
        start_date: query.start_date,
        end_date: query.end_date,
        search: query.search
      };
      const summary = await reportService.getReportData(filters);
      return { success: true, data: summary };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err.message };
    }
  });
