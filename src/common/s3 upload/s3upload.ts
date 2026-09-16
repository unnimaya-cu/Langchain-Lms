import { S3 } from 'aws-sdk';

export async function uploadToS3(file: Express.Multer.File, bucketName: string): Promise<string> {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

  if (!file.buffer) {
    throw new Error('File buffer is missing.');
  }

  const params = {
    Bucket: bucketName,
    Key: `${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    // Upload the file to S3
    const uploadResult = await s3.upload(params).promise();
    console.log('S3 Upload Result:', uploadResult);

    // Generate presigned URL for private access (if required)
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: uploadResult.Key,
      Expires: 3600, // URL expires in 1 hour
    });

    return presignedUrl; // Return the presigned URL
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}
