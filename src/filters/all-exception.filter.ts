import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseDto } from 'src/dtos/response.dto';
interface PipeRespone {
    message: string[]
    error: string
    stateCode: number
}
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        console.log(exception)
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const startTime = Number(request['startTime']);
        const endTime = Date.now();
        const takenTime = `${endTime - startTime}ms`;
        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        let message = exception instanceof HttpException ? exception.getResponse() as string : 'Internal server error';
            
        if (exception instanceof BadRequestException) 
            message = (exception.getResponse() as PipeRespone).message[0]
        const a = []
        response.status(status).json(new ResponseDto(status, message, takenTime, request));
    }
}
