import { supabase } from '../config/supabase';
import { Department } from '../types';

export class DepartmentRepository {
  async findAll(): Promise<(Department & { user_count?: number })[]> {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .order('department_id', { ascending: true });

      if (error) {
        console.error('[Supabase DepartmentRepository] findAll error:', error.message);
        throw error;
      }

      if (data && data.length > 0) {
        // Fetch user counts per department
        try {
          const { data: users } = await supabase.from('users').select('department_id');
          const countMap: Record<number, number> = {};
          if (users) {
            for (const u of users) {
              if (u.department_id) {
                countMap[u.department_id] = (countMap[u.department_id] || 0) + 1;
              }
            }
          }
          return data.map((d: any) => ({
            department_id: d.department_id,
            department_name: d.department_name,
            user_count: countMap[d.department_id] || 0
          }));
        } catch {
          return data as Department[];
        }
      }
      return [];
    } catch (err: any) {
      console.error('[DepartmentRepository] findAll fallback error:', err?.message);
      return [];
    }
  }

  async findById(id: number): Promise<(Department & { user_count?: number }) | null> {
    const { data, error } = await supabase
      .from('department')
      .select('*')
      .eq('department_id', id)
      .maybeSingle();

    if (error) {
      console.error('[Supabase DepartmentRepository] findById error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;

    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', id);

      return {
        department_id: data.department_id,
        department_name: data.department_name,
        user_count: count || 0
      };
    } catch {
      return data as Department;
    }
  }

  async findByName(name: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('department')
      .select('*')
      .ilike('department_name', name.trim())
      .maybeSingle();

    if (error) return null;
    return data as Department | null;
  }

  async create(data: { department_name: string }): Promise<Department> {
    const { data: created, error } = await supabase
      .from('department')
      .insert({ department_name: data.department_name.trim() })
      .select()
      .single();

    if (error) {
      console.error('[Supabase DepartmentRepository] create error:', error.message);
      throw new Error(`ไม่สามารถสร้างแผนกได้: ${error.message}`);
    }

    return created as Department;
  }

  async update(id: number, data: { department_name: string }): Promise<Department> {
    const { data: updated, error } = await supabase
      .from('department')
      .update({ department_name: data.department_name.trim() })
      .eq('department_id', id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase DepartmentRepository] update error:', error.message);
      throw new Error(`ไม่สามารถแก้ไขแผนกได้: ${error.message}`);
    }

    return updated as Department;
  }

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('department')
      .delete()
      .eq('department_id', id);

    if (error) {
      console.error('[Supabase DepartmentRepository] delete error:', error.message);
      throw new Error(`ไม่สามารถลบแผนกได้: ${error.message}`);
    }

    return true;
  }
}

export const departmentRepository = new DepartmentRepository();
