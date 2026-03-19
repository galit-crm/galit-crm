import { Module } from '@nestjs/common';
import { LabSamplesController } from './lab-samples.controller';
import { LabSamplesService } from './lab-samples.service';

@Module({
  controllers: [LabSamplesController],
  providers: [LabSamplesService],
})
export class LabSamplesModule {}

