import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FollowupImportController } from './followup-import.controller';
import { FollowupImportService } from './followup-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [FollowupImportController],
  providers: [FollowupImportService],
})
export class FollowupImportModule {}
