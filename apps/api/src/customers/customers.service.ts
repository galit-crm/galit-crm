import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany();
  }

  findOne(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async findFull(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        leads: true,
        quotes: true,
        tasks: true,
        reports: true,
      },
    });

    if (!customer) {
      return null;
    }

    return {
      customer,
      leads: customer.leads,
      quotes: customer.quotes,
      tasks: customer.tasks,
      reports: customer.reports,
    };
  }

  create(data: any) {
    return this.prisma.customer.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Detach or clean up related data before deleting the customer
      await tx.lead.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.task.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.quote.deleteMany({
        where: { customerId: id },
      });
      await tx.report.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });

      return tx.customer.delete({ where: { id } });
    });
  }
}

