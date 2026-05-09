'use server';

import { redirect } from 'next/navigation';
import { adminLogin } from '@/lib/api/auth';
import { setAuthTokens, clearAuthTokens } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username?.trim() || !password?.trim()) {
    return { error: 'Username va parol kiritish shart' };
  }

  try {
    const { accessToken, refreshToken } = await adminLogin({ username, password });
    await setAuthTokens(accessToken, refreshToken);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.statusCode === 401) {
        return { error: 'Login yoki parol noto\'g\'ri' };
      }
      return { error: `Server xatosi: ${err.message}` };
    }
    return { error: 'Ulanishda xatolik yuz berdi. Keyinroq urinib ko\'ring.' };
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearAuthTokens();
  redirect('/login');
}
