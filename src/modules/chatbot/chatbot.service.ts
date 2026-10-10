import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from '../course/schema/course.schema';
import {
  CourseModule,
  CourseModuleDocument,
} from '../coursemodule/schema/coursemodule.schema';
import { PaymentStatusType } from '../../common/enum/paymentstatus-type.enum';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Maximum number of message pairs (human + AI) to keep per session
const MAX_HISTORY_PAIRS = 10;

@Injectable()
export class ChatbotService {
  private model: ChatGoogleGenerativeAI;

  /** In-memory store: sessionId → list of BaseMessage */
  private readonly sessionHistory = new Map<string, BaseMessage[]>();

  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModuleDocument>,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      // model: 'gemini-1.5-flash',
      model: 'gemini-3.1-flash-lite',
    });
  }

  private escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  private async findCoursesByText(text: string): Promise<CourseDocument[]> {
    if (!text || text.trim() === '') return [];

    // 1. Remove stop words & filler words
    const cleanText = text
      .replace(
        /\b(course|courses|related|module|modules|show|find|list|get|all|me|my|search|available|what|are|is|the|for|in|on|of|to|with|by|a|an|class|classes)\b/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return [];

    // 2. Extract individual word tokens
    const tokens = cleanText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    if (tokens.length === 0) return [];

    // 3. Search by primary subject token (e.g., "java", "python", "react") ignoring generic modifier words
    for (const token of tokens) {
      if (
        /^(development|developement|developer|programming|learn|learning|training|tutorial|basic|basics|advanced|beginner|intermediate|level|levels|code|coding)$/i.test(
          token,
        )
      ) {
        continue;
      }

      const escapedToken = this.escapeRegex(token);
      const subjectCourses = await this.courseModel
        .find({
          $or: [
            { title: { $regex: escapedToken, $options: 'i' } },
            { courseCode: { $regex: escapedToken, $options: 'i' } },
            { description: { $regex: escapedToken, $options: 'i' } },
            { courseTags: { $regex: escapedToken, $options: 'i' } },
            { skillsGain: { $regex: escapedToken, $options: 'i' } },
          ],
        })
        .exec();

      if (subjectCourses && subjectCourses.length > 0) {
        return subjectCourses;
      }
    }

    // 4. Fallback: Search using ANY token ($or) across all tokens
    const anyTokenConditions = tokens.flatMap((token) => {
      const escapedToken = this.escapeRegex(token);
      return [
        { title: { $regex: escapedToken, $options: 'i' } },
        { courseCode: { $regex: escapedToken, $options: 'i' } },
        { description: { $regex: escapedToken, $options: 'i' } },
        { courseTags: { $regex: escapedToken, $options: 'i' } },
        { skillsGain: { $regex: escapedToken, $options: 'i' } },
      ];
    });

    return await this.courseModel
      .find({ $or: anyTokenConditions })
      .exec();
  }

  private getTools() {
    const searchCoursesTool = tool(
      async (input: any) => {
        try {
          let rawArgs = input;
          if (typeof rawArgs === 'string') {
            try {
              rawArgs = JSON.parse(rawArgs);
            } catch {
              rawArgs = { query: rawArgs };
            }
          }
          if (rawArgs && typeof rawArgs === 'object' && rawArgs.args) {
            rawArgs = rawArgs.args;
          }

          const query: string | undefined = rawArgs?.query;
          const isFree: boolean | undefined = rawArgs?.isFree;
          const isPaid: boolean | undefined = rawArgs?.isPaid;
          const courseLevel: string | undefined =
            rawArgs?.courseLevel || rawArgs?.level;

          console.log(
            'Received tool argument:',
            input,
            '-> Parsed args:',
            { query, isFree, isPaid, courseLevel },
          );

          const rawQuery = query || '';

          const isFreeRequested =
            isFree === true || /\bfree\b/i.test(rawQuery);
          const isPaidRequested =
            isPaid === true || /\bpaid\b/i.test(rawQuery);

          let levelSearch = courseLevel;
          if (!levelSearch) {
            if (/\bbeginner\b/i.test(rawQuery)) levelSearch = 'Beginner';
            else if (/\bintermediate\b/i.test(rawQuery))
              levelSearch = 'Intermediate';
            else if (/\badvanced\b/i.test(rawQuery)) levelSearch = 'Advanced';
          }

          let courses: any[] = [];
          if (rawQuery.trim() !== '') {
            courses = await this.findCoursesByText(rawQuery);
            if (courses && courses.length > 0) {
              await this.courseModel.populate(courses, {
                path: 'categoryId',
                select: 'name categoryCode',
              });
            }
          } else {
            courses = await this.courseModel
              .find()
              .populate('categoryId', 'name categoryCode')
              .limit(20)
              .exec();
          }

          if (isFreeRequested && courses.length > 0) {
            courses = courses.filter(
              (c: any) =>
                c.isPaid === PaymentStatusType.FREE ||
                c.isPaid === 'Free' ||
                c.price === 0 ||
                !c.price,
            );
          } else if (isPaidRequested && courses.length > 0) {
            courses = courses.filter(
              (c: any) =>
                c.isPaid === PaymentStatusType.PAID ||
                c.isPaid === 'Paid' ||
                (c.price && c.price > 0),
            );
          }

          if (levelSearch && courses.length > 0) {
            const lvlReg = new RegExp(levelSearch, 'i');
            courses = courses.filter(
              (c: any) =>
                lvlReg.test(c.courseLevel || '') ||
                lvlReg.test(c.title || ''),
            );
          }

          console.log("return data", courses);

          if (!courses || courses.length === 0) {
            return 'No relevant courses found on Minbar.';
          }

          return JSON.stringify(
            courses.map((c: any) => ({
              id: c._id,
              courseCode: c.courseCode,
              title: c.title,
              description: c.description,
              price: c.price,
              isPaid: c.isPaid,
              level: c.courseLevel,
              category: (c.categoryId as any)?.name || 'Uncategorized',
              tags: c.courseTags,
              skills: c.skillsGain,
              status: c.status,
              isPublished: c.isPublished,
            })),
          );
        } catch (error) {
          return `Error fetching courses: ${error.message}`;
        }
      },
      {
        name: 'search_courses',
        description:
          'Search for online courses on the Minbar platform by keyword, topic, level (Beginner/Intermediate/Advanced), or price (free vs paid).',
        schema: z.object({
          query: z
            .string()
            .optional()
            .describe(
              'Search query, topic, keywords, or course name (e.g. "python", "web development", "all courses")',
            ),
          isFree: z
            .boolean()
            .optional()
            .describe('Set to true if searching specifically for free courses.'),
          isPaid: z
            .boolean()
            .optional()
            .describe('Set to true if searching specifically for paid courses.'),
          courseLevel: z
            .string()
            .optional()
            .describe('Course level filter: "Beginner", "Intermediate", or "Advanced"'),
        }),
      },
    );
    return [searchCoursesTool];
  }

  private getTopRatedCoursesTools() {
    const searchTopRatedCoursesTool = tool(
      async (input: any) => {
        try {
          let rawArgs = input;
          if (typeof rawArgs === 'string') {
            try {
              rawArgs = JSON.parse(rawArgs);
            } catch {
              rawArgs = { limit: 5 };
            }
          }
          if (rawArgs && typeof rawArgs === 'object' && rawArgs.args) {
            rawArgs = rawArgs.args;
          }

          const limitNum =
            typeof rawArgs?.limit === 'number'
              ? rawArgs.limit
              : parseInt(rawArgs?.limit, 10) || 5;
          const courseLevel = rawArgs?.courseLevel || rawArgs?.level;
          const isFree = rawArgs?.isFree;
          const isPaid = rawArgs?.isPaid;

          console.log(
            'Received search_top_rated_courses tool argument:',
            input,
            '-> Parsed args:',
            { limitNum, courseLevel, isFree, isPaid },
          );

          const matchConditions: any = {};

          if (isFree === true) {
            matchConditions.$or = [
              { isPaid: PaymentStatusType.FREE },
              { isPaid: 'Free' },
              { price: 0 },
              { price: { $exists: false } },
            ];
          } else if (isPaid === true) {
            matchConditions.$or = [
              { isPaid: PaymentStatusType.PAID },
              { isPaid: 'Paid' },
              { price: { $gt: 0 } },
            ];
          }

          if (courseLevel) {
            matchConditions.courseLevel = { $regex: courseLevel, $options: 'i' };
          }

          const pipeline: any[] = [
            {
              $lookup: {
                from: 'ratingreviews',
                localField: '_id',
                foreignField: 'courseId',
                as: 'rating',
              },
            },
            {
              $addFields: {
                totalReviews: { $size: '$rating' },
                averageRating: {
                  $cond: {
                    if: { $gt: [{ $size: '$rating' }, 0] },
                    then: { $avg: '$rating.rating' },
                    else: 0,
                  },
                },
              },
            },
          ];

          if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
          }

          pipeline.push(
            {
              $sort: {
                averageRating: -1,
                totalReviews: -1,
                createdAt: -1,
              },
            },
            {
              $limit: limitNum,
            },
          );

          const courses = await this.courseModel.aggregate(pipeline).exec();

          if (courses && courses.length > 0) {
            await this.courseModel.populate(courses, {
              path: 'categoryId',
              select: 'name categoryCode',
            });
          }

          console.log('Top rated courses found count:', courses?.length);

          if (!courses || courses.length === 0) {
            return 'No top rated courses found on Minbar.';
          }

          return JSON.stringify(
            courses.map((c: any) => ({
              id: c._id,
              courseCode: c.courseCode,
              title: c.title,
              description: c.description,
              price: c.price,
              isPaid: c.isPaid,
              level: c.courseLevel,
              category: c.categoryId?.name || 'Uncategorized',
              averageRating: c.averageRating
                ? Number(c.averageRating.toFixed(1))
                : 0,
              totalReviews: c.totalReviews || 0,
              tags: c.courseTags,
              skills: c.skillsGain,
            })),
          );
        } catch (error) {
          return `Error fetching top rated courses: ${error.message}`;
        }
      },
      {
        name: 'search_top_rated_courses',
        description:
          'Search or list the top rated / highest rated courses on Minbar based on user ratings and reviews.',
        schema: z.object({
          limit: z
            .number()
            .optional()
            .describe('Maximum number of top rated courses to return (default: 5).'),
          courseLevel: z
            .string()
            .optional()
            .describe('Filter top rated courses by level: "Beginner", "Intermediate", or "Advanced".'),
          isFree: z
            .boolean()
            .optional()
            .describe('Set to true to filter for free top-rated courses.'),
          isPaid: z
            .boolean()
            .optional()
            .describe('Set to true to filter for paid top-rated courses.'),
        }),
      },
    );

    return [searchTopRatedCoursesTool];
  }

  private getCourseModulesTools() {
    const searchCourseModulesTool = tool(
      async (input: any) => {
        try {
          let rawArgs = input;
          if (typeof rawArgs === 'string') {
            try {
              rawArgs = JSON.parse(rawArgs);
            } catch {
              rawArgs = { query: rawArgs };
            }
          }
          if (rawArgs && typeof rawArgs === 'object' && rawArgs.args) {
            rawArgs = rawArgs.args;
          }

          const courseId: string | undefined = rawArgs?.courseId;
          const courseTitle: string | undefined =
            rawArgs?.courseTitle || rawArgs?.courseName || rawArgs?.course;
          const query: string | undefined =
            rawArgs?.query || rawArgs?.moduleQuery || rawArgs?.keyword;

          console.log(
            'Received search_course_modules tool argument:',
            input,
            '-> Parsed args:',
            { courseId, courseTitle, query },
          );

          const filterConditions: any = {};
          let matchingCourses: CourseDocument[] = [];

          if (courseId && Types.ObjectId.isValid(courseId)) {
            matchingCourses = await this.courseModel
              .find({ _id: new Types.ObjectId(courseId) })
              .select('_id title courseCode')
              .exec();
          } else {
            const searchTerm = courseTitle || query || '';
            matchingCourses = await this.findCoursesByText(searchTerm);
          }

          if (!matchingCourses || matchingCourses.length === 0) {
            return `No courses matching "${courseTitle || query || 'specified criteria'}" were found on Minbar.`;
          }

          const courseIds = matchingCourses.map((c) => c._id);
          filterConditions.courseId = { $in: courseIds };

          // Clean query for module-level title/description keyword search
          let moduleQueryText = '';
          if (query && query.trim() !== '') {
            const clean = query
              .replace(
                /\b(course|courses|related|module|modules|show|find|list|get|all|me|my|search|available|what|are|is|the|for|in|on|of|to|with|by|a|an|class|classes|java|python|react|node|sql|js|javascript|html|css|cpp|c\+\+|aws|flutter)\b/gi,
                ' ',
              )
              .replace(/\s+/g, ' ')
              .trim();

            if (clean.length > 1) {
              moduleQueryText = clean;
            }
          }

          if (moduleQueryText) {
            const escapedQuery = this.escapeRegex(moduleQueryText);
            const moduleSearchConditions = [
              { title: { $regex: escapedQuery, $options: 'i' } },
              { description: { $regex: escapedQuery, $options: 'i' } },
            ];

            const moduleMatches = await this.courseModuleModel.countDocuments({
              ...filterConditions,
              $or: moduleSearchConditions,
            });

            if (moduleMatches > 0) {
              filterConditions.$or = moduleSearchConditions;
            }
          }

          const modules = await this.courseModuleModel
            .find(filterConditions)
            .populate('courseId', 'title courseCode')
            .sort({ courseId: 1, moduleOrder: 1 })
            .limit(50)
            .exec();

          console.log('Modules found count:', modules?.length);

          const resultByCourse = matchingCourses.map((course: any) => {
            const courseModules = (modules || []).filter(
              (m: any) =>
                m.courseId &&
                m.courseId._id.toString() === course._id.toString(),
            );
            return {
              courseId: course._id,
              courseTitle: course.title,
              courseCode: course.courseCode,
              totalModules: courseModules.length,
              modules: courseModules.map((m: any) => ({
                id: m._id,
                moduleOrder: m.moduleOrder,
                title: m.title,
                description: m.description,
                duration: m.duration,
                isPaid: m.isPaid,
                isPublished: m.isPublished,
                status: m.status,
              })),
            };
          });

          return JSON.stringify(resultByCourse);
        } catch (error) {
          return `Error fetching course modules: ${error.message}`;
        }
      },
      {
        name: 'search_course_modules',
        description:
          'Search and list modules within a specific course or across courses on Minbar using course name, course ID, or module topic keyword.',
        schema: z.object({
          courseId: z
            .string()
            .optional()
            .describe('Specific course ID (MongoDB ObjectId) to fetch modules for.'),
          courseTitle: z
            .string()
            .optional()
            .describe(
              'Course title, course code, or course keyword to find modules under (e.g. "Python", "Java", "Web Development")',
            ),
          query: z
            .string()
            .optional()
            .describe(
              'Keyword or module title filter (e.g. "Introduction", "Variables", "Database")',
            ),
        }),
      },
    );

    return [searchCourseModulesTool];
  }

  /** Get or create history for a session */
  private getSessionHistory(sessionId: string): BaseMessage[] {
    if (!this.sessionHistory.has(sessionId)) {
      this.sessionHistory.set(sessionId, []);
    }
    return this.sessionHistory.get(sessionId)!;
  }

  /** Append a human + AI message pair and trim to MAX_HISTORY_PAIRS */
  private appendToHistory(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
  ): void {
    const history = this.getSessionHistory(sessionId);
    history.push(new HumanMessage(userMessage));
    history.push(new AIMessage(aiResponse));

    // Keep only the last MAX_HISTORY_PAIRS pairs (each pair = 2 messages)
    const maxMessages = MAX_HISTORY_PAIRS * 2;
    if (history.length > maxMessages) {
      history.splice(0, history.length - maxMessages);
    }
  }

  async sendMessage(
    message: string,
    sessionId: string,
  ): Promise<string> {
    try {
      const tools = [
        ...this.getTools(),
        ...this.getTopRatedCoursesTools(),
        ...this.getCourseModulesTools(),
      ];

      // Load history for this session
      const historyMessages = this.getSessionHistory(sessionId);
      console.log('history of message', historyMessages);
      console.log('Session ID:', sessionId, '| History length:', historyMessages.length);

      const modelWithTools = this.model.bindTools(tools);

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are the AI Assistant for the Minbar Learning Platform.
          Minbar is an online learning management system.
          You can help users with:
    - Courses
    - Top rated courses
    - Modules
    - Chapters
    - Assessments
    - Learning materials
    - Progress
    - Certificates

    Only answer questions related to Minbar.
    Do not answer unrelated questions.

    If you don't know something about Minbar,
    clearly say that you don't have enough information.`,
        ],
        new MessagesPlaceholder('history'),
        ['user', '{input}'],
      ]);

      const chain = prompt.pipe(modelWithTools);
      const inputPayload = { input: message, history: historyMessages };
      const formattedInput = await prompt.formatMessages(inputPayload);

      console.log('LLM Input:');
      console.dir({ inputPayload, formattedInput }, { depth: null });

      const response = await chain.invoke(inputPayload);

      console.log('LLM Response:');
      console.dir(response, { depth: null });

      let finalAnswer: string;

      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
        const toolMessages: ToolMessage[] = [];

        for (const toolCall of response.tool_calls) {
          const selectedTool = toolsByName[toolCall.name];
          if (selectedTool) {
            let toolArgs = toolCall.args;
            if (typeof toolArgs === 'string') {
              try {
                toolArgs = JSON.parse(toolArgs);
              } catch {
                toolArgs = { query: toolArgs };
              }
            }
            console.log(`Invoking tool "${selectedTool.name}" with args:`, toolArgs);
            const toolOutput = await (selectedTool as any).invoke(toolArgs ?? {});
            console.log(`Tool "${selectedTool.name}" output (from DB):`, toolOutput);
            toolMessages.push(
              new ToolMessage({
                content:
                  typeof toolOutput === 'string'
                    ? toolOutput
                    : JSON.stringify(toolOutput),
                tool_call_id: toolCall.id ?? toolCall.name,
              }),
            );
          }
        }

        console.log('Tool messages (DB response) sent to LLM:');
        console.dir(toolMessages, { depth: null });

        const finalResponse = await this.model.invoke([
          ...formattedInput,
          response,
          ...toolMessages,
        ]);

        console.log('Final LLM Response:');
        console.dir(finalResponse, { depth: null });

        finalAnswer =
          typeof finalResponse.content === 'string'
            ? finalResponse.content
            : JSON.stringify(finalResponse.content);
      } else {
        finalAnswer =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
      }

      // Save the exchange into session history for future follow-up questions
      this.appendToHistory(sessionId, message, finalAnswer);
      console.log(
        'Updated history for session',
        sessionId,
        ':',
        this.getSessionHistory(sessionId).length,
        'messages',
      );

      return finalAnswer;
    } catch (error) {
      console.error('Error in ChatbotService:', error);
      throw new InternalServerErrorException(
        'Failed to process message in chatbot service',
      );
    }
  }
}
