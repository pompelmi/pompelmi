import { DynamicModule, CanActivate, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ScanOptions, VerdictValue } from 'pompelmi';
import { Observable } from 'rxjs';

export declare const POMPELMI_OPTIONS = 'POMPELMI_OPTIONS';

export interface PompelmiModuleOptions extends ScanOptions {}

export interface PompelmiModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => PompelmiModuleOptions | Promise<PompelmiModuleOptions>;
  inject?: any[];
}

export declare class PompelmiModule {
  static forRoot(options?: PompelmiModuleOptions): DynamicModule;
  static forRootAsync(options: PompelmiModuleAsyncOptions): DynamicModule;
}

export declare class PompelmiService {
  readonly options: PompelmiModuleOptions;
  constructor(options?: PompelmiModuleOptions);
  scan(filePath: string): Promise<VerdictValue>;
  scanBuffer(buffer: Buffer): Promise<VerdictValue>;
  scanStream(stream: import('stream').Readable): Promise<VerdictValue>;
  isMalware(buffer: Buffer): Promise<boolean>;
}

export declare class PompelmiGuard implements CanActivate {
  constructor(pompelmiService: PompelmiService);
  canActivate(context: ExecutionContext): Promise<boolean>;
}

export declare class PompelmiInterceptor implements NestInterceptor {
  constructor(pompelmiService: PompelmiService);
  intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
}
