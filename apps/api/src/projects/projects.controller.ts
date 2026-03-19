import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  findAll(@Req() req: any) {
    return this.projectsService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'TECHNICIAN')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.projectsService.update(id, body, req.user);
  }
}
