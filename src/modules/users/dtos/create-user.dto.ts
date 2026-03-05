import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString } from "class-validator"
import { Role } from "src/constants/role.enum";
import { StringRequired } from "src/decorators/dto.decorator";
export class CreateUserDto {
    @StringRequired('Full Name')
    fullName: string

    @IsEmail()
    @StringRequired('Email')
    email: string

    @StringRequired('Password')
    password: string

    @IsEnum(Role)
    @ApiProperty({enum: Role})
    role: Role;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File avatar',
        required: false
    })
    avatar?: any;
}
