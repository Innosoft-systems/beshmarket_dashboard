import { getMe } from '@/lib/api/auth';
import { getAccessToken } from '@/lib/auth/session';
import type { CurrentUser } from '@/types/auth';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    return await getMe(token);
  } catch {
    return null;
  }
}
