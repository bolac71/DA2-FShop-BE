import { Request } from "express";
import { convertISODate } from "src/utils/convertTime";

export class ResponseDto<T = any> {
    statusCode: number
    message: string;
    data?: T;
    timestamp: string;
    path: string
    takenTime?: string;
    constructor(stateCode: number, message: string, takenTime: string, request: Request, data?: T) {
        this.statusCode = stateCode
        this.message = message
        this.data = data
        this.timestamp = convertISODate(new Date().toISOString())
        this.path = request?.url || ''
        this.takenTime = takenTime
    }
}