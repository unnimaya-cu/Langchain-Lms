import { Test, TestingModule } from '@nestjs/testing';
import { CourseReminderService } from './course-reminder.service';

describe('CourseReminderService', () => {
  let service: CourseReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseReminderService],
    }).compile();

    service = module.get<CourseReminderService>(CourseReminderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
