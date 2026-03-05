import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString } from "class-validator"
import { Role } from "src/constants/role.enum";
import { StringRequired } from "src/decorators/dto.decorator";
export class CreateUserDto {
    @ApiProperty({ example: 'Nguyen Van A' })
    @StringRequired('Full Name')
    fullName: string

    @ApiProperty({ example: 'nguyenvana@gmail.com' })
    @IsEmail()
    @StringRequired('Email')
    email: string

    @ApiProperty({ example: '123456' })
    @StringRequired('Password')
    password: string

    @IsEnum(Role)
    @ApiProperty({enum: Role, default: Role.USER, example: Role.USER})

    role: Role;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File avatar',
        required: false
    })
    avatar?: any;
}
