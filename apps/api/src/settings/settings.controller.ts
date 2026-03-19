import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  get(@Param('key') key: string, @Req() req: any) {
    return this.settingsService.get(key, req.user);
  }

  @Patch(':key')
  upsert(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.settingsService.upsert(key, body?.value, req.user);
  }
}

