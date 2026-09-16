import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
//   import { LogModuleService } from "src/v1/log-module/log-module.service";
//   import { LogSubject } from "../decorators/log-subject.decorator";
//   import { UserAction } from "../decorators/user-action.decorator";
import { Log } from 'src/modules/log/log.schema';
//   import { logWhitelists } from "./loggerWhitelist";
import { LogService } from 'src/modules/log/log.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(
    private logService: LogService,
    private reflector: Reflector,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request: Request = context.switchToHttp().getRequest();
    //   if (logWhitelists.includes(request.path)) {
    //     // If the path is in the whitelist, skip logging
    //     return next.handle();
    //   }

    //   const action = this.reflector.get(UserAction, context.getHandler());

    const startTime = Date.now();
    return next.handle().pipe(
      tap((data) => {
        //   const logSubjects = this.reflector.get(
        //     // LogSubject,
        //     context.getHandler()
        //   );
        let requestResponse: any = null;
        let valueFrom: any = null;
        let getValue: any = null;
        let subjectType: any = null;
        //   if (logSubjects) {
        //     const [subject_type, request_response, value_from, value] =
        //       logSubjects;
        //     requestResponse = request_response;
        //     valueFrom = value_from;
        //     getValue = value;
        //     subjectType = subject_type;
        //   }
        let subject_id: string | null = null;
        if (requestResponse === 'request') {
          console.log('Value from request : ', valueFrom, getValue);
          subject_id = request[valueFrom][getValue];
        }
        if (requestResponse === 'response' && data?.data) {
          console.log('Value from response : ', valueFrom);
          // console.log("RESPONSE: ", data);
          subject_id = data?.data[getValue];
        }
        //   const currentUser = request?.user ? (request?.user as any) : null;

        const body = request.body;
        if ('user_password' in body) {
          body.user_password = 'password';
        }
        const responseTime = Date.now() - startTime;
        const createActivityLogBody: Log = {
          activity_log_action: 'action',
          activity_log_created_by: 1,
          activity_log_created_at: new Date(),
          activity_log_endpoint: request.path,
          activity_log_ip_address: request?.ip,
          activity_log_request: JSON.stringify(body),
          activity_log_request_files: JSON.stringify(request.params),
          activity_log_request_method: request.method,
          activity_log_request_param: JSON.stringify(request.params),
          activity_log_request_query: JSON.stringify(request.query),
          activity_log_response: JSON.stringify(data),
          activity_log_subject: subjectType,
          activity_log_response_time: responseTime,
          activity_log_subject_id: !isNaN(Number(subject_id))
            ? Number(subject_id)
            : null,
        };
        this.logService.logActivities(createActivityLogBody);
      }),
    );
  }
}
