import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalSearchService } from './global-search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('global-search')
@UseGuards(JwtAuthGuard)
export class GlobalSearchController {
  constructor(private service: GlobalSearchService) {}

  @Get('deceased')
  search(@Req() req: any, @Query() q: SearchQueryDto) {
    return this.service.searchDeceased(req.user.sub, q);
  }
}

