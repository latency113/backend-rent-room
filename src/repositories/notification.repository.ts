import { supabase } from '../config/supabase';
import { AppNotification } from '../types';

export class NotificationRepository {
  async findByUserId(userId: string): Promise<AppNotification[]> {
    const numUserId = Number(userId);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', isNaN(numUserId) ? userId : numUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase NotificationRepository] findByUserId error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return ((data || []) as any[]).map(n => ({
      ...n,
      id: String(n.id),
      user_id: String(n.user_id),
    }));
  }

  async create(notif: {
    user_id: string | number;
    title: string;
    message: string;
    type: AppNotification['type'];
  }): Promise<AppNotification> {
    const numUserId = Number(notif.user_id);
    const newNotif: any = {
      user_id: isNaN(numUserId) ? notif.user_id : numUserId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([newNotif])
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase NotificationRepository] create error:', error?.message);
      throw new Error(`Database error: ${error?.message}`);
    }

    return {
      ...data,
      id: String(data.id),
      user_id: String(data.user_id),
    } as AppNotification;
  }

  async markAsRead(id: string | number): Promise<boolean> {
    const numId = Number(id);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', isNaN(numId) ? id : numId);

    if (error) {
      console.error('[Supabase NotificationRepository] markAsRead error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return true;
  }

  async markAllAsRead(userId: string | number): Promise<boolean> {
    const numUserId = Number(userId);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', isNaN(numUserId) ? userId : numUserId);

    if (error) {
      console.error('[Supabase NotificationRepository] markAllAsRead error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return true;
  }
}

export const notificationRepository = new NotificationRepository();
