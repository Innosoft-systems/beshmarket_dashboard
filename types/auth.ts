export interface AdminUser {
  id: string;
  username: string;
  role: 'admin';
}

export type UserRole = 'admin' | 'client' | 'kuryer' | 'restaurant';

export interface CurrentUser {
  _id?: string;
  id?: string;
  full_name?: string;
  phone?: string;
  username?: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginResponse extends AuthTokens {
  user: AdminUser;
}

export interface OtpLoginResponse extends AuthTokens {
  user: CurrentUser;
  isNewUser?: boolean;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export type AuthError = {
  message: string;
  statusCode?: number;
};
