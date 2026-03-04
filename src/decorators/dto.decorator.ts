/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Max,
  Min,
  IsBoolean,
  IsPhoneNumber,
  IsInt,
} from 'class-validator';

export const StringOptional = () =>
  applyDecorators(ApiProperty({ required: false }), IsString(), IsOptional());

export const StringRequired = (name: string) =>
  applyDecorators(
    ApiProperty({
      required: true,
    }),
    IsString({ message: `${name} must be a string` }),
    IsNotEmpty({ message: `${name} can not be empty` }),
  );

export const NumberOptional = () =>
  applyDecorators(
    ApiProperty({ required: false }),
    IsOptional(),
    Type(() => Number),
    IsNumber(),
  );

export const NumberRequired = (name: string, min: number = 0, max?: number) =>
  applyDecorators(
    ApiProperty({ required: true }),
    Type(() => Number),
    IsNotEmpty({ message: `${name} can not be empty` }),
    IsNumber(),
    Min(min),
    ...(max ? [Max(max)] : []),
  );

export const BooleanOptional = () =>
  applyDecorators(
    ApiProperty({ required: false }),
    IsOptional(),
    IsBoolean(),
    Transform(({ value }) => value === 'true' || value === '1' || value === true),
  );

export const PhoneNumberRequired = (name: string) =>
  applyDecorators(
    ApiProperty({
      required: true,
      example: '+84-123-456-7890',
      description: 'Phone number must be a valid number with country code.',
    }),
    IsString({ message: `${name} must be a string` }),
    IsNotEmpty({ message: `${name} can not be empty` }),
    IsPhoneNumber('VN', {
      message: 'Invalid phone number format',
    }),
  );

export const PhoneNumberOptional = (name: string) =>
  applyDecorators(
    ApiProperty({
      required: false,
      example: '+84987654321',
      description: 'The phone number must be a valid number with country code.',
    }),
    IsOptional(),
    IsString({ message: `${name} must be a string` }),
    IsPhoneNumber('VN', {
      message: 'Invalid phone number format',
    }),
  );

export const IntegerRequired = (
  name: string,
  min?: number,
  max?: number,
) => {
  return applyDecorators(
    ApiProperty({ required: true, type: Number, description: `${name} (integer)` }),
    Type(() => Number), 
    IsNotEmpty({ message: `${name} can not be empty` }),
    IsInt({ message: `${name} must be an integer` }),
    ...(min !== undefined ? [Min(min, { message: `${name} must be >= ${min}` })] : []),
    ...(max !== undefined ? [Max(max, { message: `${name} must be <= ${max}` })] : []),
  );
};