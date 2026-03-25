import { Module } from '@nestjs/common';
import { CustomerClassificationsController } from './customer-classifications.controller';
import { CustomerClassificationsService } from './customer-classifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerClassificationsController],
  providers: [CustomerClassificationsService],
  exports: [CustomerClassificationsService],
})
export class CustomerClassificationsModule {}
