// Interface para la respuesta de login/register
export interface AuthResponse {
  accessToken: string;
  user: AuthUserResponse;
}

// Interface para el usuario en respuestas de auth (con fullName)
export interface AuthUserResponse {
  id: string;
  fullName: string;
  email: string; // Solo usuarios con email pueden autenticarse
  createdAt: Date;
  updatedAt: Date;
}

// Interface para el payload del JWT
export interface JwtPayload {
  sub: string; // user id
  email: string; // Solo usuarios con email pueden autenticarse
  iat?: number;
  exp?: number;
}
