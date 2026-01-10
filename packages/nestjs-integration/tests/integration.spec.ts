import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PompelmiModule } from '../src/pompelmi.module';
import { PompelmiService } from '../src/pompelmi.service';
import { PompelmiInterceptor } from '../src/pompelmi.interceptor';

describe('PompelmiModule Integration', () => {
  let app: INestApplication;
  let service: PompelmiService;
  let interceptor: PompelmiInterceptor;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PompelmiModule.forRoot({
          failFast: true,
          heuristicThreshold: 80,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<PompelmiService>(PompelmiService);
    interceptor = moduleFixture.get<PompelmiInterceptor>(PompelmiInterceptor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Module initialization', () => {
    it('should create application with Pompelmi module', () => {
      expect(app).toBeDefined();
    });

    it('should provide PompelmiService', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PompelmiService);
    });

    it('should provide PompelmiInterceptor', () => {
      expect(interceptor).toBeDefined();
      expect(interceptor).toBeInstanceOf(PompelmiInterceptor);
    });

    it('should configure service with module options', () => {
      const options = service.getOptions();
      expect(options.failFast).toBe(true);
      expect(options.heuristicThreshold).toBe(80);
    });
  });

  describe('End-to-end scanning workflow', () => {
    it('should scan clean content successfully', async () => {
      const result = await service.scan('This is clean content');
      
      expect(result.verdict).toBe('clean');
      expect(result.findings).toEqual([]);
      expect(result.bytes).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect malicious content', async () => {
      const eicarSignature =
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      
      const result = await service.scan(eicarSignature);
      
      expect(result.verdict).toBe('malicious');
      expect(result.findings).toContain('EICAR test signature');
    });

    it('should provide quick malware check', async () => {
      const cleanBuffer = Buffer.from('clean data');
      const maliciousBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );

      expect(await service.isMalware(cleanBuffer)).toBe(false);
      expect(await service.isMalware(maliciousBuffer)).toBe(true);
    });
  });

  describe('Async configuration', () => {
    it('should support async module configuration', async () => {
      const asyncModule: TestingModule = await Test.createTestingModule({
        imports: [
          PompelmiModule.forRootAsync({
            useFactory: async () => {
              // Simulate async config loading
              await new Promise(resolve => setTimeout(resolve, 10));
              return {
                failFast: false,
                maxDepth: 5,
              };
            },
          }),
        ],
      }).compile();

      const asyncApp = asyncModule.createNestApplication();
      await asyncApp.init();

      const asyncService = asyncModule.get<PompelmiService>(PompelmiService);
      const options = asyncService.getOptions();

      expect(options.failFast).toBe(false);
      expect(options.maxDepth).toBe(5);

      await asyncApp.close();
    });
  });
});
