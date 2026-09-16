import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const getUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Express.Request = ctx.switchToHttp().getRequest();
    // console.log("request.user",request.user);
    return request.user;
  },
);
