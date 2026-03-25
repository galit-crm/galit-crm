import { Module } from '@nestjs/common';
import { QuoteTemplatesService } from './quote-templates.service';
import { QuoteTemplatesController } from './quote-templates.controller';

@Module({
  controllers: [QuoteTemplatesController],
  providers: [QuoteTemplatesService],
  exports: [QuoteTemplatesService],
})
export class QuoteTemplatesModule {}
