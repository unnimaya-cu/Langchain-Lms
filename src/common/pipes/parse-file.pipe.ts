import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FileTransform implements PipeTransform {
  // Custom Pipe for Optional Validation of Uploaded Files
  required = false;
  fileTypes: Array<string>;
  maxFileSize: number;
  // multifield = false;
  // fieldNames = Array;

  checkFileExceedsMaximumLimited(file: Express.Multer.File) {
    const inputFileSize: number = file.size / 1024 / 1024;
    if (inputFileSize > this.maxFileSize) {
      fs.unlink(`./uploads/branches/${file.filename}`, (err) => {});
    }
    return inputFileSize > this.maxFileSize;
  }

  constructor(
    isRequired: boolean,
    maxFileSize: number,
    fileTypes: Array<string>,
    // multiField:boolean,
    // fieldNames:Array<object>
  ) {
    this.required = isRequired;
    this.fileTypes = fileTypes;
    this.maxFileSize = maxFileSize;
    // this.multifield = multiField;
    // this.fieldNames= fieldNames
  }

  transform(
    files: Express.Multer.File | Express.Multer.File[],
    // metadata: ArgumentMetadata,
  ): Express.Multer.File | Express.Multer.File[] {
    console.log('file', files);

    if (this.required) {
      if (files === undefined || files === null) {
        throw new BadRequestException('Validation failed (file expected)');
      }
      //If files are required, this block will return exception if no files found
      // if (Array.isArray(files) && files.length == 0)
      //   throw new BadRequestException('Validation failed (Need JPEG Files)');
    }

    if (Array.isArray(files) && files.length > 0) {
      // Looping through File Array to check each file for the condition specified
      if (this.fileTypes && this.fileTypes.length > 0) {
        files.forEach((file) => {
          if (!this.fileTypes.some((m) => file.mimetype.includes(m))) {
            throw new UnsupportedMediaTypeException(
              `File type is not matching: ${this.fileTypes.join(', ')}`,
            );
          }
          if (this.checkFileExceedsMaximumLimited(file))
            throw new HttpException(
              `fileSize should be less than ${this.maxFileSize}`,
              HttpStatus.PAYLOAD_TOO_LARGE,
            );
        });
      }
    }

    return files;
  }
}
