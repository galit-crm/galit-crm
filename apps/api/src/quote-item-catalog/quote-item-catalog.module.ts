import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuoteItemCatalogController } from './quote-item-catalog.controller';
import { QuoteItemCatalogService } from './quote-item-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteItemCatalogController],
  providers: [QuoteItemCatalogService],
})
export class QuoteItemCatalogModule {}

