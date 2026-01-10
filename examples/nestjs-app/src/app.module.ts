import { Module } from '@nestjs/common';
import { PompelmiModule } from '@pompelmi/nestjs';
import { UploadController } from './upload.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [
    PompelmiModule.forRoot({
      failFast: true,
      heuristicThreshold: 75,
      maxDepth: 3,
    }),
  ],
  controllers: [UploadController],
  providers: [ScanService],
})
export class AppModule {}
