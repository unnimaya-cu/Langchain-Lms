import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from '../course/schema/course.schema';

@Injectable()
export class ChatbotService {
  private model: ChatGoogleGenerativeAI;

  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
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
  async sendMessage(message: string): Promise<string> {
    try {
    
      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are the AI Assistant for the Minbar Learning Platform.
          Minbar is an online learning management system.
          You can help users with:
    - Courses
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
        ['user', '{input}'],
      ]);

      const chain = prompt.pipe(this.model);
      const inputPayload = { input: message };
      const formattedInput = await prompt.formatMessages(inputPayload);

      console.log('LLM Input:');
      console.dir({ inputPayload, formattedInput }, { depth: null });

      const response = await chain.invoke(inputPayload);

      console.log('LLM Response:');
      console.dir(response, { depth: null });

      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error) {
      console.error('Error in ChatbotService:', error);
      throw new InternalServerErrorException(
        'Failed to process message in chatbot service',
      );
    }
  }
}
