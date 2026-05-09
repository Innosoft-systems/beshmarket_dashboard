export interface AdminUser {
  id: string;
  username: string;
  role: 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginResponse extends AuthTokens {
  user: AdminUser;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export type AuthError = {
  message: string;
  statusCode?: number;
};
