import { roomRepository } from '../repositories/room.repository';
import { Room } from '../types';

export class RoomService {
  async getAllRooms(onlyActive: boolean = false): Promise<Room[]> {
    return roomRepository.findAll(onlyActive);
  }

  async getRoomById(id: string): Promise<Room | null> {
    return roomRepository.findById(id);
  }

  async createRoom(data: {
    code?: string;
    room_code?: string;
    name?: string;
    room_name?: string;
    capacity: number;
    floor?: string;
    location_detail?: string;
    description?: string;
    image_url?: string;
    images?: string[];
    equipment?: string[];
    status?: string;
    is_active?: boolean;
  }): Promise<Room> {
    const code = data.room_code || data.code;
    const name = data.room_name || data.name;
    if (!name || !code) {
      throw new Error('กรุณาระบุชื่อห้องและรหัสห้องประชุม');
    }
    if (!data.capacity || Number(data.capacity) <= 0) {
      throw new Error('ความจุของห้องต้องมากกว่า 0 คน');
    }

    const existing = await roomRepository.findByCode(code);
    if (existing) {
      throw new Error(`รหัสห้องประชุม "${code}" ถูกใช้งานแล้ว`);
    }

    return roomRepository.create({
      ...data,
      code,
      room_code: code,
      name,
      room_name: name
    });
  }

  async updateRoom(id: string, data: Partial<Room> & { images?: string[] }): Promise<Room> {
    const existing = await roomRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบห้องประชุมที่ต้องการแก้ไข');
    }

    if (data.code && data.code !== existing.code) {
      const codeCheck = await roomRepository.findByCode(data.code);
      if (codeCheck && codeCheck.id !== id) {
        throw new Error(`รหัสห้องประชุม "${data.code}" ถูกใช้งานแล้ว`);
      }
    }

    if (data.capacity !== undefined && Number(data.capacity) <= 0) {
      throw new Error('ความจุของห้องต้องมากกว่า 0 คน');
    }

    const updated = await roomRepository.update(id, data);
    if (!updated) {
      throw new Error('ไม่สามารถบันทึกการแก้ไขห้องประชุมได้');
    }
    return updated;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const existing = await roomRepository.findById(id);
    if (!existing) {
      throw new Error('ไม่พบห้องประชุมที่ต้องการลบ');
    }
    return roomRepository.delete(id);
  }
}

export const roomService = new RoomService();
