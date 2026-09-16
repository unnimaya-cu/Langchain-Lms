import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { StudentAssessment } from '../student-assessment/schema/create-student-assessment.schema';
import mongoose, { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { StudentAssessmentStatus } from 'src/common/enum/student-assessment-status';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationDocument, Notification } from '../notification/schema/notification.schema';
import { StudentSubmission } from '../student-submission/schema/student-submission.schema';
import { StudentSubmissionStatus } from 'src/common/enum/student-submission.enum';
import { CourseAssessment } from '../course-assessment/schema/course-assessment.schema';
import { StudentSubmissionService } from '../student-submission/student-submission.service';

@Injectable()
export class SchedulerService {
    constructor(
        @InjectModel(StudentAssessment.name)
        private readonly studentAssessmentModel: Model<StudentAssessment>,
        private readonly notificationService: NotificationService,
        private readonly notificationGateway: NotificationGateway,
        @InjectModel(Notification.name)
        private notificationModel: Model<NotificationDocument>,
        @InjectModel(StudentSubmission.name)
        private readonly studentSubmissionModel:Model<StudentSubmission>,
        @InjectModel(CourseAssessment.name)
        private readonly courseAssessmentModel:Model<CourseAssessment>,
        @Inject(forwardRef(() => StudentSubmissionService))
        private readonly studentSubmissionService: StudentSubmissionService
    ) {}

    @Cron('0 * * * *')
    async sendAssessmentReminder() {
        try {
            console.log('CRON jobs running...')
            const now = new Date()
            const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            console.log('now', now)

            const assessments = await this.studentAssessmentModel.find({
                // _id: new mongoose.Types.ObjectId('6a55e971383e3162112f56ce'),
                submissionStatus: StudentAssessmentStatus.PENDING,
                reminderSent: false,
                dueDate: { $gte: now, $lte: next24h }
            })
            .populate({
                path:'assessmentId',
                select:'title _id'
            })

            console.log('assessments count', assessments.length)

            for(const assessment of assessments) {
                const dueDate = new Date(assessment.dueDate)

                const reminderTime = new Date(dueDate)
                reminderTime.setHours(reminderTime.getHours() - 24)
                
                if(now >= reminderTime  && now < dueDate) {
                    const courseAssessment: any = assessment.assessmentId;
                    const diffMs = dueDate.getTime() - now.getTime();

                    const totalMinutes = Math.ceil(diffMs / (1000 * 60));

                    let remainingTime = '';

                    if (totalMinutes >= 60) {
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;

                    remainingTime = minutes
                        ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`
                        : `${hours} hour${hours > 1 ? 's' : ''}`;
                    } else {
                    remainingTime = `${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}`;
                    }

                    const message = `Reminder: Your assessment ${courseAssessment.title} is due in ${remainingTime}. Please complete it before the due date.`;
                    // const message = `Reminder: Your assessment ${courseAssessment.title} is due in 24 hours. Please complete it before the due date.`

                    console.log(
                        `Sending reminder to student ${assessment.studentId}`
                    );

                    let notification = await this.notificationModel.findOne({
                        type: NotificationType.ASSESSMENT_REMINDER,
                        assessmentId: new Types.ObjectId(courseAssessment._id),
                    })
                                            
                    if(!notification) {
                        const created = await this.notificationService.CreateNewNotification(
                            NotificationType.ASSESSMENT_REMINDER,
                            undefined,
                            undefined,
                            undefined,
                            courseAssessment._id.toString()
                        );
                        notification = created.data;
                    }
                    await this.notificationGateway.sendNotificationToUser(
                        notification._id.toString(),
                        [assessment.studentId.toString()],
                        message
                    );

                    await this.studentAssessmentModel.updateOne(
                        { _id: assessment._id },
                        { reminderSent: true }
                    );
                }
            }

        } catch (error) {
            console.error('Reminder job failed', error);
        }
    }

    @Cron('0 * * * *')
    async expireOverdueAssessments() {
        try {
            console.log('Running overdue assessment expiration cron...');

            const now = new Date();

            const overdueAssessments = await this.studentAssessmentModel.find({
                // _id: new mongoose.Types.ObjectId('699eb700192645dd8f986db9'),
                submissionStatus: {
                    $in:[
                        StudentAssessmentStatus.PENDING,
                        StudentAssessmentStatus.IN_PROGRESS
                    ]
                },
                dueDate: { $lt: now }, 
            });

            console.log('Overdue assessments found:', overdueAssessments.length);

            for (const assessment of overdueAssessments) {
                await this.studentAssessmentModel.updateOne(
                    { _id: assessment._id },
                    { submissionStatus: StudentAssessmentStatus.EXPIRED }
                );

                console.log(
                    `Assessment ${assessment._id} for student ${assessment.studentId} marked as EXPIRED`
                );
            }
        } catch (error) {
            console.error('Failed to expire overdue assessments', error);
        }
    }

    @Cron('0 * * * *')
    async sendGradeReminderToTutor() {
        try {
            console.log('Running grade reminder cron...');

            const now = new Date();

            // const startOfDay = new Date();
            // startOfDay.setUTCHours(0, 0, 0, 0);

            // const endOfDay = new Date();
            // endOfDay.setUTCHours(23, 59, 59, 999);

            const assessments = await this.studentSubmissionModel.aggregate([
                {
                    $match: {
                        submissionStatus: StudentSubmissionStatus.SUBMITTED,
                        isGraded: false
                    }
                },
                {
                    $lookup: {
                        from: 'courseassessments',
                        localField: 'assessmentId',
                        foreignField: '_id',
                        as: 'assessment'
                    }
                },
                {
                    $unwind: '$assessment'
                },
                {
                    $match: {
                        'assessment.instructions.enableGradeReminder': true,
                        'assessment.isGradeReminderSent': false,
                        // 'assessment.instructions.gradeReminderDate': { $lte: now }
                        'assessment.instructions.gradeReminderDate': {
                            // $gte: startOfDay,
                            $lte: now
                        }
                    }
                },
                {
                    $group: {
                        _id: '$assessmentId',
                        title: { $first: '$assessment.title' },
                        createdBy: { $first: '$assessment.createdBy' }
                    }
                },
                {
                    $project: {
                        assessmentId: '$_id',
                        title: 1,
                        createdBy: 1
                    }
                }
            ]);

            // console.log('assessments', assessments)
            console.log('grade reminder assessments:', assessments.length);

            for (const assessment of assessments) {
                const courseAssessment: any = assessment;
                if (!courseAssessment?.createdBy) continue;
                const message = `Reminder: Assessment ${courseAssessment.title} needs to be graded.`;

                let notification = await this.notificationModel.findOne({
                    type: NotificationType.GRADE_REMINDER,
                    assessmentId: new Types.ObjectId(courseAssessment.assessmentId),
                });

                if (!notification) {
                    const created =
                    await this.notificationService.CreateNewNotification(
                        NotificationType.GRADE_REMINDER,
                        undefined,
                        undefined,
                        undefined,
                        courseAssessment._id
                    );
                    notification = created.data;
                }

                await this.notificationGateway.sendNotificationToUser(
                    notification._id.toString(),
                    [courseAssessment.createdBy.toString()],
                    message
                );

                console.log(`Reminder sent successfully for assessment: ${courseAssessment._id}`);

                await this.courseAssessmentModel.updateOne(
                    { _id: courseAssessment.assessmentId },
                    { $set: { isGradeReminderSent: true } }
                );
            }
        } catch (error) {
            console.error('Grade reminder cron failed', error);
        }
    }

    @Cron('0 * * * *')
    async handleExpiredAssessments() {
        const now = new Date();

        const expiredSubmissions = await this.studentSubmissionModel.find({
            submissionStatus: 'in_progress',
            endTime: { $lt: new Date() },
        });
        console.log('Expired submissions found:', expiredSubmissions.length);
        
        for (const submission of expiredSubmissions) {
            try {
                await this.studentSubmissionService.submitAssessment(
                    submission._id.toString(),
                    { isAutoSubmit: true } as any,
                    submission.studentId.toString(),
                );
                console.log('Auto-submitted assessment for submission:', submission._id);    
            } catch (err) {
                console.error(
                    `Auto-submit failed for ${submission._id}`,
                    err,
                );
            }
        }
    }
}