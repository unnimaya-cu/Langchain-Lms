// import { Injectable, NestMiddleware } from '@nestjs/common';
// import rateLimit from 'express-rate-limit';

// @Injectable()
// export class RateLimiterMiddleware implements NestMiddleware {
//   private limiter = rateLimit({
//     windowMs: 5 * 60 * 1000,   //5 min
//     max: 1000, // max requests
//     message: 'Too many requests from this IP, please try again later.',
//   });

//   use(req: any, res: any, next: () => void) {
//     this.limiter(req, res, next);
//   }
// }
