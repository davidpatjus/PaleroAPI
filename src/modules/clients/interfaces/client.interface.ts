export interface ClientProfile {
  id: string;
  userId: string; // Foreign key to usersTable
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  socialMediaLinks?: Record<string, any>;
  status: 'PROSPECT' | 'ACTIVE' | 'IN_PROJECT' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}
