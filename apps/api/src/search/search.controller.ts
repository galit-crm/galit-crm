import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'MANAGER', 'SALES', 'TECHNICIAN', 'EXPERT', 'BILLING')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Req() req: any, @Query('q') q?: string) {
    return this.searchService.search(q || '', req.user);
  }
}

