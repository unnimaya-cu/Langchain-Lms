import { HttpException } from '@nestjs/common';
import { TErrorSection } from 'src/common/types/error-types';

export const ErrorSection: TErrorSection = {
  invalidId: 'Invalid ID provided.',
  validationError: `Validation failed`,
  notFound: 'Not found.',
  duplicateKey: 'Already exists.',
  unknown: 'An unknown error occurred.',
};

export const errorMessageBuilder = (
  err: any,
): { fields?: string[]; message: string } => {
  // console.log('field', Object.keys(err.keyValue));

  switch (err.name) {
    case 'CastError': // Invalid ObjectId or type casting issue
      return { message: ErrorSection.invalidId };

    case 'ValidationError': // Schema validation error
      return {
        message: `${ErrorSection.validationError}`,
        fields: Object.keys(err?.errors),
      };

    case 'DocumentNotFoundError': // Unable to find a document
      return { message: ErrorSection.notFound };

    case 'MongoServerError': {
      if (err.code === 11000) {
        return {
          message: ErrorSection.duplicateKey,
          fields: Object.keys(err.keyValue),
        }; // Duplicate key error
      }
      break;
    }
  }
  switch (err.message) {
    case 'notFound':
      return { message: ErrorSection.notFound };

    default:
      return { message: ErrorSection.unknown };
  }
};

// Function to build error code according to error type
export const errorCodeBuilder = (err: any) => {
  switch (err.name) {
    case 'CastError': // Invalid ObjectId or type casting issue
      return 400; // Bad Request

    case 'ValidationError': // Schema validation error
      return 422; // Unprocessable Entity

    case 'DocumentNotFoundError': // Unable to find a document
      return 404; // Not Found

    case 'MongoServerError': {
      if (err.code === 11000) {
        return 409; // Conflict (Duplicate key error)
      }
      break;
    }
  }
  switch (err.message) {
    case 'notFound':
      return 404; // Not Found

    default:
      return 500; // Internal Server Error
  }
};
export const responseBuilder = (success: boolean = true, data: any) => {
  return {
    success,
    data,
    error: null,
  };
};

export const errorResponseBuilder = (err: any) => {
  console.log(err)

  let message: string;
  let code: number = 500;
  let fields: string[] = [];
  if (typeof err === 'string') {
    message = err;
    code = 400;
  } else if (err.custom) {
    message = err.message;
    code = err.code;
    fields = err.fields || [];
  } else {
    const errObj = errorMessageBuilder(err);
    (message = errObj.message),
      (fields = errObj.fields),
      (code = errorCodeBuilder(err));
  }

  const errRes = {
    success: false,
    data: null,
    error: {
      message,
      type: err?.name,
      fields,
      err
    },
  };
  throw new HttpException(errRes, code);
};
