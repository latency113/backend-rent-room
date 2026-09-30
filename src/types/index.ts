export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// 8. Department
export interface Department {
  department_id: number;
  department_name: string;
}

// 1. User
export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  department_id: number | null;
  created_by_admin_id?: number | null;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
  department?: Department;
  // Computed / convenience
  id?: string | number;
  name?: string;
}

// 2. Room
export interface Room {
  room_id: number;
  room_name: string;
  capacity: number;
  location_detail?: string;
  // Related
  images?: RoomImage[];
  equipments?: {
    equipment_id: number;
    equipment_name: string;
    default_quantity: number;
  }[];
  // Backward-compat aliases
  id?: string | number;
  name?: string;
  code?: string;
  floor?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  equipment?: string[];
}

// 3. RoomImage
export interface RoomImage {
  image_id: number;
  image_url: string;
  uploaded_at?: string;
  room_id: number;
}

// 4. Equipment
export interface Equipment {
  equipment_id: number;
  equipment_name: string;
}

// 5. RoomEquipment
export interface RoomEquipment {
  room_id: number;
  equipment_id: number;
  default_quantity: number;
  equipment?: Equipment;
}

// 6. Booking
export interface Booking {
  booking_id: number;
  start_time: string; // ISO / DATETIME
  end_time: string;   // ISO / DATETIME
  attendee_count: number;
  status: BookingStatus;
  created_at?: string;
  user_id: number;
  room_id: number;
  approved_by_admin_id?: number | null;
  title?: string;
  note?: string;

  // Joined relations
  user?: Partial<User>;
  room?: Room;
  booking_equipments?: {
    equipment_id: number;
    equipment_name?: string;
    requested_quantity: number;
  }[];

  // Backward-compat aliases
  id?: string | number;
  booking_date?: string;
  booker_name?: string;
  department?: string;
  branch?: string;
  phone?: string;
  email?: string;
  attendees_count?: number;
  equipment?: string[];
  raw_start_time?: string;
  raw_end_time?: string;
  start_time_iso?: string;
  end_time_iso?: string;
}

// 7. BookingEquipment
export interface BookingEquipment {
  booking_id: number;
  equipment_id: number;
  requested_quantity: number;
  equipment?: Equipment;
}

// 9. Report
export interface Report {
  report_id: number;
  report_date: string;
  report_type: string;
  start_date?: string;
  end_date?: string;
  room_id?: number | null;
  status?: string;
  created_by?: number | null;
}

// Notifications
export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateBookingDTO {
  room_id: number | string;
  title: string;
  booker_name?: string;
  department?: string;
  branch?: string;
  phone?: string;
  email?: string;
  booking_date?: string;
  start_time: string;
  end_time: string;
  attendees_count?: number;
  attendee_count?: number;
  equipment?: string[];
  equipment_ids?: number[];
  requested_equipments?: { equipment_id: number; requested_quantity: number }[];
  note?: string;
}

export interface ReportFilterDTO {
  start_date?: string;
  end_date?: string;
  room_id?: string | number;
  status?: string;
  search?: string;
}
