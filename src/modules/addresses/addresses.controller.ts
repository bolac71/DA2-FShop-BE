import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { ApiBearerAuth, ApiOperation, ApiCreatedResponse, ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';
import { CreateAddressDto, UpdateAddressDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressService: AddressesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new address for the authenticated user'})
  @ApiCreatedResponse({description: 'Address created successfully'})
  @ApiNotFoundResponse({description: 'User not found'})
  create(@Req() req: Request, @Body() createAddressDto: CreateAddressDto) {
    const {sub} = req['user'];
    return this.addressService.create(sub, createAddressDto);
  }

  @ApiOperation({ summary: 'Get all addresses (admin)' })
  @Get('all')
  findAll(@Query()query: QueryDto) {
    return this.addressService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all addresses for the authenticated user' })
  getMyAddresses(@Req() req: Request) {
    const {sub} = req['user'];;
    return this.addressService.getMyAddresses(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address by ID' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(@Req() req: Request, @Param('id') id: number, @Body() updateAddressDto: UpdateAddressDto) {
    const {sub} = req['user'];
    return this.addressService.update(sub, id, updateAddressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  getAddress(@Req() req: Request, @Param('addressId') addressId: number) {
    const {sub} = req['user'];
    return this.addressService.getAddressById(sub, addressId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/default/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default successfully' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  setDefault(@Req() req: Request, @Param('id') id: number) {
    const {sub} = req['user'];
    return this.addressService.setDefault(sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete address by ID' })
  delete(@Req() req: Request, @Param('id') id: number) {
    const {sub} = req['user'];
    return this.addressService.delete(sub, id);
  }
}
