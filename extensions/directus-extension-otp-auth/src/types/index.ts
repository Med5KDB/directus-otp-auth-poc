export interface OTPCode {
  id?: string;
  user_id: string;
  code: string;
  phone: string;
  expires_at: Date;
  created_at?: Date;
  attempts: number;
  used: boolean;
  ip_address?: string;
  user_agent?: string;
}

export interface RequestOTPPayload {
  phone: string;
}

export interface VerifyOTPPayload {
  phone: string;
  code: string;
}

export interface OTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AuthResponse extends OTPResponse {
  access_token?: string;
  refresh_token?: string;
  expires?: number;
}

export interface DirectusUser {
  id: string;
  email: string;
  phone?: string;
  status: string;
}

