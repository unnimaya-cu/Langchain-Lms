import { Test, TestingModule } from '@nestjs/testing';
import { ChapterVideoService } from './chapter-video.service';

describe('ChapterVideoService', () => {
  let service: ChapterVideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChapterVideoService],
    }).compile();

    service = module.get<ChapterVideoService>(ChapterVideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
