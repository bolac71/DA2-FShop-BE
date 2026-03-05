import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiCreatedResponse, ApiConflictResponse, ApiConsumes, ApiNotFoundResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { QueryDto } from 'src/dtos/query.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({description: 'User created successfully'})
  @ApiConflictResponse({description: 'User already exists'})
  create(@Body() createUserDto: CreateUserDto, @UploadedFile() file?: Express.Multer.File) {
    return this.usersService.create(createUserDto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll(@Query() query: QueryDto, @Req() request: Request) {
    return this.usersService.findAll(query);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Update user' })
  @ApiConsumes('multipart/form-data')
  @ApiNotFoundResponse({description: 'User not found'})
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto, @UploadedFile() file?: Express.Multer.File) {
    return this.usersService.update(id, updateUserDto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiNotFoundResponse({description: 'User not found'})
  remove(@Param('id') id: number) {
    return this.usersService.remove(id);
  }
}
