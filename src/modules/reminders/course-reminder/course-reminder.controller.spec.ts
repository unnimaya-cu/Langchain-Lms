import { Test, TestingModule } from '@nestjs/testing';
import { CourseReminderController } from './course-reminder.controller';

describe('CourseReminderController', () => {
  let controller: CourseReminderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseReminderController],
    }).compile();

    controller = module.get<CourseReminderController>(CourseReminderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
