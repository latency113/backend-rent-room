import { supabase } from '../config/supabase';
import { User, UserStatus, UserRole } from '../types';

export class UserRepository {
  private formatUser(data: any): User {
    const firstName = data.first_name || '';
    const lastName = data.last_name || '';
    return {
      ...data,
      id: String(data.user_id),
      name: `${firstName} ${lastName}`.trim() || data.name || data.email,
      department: data.department?.department_name || '',
      branch: 'สำนักงานใหญ่'
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*, department(*)')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('[Supabase UserRepository] findByEmail error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;
    return this.formatUser(data);
  }

  async findById(id: string | number): Promise<User | null> {
    const numId = Number(id);
    const { data, error } = await supabase
      .from('users')
      .select('*, department(*)')
      .eq('user_id', numId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase UserRepository] findById error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;
    return this.formatUser(data);
  }

  async create(userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
    role?: UserRole;
    department_id?: number | null;
    created_by_admin_id?: number | null;
    status?: UserStatus;
  }): Promise<User> {
    const insertPayload = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      phone: userData.phone || '',
      role: userData.role || 'USER',
      department_id: userData.department_id || null,
      created_by_admin_id: userData.created_by_admin_id || null,
      status: userData.status || 'PENDING'
    };

    const { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select('*, department(*)')
      .single();

    if (error || !data) {
      console.error('[Supabase UserRepository] create error:', error?.message);
      throw new Error(`ไม่สามารถสร้างผู้ใช้งานในฐานข้อมูลได้: ${error?.message}`);
    }

    return this.formatUser(data);
  }

  async findAll(status?: string, role?: string): Promise<User[]> {
    let query = supabase
      .from('users')
      .select('*, department(*)')
      .order('user_id', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }
    if (role && role !== 'all') {
      query = query.eq('role', role.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase UserRepository] findAll error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return (data || []).map(u => this.formatUser(u));
  }

  async updateStatus(id: string | number, status: UserStatus): Promise<User | null> {
    const numId = Number(id);
    const { data, error } = await supabase
      .from('users')
      .update({ status: status.toUpperCase(), updated_at: new Date().toISOString() })
      .eq('user_id', numId)
      .select('*, department(*)')
      .maybeSingle();

    if (error) {
      console.error('[Supabase UserRepository] updateStatus error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;
    return this.formatUser(data);
  }

  async update(id: string | number, partial: any): Promise<User | null> {
    const numId = Number(id);
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (partial.first_name !== undefined) updatePayload.first_name = partial.first_name;
    if (partial.last_name !== undefined) updatePayload.last_name = partial.last_name;
    if (partial.name && !partial.first_name && !partial.last_name) {
      const parts = String(partial.name).trim().split(/\s+/);
      updatePayload.first_name = parts[0] || '';
      updatePayload.last_name = parts.slice(1).join(' ') || '';
    }
    if (partial.email !== undefined) updatePayload.email = String(partial.email).toLowerCase().trim();
    if (partial.password !== undefined && String(partial.password).trim() !== '') {
      updatePayload.password = partial.password;
    }
    if (partial.phone !== undefined) updatePayload.phone = partial.phone;
    if (partial.role !== undefined) updatePayload.role = String(partial.role).toUpperCase();
    if (partial.department_id !== undefined) {
      updatePayload.department_id = partial.department_id ? Number(partial.department_id) : null;
    }
    if (partial.status !== undefined) updatePayload.status = String(partial.status).toUpperCase();

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('user_id', numId)
      .select('*, department(*)')
      .maybeSingle();

    if (error) {
      console.error('[Supabase UserRepository] update error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;
    return this.formatUser(data);
  }

  async delete(id: string | number): Promise<boolean> {
    const numId = Number(id);
    const { error } = await supabase.from('users').delete().eq('user_id', numId);
    if (error) {
      console.error('[Supabase UserRepository] delete error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    return true;
  }
}

export const userRepository = new UserRepository();
