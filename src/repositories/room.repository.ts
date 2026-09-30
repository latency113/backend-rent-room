import { supabase } from '../config/supabase';
import { Room } from '../types';

const DEFAULT_ROOMS = [
  {
    room_id: 1,
    room_name: 'Diamond Boardroom (ห้องเพชรไพลิน)',
    capacity: 24,
    location_detail: 'ชั้น 4 อาคาร A',
    room_image: [{ image_url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80' }],
    room_equipment: [
      { equipment: { equipment_name: 'Projector' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Television' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Microphone' }, default_quantity: 2 },
      { equipment: { equipment_name: 'Whiteboard' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Video Conference System' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Sound System' }, default_quantity: 1 }
    ]
  },
  {
    room_id: 2,
    room_name: 'Sapphire Conference Hall (ห้องไพลินสยาม)',
    capacity: 60,
    location_detail: 'ชั้น 2 อาคาร A',
    room_image: [{ image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80' }],
    room_equipment: [
      { equipment: { equipment_name: 'Projector' }, default_quantity: 2 },
      { equipment: { equipment_name: 'Television' }, default_quantity: 2 },
      { equipment: { equipment_name: 'Microphone' }, default_quantity: 4 },
      { equipment: { equipment_name: 'Whiteboard' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Sound System' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Stage Light' }, default_quantity: 1 }
    ]
  },
  {
    room_id: 3,
    room_name: 'Emerald Brainstorming (ห้องมรกต)',
    capacity: 10,
    location_detail: 'ชั้น 3 อาคาร B',
    room_image: [{ image_url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80' }],
    room_equipment: [
      { equipment: { equipment_name: 'Television' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Whiteboard' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Video Conference System' }, default_quantity: 1 }
    ]
  },
  {
    room_id: 4,
    room_name: 'Ruby Creative Workshop (ห้องทับทิม)',
    capacity: 16,
    location_detail: 'ชั้น 3 อาคาร B',
    room_image: [{ image_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80' }],
    room_equipment: [
      { equipment: { equipment_name: 'Projector' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Microphone' }, default_quantity: 1 },
      { equipment: { equipment_name: 'Whiteboard' }, default_quantity: 2 }
    ]
  }
];

export class RoomRepository {
  private formatRoom(r: any): Room {
    const images = r.room_image || [];
    const mainImageUrl = images[0]?.image_url || 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80';
    
    const roomEqs = r.room_equipment || [];
    const equipmentList = roomEqs.map((re: any) => re.equipment?.equipment_name).filter(Boolean);

    return {
      room_id: r.room_id,
      room_name: r.room_name,
      capacity: r.capacity,
      location_detail: r.location_detail || 'ชั้น 1',
      images,
      equipments: roomEqs.map((re: any) => ({
        equipment_id: re.equipment_id,
        equipment_name: re.equipment?.equipment_name || '',
        default_quantity: re.default_quantity || 1
      })),
      // Backward-compat aliases for frontend UI
      id: String(r.room_id),
      name: r.room_name,
      code: `MR-${r.room_id}`,
      floor: r.location_detail || 'ชั้น 1',
      description: `ห้องประชุม ${r.room_name} รองรับได้สูงสุด ${r.capacity} คน ${r.location_detail || ''}`,
      image_url: mainImageUrl,
      is_active: true,
      equipment: equipmentList
    };
  }

  async findAll(onlyActive: boolean = false): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('room')
        .select('*, room_image(*), room_equipment(*, equipment(*))')
        .order('room_id');

      if (!error && data && data.length > 0) {
        return data.map(r => this.formatRoom(r));
      }
      if (error) {
        console.warn('[Supabase RoomRepository] Using fallback rooms:', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase RoomRepository] Using fallback rooms:', err.message);
    }

    return DEFAULT_ROOMS.map(r => this.formatRoom(r));
  }

  async findById(id: string | number): Promise<Room | null> {
    const numId = Number(id);
    try {
      const { data, error } = await supabase
        .from('room')
        .select('*, room_image(*), room_equipment(*, equipment(*))')
        .eq('room_id', numId)
        .maybeSingle();

      if (!error && data) {
        return this.formatRoom(data);
      }
    } catch {
      // ignore
    }

    const fallback = DEFAULT_ROOMS.find(r => r.room_id === numId);
    return fallback ? this.formatRoom(fallback) : null;
  }

  async findByCode(code: string): Promise<Room | null> {
    const idMatch = code.match(/^MR-(\d+)$/i);
    if (idMatch) {
      const numId = parseInt(idMatch[1], 10);
      return this.findById(numId);
    }
    try {
      const { data } = await supabase
        .from('room')
        .select('*, room_image(*), room_equipment(*, equipment(*))')
        .eq('room_name', code)
        .maybeSingle();

      if (data) return this.formatRoom(data);
    } catch {
      // ignore
    }
    return null;
  }

  async create(roomData: {
    room_name?: string;
    name?: string;
    code?: string;
    capacity: number;
    location_detail?: string;
    floor?: string;
    image_url?: string;
    images?: string[];
    equipment_ids?: number[];
    equipment?: string[];
  }): Promise<Room> {
    const name = roomData.room_name || roomData.name || 'ห้องประชุม';
    const location = roomData.location_detail || roomData.floor || 'ชั้น 1';

    const { data, error } = await supabase
      .from('room')
      .insert([{
        room_name: name,
        capacity: Number(roomData.capacity),
        location_detail: location
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase RoomRepository] create error:', error?.message);
      throw new Error(`ไม่สามารถเพิ่มห้องประชุมในฐานข้อมูลได้: ${error?.message}`);
    }

    const roomId = data.room_id;

    // Collect all image URLs
    const imageUrls: string[] = [];
    if (Array.isArray(roomData.images) && roomData.images.length > 0) {
      for (const u of roomData.images) {
        if (typeof u === 'string' && u.trim()) imageUrls.push(u.trim());
      }
    } else if (roomData.image_url && roomData.image_url.trim()) {
      imageUrls.push(roomData.image_url.trim());
    }

    // Insert Images into room_image table
    if (imageUrls.length > 0) {
      const imgInserts = imageUrls.map(url => ({
        room_id: roomId,
        image_url: url
      }));
      await supabase.from('room_image').insert(imgInserts);
    }

    // Resolve equipment IDs if equipment name array passed
    let eqIds: number[] = roomData.equipment_ids ? [...roomData.equipment_ids] : [];
    if (roomData.equipment && roomData.equipment.length > 0 && eqIds.length === 0) {
      const { data: allEqs } = await supabase.from('equipment').select('equipment_id, equipment_name');
      if (allEqs && allEqs.length > 0) {
        const eqMap = new Map(allEqs.map(e => [e.equipment_name.toLowerCase().trim(), e.equipment_id]));
        eqIds = roomData.equipment
          .map(eqName => eqMap.get(eqName.toLowerCase().trim()))
          .filter((id): id is number => id !== undefined);
      }
    }

    // Insert RoomEquipment if provided
    if (eqIds.length > 0) {
      const inserts = eqIds.map(eqId => ({
        room_id: roomId,
        equipment_id: eqId,
        default_quantity: 1
      }));
      await supabase.from('room_equipment').insert(inserts);
    }

    return this.findById(roomId) as Promise<Room>;
  }

  async update(id: string | number, roomData: Partial<Room> & { images?: string[] }): Promise<Room | null> {
    const numId = Number(id);
    const updatePayload: any = {};
    if (roomData.room_name || roomData.name) {
      updatePayload.room_name = roomData.room_name || roomData.name;
    }
    if (roomData.capacity !== undefined) {
      updatePayload.capacity = Number(roomData.capacity);
    }
    if (roomData.location_detail || roomData.floor) {
      updatePayload.location_detail = roomData.location_detail || roomData.floor;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from('room')
        .update(updatePayload)
        .eq('room_id', numId);

      if (error) {
        console.error('[Supabase RoomRepository] update error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
    }

    // Update images if provided
    if (roomData.images !== undefined || roomData.image_url !== undefined) {
      const imageUrls: string[] = [];
      if (Array.isArray(roomData.images)) {
        for (const u of roomData.images) {
          if (typeof u === 'string' && u.trim()) imageUrls.push(u.trim());
        }
      } else if (roomData.image_url && roomData.image_url.trim()) {
        imageUrls.push(roomData.image_url.trim());
      }

      await supabase.from('room_image').delete().eq('room_id', numId);
      if (imageUrls.length > 0) {
        const imgInserts = imageUrls.map(url => ({
          room_id: numId,
          image_url: url
        }));
        await supabase.from('room_image').insert(imgInserts);
      }
    }

    // Update equipment if provided
    if (roomData.equipment !== undefined) {
      let eqIds: number[] = [];
      if (roomData.equipment.length > 0) {
        const { data: allEqs } = await supabase.from('equipment').select('equipment_id, equipment_name');
        if (allEqs && allEqs.length > 0) {
          const eqMap = new Map(allEqs.map(e => [e.equipment_name.toLowerCase().trim(), e.equipment_id]));
          eqIds = roomData.equipment
            .map(eqName => eqMap.get(eqName.toLowerCase().trim()))
            .filter((id): id is number => id !== undefined);
        }
      }

      await supabase.from('room_equipment').delete().eq('room_id', numId);
      if (eqIds.length > 0) {
        const inserts = eqIds.map(eqId => ({
          room_id: numId,
          equipment_id: eqId,
          default_quantity: 1
        }));
        await supabase.from('room_equipment').insert(inserts);
      }
    }

    return this.findById(numId);
  }

  async delete(id: string | number): Promise<boolean> {
    const numId = Number(id);
    const { error } = await supabase.from('room').delete().eq('room_id', numId);
    if (error) {
      console.error('[Supabase RoomRepository] delete error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    return true;
  }
}

export const roomRepository = new RoomRepository();
