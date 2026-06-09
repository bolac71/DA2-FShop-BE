import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseDto } from 'src/dtos/response.dto';
interface PipeRespone {
    message: string[]
    error: string
    stateCode: number
}
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const startTime = Number(request['startTime']);
        const endTime = Date.now();
        const takenTime = `${endTime - startTime}ms`;
        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        let message = exception instanceof HttpException ? exception.getResponse() as string : 'Internal server error';
            
        if (exception instanceof BadRequestException) {
            const badRequestResponse = exception.getResponse() as PipeRespone | string;
            if (typeof badRequestResponse === 'string') {
                message = badRequestResponse;
            } else if (Array.isArray(badRequestResponse.message)) {
                message = badRequestResponse.message[0];
            } else {
                message = badRequestResponse.message;
            }
        }
        this.logger.error({
            requestId: request['requestId'],
            method: request.method,
            path: request.url,
            statusCode: status,
            message,
        });
        response.status(status).json(new ResponseDto(status, message, takenTime, request));
    }
}
