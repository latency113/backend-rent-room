import { supabase } from '../config/supabase';
import { Equipment } from '../types';

const DEFAULT_EQUIPMENT: Equipment[] = [
  { equipment_id: 1, equipment_name: 'Projector' },
  { equipment_id: 2, equipment_name: 'Television' },
  { equipment_id: 3, equipment_name: 'Microphone' },
  { equipment_id: 4, equipment_name: 'Whiteboard' },
  { equipment_id: 5, equipment_name: 'Video Conference System' },
  { equipment_id: 6, equipment_name: 'Sound System' },
  { equipment_id: 7, equipment_name: 'Stage Light' }
];

export class EquipmentRepository {
  async findAll(): Promise<Equipment[]> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('equipment_id');

      if (!error && data && data.length > 0) {
        return data as Equipment[];
      }
    } catch {
      // ignore
    }

    return DEFAULT_EQUIPMENT;
  }
}

export const equipmentRepository = new EquipmentRepository();
