import { Injectable } from '@nestjs/common';
// import {
//   createErrorData,
//   createResponseData,
// } from 'src/utils/response-builder';
import { Log, LogDocument } from './log.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
@Injectable()
export class LogService {
  constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

  async logActivities(body: Log) {
    // console.log("cx bv");
    try {
      const data = await this.logModel.create(body);
      return data;
    } catch (err) {
      console.log('error on creating activity log : ', err);
    }
  }

  async getActivityLogs(
    page: number,
    perPage: number,
    search: string,
    startDate: Date,
    endDate: Date,
    userId: number,
  ) {
    try {
      console.log('logSearch', search);

      const query: any = {};

      // Search conditions
      if (search && search.length) {
        query.$or = [
          { activity_log_action: new RegExp(search, 'i') }, // case insensitive search
          { activity_log_ip_address: { $regex: `^${search}` } }, // startsWith equivalent
          { activity_log_endpoint: { $regex: `^${search}` } }, // startsWith equivalent
          // Assuming 'user_v1_users.user_name' is part of the Log schema in Mongoose
          { 'user_v1_users.user_name': new RegExp(search, 'i') },
        ];
      }

      // Date range conditions
      if (startDate && endDate) {
        query.$and = [
          { activity_log_created_at: { $gte: startDate } },
          { activity_log_created_at: { $lte: endDate } },
        ];
      }

      // User ID condition
      if (userId) {
        query.activity_log_created_by = userId;
      }

      console.log('query', query);

      // Find activity logs
      const activityLogs = await this.logModel
        .find(query)
        .sort({ activity_log_created_at: -1 }) // descending order
        .skip(page * perPage)
        .limit(perPage);

      //Count total logs
      const counts = await this.logModel.countDocuments(query);

      // return createResponseData({
      //   activity_logs: activityLogs,
      //   total: counts,
      //   page,
      //   perPage,
      // });
    } catch (err) {
      console.log('Error while getting activity logs:', err);
      // return createErrorData(err, 'activity_logs');
    }
  }
}
