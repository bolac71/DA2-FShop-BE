declare global {
  namespace Express {
    namespace Multer {
      // Ensure Express.Multer.File is always recognized by the TS language service.
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

export {};
