/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    Controller,
    Delete,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/modules/cloudinary/cloudinary.service';

@Controller('upload')
export class CloudinaryController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    @Post('')
    @UseInterceptors(FileInterceptor('file'))
    uploadImage(@UploadedFile() file: Express.Multer.File) {
        return this.cloudinaryService.uploadFile(file);
    }

    @Delete(':publicId')
    deleteImage(@Param('publicId') publicId: string) {
        return this.cloudinaryService.deleteFile(publicId);
    }
}
