export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
}

export function extractAuthUser(headers: Record<string, string | undefined>): AuthUser | null {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  try {
    const jsonStr = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);
    if (payload.id && payload.email) {
      return payload as AuthUser;
    }
  } catch {
    return null;
  }
  return null;
}
