import { Controller, Get, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';


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

  @Get('personalize')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get personalized product recommendations for the current user' })
  async getPersonalized(@Req() req: any, @Query('limit') limit?: number) {
    return this.recommendationsService.getPersonalizedRecommendations(req.user.id, limit ? Number(limit) : 10);
  }
}

