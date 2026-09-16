import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { AssessmentType } from "src/common/enum/assessment-type.enum";
import { StudentSubmissionStatus } from "src/common/enum/student-submission.enum";
import { Assessment } from "src/modules/assessment/schema/assessment.schema";

@Schema({timestamps: true})
export class StudentSubmission {
    @Prop({type: mongoose.Schema.Types.ObjectId, required: true, ref:'CourseAssessment'})
    assessmentId: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, required: true, ref:'StudentAssessment'})
    studentAssessmentId: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'})
    studentId: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'})
    assignedBy: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: false })
    chapterId: string;

    @Prop({ type: String, enum: AssessmentType, required: true })
    assessmentType: AssessmentType;

    @Prop({type: Number, default: 1})
    attemptNumber: number;

    @Prop({type: Number})
    objectiveScore: number;

    @Prop({type: Number})
    subjectiveScore: number;

    @Prop({type: Number})
    totalMarksObtained: number;

    @Prop({type: Number})
    totalMarks: number;

    @Prop({type: Number})
    subjectiveMarksObtained: number;

    @Prop({type: Number})
    totalSubjectiveMarks: number;

    @Prop({type: Number})
    objectiveMarksObtained: number;

    @Prop({type: Number})
    totalObjectiveMarks: number;

    @Prop({type: Date})
    startedAt: Date;

    @Prop({type: Date})
    serverNow: Date;

    @Prop({type: Date})
    endTime: Date;

    @Prop({type: Date})
    submittedAt: Date;

    @Prop({type: String, enum: StudentSubmissionStatus, default: StudentSubmissionStatus.IN_PROGRESS})
    submissionStatus: StudentSubmissionStatus;

    @Prop({
        type: [
            {
                questionId: mongoose.Schema.Types.ObjectId,
                questionType: String,
                selectedChoices: [String],
                text: String,
                placeholders: mongoose.Schema.Types.Mixed,
                attachments: [String],
                correctAnswer: Boolean,
                score: Number,
                manualScore: String,
                feedback: String,
            }
        ],
        default : []
    })
    studentAnswers: any[];

    @Prop({type: Number})
    totalScore: number;

    @Prop({type: String})
    grade: string;

    @Prop({type:Boolean, default: false})
    isGraded: boolean;

    @Prop({type:mongoose.Schema.Types.ObjectId, ref:'User'})
    gradedBy: string;

    @Prop({ type: Date })
    gradedAt: Date;

    @Prop({ type: String })
    graderFeedback: string;

    @Prop({ type: Array })
    questionSnapshot: any[];
}

export const StudentSubmissionSchema = SchemaFactory.createForClass(StudentSubmission);