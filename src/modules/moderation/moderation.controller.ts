import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';
import { ModerationService } from './moderation.service';
import { ModerationQueueQueryDto, OverrideDecisionDto } from './dtos/moderation.dto';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  getQueue(@Query() query: ModerationQueueQueryDto) {
    return this.moderationService.getModerationQueue(query);
  }

  @Get('stats')
  getStats() {
    return this.moderationService.getStats();
  }

  @Patch(':logId/decision')
  overrideDecision(
    @Param('logId', ParseIntPipe) logId: number,
    @Body() dto: OverrideDecisionDto,
    @Req() req: Request,
  ) {
    const { sub } = req['user'] as { sub: number };
    return this.moderationService.overrideDecision(logId, dto, sub);
  }
}
