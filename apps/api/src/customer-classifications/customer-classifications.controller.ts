import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CustomerClassificationsService } from './customer-classifications.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

/** קריאת רשימת סיווגים — לכל מי שצריך טפסי לקוח/דשבורד; יצירה רק למנהלים ב-POST */
@Controller('customer-classifications')
@UseGuards(RolesGuard)
export class CustomerClassificationsController {
  constructor(private readonly customerClassificationsService: CustomerClassificationsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'SALES', 'EXPERT', 'TECHNICIAN', 'BILLING')
  findAll() {
    return this.customerClassificationsService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() body: { labelHe?: string }) {
    return this.customerClassificationsService.create(body?.labelHe ?? '');
  }
}
