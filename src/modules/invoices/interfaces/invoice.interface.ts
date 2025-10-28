import { invoiceStatusEnum } from '../../../db/schema';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: string; // Cambiado a string
  updatedAt: string; // Cambiado a string
}

export interface Invoice {
  id: string;
  projectId?: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string; // Cambiado a string
  dueDate: string; // Cambiado a string
  totalAmount: string;
  taxes: string; // Tax percentage as string (e.g., "21.00" for 21%)
  status: (typeof invoiceStatusEnum.enumValues)[number];
  notes?: string | null;
  createdAt: string; // Cambiado a string
  updatedAt: string; // Cambiado a string
  items?: InvoiceItem[];
  client?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  } | null;
}
