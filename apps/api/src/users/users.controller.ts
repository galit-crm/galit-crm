import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('active-now')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  activeNow(@Req() req: any) {
    return this.usersService.activeNow(req.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Patch(':id/presence')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'SALES', 'TECHNICIAN', 'EXPERT', 'BILLING')
  updatePresence(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const { isOnline, currentWorkMode, currentProjectId } = body || {};
    return this.usersService.updatePresence(id, { isOnline, currentWorkMode, currentProjectId }, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body || {};

    if (!email || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.login(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}

