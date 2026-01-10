import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PompelmiModule } from '../src/pompelmi.module';
import { PompelmiService } from '../src/pompelmi.service';
import { PompelmiInterceptor } from '../src/pompelmi.interceptor';
import { POMPELMI_MODULE_OPTIONS } from '../src/interfaces';

describe('PompelmiModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [PompelmiModule.forRoot()],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(PompelmiService)).toBeDefined();
      expect(module.get(PompelmiInterceptor)).toBeDefined();
    });

    it('should provide module options', async () => {
      const options = {
        failFast: true,
        heuristicThreshold: 80,
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [PompelmiModule.forRoot(options)],
      }).compile();

      const providedOptions = module.get(POMPELMI_MODULE_OPTIONS);
      expect(providedOptions).toEqual(options);
    });

    it('should create PompelmiService with provided options', async () => {
      const options = {
        failFast: false,
        maxDepth: 5,
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [PompelmiModule.forRoot(options)],
      }).compile();

      const service = module.get(PompelmiService);
      expect(service.getOptions()).toEqual(options);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with useFactory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          PompelmiModule.forRootAsync({
            useFactory: () => ({
              failFast: true,
              heuristicThreshold: 90,
            }),
          }),
        ],
      }).compile();

      const service = module.get(PompelmiService);
      const options = service.getOptions();
      
      expect(options.failFast).toBe(true);
      expect(options.heuristicThreshold).toBe(90);
    });

    it('should support async factory with dependencies', async () => {
      class ConfigService {
        get(key: string, defaultValue?: any) {
          if (key === 'SCAN_FAIL_FAST') return true;
          if (key === 'SCAN_THRESHOLD') return 85;
          return defaultValue;
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          PompelmiModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
              failFast: config.get('SCAN_FAIL_FAST'),
              heuristicThreshold: config.get('SCAN_THRESHOLD'),
            }),
            inject: [ConfigService],
          }),
        ],
        providers: [ConfigService],
      }).compile();

      const service = module.get(PompelmiService);
      const options = service.getOptions();
      
      expect(options.failFast).toBe(true);
      expect(options.heuristicThreshold).toBe(85);
    });

    it('should support useClass', async () => {
      class PompelmiConfigService {
        createPompelmiOptions() {
          return {
            failFast: false,
            maxDepth: 10,
          };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          PompelmiModule.forRootAsync({
            useClass: PompelmiConfigService,
          }),
        ],
      }).compile();

      const service = module.get(PompelmiService);
      const options = service.getOptions();
      
      expect(options.failFast).toBe(false);
      expect(options.maxDepth).toBe(10);
    });

    it('should throw error if no configuration method provided', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            PompelmiModule.forRootAsync({} as any),
          ],
        }).compile()
      ).rejects.toThrow('Invalid PompelmiModuleAsyncOptions');
    });
  });
});
