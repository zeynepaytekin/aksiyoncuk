export type RegistrationRequest = {
  email: string;
  username: string;
  password: string;
  fullName: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  status: string;
};

export type User = AuthUser;

export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  user: AuthUser;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type RegistrationProfile = {
  professionalTitle: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
};

export type RegistrationResponse = AuthUser & {
  createdAt: string;
  profile: RegistrationProfile;
};

export type FieldValidationError = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  timestamp?: string;
  path?: string;
  fieldErrors?: FieldValidationError[];
};
