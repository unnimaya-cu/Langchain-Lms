import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';

@Injectable()
export class FileUploadService {
  private s3: AWS.S3;

  constructor(private readonly miscService: MiscService) {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async generatePresignedUrls(
    count: number,
  ): Promise<{ url: string; fileName: string; publicUrl: string }[]> {
    const urls: { url: string; fileName: string; publicUrl: string }[] = [];

    for (let i = 0; i < count; i++) {
      const fileName = await this.miscService.getNextSequence(ModelNames.File);

      console.log(`Generated file name: ${fileName}`);

      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Expires: 3600,
      };

      const presignedUrl = this.s3.getSignedUrl('putObject', params);

      const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      urls.push({ url: presignedUrl, fileName, publicUrl });
    }

    return urls;
  }
}
