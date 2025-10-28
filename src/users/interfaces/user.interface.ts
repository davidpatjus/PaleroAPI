// Interface para el usuario sin contraseña (para respuestas)
export interface UserResponse {
  id: string; // UUID es string
  email?: string; // Opcional para FAST_CLIENT
  name: string; // Coincide con el esquema de BD
  role: 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'FAST_CLIENT';
  createdAt: Date;
  updatedAt: Date;
}

// Interface para el usuario completo (uso interno)
export interface User extends UserResponse {
  password?: string; // Opcional para FAST_CLIENT
}

// Tipos de roles disponibles
export type UserRole = 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'FAST_CLIENT';
