import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { LabSamplesService } from './lab-samples.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('lab-samples')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
export class LabSamplesController {
  constructor(private readonly labSamplesService: LabSamplesService) {}

  @Get()
  findAll(@Req() req: any, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string) {
    return this.labSamplesService.findAll({ projectId, customerId, user: req.user });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.labSamplesService.findOne(id, req.user);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.labSamplesService.create(body, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.labSamplesService.update(id, body, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.labSamplesService.remove(id, req.user);
  }
}

