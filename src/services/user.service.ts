import { userRepository } from '../repositories/user.repository';
import { notificationService } from './notification.service';
import { supabase } from '../config/supabase';
import { User, UserStatus } from '../types';

export class UserService {
  async getAllUsers(status?: string, role?: string): Promise<Partial<User>[]> {
    const users = await userRepository.findAll(status, role);
    return users.map(({ password, ...u }) => u);
  }

  async getUserById(id: string | number): Promise<Partial<User> | null> {
    const user = await userRepository.findById(id);
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async approveUser(id: string | number, adminId?: number): Promise<Partial<User>> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานนี้');
    }

    const updated = await userRepository.updateStatus(id, 'APPROVED');
    if (!updated) {
      throw new Error('ไม่สามารถอนุมัติบัญชีผู้ใช้ได้');
    }

    // Trigger notification and email
    try {
      await notificationService.notifyRegistrationApproved(updated);
    } catch (notifErr: any) {
      console.error('[UserService] notifyRegistrationApproved error:', notifErr?.message || notifErr);
    }

    const { password, ...safeUser } = updated;
    return safeUser;
  }

  async rejectUser(id: string | number, reason?: string): Promise<Partial<User>> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานนี้');
    }

    const updated = await userRepository.updateStatus(id, 'REJECTED');
    if (!updated) {
      throw new Error('ไม่สามารถปฏิเสธบัญชีผู้ใช้ได้');
    }

    // Trigger notification and email
    try {
      await notificationService.notifyRegistrationRejected(updated, reason);
    } catch (notifErr: any) {
      console.error('[UserService] notifyRegistrationRejected error:', notifErr?.message || notifErr);
    }

    const { password, ...safeUser } = updated;
    return safeUser;
  }

  async updateUser(id: string | number, data: Partial<User>): Promise<Partial<User>> {
    const updateData: Partial<User> = { ...data };
    if (updateData.password) {
      if (updateData.password.length < 6) {
        throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      }
      updateData.password = await Bun.password.hash(updateData.password, {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 2
      });
    }

    const updated = await userRepository.update(id, updateData);
    if (!updated) {
      throw new Error('ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้');
    }
    const { password, ...safeUser } = updated;
    return safeUser;
  }

  async createUser(adminId: number | string, data: {
    first_name?: string;
    last_name?: string;
    name?: string;
    email: string;
    password?: string;
    phone?: string;
    role?: any;
    department_id?: number | null;
    status?: any;
  }): Promise<Partial<User>> {
    const email = data.email?.toLowerCase().trim();
    if (!email) {
      throw new Error('กรุณาระบุอีเมล');
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('อีเมลนี้ถูกใช้งานในระบบแล้ว');
    }

    let firstName = data.first_name?.trim() || '';
    let lastName = data.last_name?.trim() || '';
    if (!firstName && data.name) {
      const parts = data.name.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    if (!firstName) {
      throw new Error('กรุณาระบุชื่อผู้ใช้งาน');
    }

    const rawPassword = data.password?.trim() || 'password123';
    if (rawPassword.length < 6) {
      throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    }

    const hashedPassword = await Bun.password.hash(rawPassword, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 2
    });

    const user = await userRepository.create({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      phone: data.phone?.trim() || '',
      role: (data.role || 'USER').toUpperCase() as any,
      department_id: data.department_id ? Number(data.department_id) : null,
      created_by_admin_id: Number(adminId) || null,
      status: (data.status || 'APPROVED').toUpperCase() as any
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async deleteUser(id: string | number): Promise<boolean> {
    const numId = Number(id);
    // Check if user has any bookings in the system
    const { count, error } = await supabase
      .from('booking')
      .select('booking_id', { count: 'exact', head: true })
      .eq('user_id', numId);

    if (error) {
      console.error('[UserService] check user bookings error:', error.message);
    }

    if (count && count > 0) {
      throw new Error(`ไม่สามารถลบผู้ใช้งานนี้ได้ เนื่องจากมีประวัติการจองห้องประชุม (${count} รายการ) อยู่ในระบบ`);
    }

    return userRepository.delete(id);
  }
}

export const userService = new UserService();
