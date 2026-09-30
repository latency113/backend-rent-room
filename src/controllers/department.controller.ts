import { Elysia, t } from 'elysia';
import { departmentService } from '../services/department.service';
import { extractAuthUser } from '../middleware/auth.middleware';

export const departmentController = new Elysia({ prefix: '/api/departments' })
  // List all departments
  .get('/', async () => {
    try {
      const data = await departmentService.getAllDepartments();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message, data: [] };
    }
  })
  // Get department by ID
  .get('/:id', async ({ params, set }) => {
    try {
      const data = await departmentService.getDepartmentById(params.id);
      return { success: true, data };
    } catch (err: any) {
      set.status = 404;
      return { success: false, error: err.message };
    }
  })
  // Create department (Admin only)
  .post(
    '/',
    async ({ body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const created = await departmentService.createDepartment(body.department_name);
        set.status = 201;
        return {
          success: true,
          message: 'เพิ่มแผนกใหม่เรียบร้อยแล้ว',
          data: created
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        department_name: t.String({ minLength: 2, maxLength: 100 })
      })
    }
  )
  // Update department (Admin only)
  .put(
    '/:id',
    async ({ params, body, headers, set }) => {
      const auth = extractAuthUser(headers);
      if (!auth || auth.role !== 'admin') {
        set.status = 403;
        return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
      }

      try {
        const updated = await departmentService.updateDepartment(params.id, body.department_name);
        return {
          success: true,
          message: 'แก้ไขข้อมูลแผนกเรียบร้อยแล้ว',
          data: updated
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, error: err.message };
      }
    },
    {
      body: t.Object({
        department_name: t.String({ minLength: 2, maxLength: 100 })
      })
    }
  )
  // Delete department (Admin only)
  .delete('/:id', async ({ params, headers, set }) => {
    const auth = extractAuthUser(headers);
    if (!auth || auth.role !== 'admin') {
      set.status = 403;
      return { success: false, error: 'Forbidden: สิทธิ์สำหรับผู้ดูแลระบบเท่านั้น' };
    }

    try {
      const result = await departmentService.deleteDepartment(params.id);
      return result;
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  });
