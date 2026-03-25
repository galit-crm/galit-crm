import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { QuoteTemplatesService } from './quote-templates.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('quote-templates')
@UseGuards(RolesGuard)
export class QuoteTemplatesController {
  constructor(private readonly quoteTemplatesService: QuoteTemplatesService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'SALES')
  findAll(@Query('serviceType') serviceType?: string, @Query('activeOnly') activeOnly?: string) {
    return this.quoteTemplatesService.findAll({
      serviceType: serviceType || undefined,
      activeOnly: activeOnly === 'true' || activeOnly === '1',
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'SALES')
  findOne(@Param('id') id: string) {
    return this.quoteTemplatesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() body: any) {
    return this.quoteTemplatesService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any) {
    return this.quoteTemplatesService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.quoteTemplatesService.remove(id);
  }
}
