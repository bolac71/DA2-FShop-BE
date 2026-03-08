import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiCreatedResponse, ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';
import { CreateAddressDto, UpdateAddressDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressService: AddressesService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new address for the authenticated user'})
  @ApiCreatedResponse({description: 'Address created successfully'})
  @ApiNotFoundResponse({description: 'User not found'})
  create(@Req() req: Request, @Body() createAddressDto: CreateAddressDto) {
    const {id} = req['user'];
    return this.addressService.create(id, createAddressDto);
  }

  @ApiOperation({ summary: 'Get all addresses (admin)' })
  @Get('all')
  findAll(@Query()query: QueryDto) {
    return this.addressService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all addresses for the authenticated user' })
  getMyAddresses(@Req() req: Request) {
    const {id} = req['user'];
    return this.addressService.getMyAddresses(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address by ID' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(@Req() req: Request, @Param('id') id: number, @Body() updateAddressDto: UpdateAddressDto) {
    const {id: userId} = req['user'];
    return this.addressService.update(userId, id, updateAddressDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  getAddress(@Req() req: Request, @Param('addressId') addressId: number) {
    const {id} = req['user'];
    return this.addressService.getAddressById(id, addressId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/default/:id') 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default successfully' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  setDefault(@Req() req: Request, @Param('id') id: number) {
    const { id: userId } = req['user'];
    return this.addressService.setDefault(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address by ID' })
  delete(@Param('id') id: number) {
    return this.addressService.delete(id);
  }
}
