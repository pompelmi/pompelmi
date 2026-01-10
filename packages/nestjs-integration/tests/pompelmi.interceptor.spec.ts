import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ExecutionContext, CallHandler } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PompelmiInterceptor } from '../src/pompelmi.interceptor';
import { PompelmiService } from '../src/pompelmi.service';
import { POMPELMI_MODULE_OPTIONS } from '../src/interfaces';

describe('PompelmiInterceptor', () => {
  let interceptor: PompelmiInterceptor;
  let service: PompelmiService;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PompelmiInterceptor,
        PompelmiService,
        {
          provide: POMPELMI_MODULE_OPTIONS,
          useValue: { failFast: true },
        },
      ],
    }).compile();

    interceptor = module.get<PompelmiInterceptor>(PompelmiInterceptor);
    service = module.get<PompelmiService>(PompelmiService);

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ success: true })),
    };
  });

  const createMockContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: vi.fn(),
        getNext: vi.fn(),
      }),
      getClass: vi.fn(),
      getHandler: vi.fn(),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as any;
  };

  describe('Single file upload', () => {
    it('should allow clean file to pass through', async () => {
      const mockRequest = {
        file: {
          originalname: 'clean.txt',
          mimetype: 'text/plain',
          size: 100,
          buffer: Buffer.from('Clean file content'),
        },
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should throw BadRequestException for malicious file', async () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );

      const mockRequest = {
        file: {
          originalname: 'malware.exe',
          mimetype: 'application/x-msdownload',
          size: eicarBuffer.length,
          buffer: eicarBuffer,
        },
      };

      mockExecutionContext = createMockContext(mockRequest);

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler)
      ).rejects.toThrow(BadRequestException);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should include file details in exception', async () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );

      const mockRequest = {
        file: {
          originalname: 'virus.txt',
          mimetype: 'text/plain',
          size: eicarBuffer.length,
          buffer: eicarBuffer,
        },
      };

      mockExecutionContext = createMockContext(mockRequest);

      try {
        await interceptor.intercept(mockExecutionContext, mockCallHandler);
        expect.fail('Should have thrown BadRequestException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response).toHaveProperty('message', 'Malware detected in uploaded file');
        expect(response).toHaveProperty('details');
        expect(response.details).toHaveProperty('filename', 'virus.txt');
        expect(response.details).toHaveProperty('verdict', 'malicious');
        expect(response.details.findings).toContain('EICAR test signature');
      }
    });

    it('should throw error if buffer not available', async () => {
      const mockRequest = {
        file: {
          originalname: 'file.txt',
          mimetype: 'text/plain',
          size: 100,
          // No buffer property (disk storage)
        },
      };

      mockExecutionContext = createMockContext(mockRequest);

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler)
      ).rejects.toThrow('File buffer not available');
    });
  });

  describe('Multiple files upload (array)', () => {
    it('should scan all files in array', async () => {
      const mockRequest = {
        files: [
          {
            originalname: 'file1.txt',
            mimetype: 'text/plain',
            size: 50,
            buffer: Buffer.from('Clean file 1'),
          },
          {
            originalname: 'file2.txt',
            mimetype: 'text/plain',
            size: 50,
            buffer: Buffer.from('Clean file 2'),
          },
        ],
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should reject if any file is malicious', async () => {
      const eicarBuffer = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );

      const mockRequest = {
        files: [
          {
            originalname: 'clean.txt',
            mimetype: 'text/plain',
            size: 50,
            buffer: Buffer.from('Clean file'),
          },
          {
            originalname: 'malware.exe',
            mimetype: 'application/x-msdownload',
            size: eicarBuffer.length,
            buffer: eicarBuffer,
          },
        ],
      };

      mockExecutionContext = createMockContext(mockRequest);

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Multiple files upload (object)', () => {
    it('should scan files from FileFieldsInterceptor format', async () => {
      const mockRequest = {
        files: {
          avatar: [
            {
              originalname: 'avatar.jpg',
              mimetype: 'image/jpeg',
              size: 1000,
              buffer: Buffer.from('fake image data'),
            },
          ],
          documents: [
            {
              originalname: 'doc1.pdf',
              mimetype: 'application/pdf',
              size: 2000,
              buffer: Buffer.from('fake pdf data'),
            },
            {
              originalname: 'doc2.pdf',
              mimetype: 'application/pdf',
              size: 2000,
              buffer: Buffer.from('fake pdf data 2'),
            },
          ],
        },
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('No files uploaded', () => {
    it('should allow request with no files', async () => {
      const mockRequest = {};

      mockExecutionContext = createMockContext(mockRequest);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});
