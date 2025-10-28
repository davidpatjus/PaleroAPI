import { UUID } from 'crypto';

export interface CreateClientProfileDto {
  userId: UUID;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  socialMediaLinks?: Record<string, string>;
  status: 'PROSPECT' | 'ACTIVE' | 'IN_PROJECT' | 'COMPLETED' | 'ARCHIVED';
}

export interface UpdateClientProfileDto {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  socialMediaLinks?: Record<string, string>;
  status?: 'PROSPECT' | 'ACTIVE' | 'IN_PROJECT' | 'COMPLETED' | 'ARCHIVED';
}

export interface ClientProfile {
  id: UUID;
  userId: UUID;
  companyName: string | null;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  socialMediaLinks: Record<string, string> | null;
  status: 'PROSPECT' | 'ACTIVE' | 'IN_PROJECT' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}
