import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { db } from 'src/db/config';
import {
  invoicesTable,
  invoiceItemsTable,
  usersTable,
  projectsTable,
} from 'src/db/schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './interfaces/invoice.interface';
import { NotificationsService } from '../notifications/notifications.service';

// Tipos auxiliares
type DbInvoice = typeof invoicesTable.$inferSelect;
type NewInvoiceItem = typeof invoiceItemsTable.$inferInsert;
type DbInvoiceItem = typeof invoiceItemsTable.$inferSelect;
type FullInvoiceEntity = DbInvoice & {
  items: DbInvoiceItem[];
  client: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
};

@Injectable()
export class InvoicesService {
  constructor(private readonly notificationsService: NotificationsService) {}
  private handleError(error: unknown): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    console.error('Error inesperado en InvoicesService:', error);
    throw new InternalServerErrorException(
      'Ha ocurrido un error inesperado. Por favor, contacte al soporte.',
    );
  }

  private toInvoice(entity: FullInvoiceEntity): Invoice {
    const { items, client, project, ...invoiceData } = entity;
    return {
      ...invoiceData,
      issueDate: entity.issueDate.toISOString().split('T')[0],
      dueDate: entity.dueDate.toISOString().split('T')[0],
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      client: client ?? undefined,
      project: project ?? undefined,
      notes: entity.notes ?? undefined,
      projectId: entity.projectId ?? undefined,
    };
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const { clientId, projectId, issueDate, dueDate, items, taxes, ...rest } =
      createInvoiceDto;

    let invoice: DbInvoice | undefined;

    try {
      await this.validateClientAndProject(clientId, projectId);

      const { totalAmount } = this.calculateTotals(items, taxes);
      const invoiceNumber = await this.generateInvoiceNumber();

      const [createdInvoice] = await db
        .insert(invoicesTable)
        .values({
          ...rest,
          clientId,
          projectId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          totalAmount,
          taxes: taxes?.toString() || '0.00',
          status: 'DRAFT', // Corregido de 'pending' a 'DRAFT'
          invoiceNumber,
        })
        .returning();

      invoice = createdInvoice;

      if (!invoice || !invoice.id) {
        throw new InternalServerErrorException(
          'Error al crear la factura: no se pudo obtener el ID.',
        );
      }

      const newInvoiceId = invoice.id;

      if (items && items.length > 0) {
        const invoiceItems: NewInvoiceItem[] = items.map((item) => ({
          ...item,
          invoiceId: newInvoiceId,
          totalPrice: (
            parseFloat(item.quantity) * parseFloat(item.unitPrice)
          ).toFixed(2),
        }));
        await db.insert(invoiceItemsTable).values(invoiceItems);
      }

      // Send notification to client about new invoice
      await this.notificationsService.create({
        userId: clientId,
        type: 'INVOICE_GENERATED',
        message: `New invoice #${invoiceNumber} has been generated for your ${projectId ? 'project' : 'account'}`,
        entityType: 'INVOICE',
        entityId: newInvoiceId,
      });

      return this.findOne(newInvoiceId);
    } catch (error) {
      if (invoice?.id) {
        await db.delete(invoicesTable).where(eq(invoicesTable.id, invoice.id));
      }
      this.handleError(error);
    }
  }

  async findAll(): Promise<Invoice[]> {
    try {
      const result = await db.query.invoicesTable.findMany({
        with: {
          items: true,
          client: { columns: { id: true, name: true, email: true } },
          project: { columns: { id: true, name: true } },
        },
        orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
      });
      return result.map((invoice) =>
        this.toInvoice(invoice as FullInvoiceEntity),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string): Promise<Invoice> {
    try {
      const invoice = await this.findInvoiceEntityById(id);
      if (!invoice) {
        throw new NotFoundException(`Factura con ID '${id}' no encontrada.`);
      }
      return this.toInvoice(invoice);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const { items, taxes, ...invoiceData } = updateInvoiceDto;

    try {
      const currentInvoice = await this.findOne(id); // Asegura que la factura existe
      const previousStatus = currentInvoice.status;

      let totalAmount: string | undefined;
      if (items || taxes !== undefined) {
        // Si se actualiza items o taxes, recalcular total
        const itemsToUse = items || currentInvoice.items || [];
        const taxesToUse =
          taxes !== undefined ? taxes : parseFloat(currentInvoice.taxes);
        totalAmount = this.calculateTotals(itemsToUse, taxesToUse).totalAmount;
      }

      if (
        Object.keys(invoiceData).length > 0 ||
        totalAmount !== undefined ||
        taxes !== undefined
      ) {
        await db
          .update(invoicesTable)
          .set({
            ...invoiceData,
            issueDate: invoiceData.issueDate
              ? new Date(invoiceData.issueDate)
              : undefined,
            dueDate: invoiceData.dueDate
              ? new Date(invoiceData.dueDate)
              : undefined,
            totalAmount,
            taxes: taxes !== undefined ? taxes.toString() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(invoicesTable.id, id));
      }

      if (items) {
        await db
          .delete(invoiceItemsTable)
          .where(eq(invoiceItemsTable.invoiceId, id));

        const newItems: NewInvoiceItem[] = items.map((item) => ({
          ...item,
          invoiceId: id,
          totalPrice: (
            parseFloat(item.quantity) * parseFloat(item.unitPrice)
          ).toFixed(2),
        }));
        await db.insert(invoiceItemsTable).values(newItems);
      }

      // Send notification if status changed
      if (invoiceData.status && invoiceData.status !== previousStatus) {
        let notificationMessage = '';
        let notificationType: 'INVOICE_GENERATED' | 'PAYMENT_REMINDER' =
          'INVOICE_GENERATED';

        switch (invoiceData.status) {
          case 'SENT':
            notificationMessage = `Invoice #${currentInvoice.invoiceNumber} has been sent and is now available for payment`;
            break;
          case 'PAID':
            notificationMessage = `Payment received for invoice #${currentInvoice.invoiceNumber}. Thank you!`;
            break;
          case 'VOID':
            notificationMessage = `Invoice #${currentInvoice.invoiceNumber} has been voided`;
            break;
          default:
            // Handle OVERDUE and other statuses
            if (invoiceData.status.toString() === 'OVERDUE') {
              notificationMessage = `Invoice #${currentInvoice.invoiceNumber} is now overdue. Please make payment as soon as possible.`;
              notificationType = 'PAYMENT_REMINDER';
            }
            break;
        }

        if (notificationMessage) {
          await this.notificationsService.create({
            userId: currentInvoice.clientId,
            type: notificationType,
            message: notificationMessage,
            entityType: 'INVOICE',
            entityId: id,
          });
        }
      }

      return this.findOne(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async remove(id: string): Promise<Invoice> {
    try {
      await this.findOne(id); // Asegura que la factura existe

      await db
        .update(invoicesTable)
        .set({ status: 'VOID', updatedAt: new Date() })
        .where(eq(invoicesTable.id, id));

      return this.findOne(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async findInvoiceEntityById(
    id: string,
  ): Promise<FullInvoiceEntity | null> {
    const invoice = await db.query.invoicesTable.findFirst({
      where: eq(invoicesTable.id, id),
      with: {
        items: true,
        client: { columns: { id: true, name: true, email: true } },
        project: { columns: { id: true, name: true } },
      },
    });
    return invoice as FullInvoiceEntity | null;
  }

  private async validateClientAndProject(
    clientId: string,
    projectId?: string,
  ): Promise<void> {
    const clientExists = await db.query.usersTable.findFirst({
      where: and(eq(usersTable.id, clientId), eq(usersTable.role, 'CLIENT')),
    });
    if (!clientExists) {
      throw new NotFoundException(
        `Cliente con ID '${clientId}' no encontrado o no tiene el rol correcto.`,
      );
    }

    if (projectId) {
      const projectExists = await db.query.projectsTable.findFirst({
        where: eq(projectsTable.id, projectId),
      });
      if (!projectExists) {
        throw new NotFoundException(
          `Proyecto con ID '${projectId}' no encontrado.`,
        );
      }
    }
  }

  private calculateTotals(
    items: CreateInvoiceDto['items'],
    taxes?: number,
  ): {
    subtotal: string;
    taxAmount: string;
    totalAmount: string;
  } {
    if (!items || items.length === 0) {
      return {
        subtotal: '0.00',
        taxAmount: '0.00',
        totalAmount: '0.00',
      };
    }

    const subtotal = items.reduce((acc, item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      if (
        isNaN(quantity) ||
        isNaN(unitPrice) ||
        quantity <= 0 ||
        unitPrice < 0
      ) {
        throw new BadRequestException(
          `El ítem '${item.description}' tiene una cantidad o precio unitario inválido.`,
        );
      }
      return acc + quantity * unitPrice;
    }, 0);

    const taxPercentage = taxes || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(invoicesTable)
      .where(sql`extract(year from "created_at") = ${year}`);

    const count = parseInt(result[0].count, 10);
    return `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }

  /**
   * Send payment reminder for overdue invoices
   * This method can be called by a cron job or manually
   */
  async sendPaymentReminders(): Promise<void> {
    try {
      const today = new Date();
      const overdueInvoices = await db.query.invoicesTable.findMany({
        where: sql`"due_date" < ${today} AND "status" IN ('SENT', 'DRAFT')`,
        with: {
          client: { columns: { id: true, name: true, email: true } },
        },
      });

      for (const invoice of overdueInvoices) {
        const daysPastDue = Math.floor(
          (today.getTime() - new Date(invoice.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await this.notificationsService.create({
          userId: invoice.clientId,
          type: 'PAYMENT_REMINDER',
          message: `Payment reminder: Invoice #${invoice.invoiceNumber} is ${daysPastDue} days overdue. Total amount: $${invoice.totalAmount}`,
          entityType: 'INVOICE',
          entityId: invoice.id,
        });

        // Optionally update status to OVERDUE
        if (invoice.status !== 'OVERDUE') {
          await db
            .update(invoicesTable)
            .set({ status: 'OVERDUE', updatedAt: new Date() })
            .where(eq(invoicesTable.id, invoice.id));
        }
      }
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }
}
