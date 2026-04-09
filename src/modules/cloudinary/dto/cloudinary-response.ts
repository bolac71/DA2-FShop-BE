// cloudinary-response.ts

import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

export type CloudinaryResponse = UploadApiResponse | UploadApiErrorResponse | undefined;
