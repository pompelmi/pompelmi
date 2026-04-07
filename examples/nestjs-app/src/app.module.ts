import { Module } from "@nestjs/common";
import { PompelmiModule } from "@pompelmi/nestjs";
import { ScanService } from "./scan.service";
import { UploadController } from "./upload.controller";

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
