import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('frequently-bought-together/:productId')
  @ApiOperation({ summary: 'Get products frequently bought together with a specific product' })
  async getFrequentlyBoughtTogether(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('limit') limit?: number,
  ) {
    return this.recommendationsService.getFrequentlyBoughtTogether(productId, limit ? Number(limit) : 4);
  }
}
