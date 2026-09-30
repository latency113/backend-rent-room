import { departmentRepository } from '../repositories/department.repository';
import { Department } from '../types';

export class DepartmentService {
  async getAllDepartments(): Promise<(Department & { user_count?: number })[]> {
    return departmentRepository.findAll();
  }

  async getDepartmentById(id: number | string): Promise<(Department & { user_count?: number })> {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('รหัสแผนกไม่ถูกต้อง');
    }

    const dept = await departmentRepository.findById(numId);
    if (!dept) {
      throw new Error('ไม่พบข้อมูลแผนกที่ระบุ');
    }
    return dept;
  }

  async createDepartment(departmentName: string): Promise<Department> {
    const trimmed = (departmentName || '').trim();
    if (!trimmed) {
      throw new Error('กรุณาระบุชื่อแผนก');
    }
    if (trimmed.length < 2) {
      throw new Error('ชื่อแผนกต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
    }
    if (trimmed.length > 100) {
      throw new Error('ชื่อแผนกต้องมีความยาวไม่เกิน 100 ตัวอักษร');
    }

    // Check duplicate
    const existing = await departmentRepository.findByName(trimmed);
    if (existing) {
      throw new Error(`มีแผนก "${trimmed}" อยู่ในระบบแล้ว`);
    }

    return departmentRepository.create({ department_name: trimmed });
  }

  async updateDepartment(id: number | string, departmentName: string): Promise<Department> {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('รหัสแผนกไม่ถูกต้อง');
    }

    const trimmed = (departmentName || '').trim();
    if (!trimmed) {
      throw new Error('กรุณาระบุชื่อแผนก');
    }
    if (trimmed.length < 2) {
      throw new Error('ชื่อแผนกต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
    }
    if (trimmed.length > 100) {
      throw new Error('ชื่อแผนกต้องมีความยาวไม่เกิน 100 ตัวอักษร');
    }

    // Check department exists
    const current = await departmentRepository.findById(numId);
    if (!current) {
      throw new Error('ไม่พบข้อมูลแผนกที่ต้องการแก้ไข');
    }

    // Check if another department has the same name
    const existing = await departmentRepository.findByName(trimmed);
    if (existing && existing.department_id !== numId) {
      throw new Error(`มีแผนก "${trimmed}" อยู่ในระบบแล้ว`);
    }

    return departmentRepository.update(numId, { department_name: trimmed });
  }

  async deleteDepartment(id: number | string): Promise<{ success: boolean; message: string }> {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('รหัสแผนกไม่ถูกต้อง');
    }

    const current = await departmentRepository.findById(numId);
    if (!current) {
      throw new Error('ไม่พบข้อมูลแผนกที่ต้องการลบ');
    }

    const userCount = current.user_count || 0;
    await departmentRepository.delete(numId);

    const message = userCount > 0
      ? `ลบแผนก "${current.department_name}" สำเร็จ (ผู้ใช้ ${userCount} คนในแผนกนี้จะถูกปรับเป็นไม่มีแผนก)`
      : `ลบแผนก "${current.department_name}" เรียบร้อยแล้ว`;

    return {
      success: true,
      message
    };
  }
}

export const departmentService = new DepartmentService();
