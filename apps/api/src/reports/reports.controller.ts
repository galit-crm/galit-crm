import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.reportsService.findAll({ projectId, user: req.user });
  }

  /** Read-only ops metrics — allowed for מומחה (dashboard) as well as מנהלים */
  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER', 'EXPERT')
  getDashboard(@Req() req: any) {
    return this.reportsService.getDashboard(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.reportsService.findOne(id, req.user);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() body: any, @Req() req: any) {
    return this.reportsService.create(body, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.reportsService.update(id, body, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.reportsService.remove(id, req.user);
  }
}

