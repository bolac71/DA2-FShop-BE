/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InventoriesService } from './inventories.service';
import {
  CreateInventoryDto,
  CreateInventoryTransactionDto,
  UpdateInventoryDto,
} from './dtos';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants/role.enum';
import { RolesGuard } from 'src/guards/roles.guard';
import { QueryDto } from 'src/dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('Inventories')
@Controller('inventories')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  /**
   * Create inventory for a variant
   * @route POST /inventories
   */
  @Post()  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inventory for a product variant (admin only)' })
  @ApiCreatedResponse({ description: 'Inventory created successfully' })
  @ApiResponse({ status: 409, description: 'Inventory already exists for this variant' })
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoriesService.create(createInventoryDto);
  }

  /**
   * Get all inventories with pagination
   * @route GET /inventories
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all inventories (admin only)' })
  @ApiResponse({ status: 200, description: 'List of inventories' })
  findAll(@Query() query: QueryDto) {
    return this.inventoriesService.getAll(query);
  }

  /**
   * Get low stock inventories (inventories below threshold)
   * @route GET /inventories/low-stock?threshold=10
   */
  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get low stock inventories (admin only)' })
  @ApiResponse({ status: 200, description: 'List of low stock inventories' })
  getLowStock(@Query('threshold') threshold: number = 10) {
    return this.inventoriesService.getLowStockInventories(threshold);
  }

  /**
   * Create inventory transaction (import/export/return/adjustment)
   * @route POST /inventories/transactions/create
   */
  @Post('transactions/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inventory transaction (import/export/return/adjustment)' })
  @ApiCreatedResponse({ description: 'Transaction created and inventory updated' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  createTransaction(
    @Req() req: Request,
    @Body() createTransactionDto: CreateInventoryTransactionDto,
  ) {
    const userId = req['user']?.sub;
    return this.inventoriesService.createTransaction(userId, createTransactionDto);
  }

  /**
   * Get inventory by ID
   * @route GET /inventories/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory by ID (admin only)' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  getById(@Param('id') id: number) {
    return this.inventoriesService.getById(id);
  }

  /**
   * Get inventory by variant ID
   * @route GET /inventories/variant/:variantId
   */
  @Get('variant/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory by variant ID (admin only)' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  getByVariantId(@Param('variantId') variantId: number) {
    return this.inventoriesService.getByVariantId(variantId);
  }

  /**
   * Update inventory quantity (admin only - direct update)
   * @route PATCH /inventories/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inventory quantity directly (admin only)' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  update(@Param('id') id: number, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoriesService.update(id, updateInventoryDto);
  }

  /**
   * Get transaction history for a variant
   * @route GET /inventories/:variantId/transactions
   */
  @Get(':variantId/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history for a variant' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  getTransactionHistory(
    @Param('variantId') variantId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoriesService.getTransactionHistory(variantId, page, limit);
  }

  /**
   * Delete inventory
   * @route DELETE /inventories/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete inventory (admin only)' })
  @ApiResponse({ status: 200, description: 'Inventory deleted successfully' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  delete(@Param('id') id: number) {
    return this.inventoriesService.delete(id);
  }
}
