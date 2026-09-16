import { Controller, Post, Body } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  // @Post('generate-urls')
  // async generatePresignedUrls(
  //   @Body('count') count: number,
  // ): Promise<{ url: string }[]> {
  //   console.log('Generating presigned URLs for count:', count);

  //   const urls = await this.fileUploadService.generatePresignedUrls(count);
  //   console.log('Generated presigned URLs:', urls);
  //   return urls;
  // }
}
