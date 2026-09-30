import { userRepository } from '../repositories/user.repository';
import { User, UserRole, UserStatus } from '../types';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    department_id?: number | null;
    department?: string;
    phone?: string;
  }): Promise<{ message: string; user: Partial<User> }> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('อีเมลนี้ถูกใช้งานในระบบแล้ว');
    }

    if (!data.email || !data.password) {
      throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
    }

    if (data.password.length < 6) {
      throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    }

    let firstName = data.first_name;
    let lastName = data.last_name;

    if (!firstName && data.name) {
      const parts = data.name.trim().split(' ');
      firstName = parts[0] || 'ผู้ใช้งาน';
      lastName = parts.slice(1).join(' ') || '-';
    }

    const hashedPassword = await Bun.password.hash(data.password, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 2
    });

    const newUser = await userRepository.create({
      first_name: firstName || 'ผู้ใช้งาน',
      last_name: lastName || '-',
      email: data.email,
      password: hashedPassword,
      phone: data.phone || '',
      role: 'USER',
      department_id: data.department_id || 1,
      status: 'PENDING'
    });

    console.log(`[AUTH] New user registration submitted (Argon2id): ${newUser.first_name} ${newUser.last_name} (${newUser.email}), status: PENDING`);

    const { password, ...safeUser } = newUser;
    return {
      message: 'สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติ',
      user: safeUser
    };
  }

  async login(email: string, passwordAttempt: string): Promise<{ user: Partial<User>; token: string }> {
    if (!email || !passwordAttempt) {
      throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    let isPasswordValid = false;
    if (user.password && user.password.startsWith('$argon2')) {
      isPasswordValid = await Bun.password.verify(passwordAttempt, user.password);
    } else if (user.password) {
      // Legacy plain-text fallback (automatically upgrade to Argon2id)
      if (user.password === passwordAttempt) {
        isPasswordValid = true;
        try {
          const newHashed = await Bun.password.hash(passwordAttempt, { algorithm: 'argon2id' });
          await userRepository.update(user.user_id, { password: newHashed });
          console.log(`[AUTH] Automatically upgraded password for ${user.email} to Argon2id`);
        } catch {
          // ignore
        }
      }
    }

    if (!isPasswordValid) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Check account status
    const status = (user.status || '').toUpperCase();
    if (status === 'PENDING') {
      throw new Error('บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติ (กรุณารอการตรวจสอบ)');
    }

    if (status === 'REJECTED') {
      throw new Error('บัญชีของคุณไม่ผ่านการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
    }

    const { password, ...safeUser } = user;
    const userRole = String(user.role || 'USER').toLowerCase();
    const tokenPayload = {
      id: String(user.user_id),
      user_id: user.user_id,
      email: user.email,
      role: userRole,
      name: `${user.first_name} ${user.last_name}`.trim()
    };
    const token = Buffer.from(JSON.stringify({ ...tokenPayload, exp: Date.now() + 7 * 86400000 })).toString('base64');

    return {
      user: {
        ...safeUser,
        role: userRole as any
      },
      token
    };
  }

  async getProfile(userId: string | number): Promise<Partial<User>> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้');
    }
    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      role: String(user.role || 'USER').toLowerCase() as any
    };
  }
}

export const authService = new AuthService();
