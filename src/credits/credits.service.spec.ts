import { Test, TestingModule } from '@nestjs/testing';
import { CreditsService } from './credits.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from '../auth/otp.service';
import { ConfigService } from '@nestjs/config';

describe('CreditsService', () => {
  let service: CreditsService;
  let userRepository: any;
  let transactionRepository: any;

  const mockUser = {
    id: 'user-1',
    credits: 100,
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: getRepositoryToken(CreditTransaction),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: OtpService,
          useValue: {
            sendSms: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('dummy'),
          },
        },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
    userRepository = module.get(getRepositoryToken(User));
    transactionRepository = module.get(getRepositoryToken(CreditTransaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deduct', () => {
    it('should deduct credits if balance is sufficient', async () => {
      mockUser.credits = 100;
      const remaining = await service.deduct('user-1', 'HELPER_CHAT');
      
      expect(remaining).toBe(99);
      expect(userRepository.update).toHaveBeenCalled();
      expect(transactionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if balance is insufficient', async () => {
      mockUser.credits = 0;
      await expect(service.deduct('user-1', 'HELPER_CHAT')).rejects.toThrow(BadRequestException);
    });
  });

  describe('topUp', () => {
    it('should increase user credits', async () => {
      mockUser.credits = 100;
      const updated = await service.topUp('user-1', 50);
      
      expect(updated).toBe(150);
      expect(userRepository.update).toHaveBeenCalled();
    });
  });
});
